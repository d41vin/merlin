//! Minimal persisted replacement protocol for Phase 0, not a full Docs synchronizer.
//!
//! The driver can stop after durable stage transitions. Recovery inspects actual hashes and
//! either rolls forward safely or pauses. These deterministic stops are simulated interruptions,
//! not claims of power-loss, OS-crash, or filesystem-durability proof. Full manifests, three-way
//! reconciliation, tombstones, conflict UI, and baseline tables remain outside this prototype.

use std::fs::OpenOptions;
use std::io::Write;
use std::path::{Path, PathBuf};

use time::{format_description::well_known::Rfc3339, OffsetDateTime};
use uuid::Uuid;

use crate::db::sync::{SyncOperation, SyncSide, SyncState};
use crate::db::PreflightDatabase;
use crate::error::{PreflightError, PreflightErrorCode};
use crate::filesystem::hash::{normalize_expected_hash, sha256_file};
use crate::filesystem::path::RegisteredRoot;

#[derive(Debug, Clone)]
pub struct SyncRequest {
    pub source_side: SyncSide,
    pub destination_side: SyncSide,
    pub source_path: PathBuf,
    pub destination_path: PathBuf,
    pub baseline_hash: String,
    pub expected_source_hash: String,
    pub expected_destination_hash: String,
    pub repository_context: String,
}

/// Deterministic driver stops used by integration tests to exercise persisted recovery states.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum InterruptionPoint {
    AfterPrepared,
    AfterStaged,
    /// `replacing` is durable and the snapshot exists, but replacement has not occurred.
    AfterReplacingIntent,
    /// Replacement occurred, but post-write verification has not been persisted.
    AfterReplacement,
    AfterVerified,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SyncOutcome {
    Interrupted(InterruptionPoint),
    Committed,
    RecoveryRequired,
}

#[derive(Debug, Clone)]
pub struct SyncReport {
    pub operation: SyncOperation,
    pub outcome: SyncOutcome,
    /// Committed content does not depend on deleting a leftover internal staging file.
    pub cleanup_pending: bool,
}

pub struct SyncService<'a> {
    database: &'a PreflightDatabase,
    source_root: RegisteredRoot,
    destination_root: RegisteredRoot,
}

impl<'a> SyncService<'a> {
    pub fn new(
        database: &'a PreflightDatabase,
        source_root: RegisteredRoot,
        destination_root: RegisteredRoot,
    ) -> Self {
        Self {
            database,
            source_root,
            destination_root,
        }
    }

    pub fn execute(
        &self,
        request: &SyncRequest,
        interruption: Option<InterruptionPoint>,
    ) -> Result<SyncReport, PreflightError> {
        let mut operation = self.prepare(request)?;
        self.database.insert_sync_operation(&operation)?;
        if interruption == Some(InterruptionPoint::AfterPrepared) {
            return Ok(report(
                operation,
                SyncOutcome::Interrupted(InterruptionPoint::AfterPrepared),
            ));
        }

        operation = self.stage(operation)?;
        if operation.state == SyncState::RecoveryRequired {
            return Ok(report(operation, SyncOutcome::RecoveryRequired));
        }
        if interruption == Some(InterruptionPoint::AfterStaged) {
            return Ok(report(
                operation,
                SyncOutcome::Interrupted(InterruptionPoint::AfterStaged),
            ));
        }
        self.replace_verify_commit(operation, &request.repository_context, interruption)
    }

