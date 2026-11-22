use serde::{Deserialize, Serialize};
use thiserror::Error;

/// Stable, content-free error codes returned by native Phase 0 proofs.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PreflightErrorCode {
    InvalidLayout,
    Database,
    Io,
    PathUnavailable,
    PathOutsideRoot,
    Conflict,
    RecoveryRequired,
    Credential,
    CredentialNotFound,
    InvalidCredentialReference,
    Crypto,
    UnsupportedPlatform,
    InvalidUrl,
    InvalidLaunch,
    ProcessLaunch,
    Watcher,
}

/// Serializable command-boundary error. Messages never contain supplied bytes or secrets.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Error)]
#[error("{message}")]
#[serde(rename_all = "camelCase")]
pub struct PreflightError {
    pub code: PreflightErrorCode,
    pub message: String,
}

impl PreflightError {
    pub(crate) fn new(code: PreflightErrorCode, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
        }
    }

    pub(crate) fn database() -> Self {
        Self::new(PreflightErrorCode::Database, "SQLite operation failed")
    }

    pub(crate) fn io(action: &str, error: &std::io::Error) -> Self {
        if error.kind() == std::io::ErrorKind::NotFound {
            return Self::path_unavailable();
        }

        Self::new(
            PreflightErrorCode::Io,
            format!("filesystem operation failed while attempting to {action}"),
        )
    }

    pub(crate) fn path_unavailable() -> Self {
        Self::new(
            PreflightErrorCode::PathUnavailable,
            "path is unavailable; absence does not establish deletion",
        )
    }

    pub(crate) fn conflict(message: &str) -> Self {
        Self::new(PreflightErrorCode::Conflict, message)
    }

    pub(crate) fn crypto(message: &str) -> Self {
        Self::new(PreflightErrorCode::Crypto, message)
    }
}

impl From<rusqlite::Error> for PreflightError {
    fn from(_: rusqlite::Error) -> Self {
        Self::database()
    }
}

impl From<serde_json::Error> for PreflightError {
    fn from(_: serde_json::Error) -> Self {
        Self::new(PreflightErrorCode::Database, "stored JSON is invalid")
    }
}
