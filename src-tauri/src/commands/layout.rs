use tauri::State;

use crate::db::PreflightDatabase;
use crate::error::PreflightError;
use crate::services::layout::PanelLayout;

pub fn load_persisted_layout(
    database: &PreflightDatabase,
) -> Result<Option<PanelLayout>, PreflightError> {
    database.load_layout()
}

pub fn store_persisted_layout(
    database: &PreflightDatabase,
    layout: PanelLayout,
) -> Result<(), PreflightError> {
    database.save_layout(&layout)
}

#[tauri::command]
pub fn preflight_get_layout(
    database: State<'_, PreflightDatabase>,
) -> Result<Option<PanelLayout>, PreflightError> {
    load_persisted_layout(database.inner())
}

#[tauri::command]
pub fn preflight_save_layout(
    layout: PanelLayout,
    database: State<'_, PreflightDatabase>,
) -> Result<(), PreflightError> {
    store_persisted_layout(database.inner(), layout)
}