    /// Recover one persisted operation. Ambiguity or unavailability pauses without deleting data.
    pub fn recover(
        &self,
        operation_id: &str,
        current_repository_context: &str,
    ) -> Result<SyncReport, PreflightError> {
        let operation = self
            .database
            .get_sync_operation(operation_id)?
            .ok_or_else(|| {
                PreflightError::new(
                    PreflightErrorCode::RecoveryRequired,
                    "sync operation record is unavailable",
                )
            })?;

        if operation.state == SyncState::Committed {
            return Ok(report(operation, SyncOutcome::Committed));
        }
        if operation.state == SyncState::RecoveryRequired {
            return Ok(report(operation, SyncOutcome::RecoveryRequired));
        }
        if operation.repository_context != current_repository_context {
            return self.pause(operation);
        }

        let previous = operation.clone();
        let result = match operation.state {
            SyncState::Prepared => self.pause(operation),
            SyncState::Staged => {
                self.replace_verify_commit(operation, current_repository_context, None)
            }
            SyncState::Replacing => self.recover_replacing(operation, current_repository_context),
            SyncState::Verified => self.commit_verified(operation, current_repository_context),
            SyncState::Committed | SyncState::RecoveryRequired => unreachable!(),
        };

        match result {
            Err(error) if error.code != PreflightErrorCode::Database => self.pause(previous),
            other => other,
        }
    }

    pub fn recover_all(
        &self,
        current_repository_context: &str,
    ) -> Result<Vec<SyncReport>, PreflightError> {
        let operations = self.database.list_incomplete_sync_operations()?;
        let mut reports = Vec::with_capacity(operations.len());
        for operation in operations {
            reports.push(self.report_for_recovery(operation, current_repository_context)?);
        }
        Ok(reports)
    }

    fn report_for_recovery(
        &self,
        operation: SyncOperation,
        current_repository_context: &str,
    ) -> Result<SyncReport, PreflightError> {
        // Use the same public path so recovery_required records can never be resumed accidentally.
        self.recover(&operation.operation_id, current_repository_context)
    }

    fn prepare(&self, request: &SyncRequest) -> Result<SyncOperation, PreflightError> {
        if request.source_side == request.destination_side {
            return Err(PreflightError::conflict(
                "sync source and destination sides must differ",
            ));
        }
        if request.repository_context.is_empty()
            || request
                .repository_context
                .chars()
                .any(|character| character.is_control())
        {
            return Err(PreflightError::conflict(
                "repository context must be a nonempty, control-free identity",
            ));
        }

        let baseline_hash = normalize_expected_hash(&request.baseline_hash)?;
        let expected_source_hash = normalize_expected_hash(&request.expected_source_hash)?;
        let expected_destination_hash =
            normalize_expected_hash(&request.expected_destination_hash)?;
        if baseline_hash != expected_destination_hash {
            return Err(PreflightError::conflict(
                "prototype baseline must match the expected destination hash",
            ));
        }

        let source_path = self
            .source_root
            .resolve_existing_file(&request.source_path)?;
        let destination_path = self
            .destination_root
            .resolve_existing_file(&request.destination_path)?;
        if source_path == destination_path {
            return Err(PreflightError::conflict(
                "source and destination must be different files",
            ));
        }

        if sha256_file(&source_path)? != expected_source_hash {
            return Err(PreflightError::conflict(
                "source hash changed before sync intent was prepared",
            ));
        }
        if sha256_file(&destination_path)? != expected_destination_hash {
            return Err(PreflightError::conflict(
                "destination no longer matches the supplied baseline",
            ));
        }

        let operation_id = Uuid::new_v4().to_string();
        let parent = destination_path.parent().ok_or_else(|| {
            PreflightError::new(
                PreflightErrorCode::PathUnavailable,
                "destination has no parent directory",
            )
        })?;
        let staging_path = parent.join(format!(".merlin-preflight-{operation_id}.staged"));
        let snapshot_path = parent.join(format!(".merlin-preflight-{operation_id}.snapshot"));
        let timestamp = timestamp()?;
        Ok(SyncOperation {
            operation_id: operation_id.clone(),
            source_side: request.source_side,
            destination_side: request.destination_side,
            source_path,
            destination_path,
            staging_path,
            snapshot_path,
            baseline_hash,
            expected_source_hash: expected_source_hash.clone(),
            expected_destination_hash,
            intended_result_hash: expected_source_hash,
            repository_context: request.repository_context.clone(),
            state: SyncState::Prepared,
            created_at: timestamp.clone(),
            updated_at: timestamp,
        })
    }

