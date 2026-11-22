use std::fs;
use std::time::Duration;

use merlin_preflight::error::PreflightErrorCode;
use merlin_preflight::filesystem::path::RegisteredRoot;
use merlin_preflight::filesystem::watcher::{classify_notification, RootWatcher, WatchHint};

#[test]
fn registered_root_rejects_traversal_and_reports_missing_as_unavailable() {
    let directory = tempfile::tempdir().expect("temporary directory");
    let root_path = directory.path().join("root");
    let outside_path = directory.path().join("outside.txt");
    fs::create_dir(&root_path).expect("root");
    fs::write(&outside_path, b"outside").expect("outside fixture");
    let root = RegisteredRoot::register(&root_path).expect("registered root");

    let error = root
        .resolve_existing(&outside_path)
        .expect_err("outside path accepted");
    assert_eq!(error.code, PreflightErrorCode::PathOutsideRoot);

    let missing = root
        .resolve_existing_file(std::path::Path::new("missing.md"))
        .expect_err("missing file accepted");
    assert_eq!(missing.code, PreflightErrorCode::PathUnavailable);
    assert!(missing.message.contains("does not establish deletion"));
}

#[test]
fn recursive_watcher_emits_reconciliation_hints_and_errors_are_not_event_truth() {
    let directory = tempfile::tempdir().expect("temporary directory");
    let root = RegisteredRoot::register(directory.path()).expect("registered root");
    let watcher = RootWatcher::watch_recursive(&root).expect("recursive watcher");

    fs::create_dir(directory.path().join("nested")).expect("watched filesystem change");
    let hint = watcher
        .recv_timeout(Duration::from_secs(10))
        .expect("watcher did not emit a hint");
    assert_eq!(hint, WatchHint::EventReceived);

    let injected_error = notify::Error::new(notify::ErrorKind::Generic(
        "synthetic watcher interruption".to_owned(),
    ));
    assert_eq!(
        classify_notification(Err(injected_error)),
        WatchHint::WatcherError
    );
}

#[cfg(any(unix, windows))]
#[test]
fn existing_symlink_escape_is_rejected_when_the_os_permits_the_fixture() {
    let directory = tempfile::tempdir().expect("temporary directory");
    let root_path = directory.path().join("root");
    let outside_path = directory.path().join("outside.txt");
    fs::create_dir(&root_path).expect("root");
    fs::write(&outside_path, b"outside").expect("outside fixture");
    let link_path = root_path.join("link.txt");

    #[cfg(unix)]
    let link_result = std::os::unix::fs::symlink(&outside_path, &link_path);
    #[cfg(windows)]
    let link_result = std::os::windows::fs::symlink_file(&outside_path, &link_path);

    if link_result.is_err() {
        eprintln!("symlink escape fixture skipped because the OS denied symlink creation");
        return;
    }
    let root = RegisteredRoot::register(&root_path).expect("registered root");
    let error = root
        .resolve_existing_file(&link_path)
        .expect_err("escaping symlink accepted");
    assert_eq!(error.code, PreflightErrorCode::PathOutsideRoot);
}
