use std::io::Read;
use std::path::{Component, Path, PathBuf};

use serde::{Deserialize, Serialize};
use time::{format_description::well_known::Rfc3339, OffsetDateTime};

use crate::db::docs::{DocsFileRecord, DocsFilesRepository};
use crate::db::projects::{DocsRootRecord, ProjectsRepository};
use crate::db::{utc_timestamp, AppDatabase};
use crate::error::{AppError, AppErrorCode};
use crate::filesystem::hash::sha256_bytes;
use crate::filesystem::path::RegisteredRoot;
use crate::services::projects::{DocsRootKind, DocsRootStatus, PROJECT_STORE_DIRECTORY};

/// Bounds are deliberately explicit. A scan fails loudly instead of truncating the manifest.
pub const MAX_MANIFEST_ENTRIES: usize = 5_000;
pub const MAX_DOCUMENT_BYTES: u64 = 2 * 1024 * 1024;
pub const MAX_SCAN_DEPTH: usize = 32;
const MAX_RELATIVE_PATH_LENGTH: usize = 1_024;
const GIT_DIRECTORY_NAME: &str = ".git";

#[derive(Debug, Clone, Copy)]
pub(crate) struct DocsScanLimits {
    pub(crate) max_entries: usize,
    pub(crate) max_document_bytes: u64,
    pub(crate) max_depth: usize,
}

