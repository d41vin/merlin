use serde::{de::Error as _, Deserialize, Deserializer};
use tauri::State;

use crate::db::AppDatabase;
use crate::error::AppError;
use crate::services::settings::{ApplicationSettingsSnapshot, SettingsService};

#[derive(Debug)]
pub struct ContentFreeString(String);

impl<'de> Deserialize<'de> for ContentFreeString {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        String::deserialize(deserializer)
            .map(Self)
            .map_err(|_| D::Error::custom("settings value must be a string"))
    }
}

#[derive(Debug)]
pub struct ContentFreeBool(bool);

impl<'de> Deserialize<'de> for ContentFreeBool {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        bool::deserialize(deserializer)
            .map(Self)
            .map_err(|_| D::Error::custom("reduced-motion setting must be a boolean"))
    }
}

pub fn load_application_settings(
    database: &AppDatabase,
) -> Result<ApplicationSettingsSnapshot, AppError> {
    SettingsService::new(database).load()
}

pub fn store_application_theme(
    database: &AppDatabase,
    theme: &str,
) -> Result<ApplicationSettingsSnapshot, AppError> {
    SettingsService::new(database).set_theme(theme)
}

pub fn store_application_density(
    database: &AppDatabase,
    density: &str,
) -> Result<ApplicationSettingsSnapshot, AppError> {
    SettingsService::new(database).set_density(density)
}

pub fn store_application_reduced_motion(
    database: &AppDatabase,
    force_reduced_motion: bool,
) -> Result<ApplicationSettingsSnapshot, AppError> {
    SettingsService::new(database).set_force_reduced_motion(force_reduced_motion)
}

#[tauri::command]
pub fn settings_get(
    database: State<'_, AppDatabase>,
) -> Result<ApplicationSettingsSnapshot, AppError> {
    load_application_settings(database.inner())
}

#[tauri::command]
pub fn settings_set_theme(
    theme: ContentFreeString,
    database: State<'_, AppDatabase>,
) -> Result<ApplicationSettingsSnapshot, AppError> {
    store_application_theme(database.inner(), &theme.0)
}

#[tauri::command]
pub fn settings_set_density(
    density: ContentFreeString,
    database: State<'_, AppDatabase>,
) -> Result<ApplicationSettingsSnapshot, AppError> {
    store_application_density(database.inner(), &density.0)
}

#[tauri::command]
pub fn settings_set_reduce_motion(
    force_reduced_motion: ContentFreeBool,
    database: State<'_, AppDatabase>,
) -> Result<ApplicationSettingsSnapshot, AppError> {
    store_application_reduced_motion(database.inner(), force_reduced_motion.0)
}
