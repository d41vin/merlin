#![deny(unsafe_op_in_unsafe_fn)]

pub mod commands;
pub mod db;
pub mod error;
pub mod filesystem;
pub mod security;
pub mod services;

use db::{resolve_data_directory, PreflightDatabase};
use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let fallback = app.path().app_data_dir()?;
            let directory = resolve_data_directory(&fallback);
            app.manage(PreflightDatabase::open_in_data_dir(&directory)?);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::layout::preflight_get_layout,
            commands::layout::preflight_save_layout,
        ])
        .run(tauri::generate_context!())
        .expect("Merlin Preflight encountered a fatal Tauri runtime error");
}
