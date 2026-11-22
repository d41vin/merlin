use std::fs;
use std::path::PathBuf;

use merlin::db::sync::{SyncSide, SyncState};
use merlin::db::AppDatabase;
use merlin::filesystem::hash::{sha256_bytes, sha256_file};
use merlin::filesystem::path::RegisteredRoot;
use merlin::filesystem::sync::{InterruptionPoint, SyncOutcome, SyncRequest, SyncService};

const ORIGINAL: &[u8] = b"original destination bytes\n";
const CHANGED: &[u8] = b"changed source bytes\n";
const EXTERNAL: &[u8] = b"independent external destination edit\n";
const GIT_CONTEXT: &str = "branch=main;head=0123456789abcdef";

struct Fixture {
    database: AppDatabase,
    source_root: RegisteredRoot,
    destination_root: RegisteredRoot,
    request: SyncRequest,
    original_hash: String,
    changed_hash: String,
    _directory: tempfile::TempDir,
}

impl Fixture {
    fn new() -> Self {
        let directory = tempfile::tempdir().expect("temporary sync directory");
        let source_directory = directory.path().join("repository");
        let destination_directory = directory.path().join("backup");
        fs::create_dir(&source_directory).expect("source root");
        fs::create_dir(&destination_directory).expect("destination root");
        let source_path = source_directory.join("document.md");
        let destination_path = destination_directory.join("document.md");
        fs::write(&source_path, CHANGED).expect("source fixture");
        fs::write(&destination_path, ORIGINAL).expect("destination fixture");
        let original_hash = sha256_bytes(ORIGINAL);
        let changed_hash = sha256_bytes(CHANGED);
        let database = AppDatabase::open_in_data_dir(directory.path().join("data").as_path())
            .expect("sync operation database");
        let request = SyncRequest {
            source_side: SyncSide::Repository,
            destination_side: SyncSide::Backup,
            source_path,
            destination_path,
            baseline_hash: original_hash.clone(),
            expected_source_hash: changed_hash.clone(),
            expected_destination_hash: original_hash.clone(),
            repository_context: GIT_CONTEXT.to_owned(),
        };
        Self {
            source_root: RegisteredRoot::register(&source_directory).expect("source root"),
            destination_root: RegisteredRoot::register(&destination_directory)
                .expect("destination root"),
            database,
            request,
            original_hash,
            changed_hash,
            _directory: directory,
        }
    }

    fn service(&self) -> SyncService<'_> {
        SyncService::new(
            &self.database,
            self.source_root.clone(),
            self.destination_root.clone(),
        )
    }

    fn assert_source_unchanged(&self) {
        assert_eq!(
            sha256_file(&self.request.source_path).expect("source hash"),
            self.changed_hash
        );
    }
}

#[test]
fn deterministic_interruptions_at_every_stage_recover_without_losing_originals() {
    let cases = [
        (InterruptionPoint::AfterPrepared, SyncState::Prepared),
        (InterruptionPoint::AfterStaged, SyncState::Staged),
        (
            InterruptionPoint::AfterReplacingIntent,
            SyncState::Replacing,
        ),
        (InterruptionPoint::AfterReplacement, SyncState::Replacing),
        (InterruptionPoint::AfterVerified, SyncState::Verified),
    ];

    for (point, expected_state) in cases {
        let fixture = Fixture::new();
        let service = fixture.service();
        let interrupted = service
            .execute(&fixture.request, Some(point))
            .expect("stage should be reached");
        assert_eq!(interrupted.operation.state, expected_state, "{point:?}");
        assert_eq!(
            interrupted.outcome,
            SyncOutcome::Interrupted(point),
            "{point:?}"
        );
        let operation = interrupted.operation.clone();
        fixture.assert_source_unchanged();

        match point {
            InterruptionPoint::AfterPrepared => {
                assert_eq!(destination_hash(&fixture), fixture.original_hash);
                assert!(!operation.staging_path.exists());
                assert!(!operation.snapshot_path.exists());
            }
            InterruptionPoint::AfterStaged => {
                assert_eq!(destination_hash(&fixture), fixture.original_hash);
                assert_eq!(
                    sha256_file(&operation.staging_path).expect("staged hash"),
                    fixture.changed_hash
                );
                assert!(!operation.snapshot_path.exists());
            }
            InterruptionPoint::AfterReplacingIntent => {
                assert_eq!(destination_hash(&fixture), fixture.original_hash);
                assert_eq!(
                    sha256_file(&operation.staging_path).expect("staged hash"),
                    fixture.changed_hash
                );
                assert_eq!(
                    sha256_file(&operation.snapshot_path).expect("snapshot hash"),
                    fixture.original_hash
                );
            }
            InterruptionPoint::AfterReplacement | InterruptionPoint::AfterVerified => {
                assert_eq!(destination_hash(&fixture), fixture.changed_hash);
                assert!(!operation.staging_path.exists());
                assert_eq!(
                    sha256_file(&operation.snapshot_path).expect("snapshot hash"),
                    fixture.original_hash
                );
            }
        }

        let recovered = service
            .recover(&operation.operation_id, GIT_CONTEXT)
            .expect("recovery should complete or pause explicitly");
        if point == InterruptionPoint::AfterPrepared {
            assert_eq!(recovered.outcome, SyncOutcome::RecoveryRequired);
            assert_eq!(recovered.operation.state, SyncState::RecoveryRequired);
            assert_eq!(destination_hash(&fixture), fixture.original_hash);
        } else {
            assert_eq!(recovered.outcome, SyncOutcome::Committed, "{point:?}");
            assert_eq!(recovered.operation.state, SyncState::Committed, "{point:?}");
            assert!(!recovered.cleanup_pending, "{point:?}");
            assert_eq!(destination_hash(&fixture), fixture.changed_hash);
            assert_eq!(
                sha256_file(&operation.snapshot_path).expect("retained original snapshot"),
                fixture.original_hash
            );
        }
        fixture.assert_source_unchanged();
    }
}

