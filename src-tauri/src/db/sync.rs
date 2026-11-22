use std::path::PathBuf;

use rusqlite::Row;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SyncSide {
    Repository,
    Backup,
}

impl SyncSide {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Repository => "repository",
            Self::Backup => "backup",
        }
    }

    fn parse(value: &str) -> Option<Self> {
        match value {
            "repository" => Some(Self::Repository),
            "backup" => Some(Self::Backup),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SyncState {
    Prepared,
    Staged,
    Replacing,
    Verified,
    Committed,
    RecoveryRequired,
}

impl SyncState {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Prepared => "prepared",
            Self::Staged => "staged",
            Self::Replacing => "replacing",
            Self::Verified => "verified",
            Self::Committed => "committed",
            Self::RecoveryRequired => "recovery_required",
        }
    }

    fn parse(value: &str) -> Option<Self> {
        match value {
            "prepared" => Some(Self::Prepared),
            "staged" => Some(Self::Staged),
            "replacing" => Some(Self::Replacing),
            "verified" => Some(Self::Verified),
            "committed" => Some(Self::Committed),
            "recovery_required" => Some(Self::RecoveryRequired),
            _ => None,
        }
    }
}

/// Durable intent and recovery metadata. File contents never enter this record.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SyncOperation {
    pub operation_id: String,
    pub source_side: SyncSide,
    pub destination_side: SyncSide,
    pub source_path: PathBuf,
    pub destination_path: PathBuf,
    pub staging_path: PathBuf,
    pub snapshot_path: PathBuf,
    pub baseline_hash: String,
    pub expected_source_hash: String,
    pub expected_destination_hash: String,
    pub intended_result_hash: String,
    pub repository_context: String,
    pub state: SyncState,
    pub created_at: String,
    pub updated_at: String,
}

pub(crate) const OPERATION_COLUMNS: &str = "\
operation_id, source_side, destination_side, source_path, destination_path, \
staging_path, snapshot_path, baseline_hash, expected_source_hash, \
expected_destination_hash, intended_result_hash, repository_context, state, \
created_at, updated_at";

pub(crate) fn operation_from_row(row: &Row<'_>) -> rusqlite::Result<SyncOperation> {
    let source_side = row.get::<_, String>(1)?;
    let destination_side = row.get::<_, String>(2)?;
    let state = row.get::<_, String>(12)?;

    Ok(SyncOperation {
        operation_id: row.get(0)?,
        source_side: SyncSide::parse(&source_side).ok_or(rusqlite::Error::InvalidQuery)?,
        destination_side: SyncSide::parse(&destination_side)
            .ok_or(rusqlite::Error::InvalidQuery)?,
        source_path: PathBuf::from(row.get::<_, String>(3)?),
        destination_path: PathBuf::from(row.get::<_, String>(4)?),
        staging_path: PathBuf::from(row.get::<_, String>(5)?),
        snapshot_path: PathBuf::from(row.get::<_, String>(6)?),
        baseline_hash: row.get(7)?,
        expected_source_hash: row.get(8)?,
        expected_destination_hash: row.get(9)?,
        intended_result_hash: row.get(10)?,
        repository_context: row.get(11)?,
        state: SyncState::parse(&state).ok_or(rusqlite::Error::InvalidQuery)?,
        created_at: row.get(13)?,
        updated_at: row.get(14)?,
    })
}