    fn stage(&self, operation: SyncOperation) -> Result<SyncOperation, PreflightError> {
        self.validate_auxiliary_paths(&operation)?;
        if !self.source_and_destination_match(&operation)? {
            let operation = self.pause(operation)?.operation;
            return Ok(operation);
        }

        // Reading source bytes only for the staged write; contents are never logged or persisted in SQLite.
        let confined_source = self
            .source_root
            .resolve_existing_file(&operation.source_path)?;
        let source_bytes = std::fs::read(&confined_source)
            .map_err(|error| PreflightError::io("read the sync source", &error))?;
        if crate::filesystem::hash::sha256_bytes(&source_bytes) != operation.expected_source_hash {
            let operation = self.pause(operation)?.operation;
            return Ok(operation);
        }
        write_new_file(&operation.staging_path, &source_bytes)?;
        if !self.staging_matches(&operation)? {
            let operation = self.pause(operation)?.operation;
            return Ok(operation);
        }
        self.transition(operation, SyncState::Staged)
    }

    fn replace_verify_commit(
        &self,
        operation: SyncOperation,
        current_repository_context: &str,
        interruption: Option<InterruptionPoint>,
    ) -> Result<SyncReport, PreflightError> {
        if operation.repository_context != current_repository_context {
            return self.pause(operation);
        }
        self.validate_auxiliary_paths(&operation)?;
        if !self.source_and_destination_match(&operation)? {
            return self.pause(operation);
        }
        if !self.staging_matches(&operation)? {
            return self.pause(operation);
        }
        if !self.ensure_snapshot(&operation)? {
            return self.pause(operation);
        }

        // This durable transition and the verified recovery snapshot precede irreversible replacement.
        let operation = self.transition(operation, SyncState::Replacing)?;
        if interruption == Some(InterruptionPoint::AfterReplacingIntent) {
            return Ok(report(
                operation,
                SyncOutcome::Interrupted(InterruptionPoint::AfterReplacingIntent),
            ));
        }

        // Recheck every protected artifact after the durable transition as well as before it.
        if !self.source_and_destination_match(&operation)?
            || !self.staging_matches(&operation)?
            || !self.snapshot_matches(&operation)?
        {
            return self.pause(operation);
        }
        atomic_replace_same_directory(&operation.staging_path, &operation.destination_path)?;
        if interruption == Some(InterruptionPoint::AfterReplacement) {
            return Ok(report(
                operation,
                SyncOutcome::Interrupted(InterruptionPoint::AfterReplacement),
            ));
        }

        let operation = self.verify_replacement(operation, current_repository_context)?;
        if operation.state == SyncState::RecoveryRequired {
            return Ok(report(operation, SyncOutcome::RecoveryRequired));
        }
        if interruption == Some(InterruptionPoint::AfterVerified) {
            return Ok(report(
                operation,
                SyncOutcome::Interrupted(InterruptionPoint::AfterVerified),
            ));
        }
        self.commit_verified(operation, current_repository_context)
    }

    fn recover_replacing(
        &self,
        operation: SyncOperation,
        current_repository_context: &str,
    ) -> Result<SyncReport, PreflightError> {
        self.validate_auxiliary_paths(&operation)?;
        let destination = self
            .destination_root
            .resolve_existing_file(&operation.destination_path)?;
        let destination_hash = sha256_file(&destination)?;

        if destination_hash == operation.intended_result_hash {
            // Never commit a post-replacement state without a valid pre-write original.
            if !self.snapshot_matches(&operation)? {
                return self.pause(operation);
            }
            let operation = self.verify_replacement(operation, current_repository_context)?;
            if operation.state == SyncState::RecoveryRequired {
                return Ok(report(operation, SyncOutcome::RecoveryRequired));
            }
            return self.commit_verified(operation, current_repository_context);
        }

        if destination_hash == operation.expected_destination_hash {
            // Replacement did not occur. Revalidate source, destination, and staging before retry.
            return self.replace_verify_commit(operation, current_repository_context, None);
        }

        // A third hash is an external/unknown state. Preserve it and all internal copies.
        self.pause(operation)
    }