#[test]
fn destination_changed_after_intent_pauses_and_preserves_every_available_copy() {
    let fixture = Fixture::new();
    let service = fixture.service();
    let interrupted = service
        .execute(
            &fixture.request,
            Some(InterruptionPoint::AfterReplacingIntent),
        )
        .expect("replacing intent");
    fs::write(&fixture.request.destination_path, EXTERNAL).expect("external destination edit");
    let external_hash = sha256_bytes(EXTERNAL);

    let recovered = service
        .recover(&interrupted.operation.operation_id, GIT_CONTEXT)
        .expect("ambiguous recovery pauses");
    assert_eq!(recovered.outcome, SyncOutcome::RecoveryRequired);
    assert_eq!(destination_hash(&fixture), external_hash);
    assert_eq!(
        sha256_file(&interrupted.operation.snapshot_path).expect("original snapshot"),
        fixture.original_hash
    );
    assert_eq!(
        sha256_file(&interrupted.operation.staging_path).expect("staged source copy"),
        fixture.changed_hash
    );
    fixture.assert_source_unchanged();
}

#[test]
fn repository_context_change_pauses_before_copying_or_committing() {
    let fixture = Fixture::new();
    let service = fixture.service();
    let interrupted = service
        .execute(
            &fixture.request,
            Some(InterruptionPoint::AfterReplacingIntent),
        )
        .expect("replacing intent");

    let recovered = service
        .recover(
            &interrupted.operation.operation_id,
            "branch=other;head=ffffffffffffffff",
        )
        .expect("changed context pauses");
    assert_eq!(recovered.outcome, SyncOutcome::RecoveryRequired);
    assert_eq!(destination_hash(&fixture), fixture.original_hash);
    assert_eq!(
        sha256_file(&interrupted.operation.snapshot_path).expect("snapshot"),
        fixture.original_hash
    );

    // Once paused, matching the old context later cannot silently resume propagation.
    let still_paused = service
        .recover(&interrupted.operation.operation_id, GIT_CONTEXT)
        .expect("paused record remains explicit");
    assert_eq!(still_paused.outcome, SyncOutcome::RecoveryRequired);
    assert_eq!(destination_hash(&fixture), fixture.original_hash);
}

