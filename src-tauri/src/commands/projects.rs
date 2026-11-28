use tauri::State;

use crate::commands::settings::ContentFreeString;
use crate::db::AppDatabase;
use crate::error::AppError;
use crate::services::projects::{
    DocsRootDetection, ProjectService, ProjectSummary, RepositoryConnectOutcome,
};

pub fn list_projects(database: &AppDatabase) -> Result<Vec<ProjectSummary>, AppError> {
    ProjectService::new(database).list_projects()
}

pub fn get_project(database: &AppDatabase, project_id: &str) -> Result<ProjectSummary, AppError> {
    ProjectService::new(database).get_project(project_id)
}

pub fn create_project(
    database: &AppDatabase,
    name: &str,
    description: &str,
) -> Result<ProjectSummary, AppError> {
    ProjectService::new(database).create_project(name, description)
}

pub fn connect_repository(
    database: &AppDatabase,
    project_id: &str,
    local_path: &str,
    remote_identity: Option<&str>,
) -> Result<RepositoryConnectOutcome, AppError> {
    ProjectService::new(database).connect_repository(project_id, local_path, remote_identity)
}

pub fn detect_docs_root(
    database: &AppDatabase,
    project_id: &str,
) -> Result<DocsRootDetection, AppError> {
    ProjectService::new(database).detect_docs_root(project_id)
}

pub fn confirm_docs_root(
    database: &AppDatabase,
    project_id: &str,
    relative_path: &str,
) -> Result<ProjectSummary, AppError> {
    ProjectService::new(database).confirm_docs_root(project_id, relative_path)
}

pub fn create_docs_root(
    database: &AppDatabase,
    project_id: &str,
) -> Result<ProjectSummary, AppError> {
    ProjectService::new(database).create_docs_root(project_id)
}

pub fn skip_docs_root(
    database: &AppDatabase,
    project_id: &str,
) -> Result<ProjectSummary, AppError> {
    ProjectService::new(database).skip_docs_root(project_id)
}

#[tauri::command]
pub fn projects_list(database: State<'_, AppDatabase>) -> Result<Vec<ProjectSummary>, AppError> {
    list_projects(database.inner())
}

#[tauri::command]
pub fn project_get(
    project_id: ContentFreeString,
    database: State<'_, AppDatabase>,
) -> Result<ProjectSummary, AppError> {
    get_project(database.inner(), &project_id.0)
}

#[tauri::command]
pub fn project_create(
    name: ContentFreeString,
    description: ContentFreeString,
    database: State<'_, AppDatabase>,
) -> Result<ProjectSummary, AppError> {
    create_project(database.inner(), &name.0, &description.0)
}

#[tauri::command]
pub fn repository_connect(
    project_id: ContentFreeString,
    local_path: ContentFreeString,
    remote_identity: Option<ContentFreeString>,
    database: State<'_, AppDatabase>,
) -> Result<RepositoryConnectOutcome, AppError> {
    connect_repository(
        database.inner(),
        &project_id.0,
        &local_path.0,
        remote_identity.as_ref().map(|value| value.0.as_str()),
    )
}

#[tauri::command]
pub fn docs_root_detect(
    project_id: ContentFreeString,
    database: State<'_, AppDatabase>,
) -> Result<DocsRootDetection, AppError> {
    detect_docs_root(database.inner(), &project_id.0)
}

#[tauri::command]
pub fn docs_root_confirm(
    project_id: ContentFreeString,
    relative_path: ContentFreeString,
    database: State<'_, AppDatabase>,
) -> Result<ProjectSummary, AppError> {
    confirm_docs_root(database.inner(), &project_id.0, &relative_path.0)
}

#[tauri::command]
pub fn docs_root_create(
    project_id: ContentFreeString,
    database: State<'_, AppDatabase>,
) -> Result<ProjectSummary, AppError> {
    create_docs_root(database.inner(), &project_id.0)
}

#[tauri::command]
pub fn docs_root_skip(
    project_id: ContentFreeString,
    database: State<'_, AppDatabase>,
) -> Result<ProjectSummary, AppError> {
    skip_docs_root(database.inner(), &project_id.0)
}