impl Default for DocsScanLimits {
    fn default() -> Self {
        Self {
            max_entries: MAX_MANIFEST_ENTRIES,
            max_document_bytes: MAX_DOCUMENT_BYTES,
            max_depth: MAX_SCAN_DEPTH,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DocsFileKind {
    Markdown,
    Mdx,
    File,
}

impl DocsFileKind {
    fn parse(value: &str) -> Option<Self> {
        match value {
            "markdown" => Some(Self::Markdown),
            "mdx" => Some(Self::Mdx),
            "file" => Some(Self::File),
            _ => None,
        }
    }

    fn as_str(self) -> &'static str {
        match self {
            Self::Markdown => "markdown",
            Self::Mdx => "mdx",
            Self::File => "file",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum DocsEncoding {
    #[serde(rename = "utf-8")]
    Utf8,
    #[serde(rename = "utf-8-bom")]
    Utf8Bom,
    #[serde(rename = "unsupported")]
    Unsupported,
    #[serde(rename = "unreadable")]
    Unreadable,
}

impl DocsEncoding {
    fn parse(value: &str) -> Option<Self> {
        match value {
            "utf-8" => Some(Self::Utf8),
            "utf-8-bom" => Some(Self::Utf8Bom),
            "unsupported" => Some(Self::Unsupported),
            "unreadable" => Some(Self::Unreadable),
            _ => None,
        }
    }

    fn as_str(self) -> &'static str {
        match self {
            Self::Utf8 => "utf-8",
            Self::Utf8Bom => "utf-8-bom",
            Self::Unsupported => "unsupported",
            Self::Unreadable => "unreadable",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DocsFileStatus {
    Present,
    Missing,
    TooLarge,
    InvalidEncoding,
    UnsupportedLink,
    Unreadable,
}

impl DocsFileStatus {
    fn parse(value: &str) -> Option<Self> {
        match value {
            "present" => Some(Self::Present),
            "missing" => Some(Self::Missing),
            "too_large" => Some(Self::TooLarge),
            "invalid_encoding" => Some(Self::InvalidEncoding),
            "unsupported_link" => Some(Self::UnsupportedLink),
            "unreadable" => Some(Self::Unreadable),
            _ => None,
        }
    }

    fn as_str(self) -> &'static str {
        match self {
            Self::Present => "present",
            Self::Missing => "missing",
            Self::TooLarge => "too_large",
            Self::InvalidEncoding => "invalid_encoding",
            Self::UnsupportedLink => "unsupported_link",
            Self::Unreadable => "unreadable",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum MarkdownFeature {
    Frontmatter,
    FencedCode,
    Mermaid,
    Table,
    TaskList,
    Html,
    Mdx,
    Links,
    Images,
    CustomContainer,
    Crlf,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DocsFileSummary {
    pub relative_path: String,
    pub kind: DocsFileKind,
    pub size_bytes: u64,
    pub modified_at: Option<String>,
    pub file_identity: Option<String>,
    pub content_hash: Option<String>,
    pub encoding: DocsEncoding,
    pub features: Vec<MarkdownFeature>,
    pub status: DocsFileStatus,
    pub last_seen_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DocsManifest {
    pub project_id: String,
    pub docs_root_kind: DocsRootKind,
    pub docs_root_relative_path: String,
    pub files: Vec<DocsFileSummary>,
    pub scanned_at: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DocsDocument {
    pub relative_path: String,
    pub kind: DocsFileKind,
    pub source: String,
    pub size_bytes: u64,
    pub modified_at: Option<String>,
    pub content_hash: String,
    pub encoding: DocsEncoding,
    pub features: Vec<MarkdownFeature>,
}

struct ResolvedDocsRoot {
    root: RegisteredRoot,
    docs_root_id: String,
    kind: DocsRootKind,
    relative_path: String,
}

pub struct DocsService<'a> {
    database: &'a AppDatabase,
    projects: ProjectsRepository<'a>,
    files: DocsFilesRepository<'a>,
}

impl<'a> DocsService<'a> {
    pub fn new(database: &'a AppDatabase) -> Self {
        Self {
            database,
            projects: ProjectsRepository::new(database),
            files: DocsFilesRepository::new(database),
        }
    }

    /// Returns the persisted manifest for the confirmed Docs root. No filesystem scan occurs.
    pub fn get_manifest(&self, project_id: &str) -> Result<DocsManifest, AppError> {
        let resolved = self.resolve_root(project_id)?;
        let records = self.files.list(project_id, &resolved.docs_root_id)?;
        let scanned_at = self
            .files
            .manifest_scanned_at(project_id, &resolved.docs_root_id)?;
        self.manifest_from_records(project_id, &resolved, records, scanned_at)
    }

    /// Scans only the confirmed Docs root and replaces the current manifest view.
    pub fn scan_manifest(&self, project_id: &str) -> Result<DocsManifest, AppError> {
        self.scan_manifest_with_limits(project_id, DocsScanLimits::default())
    }

    pub(crate) fn scan_manifest_with_limits(
        &self,
        project_id: &str,
        limits: DocsScanLimits,
    ) -> Result<DocsManifest, AppError> {
        let resolved = self.resolve_root(project_id)?;
        let timestamp = utc_timestamp()?;
        let mut records = Vec::new();
        scan_directory(
            project_id,
            &resolved.docs_root_id,
            resolved.root.path(),
            "",
            0,
            limits,
            &timestamp,
            &mut records,
        )?;
        self.files
            .replace_manifest(project_id, &resolved.docs_root_id, &records, &timestamp)?;
        self.files.record_manifest_scan(
            project_id,
            &resolved.docs_root_id,
            &timestamp,
            records.len(),
        )?;
        let persisted = self.files.list(project_id, &resolved.docs_root_id)?;
        self.manifest_from_records(project_id, &resolved, persisted, Some(timestamp))
    }

    /// Reads a Markdown-family document through the confirmed root. No content is persisted.
    pub fn read_document(
        &self,
        project_id: &str,
        relative_path: &str,
    ) -> Result<DocsDocument, AppError> {
        let relative_path = normalize_relative_path(relative_path)?;
        let resolved = self.resolve_root(project_id)?;
        if has_link_component(resolved.root.path(), &relative_path) {
            return Err(invalid_docs_file(
                "document path crosses a symbolic link or junction that Merlin does not follow",
            ));
        }
        let path = resolved
            .root
            .resolve_existing_file(Path::new(&relative_path))
            .map_err(|_| invalid_docs_file("document is not an available regular file"))?;
        let kind = file_kind(&relative_path);
        if kind == DocsFileKind::File {
            return Err(invalid_docs_file(
                "only Markdown documents can be opened in the document reader",
            ));
        }
        let metadata = std::fs::metadata(&path)
            .map_err(|_| invalid_docs_file("document is not an available regular file"))?;
        if metadata.len() > MAX_DOCUMENT_BYTES {
            return Err(docs_file_too_large());
        }
        let bytes = read_bounded(&path, MAX_DOCUMENT_BYTES)?.ok_or_else(docs_file_too_large)?;
        let content_hash = sha256_bytes(&bytes);
        let encoding = if is_utf8_bom(&bytes) {
            DocsEncoding::Utf8Bom
        } else {
            DocsEncoding::Utf8
        };
        let source = String::from_utf8(bytes)
            .map_err(|_| invalid_docs_file("document is not valid UTF-8"))?;
        let features = classify_markdown(&source);
        Ok(DocsDocument {
            relative_path,
            kind,
            source,
            size_bytes: metadata.len(),
            modified_at: modified_at(&metadata),
            content_hash,
            encoding,
            features,
        })
    }

    fn resolve_root(&self, project_id: &str) -> Result<ResolvedDocsRoot, AppError> {
        let project = self
            .projects
            .get(project_id)?
            .ok_or_else(|| invalid_docs_root("project does not exist"))?;
        let docs_root = self
            .projects
            .get_docs_root(&project.id)?
            .ok_or_else(|| invalid_docs_root("Docs root is not configured"))?;
        let stored_status =
            DocsRootStatus::parse(&docs_root.status).ok_or_else(AppError::database)?;
        if stored_status != DocsRootStatus::Active {
            return Err(invalid_docs_root("Docs root is not configured"));
        }
        let kind = DocsRootKind::parse(&docs_root.root_kind).ok_or_else(AppError::database)?;
        let root_path = match kind {
            DocsRootKind::ProjectStore => self.project_store_docs_root(project_id)?,
            DocsRootKind::Repository => self.repository_docs_root(&docs_root)?,
        };
        let root = RegisteredRoot::register(&root_path)
            .map_err(|_| invalid_docs_root("Docs root is not available"))?;
        Ok(ResolvedDocsRoot {
            root,
            docs_root_id: docs_root.id,
            kind,
            relative_path: docs_root.relative_path,
        })
    }

    fn project_store_docs_root(&self, project_id: &str) -> Result<PathBuf, AppError> {
        validate_project_id(project_id)?;
        let data_root = RegisteredRoot::register(self.database.data_directory())
            .map_err(|_| invalid_docs_root("application data directory is unavailable"))?;
        data_root
            .resolve_existing(
                Path::new(PROJECT_STORE_DIRECTORY)
                    .join(project_id)
                    .join("docs")
                    .as_path(),
            )
            .map_err(|_| invalid_docs_root("Docs root is not available"))
    }

    fn repository_docs_root(&self, docs_root: &DocsRootRecord) -> Result<PathBuf, AppError> {
        let connection = self
            .projects
            .get_connection(&docs_root.project_id)?
            .ok_or_else(|| invalid_docs_root("repository is not connected"))?;
        let repository = RegisteredRoot::register(Path::new(&connection.canonical_local_path))
            .map_err(|_| invalid_docs_root("repository is not available"))?;
        repository
            .resolve_existing(Path::new(&docs_root.relative_path))
            .map_err(|_| invalid_docs_root("Docs root is not available"))
    }

    fn manifest_from_records(
        &self,
        project_id: &str,
        resolved: &ResolvedDocsRoot,
        records: Vec<DocsFileRecord>,
        scanned_at: Option<String>,
    ) -> Result<DocsManifest, AppError> {
        let files = records
            .iter()
            .map(file_summary)
            .collect::<Result<Vec<_>, _>>()?;
        Ok(DocsManifest {
            project_id: project_id.to_owned(),
            docs_root_kind: resolved.kind,
            docs_root_relative_path: resolved.relative_path.clone(),
            files,
            scanned_at,
        })
    }
}

#[allow(clippy::too_many_arguments)]
fn scan_directory(
    project_id: &str,
    docs_root_id: &str,
    directory: &Path,
    relative_prefix: &str,
    depth: usize,
    limits: DocsScanLimits,
    timestamp: &str,
    records: &mut Vec<DocsFileRecord>,
) -> Result<(), AppError> {
    let entries = std::fs::read_dir(directory)
        .map_err(|_| docs_manifest_error("Docs tree could not be read"))?;
    let mut children = Vec::new();
    for entry in entries {
        children.push(entry.map_err(|_| docs_manifest_error("Docs tree could not be read"))?);
    }
    children.sort_by_key(|entry| entry.file_name().to_string_lossy().to_lowercase());

    for child in children {
        let name = child
            .file_name()
            .to_str()
            .map(str::to_owned)
            .ok_or_else(|| docs_manifest_error("Docs tree contains a non-Unicode file name"))?;
        let relative_path = if relative_prefix.is_empty() {
            name.clone()
        } else {
            format!("{relative_prefix}/{name}")
        };
        let metadata = std::fs::symlink_metadata(child.path())
            .map_err(|_| docs_manifest_error("Docs tree entry could not be inspected"))?;

        if is_link_like(&metadata) {
            push_entry(
                records,
                limits,
                scan_entry(
                    project_id,
                    docs_root_id,
                    relative_path,
                    DocsFileKind::File,
                    &metadata,
                    DocsEncoding::Unreadable,
                    Vec::new(),
                    DocsFileStatus::UnsupportedLink,
                    None,
                    timestamp,
                ),
            )?;
            continue;
        }

        let file_type = metadata.file_type();
        if file_type.is_dir() {
            if name.eq_ignore_ascii_case(GIT_DIRECTORY_NAME) {
                continue;
            }
            if depth >= limits.max_depth {
                return Err(docs_manifest_error(
                    "Docs tree is deeper than the supported scan limit",
                ));
            }
            scan_directory(
                project_id,
                docs_root_id,
                &child.path(),
                &relative_path,
                depth + 1,
                limits,
                timestamp,
                records,
            )?;
            continue;
        }

        if !file_type.is_file() {
            push_entry(
                records,
                limits,
                scan_entry(
                    project_id,
                    docs_root_id,
                    relative_path,
                    DocsFileKind::File,
                    &metadata,
                    DocsEncoding::Unreadable,
                    Vec::new(),
                    DocsFileStatus::Unreadable,
                    None,
                    timestamp,
                ),
            )?;
            continue;
        }

        let kind = file_kind(&relative_path);
        let file_outcome = read_bounded(&child.path(), limits.max_document_bytes);
        let summary = match file_outcome {
            Ok(Some(bytes)) => {
                let content_hash = sha256_bytes(&bytes);
                let features = if kind == DocsFileKind::File {
                    Vec::new()
                } else {
                    match std::str::from_utf8(&bytes) {
                        Ok(source) => classify_markdown(source),
                        Err(_) => Vec::new(),
                    }
                };
                let (encoding, status) = match (kind, std::str::from_utf8(&bytes)) {
                    (DocsFileKind::File, _) => (DocsEncoding::Unsupported, DocsFileStatus::Present),
                    (_, Ok(_)) => (
                        if is_utf8_bom(&bytes) {
                            DocsEncoding::Utf8Bom
                        } else {
                            DocsEncoding::Utf8
                        },
                        DocsFileStatus::Present,
                    ),
                    (_, Err(_)) => (DocsEncoding::Unreadable, DocsFileStatus::InvalidEncoding),
                };
                scan_entry(
                    project_id,
                    docs_root_id,
                    relative_path,
                    kind,
                    &metadata,
                    encoding,
                    features,
                    status,
                    Some(content_hash),
                    timestamp,
                )
            }
            Ok(None) => scan_entry(
                project_id,
                docs_root_id,
                relative_path,
                kind,
                &metadata,
                DocsEncoding::Unreadable,
                Vec::new(),
                DocsFileStatus::TooLarge,
                None,
                timestamp,
            ),
            Err(_) => scan_entry(
                project_id,
                docs_root_id,
                relative_path,
                kind,
                &metadata,
                DocsEncoding::Unreadable,
                Vec::new(),
                DocsFileStatus::Unreadable,
                None,
                timestamp,
            ),
        };
        push_entry(records, limits, summary)?;
    }
    Ok(())
}

#[allow(clippy::too_many_arguments)]
fn scan_entry(
    project_id: &str,
    docs_root_id: &str,
    relative_path: String,
    kind: DocsFileKind,
    metadata: &std::fs::Metadata,
    encoding: DocsEncoding,
    features: Vec<MarkdownFeature>,
    status: DocsFileStatus,
    content_hash: Option<String>,
    timestamp: &str,
) -> DocsFileRecord {
    let features_json = serde_json::to_string(&features).unwrap_or_else(|_| "[]".to_owned());
    DocsFileRecord::new_scan_entry(
        project_id,
        docs_root_id,
        relative_path,
        kind.as_str(),
        metadata.len(),
        modified_at(metadata),
        file_identity(metadata),
        content_hash,
        encoding.as_str(),
        features_json,
        status.as_str(),
        timestamp,
    )
}

fn push_entry(
    records: &mut Vec<DocsFileRecord>,
    limits: DocsScanLimits,
    record: DocsFileRecord,
) -> Result<(), AppError> {
    if records.len() >= limits.max_entries {
        return Err(docs_manifest_error(
            "Docs tree exceeds the supported manifest entry limit",
        ));
    }
    records.push(record);
    Ok(())
}

fn file_summary(record: &DocsFileRecord) -> Result<DocsFileSummary, AppError> {
    let features: Vec<MarkdownFeature> =
        serde_json::from_str(&record.features_json).map_err(AppError::from)?;
    Ok(DocsFileSummary {
        relative_path: record.relative_path.clone(),
        kind: DocsFileKind::parse(&record.kind).ok_or_else(AppError::database)?,
        size_bytes: u64::try_from(record.size_bytes).map_err(|_| AppError::database())?,
        modified_at: record.modified_at.clone(),
        file_identity: record.file_identity.clone(),
        content_hash: record.content_hash.clone(),
        encoding: DocsEncoding::parse(&record.encoding).ok_or_else(AppError::database)?,
        features,
        status: DocsFileStatus::parse(&record.status).ok_or_else(AppError::database)?,
        last_seen_at: record.last_seen_at.clone(),
    })
}

fn file_kind(relative_path: &str) -> DocsFileKind {
    let extension = Path::new(relative_path)
        .extension()
        .and_then(|value| value.to_str())
        .map(str::to_ascii_lowercase);
    match extension.as_deref() {
        Some("md" | "markdown") => DocsFileKind::Markdown,
        Some("mdx") => DocsFileKind::Mdx,
        _ => DocsFileKind::File,
    }
}

fn read_bounded(path: &Path, max_bytes: u64) -> Result<Option<Vec<u8>>, AppError> {
    let file =
        std::fs::File::open(path).map_err(|error| AppError::io("read a Docs file", &error))?;
    let mut reader = file.take(max_bytes.saturating_add(1));
    let mut bytes = Vec::new();
    reader
        .read_to_end(&mut bytes)
        .map_err(|error| AppError::io("read a Docs file", &error))?;
    if bytes.len() as u64 > max_bytes {
        return Ok(None);
    }
    Ok(Some(bytes))
}

fn is_utf8_bom(bytes: &[u8]) -> bool {
    bytes.starts_with(&[0xEF, 0xBB, 0xBF])
}

fn modified_at(metadata: &std::fs::Metadata) -> Option<String> {
    metadata
        .modified()
        .ok()
        .map(OffsetDateTime::from)
        .and_then(|value| value.format(&Rfc3339).ok())
}

#[cfg(windows)]
fn file_identity(metadata: &std::fs::Metadata) -> Option<String> {
    use std::os::windows::fs::MetadataExt;

    // Creation time plus size is an observed identity hint, not durable identity.
    // Content hashes remain the source of truth for manifests and later reconciliation.
    Some(format!(
        "{:016x}:{:016x}",
        metadata.creation_time(),
        metadata.file_size()
    ))
}

#[cfg(not(windows))]
fn file_identity(_metadata: &std::fs::Metadata) -> Option<String> {
    None
}

fn is_link_like(metadata: &std::fs::Metadata) -> bool {
    let file_type = metadata.file_type();
    if file_type.is_symlink() {
        return true;
    }
    #[cfg(windows)]
    {
        use std::os::windows::fs::FileTypeExt;
        if file_type.is_symlink_dir() || file_type.is_symlink_file() {
            return true;
        }
    }
    false
}

fn has_link_component(root: &Path, relative_path: &str) -> bool {
    let mut current = root.to_path_buf();
    for component in relative_path.split('/') {
        current.push(component);
        match std::fs::symlink_metadata(&current) {
            Ok(metadata) if is_link_like(&metadata) => return true,
            Ok(_) => {}
            Err(_) => return false,
        }
    }
    false
}

fn normalize_relative_path(value: &str) -> Result<String, AppError> {
    let value = value.trim();
    if value.is_empty()
        || value.len() > MAX_RELATIVE_PATH_LENGTH
        || value.chars().any(char::is_control)
    {
        return Err(invalid_docs_file("document path is invalid"));
    }
    let path = Path::new(value);
    if path.is_absolute() {
        return Err(invalid_docs_file(
            "document path must stay inside the Docs root",
        ));
    }
    let mut components = Vec::new();
    for component in path.components() {
        let Component::Normal(part) = component else {
            return Err(invalid_docs_file(
                "document path must stay inside the Docs root",
            ));
        };
        let part = part
            .to_str()
            .ok_or_else(|| invalid_docs_file("document path is not valid Unicode"))?;
        if part.eq_ignore_ascii_case(GIT_DIRECTORY_NAME) {
            return Err(invalid_docs_file(
                "document path is outside the Docs manifest",
            ));
        }
        components.push(part.to_owned());
    }
    if components.is_empty() {
        return Err(invalid_docs_file("document path is invalid"));
    }
    Ok(components.join("/"))
}

fn classify_markdown(source: &str) -> Vec<MarkdownFeature> {
    let body = source.strip_prefix('\u{feff}').unwrap_or(source);
    let lines: Vec<&str> = body
        .split('\n')
        .map(|line| line.strip_suffix('\r').unwrap_or(line))
        .collect();
    let mut features = Vec::new();
    let mut push = |feature| {
        if !features.contains(&feature) {
            features.push(feature);
        }
    };

    if lines.first().is_some_and(|line| line.trim() == "---")
        && lines.iter().skip(1).any(|line| line.trim() == "---")
    {
        push(MarkdownFeature::Frontmatter);
    }
    if source.contains("\r\n") {
        push(MarkdownFeature::Crlf);
    }

    let mut in_fence = false;
    let mut seen_fence = false;
    let mut seen_mermaid = false;
    let mut outside_fences = String::new();
    for line in &lines {
        let trimmed = line.trim_start();
        let fence = trimmed.starts_with("```") || trimmed.starts_with("~~~");
        if fence {
            seen_fence = true;
            let info = trimmed.trim_start_matches(['`', '~']).trim();
            if info.eq_ignore_ascii_case("mermaid") {
                seen_mermaid = true;
            }
            in_fence = !in_fence;
            continue;
        }
        if !in_fence {
            outside_fences.push_str(line);
            outside_fences.push('\n');
        }
    }
    if seen_fence {
        push(MarkdownFeature::FencedCode);
    }
    if seen_mermaid {
        push(MarkdownFeature::Mermaid);
    }

    let has_table_pipe = lines.iter().any(|line| line.contains('|'));
    let has_table_rule = lines.iter().any(|line| {
        let trimmed = line.trim();
        let trimmed = trimmed.strip_prefix('|').unwrap_or(trimmed).trim();
        let trimmed = trimmed.strip_prefix(':').unwrap_or(trimmed);
        trimmed.starts_with("---")
    });
    if has_table_pipe && has_table_rule {
        push(MarkdownFeature::Table);
    }

    if lines.iter().any(|line| is_task_item(line.trim_start())) {
        push(MarkdownFeature::TaskList);
    }
    if lines.iter().any(|line| {
        let trimmed = line.trim_start();
        trimmed
            .strip_prefix(":::")
            .is_some_and(|rest| rest.chars().next().is_some_and(|c| c.is_alphabetic()))
    }) {
        push(MarkdownFeature::CustomContainer);
    }

    if contains_html_tag(&outside_fences) {
        push(MarkdownFeature::Html);
    }
    if looks_like_mdx(&outside_fences) {
        push(MarkdownFeature::Mdx);
    }
    if outside_fences.contains("](") {
        push(MarkdownFeature::Links);
    }
    if outside_fences.contains("![") {
        push(MarkdownFeature::Images);
    }
    features
}

fn is_task_item(line: &str) -> bool {
    let Some(rest) = line
        .strip_prefix("- ")
        .or_else(|| line.strip_prefix("* "))
        .or_else(|| line.strip_prefix("+ "))
    else {
        return false;
    };
    let bytes = rest.as_bytes();
    bytes.len() >= 3
        && bytes[0] == b'['
        && (bytes[1] == b' ' || bytes[1] == b'x' || bytes[1] == b'X')
        && bytes[2] == b']'
        && bytes.get(3).is_none_or(|value| value.is_ascii_whitespace())
}

fn contains_html_tag(source: &str) -> bool {
    let bytes = source.as_bytes();
    for (index, byte) in bytes.iter().enumerate() {
        if *byte != b'<' {
            continue;
        }
        let Some(next) = bytes.get(index + 1) else {
            continue;
        };
        if (next.is_ascii_alphabetic()
            || (*next == b'/' && bytes.get(index + 2).is_some_and(u8::is_ascii_alphabetic)))
            && bytes[index..].contains(&b'>')
        {
            return true;
        }
    }
    false
}

fn looks_like_mdx(source: &str) -> bool {
    source.lines().any(|line| {
        let trimmed = line.trim_start();
        trimmed.starts_with("import ") || trimmed.starts_with("export ")
    }) || source
        .as_bytes()
        .windows(2)
        .any(|pair| pair[0] == b'<' && pair[1].is_ascii_uppercase())
        || (source.contains('{') && source.contains('}'))
}

fn validate_project_id(project_id: &str) -> Result<(), AppError> {
    let parsed =
        uuid::Uuid::parse_str(project_id).map_err(|_| invalid_docs_root("invalid project ID"))?;
    if parsed.to_string() != project_id {
        return Err(invalid_docs_root("invalid project ID"));
    }
    Ok(())
}

fn invalid_docs_root(message: impl Into<String>) -> AppError {
    AppError::new(AppErrorCode::InvalidDocsRoot, message)
}

fn invalid_docs_file(message: impl Into<String>) -> AppError {
    AppError::new(AppErrorCode::InvalidDocsFile, message)
}

fn docs_manifest_error(message: impl Into<String>) -> AppError {
    AppError::new(AppErrorCode::DocsManifest, message)
}

fn docs_file_too_large() -> AppError {
    invalid_docs_file("document exceeds the supported preview size")
}

#[cfg(test)]
mod tests {
    use std::fs;

    use super::*;

    fn project_with_store_docs(
        database: &AppDatabase,
    ) -> crate::services::projects::ProjectSummary {
        crate::services::projects::ProjectService::new(database)
            .create_project("Docs policy", "")
            .expect("create project")
    }

    #[test]
    fn scan_and_read_limits_fail_loudly() {
        let data = tempfile::tempdir().expect("temporary data directory");
        let database = AppDatabase::open_in_data_dir(data.path()).expect("open database");
        let project = project_with_store_docs(&database);
        let docs_root = project.docs_root.expect("docs root");
        let docs_path = Path::new(&docs_root.path);
        fs::write(docs_path.join("first.md"), "# First\n").expect("write first document");
        fs::write(docs_path.join("second.md"), "# Second\n").expect("write second document");

        let service = DocsService::new(&database);
        let error = service
            .scan_manifest_with_limits(
                &project.id,
                DocsScanLimits {
                    max_entries: 1,
                    max_document_bytes: 64,
                    max_depth: 4,
                },
            )
            .expect_err("entry limit must fail the scan");
        assert_eq!(error.code, AppErrorCode::DocsManifest);

        let manifest = service
            .scan_manifest_with_limits(
                &project.id,
                DocsScanLimits {
                    max_entries: 10,
                    max_document_bytes: 4,
                    max_depth: 4,
                },
            )
            .expect("scan within limits");
        assert_eq!(manifest.files.len(), 2);
        assert!(manifest
            .files
            .iter()
            .all(|file| file.status == DocsFileStatus::TooLarge));
    }
}
