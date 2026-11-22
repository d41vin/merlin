use std::path::{Path, PathBuf};

#[cfg(feature = "test-harness")]
use std::path::Component;

use crate::error::{AppError, AppErrorCode};

pub const DATABASE_FILE_NAME: &str = "merlin.sqlite3";

#[cfg(feature = "test-harness")]
const TEST_MODE_ENV: &str = "MERLIN_TEST_MODE";
#[cfg(feature = "test-harness")]
const TEST_DATA_DIRECTORY_ENV: &str = "MERLIN_TEST_DATA_DIR";

#[cfg(not(feature = "test-harness"))]
pub fn resolve_data_directory(fallback: &Path) -> Result<PathBuf, AppError> {
    Ok(fallback.to_path_buf())
}

#[cfg(feature = "test-harness")]
pub fn resolve_data_directory(fallback: &Path) -> Result<PathBuf, AppError> {
    use std::ffi::OsStr;

    let test_mode = std::env::var_os(TEST_MODE_ENV);
    let override_directory = std::env::var_os(TEST_DATA_DIRECTORY_ENV);
    if test_mode.as_deref() != Some(OsStr::new("1")) {
        return Ok(fallback.to_path_buf());
    }

    let requested = override_directory
        .filter(|value| !value.is_empty())
        .map(PathBuf::from)
        .ok_or_else(invalid_override)?;
    validate_override_path(&requested)?;
    prepare_data_directory(&requested)
}

#[cfg(feature = "test-harness")]
fn validate_override_path(path: &Path) -> Result<(), AppError> {
    if !path.is_absolute()
        || path.file_name().is_none()
        || path
            .components()
            .any(|component| matches!(component, Component::ParentDir))
    {
        return Err(invalid_override());
    }
    Ok(())
}

pub fn prepare_data_directory(path: &Path) -> Result<PathBuf, AppError> {
    std::fs::create_dir_all(path)
        .map_err(|error| AppError::io("create the application data directory", &error))?;
    let canonical = std::fs::canonicalize(path)
        .map_err(|error| AppError::io("canonicalize the application data directory", &error))?;
    let metadata = std::fs::metadata(&canonical)
        .map_err(|error| AppError::io("inspect the application data directory", &error))?;
    if !canonical.is_absolute() || canonical.file_name().is_none() || !metadata.is_dir() {
        return Err(AppError::new(
            AppErrorCode::PathOutsideRoot,
            "application data directory is not an approved directory",
        ));
    }
    Ok(canonical)
}

pub fn database_file_in_directory(directory: &Path) -> Result<PathBuf, AppError> {
    if !directory.is_absolute() {
        return Err(AppError::new(
            AppErrorCode::PathOutsideRoot,
            "application database directory must be absolute",
        ));
    }

    let candidate = directory.join(DATABASE_FILE_NAME);
    if candidate.parent() != Some(directory) {
        return Err(AppError::new(
            AppErrorCode::PathOutsideRoot,
            "application database path escapes its data directory",
        ));
    }

    match std::fs::symlink_metadata(&candidate) {
        Ok(_) => {
            let canonical_file = std::fs::canonicalize(&candidate)
                .map_err(|error| AppError::io("canonicalize the application database", &error))?;
            let metadata = std::fs::metadata(&canonical_file)
                .map_err(|error| AppError::io("inspect the application database", &error))?;
            if canonical_file.parent() != Some(directory) || !metadata.is_file() {
                return Err(AppError::new(
                    AppErrorCode::PathOutsideRoot,
                    "application database path escapes its data directory",
                ));
            }
            Ok(canonical_file)
        }
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(candidate),
        Err(error) => Err(AppError::io("inspect the application database", &error)),
    }
}

#[cfg(feature = "test-harness")]
fn invalid_override() -> AppError {
    AppError::new(
        AppErrorCode::PathOutsideRoot,
        "test database override requires an explicit marker and validated absolute directory",
    )
}
