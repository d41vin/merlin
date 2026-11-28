#![deny(unsafe_op_in_unsafe_fn)]

#[cfg(all(feature = "production", feature = "test-harness"))]
compile_error!("test-harness cannot be enabled in a production build");

#[cfg(all(
    feature = "custom-protocol",
    not(any(feature = "production", feature = "test-harness"))
))]
compile_error!("custom-protocol builds must explicitly select production or test-harness");

#[cfg(all(
    feature = "production",
    feature = "custom-protocol",
    not(feature = "test-harness")
))]
#[used]
static PRODUCTION_PACKAGE_MARKER: &str = "MERLIN_PRODUCTION_PACKAGE_V1";

pub mod commands;
pub mod db;
pub mod error;
pub mod filesystem;
pub mod security;
pub mod services;

use db::{path::resolve_data_directory, AppDatabase};
use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let fallback = app.path().app_data_dir()?;
            let directory = resolve_data_directory(&fallback)?;
            app.manage(AppDatabase::open_in_data_dir(&directory)?);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::layout::preflight_get_layout,
            commands::layout::preflight_save_layout,
            commands::settings::settings_get,
            commands::settings::settings_set_theme,
            commands::settings::settings_set_density,
            commands::settings::settings_set_reduce_motion,
            commands::projects::projects_list,
            commands::projects::project_get,
            commands::projects::project_create,
            commands::projects::repository_connect,
            commands::projects::docs_root_detect,
            commands::projects::docs_root_confirm,
            commands::projects::docs_root_create,
            commands::projects::docs_root_skip,
        ])
        .run(tauri::generate_context!())
        .expect("Merlin encountered a fatal Tauri runtime error");
}
