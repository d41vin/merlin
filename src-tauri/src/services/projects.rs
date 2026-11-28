use std::path::{Component, Path, PathBuf};

use serde::Serialize;
use uuid::Uuid;

use crate::db::projects::{DocsRootRecord, ProjectRecord, ProjectsRepository, RepositoryRecord};
use crate::db::{utc_timestamp, AppDatabase};
use crate::error::{AppError, AppErrorCode};
use crate::filesystem::path::RegisteredRoot;

pub const PROJECT_STORE_DIRECTORY: &str = "project-store";
pub const PROJECT_STORE_DIRECTORIES: [&str; 7] = [
    "docs",
    "versions",
    "trash",
    "attachments",
    "previews",
    "recovery",
    "exports",
];
const MAX_NAME_LENGTH: usize = 120;
const MAX_DESCRIPTION_LENGTH: usize = 10_000;
const MAX_REMOTE_IDENTITY_LENGTH: usize = 2_048;
const MAX_RELATIVE_PATH_LENGTH: usize = 1_024;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ProjectStatus {
    Planned,
    Active,
    Passive,
    Archived,
}

impl ProjectStatus {
    fn parse(value: &str) -> Option<Self> {
        match value {
            "planned" => Some(Self::Planned),
            "active" => Some(Self::Active),
            "passive" => Some(Self::Passive),
            "archived" => Some(Self::Archived),
            _ => None,
        }
    }