    fn verify_replacement(
        &self,
        operation: SyncOperation,
        current_repository_context: &str,
    ) -> Result<SyncOperation, PreflightError> {
        if operation.repository_context != current_repository_context {
            let operation = self.pause(operation)?.operation;
            return Ok(operation);
        }
        let destination = self
            .destination_root
            .resolve_existing_file(&operation.destination_path)?;
        if sha256_file(&destination)? != operation.intended_result_hash {
            let operation = self.pause(operation)?.operation;
            return Ok(operation);
        }
        if !self.snapshot_matches(&operation)? {
            let operation = self.pause(operation)?.operation;
            return Ok(operation);
        }
        self.transition(operation, SyncState::Verified)
    }

    fn commit_verified(
        &self,
        operation: SyncOperation,
        current_repository_context: &str,
    ) -> Result<SyncReport, PreflightError> {
        if operation.state != SyncState::Verified {
            return Err(PreflightError::new(
                PreflightErrorCode::RecoveryRequired,
                "only a verified operation can commit",
            ));
        }
        if operation.repository_context != current_repository_context {
            return self.pause(operation);
        }
        let destination = self
            .destination_root
            .resolve_existing_file(&operation.destination_path)?;
        if sha256_file(&destination)? != operation.intended_result_hash
            || !self.snapshot_matches(&operation)?
        {
            return self.pause(operation);
        }

        // Phase 0 commits only its durable operation result; later Docs phases add manifests/baselines.
        let operation = self.transition(operation, SyncState::Committed)?;
        let cleanup_pending = match self.staging_matches(&operation) {
            Ok(false) => true, // Preserve an unexpected file rather than deleting it as ours.
            Ok(true) => match std::fs::remove_file(&operation.staging_path) {
                Ok(()) => false,
                Err(error) if error.kind() == std::io::ErrorKind::NotFound => false,
                Err(_) => true,
            },
            Err(error) if error.code == PreflightErrorCode::PathUnavailable => false,
            Err(_) => true,
        };
        Ok(SyncReport {
            operation,
            outcome: SyncOutcome::Committed,
            cleanup_pending,
        })
    }

    fn source_and_destination_match(
        &self,
        operation: &SyncOperation,
    ) -> Result<bool, PreflightError> {
        let source = self
            .source_root
            .resolve_existing_file(&operation.source_path)?;
        let destination = self
            .destination_root
            .resolve_existing_file(&operation.destination_path)?;
        Ok(sha256_file(&source)? == operation.expected_source_hash
            && sha256_file(&destination)? == operation.expected_destination_hash)
    }

    fn ensure_snapshot(&self, operation: &SyncOperation) -> Result<bool, PreflightError> {
        match std::fs::metadata(&operation.snapshot_path) {
            Ok(_) => return self.snapshot_matches(operation),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
            Err(error) => return Err(PreflightError::io("inspect a recovery snapshot", &error)),
        }

        let confined_destination = self
            .destination_root
            .resolve_existing_file(&operation.destination_path)?;
        let destination_bytes = std::fs::read(&confined_destination)
            .map_err(|error| PreflightError::io("read the pre-write destination", &error))?;
        if crate::filesystem::hash::sha256_bytes(&destination_bytes)
            != operation.expected_destination_hash
        {
            return Ok(false);
        }
        write_new_file(&operation.snapshot_path, &destination_bytes)?;
        self.snapshot_matches(operation)
    }

    fn staging_matches(&self, operation: &SyncOperation) -> Result<bool, PreflightError> {
        let staging = self
            .destination_root
            .resolve_existing_file(&operation.staging_path)?;
        Ok(sha256_file(&staging)? == operation.intended_result_hash)
    }

    fn snapshot_matches(&self, operation: &SyncOperation) -> Result<bool, PreflightError> {
        let snapshot = self
            .destination_root
            .resolve_existing_file(&operation.snapshot_path)?;
        Ok(sha256_file(&snapshot)? == operation.expected_destination_hash)
    }

