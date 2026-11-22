use std::path::{Path, PathBuf};

use crate::error::{AppError, AppErrorCode};

/// An existing, canonical directory explicitly registered for Phase 0 filesystem access.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RegisteredRoot {
    canonical: PathBuf,
}

impl RegisteredRoot {
    pub fn register(path: &Path) -> Result<Self, AppError> {
        let canonical = canonicalize(path)?;
        let metadata = std::fs::metadata(&canonical)
            .map_err(|error| AppError::io("inspect the registered root", &error))?;
        if !metadata.is_dir() {
            return Err(AppError::new(
                AppErrorCode::PathOutsideRoot,
                "registered root must be an existing directory",
            ));
        }
        Ok(Self { canonical })
    }

    pub fn path(&self) -> &Path {
        &self.canonical
    }

    /// Canonicalization follows links/junctions before checking component-wise ancestry.
    pub fn resolve_existing(&self, candidate: &Path) -> Result<PathBuf, AppError> {
        let joined = if candidate.is_absolute() {
            candidate.to_path_buf()
        } else {
            self.canonical.join(candidate)
        };
        let canonical = canonicalize(&joined)?;
        if !canonical.starts_with(&self.canonical) {
            return Err(AppError::new(
                AppErrorCode::PathOutsideRoot,
                "canonical path escapes its registered root",
            ));
        }
        Ok(canonical)
    }

    pub fn resolve_existing_file(&self, candidate: &Path) -> Result<PathBuf, AppError> {
        let canonical = self.resolve_existing(candidate)?;
        let metadata = std::fs::metadata(&canonical)
            .map_err(|error| AppError::io("inspect a confined file", &error))?;
        if !metadata.is_file() {
            return Err(AppError::new(
                AppErrorCode::PathUnavailable,
                "confined path is not a regular file",
            ));
        }
        Ok(canonical)
    }
}

fn canonicalize(path: &Path) -> Result<PathBuf, AppError> {
    std::fs::canonicalize(path).map_err(|error| {
        if error.kind() == std::io::ErrorKind::NotFound {
            AppError::path_unavailable()
        } else {
            AppError::io("canonicalize a path", &error)
        }
    })
}