    fn as_str(self) -> &'static str {
        match self {
            Self::Planned => "planned",
            Self::Active => "active",
            Self::Passive => "passive",
            Self::Archived => "archived",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum RepositoryConnectionStatus {
    Connected,
    Unavailable,
    Disconnected,
}

impl RepositoryConnectionStatus {
    fn parse(value: &str) -> Option<Self> {
        match value {
            "connected" => Some(Self::Connected),
            "unavailable" => Some(Self::Unavailable),
            "disconnected" => Some(Self::Disconnected),
            _ => None,
        }
    }

    fn as_str(self) -> &'static str {
        match self {
            Self::Connected => "connected",
            Self::Unavailable => "unavailable",
            Self::Disconnected => "disconnected",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum DocsRootKind {
    Repository,
    ProjectStore,
}

impl DocsRootKind {
    pub(crate) fn parse(value: &str) -> Option<Self> {
        match value {
            "repository" => Some(Self::Repository),
            "project_store" => Some(Self::ProjectStore),
            _ => None,
        }
    }

    fn as_str(self) -> &'static str {
        match self {
            Self::Repository => "repository",
            Self::ProjectStore => "project_store",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum DocsRootStatus {
    Active,
    Skipped,
    Missing,
}

impl DocsRootStatus {
    pub(crate) fn parse(value: &str) -> Option<Self> {
        match value {
            "active" => Some(Self::Active),
            "skipped" => Some(Self::Skipped),
            "missing" => Some(Self::Missing),
            _ => None,
        }
    }

    fn as_str(self) -> &'static str {
        match self {
            Self::Active => "active",
            Self::Skipped => "skipped",
            Self::Missing => "missing",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RepositorySummary {
    pub path: String,
    pub remote_identity: Option<String>,
    pub default_branch: Option<String>,
    pub connection_status: RepositoryConnectionStatus,
    pub available: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DocsRootSummary {
    pub kind: DocsRootKind,
    pub relative_path: String,
    pub path: String,
    pub status: DocsRootStatus,
    pub available: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectSummary {
    pub id: String,
    pub name: String,
    pub description: String,
    pub status: ProjectStatus,
    pub created_at: String,
    pub updated_at: String,
    pub repository: Option<RepositorySummary>,
    pub docs_root: Option<DocsRootSummary>,
    pub project_store_path: String,
    pub project_store_ready: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DocsRootDetection {
    pub repository_connected: bool,
    pub repository_available: bool,
    pub candidate_relative_path: Option<String>,
    pub configured: Option<DocsRootSummary>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(tag = "status", rename_all = "camelCase")]
pub enum RepositoryConnectOutcome {
    Connected {
        project: Box<ProjectSummary>,
    },
    AlreadyConnected {
        existing_project_id: String,
        existing_project_name: String,
    },
}

pub struct ProjectService<'a> {
    database: &'a AppDatabase,
    repository: ProjectsRepository<'a>,
}

impl<'a> ProjectService<'a> {
    pub fn new(database: &'a AppDatabase) -> Self {
        Self {
            database,
            repository: ProjectsRepository::new(database),
        }
    }

    pub fn list_projects(&self) -> Result<Vec<ProjectSummary>, AppError> {
        let projects = self.repository.list()?;
        projects
            .iter()
            .map(|project| self.summary(project))
            .collect()
    }

    pub fn get_project(&self, project_id: &str) -> Result<ProjectSummary, AppError> {
        let project = self
            .repository
            .get(project_id)?
            .ok_or_else(|| invalid_project("project does not exist"))?;
        self.summary(&project)
    }

    pub fn create_project(
        &self,
        name: &str,
        description: &str,
    ) -> Result<ProjectSummary, AppError> {
        let name = validate_text(name, MAX_NAME_LENGTH, "project name")?;
        let description =
            validate_optional_text(description, MAX_DESCRIPTION_LENGTH, "project description")?;
        let project_id = Uuid::new_v4().to_string();
        self.ensure_project_store(&project_id)?;
        let timestamp = utc_timestamp()?;
        let project = ProjectRecord {
            id: project_id.clone(),
            name,
            description,
            status: ProjectStatus::Planned.as_str().to_owned(),
            created_at: timestamp.clone(),
            updated_at: timestamp.clone(),
        };
        let docs_root = DocsRootRecord {
            id: Uuid::new_v4().to_string(),
            project_id: project_id.clone(),
            root_kind: DocsRootKind::ProjectStore.as_str().to_owned(),
            relative_path: String::new(),
            status: DocsRootStatus::Active.as_str().to_owned(),
            created_at: timestamp.clone(),
            updated_at: timestamp,
        };
        self.repository.create(&project, &docs_root)?;
        self.get_project(&project_id)
    }

    pub fn connect_repository(
        &self,
        project_id: &str,
        local_path: &str,
        remote_identity: Option<&str>,
    ) -> Result<RepositoryConnectOutcome, AppError> {
        let project = self
            .repository
            .get(project_id)?
            .ok_or_else(|| invalid_project("project does not exist"))?;
        let canonical_path = self.canonical_repository(local_path)?;
        let remote_identity = normalize_remote_identity(remote_identity)?;
        let canonical_path_string = path_string(&canonical_path)?;

        if let Some((existing, _)) = self
            .repository
            .find_connection(&canonical_path_string, remote_identity.as_deref())?
        {
            if existing.id != project.id {
                return Ok(RepositoryConnectOutcome::AlreadyConnected {
                    existing_project_id: existing.id,
                    existing_project_name: existing.name,
                });
            }
        }

        let timestamp = utc_timestamp()?;
        let existing_connection = self.repository.get_connection(project_id)?;
        let repository_changed = existing_connection
            .as_ref()
            .is_none_or(|connection| connection.canonical_local_path != canonical_path_string);
        let connection = RepositoryRecord {
            id: existing_connection
                .as_ref()
                .map(|connection| connection.id.clone())
                .unwrap_or_else(|| Uuid::new_v4().to_string()),
            project_id: project.id.clone(),
            canonical_local_path: canonical_path_string,
            remote_identity,
            default_branch: None,
            last_observed_head: None,
            last_observed_branch: None,
            connection_status: RepositoryConnectionStatus::Connected.as_str().to_owned(),
            last_reconciled_at: None,
            created_at: existing_connection
                .as_ref()
                .map(|connection| connection.created_at.clone())
                .unwrap_or_else(|| timestamp.clone()),
            updated_at: timestamp.clone(),
        };
        let reset_docs_root = if repository_changed {
            self.skipped_project_store_root(project_id, &timestamp)?
        } else {
            None
        };
        self.repository
            .upsert_connection(&connection, reset_docs_root.as_ref())?;
        Ok(RepositoryConnectOutcome::Connected {
            project: Box::new(self.get_project(project_id)?),
        })
    }

    pub fn detect_docs_root(&self, project_id: &str) -> Result<DocsRootDetection, AppError> {
        let project = self
            .repository
            .get(project_id)?
            .ok_or_else(|| invalid_project("project does not exist"))?;
        let connection = self.repository.get_connection(project_id)?;
        let configured = self.docs_root_summary_for_project(&project, connection.as_ref())?;
        let Some(connection) = connection else {
            return Ok(DocsRootDetection {
                repository_connected: false,
                repository_available: false,
                candidate_relative_path: None,
                configured: None,
            });
        };
        let repository_root =
            RegisteredRoot::register(Path::new(&connection.canonical_local_path)).ok();
        let repository_available = repository_root.is_some();
        let candidate_relative_path = repository_root.as_ref().and_then(|root| {
            root.resolve_existing(Path::new("docs"))
                .ok()
                .filter(|path| path.is_dir())
                .map(|_| "docs".to_owned())
        });
        Ok(DocsRootDetection {
            repository_connected: true,
            repository_available,
            candidate_relative_path,
            configured,
        })
    }

    pub fn confirm_docs_root(
        &self,
        project_id: &str,
        relative_path: &str,
    ) -> Result<ProjectSummary, AppError> {
        let project = self
            .repository
            .get(project_id)?
            .ok_or_else(|| invalid_project("project does not exist"))?;
        let connection = self
            .repository
            .get_connection(project_id)?
            .ok_or_else(|| invalid_docs_root("a repository must be connected first"))?;
        let repository_root = RegisteredRoot::register(Path::new(&connection.canonical_local_path))
            .map_err(|_| invalid_repository("repository is not an available directory"))?;
        let relative_path = normalize_relative_path(relative_path)?;
        let resolved = repository_root
            .resolve_existing(Path::new(&relative_path))
            .map_err(|_| {
                invalid_docs_root("Docs root must be an existing directory inside the repository")
            })?;
        if !resolved.is_dir() {
            return Err(invalid_docs_root(
                "Docs root must be an existing directory inside the repository",
            ));
        }
        self.store_repository_docs_root(&project, &relative_path)?;
        self.get_project(&project.id)
    }

    pub fn create_docs_root(&self, project_id: &str) -> Result<ProjectSummary, AppError> {
        let project = self
            .repository
            .get(project_id)?
            .ok_or_else(|| invalid_project("project does not exist"))?;
        let connection = self
            .repository
            .get_connection(project_id)?
            .ok_or_else(|| invalid_docs_root("a repository must be connected first"))?;
        let repository_root = RegisteredRoot::register(Path::new(&connection.canonical_local_path))
            .map_err(|_| invalid_repository("repository is not an available directory"))?;
        let target = repository_root.path().join("docs");
        if target.exists() {
            if !target.is_dir() {
                return Err(invalid_docs_root("docs path is not a directory"));
            }
        } else {
            std::fs::create_dir(&target)
                .map_err(|error| AppError::io("create the Docs folder", &error))?;
        }
        let resolved = repository_root
            .resolve_existing(Path::new("docs"))
            .map_err(|_| invalid_docs_root("Docs root could not be validated"))?;
        if !resolved.is_dir() {
            return Err(invalid_docs_root("Docs root could not be validated"));
        }
        self.store_repository_docs_root(&project, "docs")?;
        self.get_project(&project.id)
    }

    pub fn skip_docs_root(&self, project_id: &str) -> Result<ProjectSummary, AppError> {
        let project = self
            .repository
            .get(project_id)?
            .ok_or_else(|| invalid_project("project does not exist"))?;
        if self.repository.get_connection(project_id)?.is_none() {
            return Err(invalid_docs_root(
                "Docs root can only be skipped for a project with a repository",
            ));
        }
        let timestamp = utc_timestamp()?;
        let docs_root = DocsRootRecord {
            id: Uuid::new_v4().to_string(),
            project_id: project.id.clone(),
            root_kind: DocsRootKind::ProjectStore.as_str().to_owned(),
            relative_path: String::new(),
            status: DocsRootStatus::Skipped.as_str().to_owned(),
            created_at: timestamp.clone(),
            updated_at: timestamp,
        };
        self.repository.upsert_docs_root(&docs_root)?;
        self.get_project(&project.id)
    }

    fn summary(&self, project: &ProjectRecord) -> Result<ProjectSummary, AppError> {
        let connection = self.repository.get_connection(&project.id)?;
        let docs_root = self.docs_root_summary_for_project(project, connection.as_ref())?;
        let repository = connection
            .as_ref()
            .map(|connection| self.repository_summary(connection))
            .transpose()?;
        let project_store_path = self.project_store_path(&project.id)?;
        let project_store_ready = self.project_store_ready(&project_store_path);

        Ok(ProjectSummary {
            id: project.id.clone(),
            name: project.name.clone(),
            description: project.description.clone(),
            status: ProjectStatus::parse(&project.status).ok_or_else(AppError::database)?,
            created_at: project.created_at.clone(),
            updated_at: project.updated_at.clone(),
            repository,
            docs_root,
            project_store_path: path_string(&project_store_path)?,
            project_store_ready,
        })
    }

    fn repository_summary(
        &self,
        connection: &RepositoryRecord,
    ) -> Result<RepositorySummary, AppError> {
        let available = Path::new(&connection.canonical_local_path).is_dir();
        Ok(RepositorySummary {
            path: connection.canonical_local_path.clone(),
            remote_identity: connection.remote_identity.clone(),
            default_branch: connection.default_branch.clone(),
            connection_status: RepositoryConnectionStatus::parse(&connection.connection_status)
                .ok_or_else(AppError::database)?,
            available,
        })
    }

    fn docs_root_summary_for_project(
        &self,
        project: &ProjectRecord,
        connection: Option<&RepositoryRecord>,
    ) -> Result<Option<DocsRootSummary>, AppError> {
        let Some(docs_root) = self.repository.get_docs_root(&project.id)? else {
            return Ok(None);
        };
        self.docs_root_summary(project, connection, &docs_root)
    }

    fn docs_root_summary(
        &self,
        project: &ProjectRecord,
        connection: Option<&RepositoryRecord>,
        docs_root: &DocsRootRecord,
    ) -> Result<Option<DocsRootSummary>, AppError> {
        let kind = DocsRootKind::parse(&docs_root.root_kind).ok_or_else(AppError::database)?;
        let stored_status =
            DocsRootStatus::parse(&docs_root.status).ok_or_else(AppError::database)?;
        let (path, available) = match kind {
            DocsRootKind::ProjectStore => {
                let path = self.project_store_path(&project.id)?.join("docs");
                let available = path.is_dir();
                (path, available)
            }
            DocsRootKind::Repository => {
                let Some(connection) = connection else {
                    return Ok(None);
                };
                let path =
                    Path::new(&connection.canonical_local_path).join(&docs_root.relative_path);
                let available = path.is_dir();
                (path, available)
            }
        };
        let status = if !available && stored_status == DocsRootStatus::Active {
            DocsRootStatus::Missing
        } else {
            stored_status
        };
        Ok(Some(DocsRootSummary {
            kind,
            relative_path: docs_root.relative_path.clone(),
            path: path_string(&path)?,
            status,
            available,
        }))
    }

    fn store_repository_docs_root(
        &self,
        project: &ProjectRecord,
        relative_path: &str,
    ) -> Result<(), AppError> {
        let timestamp = utc_timestamp()?;
        let existing = self.repository.get_docs_root(&project.id)?;
        let docs_root = DocsRootRecord {
            id: existing
                .as_ref()
                .map(|root| root.id.clone())
                .unwrap_or_else(|| Uuid::new_v4().to_string()),
            project_id: project.id.clone(),
            root_kind: DocsRootKind::Repository.as_str().to_owned(),
            relative_path: relative_path.to_owned(),
            status: DocsRootStatus::Active.as_str().to_owned(),
            created_at: existing
                .as_ref()
                .map(|root| root.created_at.clone())
                .unwrap_or_else(|| timestamp.clone()),
            updated_at: timestamp,
        };
        self.repository.upsert_docs_root(&docs_root)
    }

    fn skipped_project_store_root(
        &self,
        project_id: &str,
        timestamp: &str,
    ) -> Result<Option<DocsRootRecord>, AppError> {
        let Some(existing) = self.repository.get_docs_root(project_id)? else {
            return Ok(Some(DocsRootRecord {
                id: Uuid::new_v4().to_string(),
                project_id: project_id.to_owned(),
                root_kind: DocsRootKind::ProjectStore.as_str().to_owned(),
                relative_path: String::new(),
                status: DocsRootStatus::Skipped.as_str().to_owned(),
                created_at: timestamp.to_owned(),
                updated_at: timestamp.to_owned(),
            }));
        };
        if existing.root_kind == DocsRootKind::Repository.as_str()
            || existing.status == DocsRootStatus::Active.as_str()
        {
            return Ok(Some(DocsRootRecord {
                id: existing.id,
                project_id: project_id.to_owned(),
                root_kind: DocsRootKind::ProjectStore.as_str().to_owned(),
                relative_path: String::new(),
                status: DocsRootStatus::Skipped.as_str().to_owned(),
                created_at: existing.created_at,
                updated_at: timestamp.to_owned(),
            }));
        }
        Ok(None)
    }

    fn canonical_repository(&self, local_path: &str) -> Result<PathBuf, AppError> {
        let trimmed = local_path.trim();
        if trimmed.is_empty()
            || trimmed.len() > 32_768
            || trimmed.chars().any(char::is_control)
            || !Path::new(trimmed).is_absolute()
        {
            return Err(invalid_repository(
                "repository path must be an absolute existing directory",
            ));
        }
        let root = RegisteredRoot::register(Path::new(trimmed))
            .map_err(|_| invalid_repository("repository path must be an existing directory"))?;
        if root.path().starts_with(self.database.data_directory())
            || self.database.data_directory().starts_with(root.path())
        {
            return Err(invalid_repository(
                "repository and Merlin application data must not contain each other",
            ));
        }
        Ok(root.path().to_path_buf())
    }

    fn project_store_path(&self, project_id: &str) -> Result<PathBuf, AppError> {
        validate_project_id(project_id)?;
        Ok(self
            .database
            .data_directory()
            .join(PROJECT_STORE_DIRECTORY)
            .join(project_id))
    }

    fn ensure_project_store(&self, project_id: &str) -> Result<PathBuf, AppError> {
        let data_directory = self.database.data_directory();
        let base = data_directory.join(PROJECT_STORE_DIRECTORY);
        std::fs::create_dir_all(&base)
            .map_err(|error| AppError::io("create the Project Store directory", &error))?;
        let base = std::fs::canonicalize(&base)
            .map_err(|error| AppError::io("canonicalize the Project Store directory", &error))?;
        if base.parent() != Some(data_directory) {
            return Err(project_store_error(
                "Project Store directory escapes application data",
            ));
        }

        let mut target = base.join(project_id);
        if target.exists() {
            let canonical = std::fs::canonicalize(&target)
                .map_err(|error| AppError::io("canonicalize the Project Store", &error))?;
            if canonical != target || canonical.parent() != Some(&base) {
                return Err(project_store_error(
                    "Project Store path escapes application data",
                ));
            }
            target = canonical;
            ensure_project_store_directories(&target)?;
            return Ok(target);
        }

        let staging = base.join(format!(".staging-{}", Uuid::new_v4()));
        std::fs::create_dir(&staging)
            .map_err(|error| AppError::io("create the Project Store staging directory", &error))?;
        if let Err(error) = ensure_project_store_directories(&staging) {
            let _ = std::fs::remove_dir_all(&staging);
            return Err(error);
        }
        if let Err(error) = std::fs::rename(&staging, &target) {
            let _ = std::fs::remove_dir_all(&staging);
            return Err(AppError::io("finalize the Project Store", &error));
        }
        let target = std::fs::canonicalize(&target)
            .map_err(|error| AppError::io("canonicalize the Project Store", &error))?;
        if target.parent() != Some(&base) {
            return Err(project_store_error(
                "Project Store path escapes application data",
            ));
        }
        Ok(target)
    }

    fn project_store_ready(&self, project_store_path: &Path) -> bool {
        PROJECT_STORE_DIRECTORIES
            .iter()
            .all(|directory| project_store_path.join(directory).is_dir())
    }
}

fn ensure_project_store_directories(root: &Path) -> Result<(), AppError> {
    for directory in PROJECT_STORE_DIRECTORIES {
        let path = root.join(directory);
        if path.exists() {
            let canonical = std::fs::canonicalize(&path)
                .map_err(|error| AppError::io("canonicalize a Project Store directory", &error))?;
            if canonical != path || !canonical.starts_with(root) || !canonical.is_dir() {
                return Err(project_store_error(
                    "Project Store directory escapes its project directory",
                ));
            }
        } else {
            std::fs::create_dir(&path)
                .map_err(|error| AppError::io("create a Project Store directory", &error))?;
        }
    }
    Ok(())
}

fn validate_text(value: &str, max_length: usize, label: &str) -> Result<String, AppError> {
    let value = value.trim();
    if value.is_empty() || value.len() > max_length || value.chars().any(char::is_control) {
        return Err(invalid_project(format!("{label} is invalid")));
    }
    Ok(value.to_owned())
}

fn validate_optional_text(value: &str, max_length: usize, label: &str) -> Result<String, AppError> {
    let value = value.trim();
    if value.len() > max_length || value.chars().any(char::is_control) {
        return Err(invalid_project(format!("{label} is invalid")));
    }
    Ok(value.to_owned())
}

fn normalize_remote_identity(value: Option<&str>) -> Result<Option<String>, AppError> {
    let Some(value) = value else {
        return Ok(None);
    };
    let value = value.trim();
    if value.is_empty() {
        return Ok(None);
    }
    if value.len() > MAX_REMOTE_IDENTITY_LENGTH || value.chars().any(char::is_control) {
        return Err(invalid_repository("remote identity is invalid"));
    }
    Ok(Some(value.to_owned()))
}

fn normalize_relative_path(value: &str) -> Result<String, AppError> {
    let value = value.trim();
    if value.is_empty()
        || value.len() > MAX_RELATIVE_PATH_LENGTH
        || value.chars().any(char::is_control)
    {
        return Err(invalid_docs_root("relative Docs path is invalid"));
    }
    let path = Path::new(value);
    if path.is_absolute()
        || path
            .components()
            .any(|component| !matches!(component, Component::Normal(_)))
    {
        return Err(invalid_docs_root(
            "relative Docs path must stay inside the repository",
        ));
    }
    let components: Vec<String> = path
        .components()
        .filter_map(|component| match component {
            Component::Normal(value) => Some(value.to_string_lossy().into_owned()),
            _ => None,
        })
        .collect();
    if components.is_empty() {
        return Err(invalid_docs_root("relative Docs path is invalid"));
    }
    Ok(components.join("/"))
}

fn path_string(path: &Path) -> Result<String, AppError> {
    path.to_str().map(str::to_owned).ok_or_else(|| {
        AppError::new(
            AppErrorCode::ProjectStore,
            "project path is not valid Unicode",
        )
    })
}

fn validate_project_id(project_id: &str) -> Result<(), AppError> {
    let parsed = Uuid::parse_str(project_id).map_err(|_| invalid_project("invalid project ID"))?;
    if parsed.to_string() != project_id {
        return Err(invalid_project("invalid project ID"));
    }
    Ok(())
}

fn invalid_project(message: impl Into<String>) -> AppError {
    AppError::new(AppErrorCode::InvalidProject, message)
}

fn invalid_repository(message: impl Into<String>) -> AppError {
    AppError::new(AppErrorCode::InvalidRepository, message)
}

fn invalid_docs_root(message: impl Into<String>) -> AppError {
    AppError::new(AppErrorCode::InvalidDocsRoot, message)
}

fn project_store_error(message: impl Into<String>) -> AppError {
    AppError::new(AppErrorCode::ProjectStore, message)
}