    fn validate_auxiliary_paths(&self, operation: &SyncOperation) -> Result<(), PreflightError> {
        let parent = operation.destination_path.parent().ok_or_else(|| {
            PreflightError::new(
                PreflightErrorCode::PathOutsideRoot,
                "invalid destination parent",
            )
        })?;
        let expected_stage = parent.join(format!(
            ".merlin-preflight-{}.staged",
            operation.operation_id
        ));
        let expected_snapshot = parent.join(format!(
            ".merlin-preflight-{}.snapshot",
            operation.operation_id
        ));
        if operation.staging_path != expected_stage || operation.snapshot_path != expected_snapshot
        {
            return Err(PreflightError::new(
                PreflightErrorCode::PathOutsideRoot,
                "sync auxiliary path does not match its durable operation identity",
            ));
        }
        Ok(())
    }

    fn transition(
        &self,
        mut operation: SyncOperation,
        state: SyncState,
    ) -> Result<SyncOperation, PreflightError> {
        operation.updated_at = self
            .database
            .update_sync_state(&operation.operation_id, state)?;
        operation.state = state;
        Ok(operation)
    }

    fn pause(&self, operation: SyncOperation) -> Result<SyncReport, PreflightError> {
        let operation = if operation.state == SyncState::RecoveryRequired {
            operation
        } else {
            self.transition(operation, SyncState::RecoveryRequired)?
        };
        Ok(report(operation, SyncOutcome::RecoveryRequired))
    }
}

fn report(operation: SyncOperation, outcome: SyncOutcome) -> SyncReport {
    SyncReport {
        operation,
        outcome,
        cleanup_pending: false,
    }
}

fn timestamp() -> Result<String, PreflightError> {
    OffsetDateTime::now_utc()
        .format(&Rfc3339)
        .map_err(|_| PreflightError::database())
}

fn write_new_file(path: &Path, bytes: &[u8]) -> Result<(), PreflightError> {
    let mut file = OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(path)
        .map_err(|error| {
            PreflightError::io("create an internal staging or snapshot file", &error)
        })?;
    file.write_all(bytes).map_err(|error| {
        PreflightError::io("write an internal staging or snapshot file", &error)
    })?;
    file.sync_all().map_err(|error| {
        PreflightError::io("flush an internal staging or snapshot file", &error)
    })?;
    Ok(())
}

#[cfg(windows)]
fn atomic_replace_same_directory(staging: &Path, destination: &Path) -> Result<(), PreflightError> {
    use windows::core::PCWSTR;
    use windows::Win32::Storage::FileSystem::{
        MoveFileExW, MOVEFILE_REPLACE_EXISTING, MOVEFILE_WRITE_THROUGH,
    };

    let staging_wide = wide_null(staging)?;
    let destination_wide = wide_null(destination)?;
    // SAFETY: both paths are NUL-terminated UTF-16 and live through the call. Both files are
    // generated/validated in the destination directory, so this same-volume MoveFileExW replaces
    // the destination atomically without a shell or an intermediate cross-volume copy.
    unsafe {
        MoveFileExW(
            PCWSTR(staging_wide.as_ptr()),
            PCWSTR(destination_wide.as_ptr()),
            MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH,
        )
    }
    .map_err(|_| {
        PreflightError::new(
            PreflightErrorCode::Io,
            "atomic same-directory replacement failed",
        )
    })?;
    Ok(())
}

#[cfg(not(windows))]
fn atomic_replace_same_directory(staging: &Path, destination: &Path) -> Result<(), PreflightError> {
    // std::fs::rename maps to rename(2) on supported Unix targets. Same-directory renaming replaces
    // the destination atomically there. The Windows proof above uses MoveFileExW instead.
    std::fs::rename(staging, destination)
        .map_err(|error| PreflightError::io("atomically replace the destination", &error))
}

#[cfg(windows)]
fn wide_null(path: &Path) -> Result<Vec<u16>, PreflightError> {
    use std::os::windows::ffi::OsStrExt;

    let mut wide: Vec<u16> = path.as_os_str().encode_wide().collect();
    if wide.contains(&0) {
        return Err(PreflightError::new(
            PreflightErrorCode::PathUnavailable,
            "filesystem path contains an interior NUL",
        ));
    }
    wide.push(0);
    Ok(wide)
}