#[test]
fn missing_source_or_destination_is_ambiguous_and_never_recreated_as_a_deletion_decision() {
    let missing_destination = Fixture::new();
    let service = missing_destination.service();
    let interrupted = service
        .execute(
            &missing_destination.request,
            Some(InterruptionPoint::AfterReplacingIntent),
        )
        .expect("replacing intent");
    fs::remove_file(&missing_destination.request.destination_path)
        .expect("simulate unavailable destination");
    let recovered = service
        .recover(&interrupted.operation.operation_id, GIT_CONTEXT)
        .expect("missing destination pauses");
    assert_eq!(recovered.outcome, SyncOutcome::RecoveryRequired);
    assert!(!missing_destination.request.destination_path.exists());
    assert_eq!(
        sha256_file(&interrupted.operation.snapshot_path).expect("original retained"),
        missing_destination.original_hash
    );
    missing_destination.assert_source_unchanged();

    let missing_source = Fixture::new();
    let service = missing_source.service();
    let interrupted = service
        .execute(
            &missing_source.request,
            Some(InterruptionPoint::AfterStaged),
        )
        .expect("staged operation");
    fs::remove_file(&missing_source.request.source_path).expect("simulate unavailable source");
    let recovered = service
        .recover(&interrupted.operation.operation_id, GIT_CONTEXT)
        .expect("missing source pauses");
    assert_eq!(recovered.outcome, SyncOutcome::RecoveryRequired);
    assert!(!missing_source.request.source_path.exists());
    assert_eq!(
        destination_hash(&missing_source),
        missing_source.original_hash
    );
    assert_eq!(
        sha256_file(&interrupted.operation.staging_path).expect("staged copy retained"),
        missing_source.changed_hash
    );
}

#[test]
fn corrupt_staging_or_changed_verified_destination_cannot_commit() {
    let corrupt_stage = Fixture::new();
    let service = corrupt_stage.service();
    let interrupted = service
        .execute(&corrupt_stage.request, Some(InterruptionPoint::AfterStaged))
        .expect("staged operation");
    fs::write(&interrupted.operation.staging_path, b"corrupt staged bytes")
        .expect("corrupt staging fixture");
    let recovered = service
        .recover(&interrupted.operation.operation_id, GIT_CONTEXT)
        .expect("bad staging pauses");
    assert_eq!(recovered.outcome, SyncOutcome::RecoveryRequired);
    assert_eq!(
        destination_hash(&corrupt_stage),
        corrupt_stage.original_hash
    );

    let changed_verified = Fixture::new();
    let service = changed_verified.service();
    let interrupted = service
        .execute(
            &changed_verified.request,
            Some(InterruptionPoint::AfterVerified),
        )
        .expect("verified operation");
    fs::write(&changed_verified.request.destination_path, EXTERNAL)
        .expect("change destination before commit");
    let recovered = service
        .recover(&interrupted.operation.operation_id, GIT_CONTEXT)
        .expect("changed verified destination pauses");
    assert_eq!(recovered.outcome, SyncOutcome::RecoveryRequired);
    assert_eq!(destination_hash(&changed_verified), sha256_bytes(EXTERNAL));
    assert_eq!(
        sha256_file(&interrupted.operation.snapshot_path).expect("original retained"),
        changed_verified.original_hash
    );
}

#[test]
fn restart_reloads_persisted_state_and_recovery_commit_is_idempotent() {
    let Fixture {
        database,
        source_root,
        destination_root,
        request,
        original_hash: _,
        changed_hash,
        _directory,
    } = Fixture::new();
    let operation_id = {
        let service = SyncService::new(&database, source_root.clone(), destination_root.clone());
        let interrupted = service
            .execute(&request, Some(InterruptionPoint::AfterStaged))
            .expect("staged operation");
        interrupted.operation.operation_id
    };
    let database_path = database.file_path().to_path_buf();
    drop(database);

    let restarted = AppDatabase::open_file(&database_path).expect("restart database");
    let service = SyncService::new(&restarted, source_root, destination_root);
    let reports = service.recover_all(GIT_CONTEXT).expect("startup recovery");
    assert_eq!(reports.len(), 1);
    assert_eq!(reports[0].outcome, SyncOutcome::Committed);
    assert_eq!(
        sha256_file(&request.destination_path).expect("destination after restart"),
        changed_hash
    );

    let committed_again = service
        .recover(&operation_id, GIT_CONTEXT)
        .expect("committed operation is idempotent");
    assert_eq!(committed_again.outcome, SyncOutcome::Committed);
    assert_eq!(committed_again.operation.state, SyncState::Committed);
}

#[test]
fn mismatched_initial_expectations_do_not_mutate_either_file() {
    let mut fixture = Fixture::new();
    fixture.request.expected_destination_hash = sha256_bytes(b"not the destination");
    let service = fixture.service();
    assert!(service.execute(&fixture.request, None).is_err());
    assert_eq!(destination_hash(&fixture), fixture.original_hash);
    fixture.assert_source_unchanged();
    assert!(fixture
        .database
        .list_incomplete_sync_operations()
        .expect("no operation")
        .is_empty());
}

fn destination_hash(fixture: &Fixture) -> String {
    sha256_file(&destination_path(fixture)).expect("destination hash")
}

fn destination_path(fixture: &Fixture) -> PathBuf {
    fixture.request.destination_path.clone()
}
