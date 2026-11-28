use tauri::State;

use crate::commands::settings::ContentFreeString;
use crate::db::AppDatabase;
use crate::error::AppError;
use crate::services::docs::{DocsDocument, DocsManifest, DocsService};

pub fn get_manifest(database: &AppDatabase, project_id: &str) -> Result<DocsManifest, AppError> {
    DocsService::new(database).get_manifest(project_id)
}

pub fn scan_manifest(database: &AppDatabase, project_id: &str) -> Result<DocsManifest, AppError> {
    DocsService::new(database).scan_manifest(project_id)
}

pub fn read_document(
    database: &AppDatabase,
    project_id: &str,
    relative_path: &str,
) -> Result<DocsDocument, AppError> {
    DocsService::new(database).read_document(project_id, relative_path)
}

#[tauri::command]
pub fn docs_manifest_get(
    project_id: ContentFreeString,
    database: State<'_, AppDatabase>,
) -> Result<DocsManifest, AppError> {
    get_manifest(database.inner(), &project_id.0)
}

#[tauri::command]
pub fn docs_manifest_scan(
    project_id: ContentFreeString,
    database: State<'_, AppDatabase>,
) -> Result<DocsManifest, AppError> {
    scan_manifest(database.inner(), &project_id.0)
}

#[tauri::command]
pub fn docs_document_read(
    project_id: ContentFreeString,
    relative_path: ContentFreeString,
    database: State<'_, AppDatabase>,
) -> Result<DocsDocument, AppError> {
    read_document(database.inner(), &project_id.0, &relative_path.0)
}
