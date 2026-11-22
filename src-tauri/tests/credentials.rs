use merlin::security::credentials::CredentialReference;
use uuid::Uuid;

#[test]
fn credential_reference_parser_is_strict_and_versioned() {
    let reference = CredentialReference::new_random();
    let parsed = CredentialReference::parse(reference.as_str()).expect("canonical reference");
    assert_eq!(parsed, reference);

    let non_v4 = format!("merlin-preflight:credential:{}", Uuid::nil());
    let uppercase = reference.as_str().to_ascii_uppercase();
    for invalid in [
        String::new(),
        "credential:test".to_owned(),
        "merlin-preflight:credential:not-a-uuid".to_owned(),
        non_v4,
        uppercase,
        format!("{} ", reference.as_str()),
        format!("{}/extra", reference.as_str()),
        " merlin-preflight:credential:00000000-0000-4000-8000-000000000000".to_owned(),
    ] {
        assert!(
            CredentialReference::parse(&invalid).is_err(),
            "invalid reference accepted"
        );
    }
}

#[cfg(windows)]
#[test]
fn windows_credential_manager_round_trip_keeps_synthetic_secret_out_of_sqlite() {
    use merlin::db::AppDatabase;
    use merlin::error::AppErrorCode;
    use merlin::security::credentials::{
        delete_preflight_secret, get_preflight_secret, set_preflight_secret,
    };
    use rusqlite::Connection;
    use zeroize::Zeroizing;

    struct DeleteOnDrop(CredentialReference);
    impl Drop for DeleteOnDrop {
        fn drop(&mut self) {
            let _ = delete_preflight_secret(&self.0);
        }
    }

    let directory = tempfile::tempdir().expect("temporary data directory");
    let database = AppDatabase::open_in_data_dir(directory.path()).expect("database");
    let reference = CredentialReference::new_random();
    let _guard = DeleteOnDrop(reference.clone());
    let secret = Zeroizing::new(format!(
        "synthetic-preflight-secret-{}-not-a-real-credential",
        Uuid::new_v4()
    ));

    set_preflight_secret(&reference, secret.as_str()).expect("set synthetic credential");
    let loaded = get_preflight_secret(&reference).expect("read synthetic credential");
    assert_eq!(loaded.as_str(), secret.as_str());
    drop(loaded);
    database
        .save_credential_reference_for_proof(&reference)
        .expect("persist reference only");

    let connection = Connection::open(database.file_path()).expect("inspect SQLite values");
    let mut statement = connection
        .prepare("SELECT key, value_json FROM settings")
        .expect("settings query");
    let rows = statement
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .expect("settings rows");
    let mut found_reference = false;
    for row in rows {
        let (key, value) = row.expect("settings row");
        assert!(!key.contains(secret.as_str()));
        assert!(!value.contains(secret.as_str()));
        found_reference |= value.contains(reference.as_str());
    }
    assert!(found_reference, "non-secret reference was not persisted");
    drop(statement);
    drop(connection);

    for suffix in ["", "-wal"] {
        let mut artifact = database.file_path().as_os_str().to_os_string();
        artifact.push(suffix);
        let artifact = std::path::PathBuf::from(artifact);
        if artifact.exists() {
            let bytes = std::fs::read(&artifact).expect("read SQLite proof artifact");
            assert!(!contains_bytes(&bytes, secret.as_bytes()));
        }
    }

    delete_preflight_secret(&reference).expect("delete synthetic credential");
    let error = get_preflight_secret(&reference).expect_err("deleted credential returned");
    assert_eq!(error.code, AppErrorCode::CredentialNotFound);
}

#[cfg(windows)]
fn contains_bytes(haystack: &[u8], needle: &[u8]) -> bool {
    !needle.is_empty()
        && haystack
            .windows(needle.len())
            .any(|window| window == needle)
}
