use std::fmt;
use std::str::FromStr;

use serde::Serialize;
use uuid::Uuid;
use zeroize::Zeroizing;

use crate::error::{AppError, AppErrorCode};

const REFERENCE_PREFIX: &str = "merlin-preflight:credential:";
const KEYRING_SERVICE: &str = "com.merlin.preflight";

/// A strict, non-secret reference suitable for SQLite metadata.
#[derive(Clone, PartialEq, Eq, Hash, Serialize)]
pub struct CredentialReference(String);

impl CredentialReference {
    pub fn new_random() -> Self {
        Self(format!("{REFERENCE_PREFIX}{}", Uuid::new_v4()))
    }

    pub fn parse(value: &str) -> Result<Self, AppError> {
        value.parse()
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl fmt::Debug for CredentialReference {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_tuple("CredentialReference")
            .field(&self.0)
            .finish()
    }
}

impl fmt::Display for CredentialReference {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(&self.0)
    }
}

impl FromStr for CredentialReference {
    type Err = AppError;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        let identifier = value
            .strip_prefix(REFERENCE_PREFIX)
            .ok_or_else(invalid_reference)?;
        let uuid = Uuid::parse_str(identifier).map_err(|_| invalid_reference())?;
        if uuid.get_version_num() != 4 || identifier != uuid.to_string() {
            return Err(invalid_reference());
        }
        Ok(Self(value.to_owned()))
    }
}

/// Store a synthetic or user-provided secret in the platform keyring.
/// This function is intentionally not a Tauri command.
pub fn set_preflight_secret(reference: &CredentialReference, secret: &str) -> Result<(), AppError> {
    entry(reference)?
        .set_password(secret)
        .map_err(credential_error)
}

/// Read a secret for native proof code only. Returned memory is zeroized on drop.
pub fn get_preflight_secret(
    reference: &CredentialReference,
) -> Result<Zeroizing<String>, AppError> {
    let secret = entry(reference)?.get_password().map_err(credential_error)?;
    Ok(Zeroizing::new(secret))
}

/// Delete only the exact credential identified by a validated preflight reference.
pub fn delete_preflight_secret(reference: &CredentialReference) -> Result<(), AppError> {
    entry(reference)?
        .delete_credential()
        .map_err(credential_error)
}

fn entry(reference: &CredentialReference) -> Result<keyring::Entry, AppError> {
    // Parsing again at the storage boundary keeps this check explicit even if construction changes.
    CredentialReference::parse(reference.as_str())?;
    keyring::Entry::new(KEYRING_SERVICE, reference.as_str()).map_err(credential_error)
}

fn credential_error(error: keyring::Error) -> AppError {
    let code = if matches!(error, keyring::Error::NoEntry) {
        AppErrorCode::CredentialNotFound
    } else {
        AppErrorCode::Credential
    };
    AppError::new(code, "Windows Credential Manager operation failed")
}

fn invalid_reference() -> AppError {
    AppError::new(
        AppErrorCode::InvalidCredentialReference,
        "credential reference must be merlin-preflight:credential:<canonical-v4-uuid>",
    )
}
