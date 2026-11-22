use std::io::Read;
use std::path::Path;

use sha2::{Digest, Sha256};

use crate::error::{AppError, AppErrorCode};

pub fn sha256_bytes(bytes: &[u8]) -> String {
    hex::encode(Sha256::digest(bytes))
}

pub fn sha256_file(path: &Path) -> Result<String, AppError> {
    let mut file = std::fs::File::open(path)
        .map_err(|error| AppError::io("open a file for hashing", &error))?;
    let mut hasher = Sha256::new();
    let mut buffer = [0_u8; 16 * 1024];
    loop {
        let read = file
            .read(&mut buffer)
            .map_err(|error| AppError::io("read a file for hashing", &error))?;
        if read == 0 {
            break;
        }
        hasher.update(&buffer[..read]);
    }
    Ok(hex::encode(hasher.finalize()))
}

pub(crate) fn normalize_expected_hash(value: &str) -> Result<String, AppError> {
    let normalized = value.to_ascii_lowercase();
    if normalized.len() != 64 || hex::decode(&normalized).is_err() {
        return Err(AppError::new(
            AppErrorCode::Conflict,
            "expected content hash must be a SHA-256 hexadecimal digest",
        ));
    }
    Ok(normalized)
}
