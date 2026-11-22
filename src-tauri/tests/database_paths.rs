use std::ffi::OsString;
use std::path::Path;
use std::sync::{Mutex, MutexGuard};

use merlin::db::path::resolve_data_directory;
use merlin::db::AppDatabase;

const TEST_MODE: &str = "MERLIN_TEST_MODE";
const TEST_DATA_DIRECTORY: &str = "MERLIN_TEST_DATA_DIR";
const LEGACY_DATA_DIRECTORY: &str = "MERLIN_PREFLIGHT_DATA_DIR";
const ENVIRONMENT_KEYS: [&str; 3] = [TEST_MODE, TEST_DATA_DIRECTORY, LEGACY_DATA_DIRECTORY];
static ENVIRONMENT_LOCK: Mutex<()> = Mutex::new(());

struct EnvironmentOverride {
    previous: Vec<(&'static str, Option<OsString>)>,
    _lock: MutexGuard<'static, ()>,
}

impl EnvironmentOverride {
    fn new(changes: &[(&'static str, Option<&str>)]) -> Self {
        let lock = ENVIRONMENT_LOCK.lock().expect("environment lock");
        let previous = ENVIRONMENT_KEYS
            .iter()
            .map(|key| (*key, std::env::var_os(key)))
            .collect();
        for key in ENVIRONMENT_KEYS {
            let value = changes
                .iter()
                .find_map(|(candidate, value)| (*candidate == key).then_some(*value))
                .flatten();
            apply_environment_value(key, value.map(std::ffi::OsStr::new));
        }
        Self {
            previous,
            _lock: lock,
        }
    }
}

impl Drop for EnvironmentOverride {
    fn drop(&mut self) {
        for (key, value) in self.previous.drain(..) {
            apply_environment_value(key, value.as_deref());
        }
    }
}

fn apply_environment_value(key: &str, value: Option<&std::ffi::OsStr>) {
    // SAFETY: callers hold the process-wide test environment lock.
    unsafe {
        match value {
            Some(value) => std::env::set_var(key, value),
            None => std::env::remove_var(key),
        }
    }
}

fn path_value(path: &Path) -> &str {
    path.as_os_str().to_str().expect("UTF-8 test path")
}

#[test]
fn legacy_preflight_database_is_not_discovered_or_modified() {
    let directory = tempfile::tempdir().expect("temporary directory");
    let legacy_path = directory.path().join("preflight.sqlite3");
    let legacy_contents = b"legacy preflight database sentinel";
    std::fs::write(&legacy_path, legacy_contents).expect("legacy database fixture");

    let database = AppDatabase::open_in_data_dir(directory.path()).expect("open current database");
    assert_eq!(
        database.file_path().file_name(),
        Some(std::ffi::OsStr::new("merlin.sqlite3"))
    );
    assert!(database.file_path().is_file());
    assert_eq!(
        std::fs::read(&legacy_path).expect("legacy database remains readable"),
        legacy_contents
    );
}

#[cfg(not(feature = "test-harness"))]
#[test]
fn production_resolver_cannot_be_redirected_by_environment_variables() {
    let directory = tempfile::tempdir().expect("temporary directory");
    let fallback = directory.path().join("production-data");
    let attempted = directory.path().join("attempted-override");
    let legacy_attempted = directory.path().join("legacy-override");
    let _environment = EnvironmentOverride::new(&[
        (TEST_MODE, Some("1")),
        (TEST_DATA_DIRECTORY, Some(path_value(&attempted))),
        (LEGACY_DATA_DIRECTORY, Some(path_value(&legacy_attempted))),
    ]);

    let resolved = resolve_data_directory(&fallback).expect("production path resolution");
    assert_eq!(resolved, fallback);
    assert!(!attempted.exists());
    assert!(!legacy_attempted.exists());
    assert!(!fallback.join("merlin.sqlite3").exists());

    let database = AppDatabase::open_in_data_dir(&resolved).expect("open production database");
    let canonical_fallback =
        std::fs::canonicalize(&fallback).expect("canonical production directory");
    assert_eq!(
        database.file_path().parent(),
        Some(canonical_fallback.as_path())
    );
    assert!(database.file_path().starts_with(&canonical_fallback));
    assert!(!attempted.exists());
    assert!(!legacy_attempted.exists());
}

#[cfg(feature = "test-harness")]
#[test]
fn harness_requires_an_explicit_marker_and_rejects_invalid_override_paths() {
    let directory = tempfile::tempdir().expect("temporary directory");
    let fallback = directory.path().join("fallback");
    let attempted = directory.path().join("attempted");
    let attempted_literal = path_value(&attempted);

    for mode in [None, Some("0"), Some("true")] {
        let _environment = EnvironmentOverride::new(&[
            (TEST_MODE, mode),
            (TEST_DATA_DIRECTORY, Some(attempted_literal)),
        ]);
        let resolved = resolve_data_directory(&fallback).expect("unmarked override is ignored");
        assert_eq!(resolved, fallback);
        assert!(!attempted.exists());
    }

    let rejected = [
        (Some("1"), None),
        (Some("1"), Some("")),
        (Some("1"), Some("relative-data")),
        (Some("1"), Some("C:drive-relative")),
        (Some("1"), Some(path_value(Path::new("\\")))),
        (Some("1"), Some("C:\\invalid\\..\\override")),
        (Some("1"), Some("/invalid/../override")),
    ];
    for (mode, override_path) in rejected {
        let _environment =
            EnvironmentOverride::new(&[(TEST_MODE, mode), (TEST_DATA_DIRECTORY, override_path)]);
        resolve_data_directory(&fallback).expect_err("invalid override was accepted");
    }
}

#[cfg(feature = "test-harness")]
#[test]
fn harness_canonicalizes_the_approved_directory_and_confines_the_database_file() {
    let directory = tempfile::tempdir().expect("temporary directory");
    let requested = directory.path().join("nested").join("approved-data");
    let _environment = EnvironmentOverride::new(&[
        (TEST_MODE, Some("1")),
        (TEST_DATA_DIRECTORY, Some(path_value(&requested))),
    ]);

    let resolved = resolve_data_directory(directory.path()).expect("approved override");
    assert!(resolved.is_absolute());
    assert_eq!(
        resolved,
        std::fs::canonicalize(&requested).expect("canonical approved directory")
    );
    assert!(!resolved.join("merlin.sqlite3").exists());

    let database = AppDatabase::open_in_data_dir(&resolved).expect("open canonical database");
    assert_eq!(database.file_path().parent(), Some(resolved.as_path()));
    assert!(database.file_path().starts_with(&resolved));
    assert_eq!(
        database
            .file_path()
            .file_name()
            .and_then(|name| name.to_str()),
        Some("merlin.sqlite3")
    );
    assert!(database.file_path().is_file());
}

#[cfg(all(feature = "test-harness", windows))]
#[test]
fn an_existing_database_symlink_cannot_escape_the_approved_directory() {
    let directory = tempfile::tempdir().expect("temporary directory");
    let approved = directory.path().join("approved");
    let outside = directory.path().join("outside.sqlite3");
    std::fs::create_dir(&approved).expect("approved directory");
    std::fs::write(&outside, b"outside fixture").expect("outside database fixture");
    let link = approved.join("merlin.sqlite3");
    std::os::windows::fs::symlink_file(&outside, &link)
        .expect("database symlink confinement requires symlink creation permission");

    let error = match AppDatabase::open_in_data_dir(&approved) {
        Ok(_) => panic!("escaping database was opened"),
        Err(error) => error,
    };
    assert_eq!(error.code, merlin::error::AppErrorCode::PathOutsideRoot);
    assert!(outside.exists());
}

#[cfg(feature = "test-harness")]
#[test]
fn harness_does_not_honor_the_legacy_override_name() {
    let directory = tempfile::tempdir().expect("temporary directory");
    let fallback = directory.path().join("fallback");
    let legacy = directory.path().join("legacy");
    let _environment = EnvironmentOverride::new(&[
        (TEST_MODE, None),
        (LEGACY_DATA_DIRECTORY, Some(path_value(&legacy))),
    ]);

    let resolved = resolve_data_directory(&fallback).expect("legacy value is ignored");
    assert_eq!(resolved, fallback);
    assert!(!legacy.exists());
}
