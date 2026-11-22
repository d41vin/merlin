use tauri::State;

use crate::db::AppDatabase;
use crate::error::AppError;
use crate::services::layout::PanelLayout;

pub fn load_persisted_layout(database: &AppDatabase) -> Result<Option<PanelLayout>, AppError> {
    database.load_layout()
}

pub fn store_persisted_layout(database: &AppDatabase, layout: PanelLayout) -> Result<(), AppError> {
    database.save_layout(&layout)
}

#[tauri::command]
pub fn preflight_get_layout(
    database: State<'_, AppDatabase>,
) -> Result<Option<PanelLayout>, AppError> {
    load_persisted_layout(database.inner())
}

#[tauri::command]
pub fn preflight_save_layout(
    layout: PanelLayout,
    database: State<'_, AppDatabase>,
) -> Result<(), AppError> {
    store_persisted_layout(database.inner(), layout)
}
