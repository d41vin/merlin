use std::path::{Path, PathBuf};

use crate::error::{PreflightError, PreflightErrorCode};

/// An existing, canonical directory explicitly registered for Phase 0 filesystem access.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RegisteredRoot {
    canonical: PathBuf,
}

impl RegisteredRoot {
    pub fn register(path: &Path) -> Result<Self, PreflightError> {
        let canonical = canonicalize(path)?;
        let metadata = std::fs::metadata(&canonical)
            .map_err(|error| PreflightError::io("inspect the registered root", &error))?;
        if !metadata.is_dir() {
            return Err(PreflightError::new(
                PreflightErrorCode::PathOutsideRoot,
                "registered root must be an existing directory",
            ));
        }
        Ok(Self { canonical })
    }

    pub fn path(&self) -> &Path {
        &self.canonical
    }

    /// Canonicalization follows links/junctions before checking component-wise ancestry.
    pub fn resolve_existing(&self, candidate: &Path) -> Result<PathBuf, PreflightError> {
        let joined = if candidate.is_absolute() {
            candidate.to_path_buf()
        } else {
            self.canonical.join(candidate)
        };
        let canonical = canonicalize(&joined)?;
        if !canonical.starts_with(&self.canonical) {
            return Err(PreflightError::new(
                PreflightErrorCode::PathOutsideRoot,
                "canonical path escapes its registered root",
            ));
        }
        Ok(canonical)
    }

    pub fn resolve_existing_file(&self, candidate: &Path) -> Result<PathBuf, PreflightError> {
        let canonical = self.resolve_existing(candidate)?;
        let metadata = std::fs::metadata(&canonical)
            .map_err(|error| PreflightError::io("inspect a confined file", &error))?;
        if !metadata.is_file() {
            return Err(PreflightError::new(
                PreflightErrorCode::PathUnavailable,
                "confined path is not a regular file",
            ));
        }
        Ok(canonical)
    }
}

fn canonicalize(path: &Path) -> Result<PathBuf, PreflightError> {
    std::fs::canonicalize(path).map_err(|error| {
        if error.kind() == std::io::ErrorKind::NotFound {
            PreflightError::path_unavailable()
        } else {
            PreflightError::io("canonicalize a path", &error)
        }
    })
}
