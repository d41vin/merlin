use merlin::commands::layout::{load_persisted_layout, store_persisted_layout};
use merlin::commands::settings::{
    load_application_settings, store_application_density, store_application_reduced_motion,
    store_application_theme, ContentFreeBool, ContentFreeString,
};
use merlin::db::AppDatabase;
use merlin::error::AppErrorCode;
use merlin::services::layout::{PanelLayout, PanelState};
use merlin::services::settings::{
    ApplicationSettingsSnapshot, Density, ThemeSlug, APPLICATION_SETTINGS_VERSION,
};
use refinery::Target;
use rusqlite::{params, Connection};
use serde_json::json;

mod embedded {
    use refinery::embed_migrations;
    embed_migrations!("migrations");
}

const LAYOUT_KEY: &str = "preflight.panel_layout.v1";
const LAYOUT_JSON: &str = r#"{"version":1,"panels":[{"id":"docs","size":40,"restoreSize":40,"collapsed":false},{"id":"todos","size":0,"restoreSize":20,"collapsed":true},{"id":"activity","size":35,"restoreSize":35,"collapsed":false},{"id":"resources","size":25,"restoreSize":25,"collapsed":false}]}"#;
const CREDENTIAL_PROOF_KEY: &str = "preflight.credential_reference_proof";
const CREDENTIAL_PROOF_JSON: &str =
    r#"{"credentialReference":"merlin-preflight:credential:4c0f28ee-2cb2-4fa3-a1ad-f1b1ba0bbf7e"}"#;

fn valid_layout() -> PanelLayout {
    PanelLayout {
        version: 1,
        panels: vec![
            PanelState {
                id: "docs".to_owned(),
                size: 40.0,
                restore_size: 40.0,
                collapsed: false,
            },
            PanelState {
                id: "todos".to_owned(),
                size: 0.0,
                restore_size: 20.0,
                collapsed: true,
            },
            PanelState {
                id: "activity".to_owned(),
                size: 35.0,
                restore_size: 35.0,
                collapsed: false,
            },
            PanelState {
                id: "resources".to_owned(),
                size: 25.0,
                restore_size: 25.0,
                collapsed: false,
            },
        ],
    }
}

#[test]
fn v1_database_upgrades_to_v2_without_changing_existing_data() {
    let directory = tempfile::tempdir().expect("temporary data directory");
    let database_path = directory.path().join("merlin.sqlite3");

    let v1_history = {
        let mut connection = Connection::open(&database_path).expect("open V1 fixture");
        embedded::migrations::runner()
            .set_target(Target::Version(1))
            .run(&mut connection)
            .expect("apply only V1 through Refinery");
        connection
            .execute(
                "INSERT INTO settings (key, value_json, updated_at) VALUES (?1, ?2, ?3)",
                params![LAYOUT_KEY, LAYOUT_JSON, "2026-01-02T03:04:05Z"],
            )
            .expect("insert V1 layout");
        connection
            .execute(
                "INSERT INTO settings (key, value_json, updated_at) VALUES (?1, ?2, ?3)",
                params![
                    CREDENTIAL_PROOF_KEY,
                    CREDENTIAL_PROOF_JSON,
                    "2026-01-02T03:04:06Z"
                ],
            )
            .expect("insert V1 credential-reference proof metadata");
        connection
            .execute(
                "INSERT INTO sync_operations (\
                    operation_id, source_side, destination_side, source_path, destination_path, \
                    staging_path, snapshot_path, baseline_hash, expected_source_hash, \
                    expected_destination_hash, intended_result_hash, repository_context, state, \
                    created_at, updated_at\
                 ) VALUES (?1, 'repository', 'backup', ?2, ?3, ?4, ?5, ?6, ?6, ?6, ?6, \
                    ?7, 'prepared', ?8, ?8)",
                params![
                    "4c0f28ee-2cb2-4fa3-a1ad-f1b1ba0bbf7e",
                    "C:\\repo\\README.md",
                    "C:\\backup\\README.md",
                    "C:\\backup\\.README.staged",
                    "C:\\backup\\.README.snapshot",
                    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
                    "main@0123456789abcdef",
                    "2026-01-02T03:04:05Z",
                ],
            )
            .expect("insert V1 sync operation");
        let history = connection
            .query_row(
                "SELECT version, name, applied_on, checksum FROM refinery_schema_history",
                [],
                |row| {
                    Ok((
                        row.get::<_, i64>(0)?,
                        row.get::<_, String>(1)?,
                        row.get::<_, String>(2)?,
                        row.get::<_, String>(3)?,
                    ))
                },
            )
            .expect("inspect V1 migration history");
        assert_eq!(history.0, 1);
        history
    };

    let database = AppDatabase::open_file(&database_path).expect("upgrade fixture through app");
    assert_eq!(
        load_persisted_layout(&database).expect("load preserved V1 layout"),
        Some(valid_layout())
    );
    drop(database);

    let connection = Connection::open(&database_path).expect("inspect upgraded fixture");
    let migration_count: i64 = connection
        .query_row("SELECT count(*) FROM refinery_schema_history", [], |row| {
            row.get(0)
        })
        .expect("count migrations");
    assert_eq!(migration_count, 2);
    let current_v1_history = connection
        .query_row(
            "SELECT version, name, applied_on, checksum FROM refinery_schema_history WHERE version = 1",
            [],
            |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, String>(3)?,
                ))
            },
        )
        .expect("inspect preserved V1 history");
    assert_eq!(current_v1_history, v1_history);

    let layout = connection
        .query_row(
            "SELECT value_json, updated_at FROM settings WHERE key = ?1",
            params![LAYOUT_KEY],
            |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)),
        )
        .expect("read preserved layout row");
    assert_eq!(
        layout,
        (LAYOUT_JSON.to_owned(), "2026-01-02T03:04:05Z".to_owned())
    );
    let credential_proof = connection
        .query_row(
            "SELECT value_json, updated_at FROM settings WHERE key = ?1",
            params![CREDENTIAL_PROOF_KEY],
            |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)),
        )
        .expect("read preserved credential-reference proof row");
    assert_eq!(
        credential_proof,
        (
            CREDENTIAL_PROOF_JSON.to_owned(),
            "2026-01-02T03:04:06Z".to_owned()
        )
    );

    let sync_count: i64 = connection
        .query_row("SELECT count(*) FROM sync_operations", [], |row| row.get(0))
        .expect("read preserved sync metadata");
    assert_eq!(sync_count, 1);

    for (key, expected) in [
        ("app.theme_slug.v1", r#""merlin-dark""#),
        ("app.density.v1", r#""default""#),
        ("app.accessibility.force_reduced_motion.v1", "false"),
    ] {
        let stored: String = connection
            .query_row(
                "SELECT value_json FROM settings WHERE key = ?1",
                params![key],
                |row| row.get(0),
            )
            .expect("read seeded production setting");
        assert_eq!(stored, expected);
    }
}

#[test]
fn v2_reopen_is_idempotent_and_preserves_existing_rows() {
    let directory = tempfile::tempdir().expect("temporary data directory");
    let database = AppDatabase::open_in_data_dir(directory.path()).expect("create V2 database");
    let connection = Connection::open(database.file_path()).expect("inspect fresh rows");
    let defaults = connection
        .query_row(
            "SELECT value_json, updated_at FROM settings WHERE key = 'app.density.v1'",
            [],
            |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)),
        )
        .expect("read default density");
    drop(connection);
    drop(database);

    let database = AppDatabase::open_in_data_dir(directory.path()).expect("idempotent reopen");
    let connection = Connection::open(database.file_path()).expect("inspect reopened rows");
    let migration_count: i64 = connection
        .query_row("SELECT count(*) FROM refinery_schema_history", [], |row| {
            row.get(0)
        })
        .expect("count migrations after reopen");
    assert_eq!(migration_count, 2);
    let reopened = connection
        .query_row(
            "SELECT value_json, updated_at FROM settings WHERE key = 'app.density.v1'",
            [],
            |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)),
        )
        .expect("read reopened density");
    assert_eq!(reopened, defaults);
}

#[test]
fn typed_settings_round_trip_survives_reopen_and_uses_camel_case_ipc() {
    let directory = tempfile::tempdir().expect("temporary data directory");
    let database = AppDatabase::open_in_data_dir(directory.path()).expect("open database");
    let initial = load_application_settings(&database).expect("load defaults");
    assert_eq!(initial, ApplicationSettingsSnapshot::default());

    let compact = store_application_density(&database, "compact").expect("save compact density");
    assert_eq!(compact.density, Density::Compact);
    let reduced = store_application_reduced_motion(&database, true).expect("save reduced motion");
    assert!(reduced.force_reduced_motion);
    let themed = store_application_theme(&database, "merlin-dark").expect("save bundled theme");
    assert_eq!(themed.theme_slug, ThemeSlug::MerlinDark);
    assert!(!themed.used_defaults);

    let serialized = serde_json::to_value(themed).expect("serialize IPC snapshot");
    assert_eq!(
        serialized,
        json!({
            "version": APPLICATION_SETTINGS_VERSION,
            "themeSlug": "merlin-dark",
            "density": "compact",
            "forceReducedMotion": true,
            "usedDefaults": false,
        })
    );
    drop(database);

    let database = AppDatabase::open_in_data_dir(directory.path()).expect("reopen database");
    let restored = load_application_settings(&database).expect("load persisted settings");
    assert_eq!(restored.density, Density::Compact);
    assert!(restored.force_reduced_motion);
    assert!(!restored.used_defaults);
}

#[test]
fn individual_setting_writes_leave_layout_persistence_untouched() {
    let directory = tempfile::tempdir().expect("temporary data directory");
    let database = AppDatabase::open_in_data_dir(directory.path()).expect("open database");
    store_persisted_layout(&database, valid_layout()).expect("save layout");

    let before = {
        let connection = Connection::open(database.file_path()).expect("inspect layout");
        connection
            .query_row(
                "SELECT value_json, updated_at FROM settings WHERE key = ?1",
                params![LAYOUT_KEY],
                |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)),
            )
            .expect("read layout row")
    };

    store_application_density(&database, "compact").expect("save density");
    store_application_reduced_motion(&database, true).expect("save motion");
    store_application_theme(&database, "merlin-dark").expect("save theme");
    assert_eq!(
        load_persisted_layout(&database).expect("load independent layout"),
        Some(valid_layout())
    );

    let after = {
        let connection = Connection::open(database.file_path()).expect("inspect layout");
        connection
            .query_row(
                "SELECT value_json, updated_at FROM settings WHERE key = ?1",
                params![LAYOUT_KEY],
                |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)),
            )
            .expect("read unchanged layout row")
    };
    assert_eq!(after, before);
}

#[test]
fn invalid_updates_are_content_free_and_preserve_last_valid_settings() {
    let canary = "sk-test-DO-NOT-REFLECT-'; DROP TABLE settings; --";
    let directory = tempfile::tempdir().expect("temporary data directory");
    let database = AppDatabase::open_in_data_dir(directory.path()).expect("open database");
    store_application_density(&database, "compact").expect("save baseline density");

    for error in [
        store_application_theme(&database, canary).expect_err("invalid theme accepted"),
        store_application_density(&database, canary).expect_err("invalid density accepted"),
    ] {
        assert_eq!(error.code, AppErrorCode::InvalidSettings);
        let serialized = serde_json::to_string(&error).expect("serialize error");
        assert!(!serialized.contains(canary));
        assert!(!format!("{error:?}").contains(canary));
        assert!(!error.to_string().contains(canary));
        assert_eq!(
            serialized,
            format!(
                r#"{{"code":"invalid_settings","message":"{}"}}"#,
                error.message
            )
        );
    }

    let string_error = serde_json::from_value::<ContentFreeString>(json!({ "secret": canary }))
        .expect_err("wrong string input type accepted");
    assert!(!string_error.to_string().contains(canary));
    assert_eq!(string_error.to_string(), "settings value must be a string");
    let bool_error = serde_json::from_value::<ContentFreeBool>(json!(canary))
        .expect_err("wrong boolean input type accepted");
    assert!(!bool_error.to_string().contains(canary));
    assert_eq!(
        bool_error.to_string(),
        "reduced-motion setting must be a boolean"
    );

    let current = load_application_settings(&database).expect("load preserved settings");
    assert_eq!(current.density, Density::Compact);
    let connection = Connection::open(database.file_path()).expect("inspect settings");
    let canary_count: i64 = connection
        .query_row(
            "SELECT count(*) FROM settings WHERE value_json LIKE ?1",
            params![format!("%{canary}%")],
            |row| row.get(0),
        )
        .expect("search for rejected canary");
    assert_eq!(canary_count, 0);
    let table_count: i64 = connection
        .query_row(
            "SELECT count(*) FROM sqlite_master WHERE type = 'table' AND name = 'settings'",
            [],
            |row| row.get(0),
        )
        .expect("settings table must survive SQL-shaped input");
    assert_eq!(table_count, 1);
}

#[test]
fn missing_malformed_wrong_type_and_unsupported_values_recover_per_field() {
    let directory = tempfile::tempdir().expect("temporary data directory");
    let database = AppDatabase::open_in_data_dir(directory.path()).expect("open database");
    store_application_density(&database, "compact").expect("save density");
    store_application_reduced_motion(&database, true).expect("save reduced motion");
    let connection = Connection::open(database.file_path()).expect("open raw settings");

    let cases = [
        ("app.theme_slug.v1", "123"),
        ("app.theme_slug.v1", "{malformed"),
        ("app.theme_slug.v1", r#""unsupported-theme""#),
        ("app.density.v1", r#""unsupported-density""#),
        ("app.density.v1", "false"),
        ("app.accessibility.force_reduced_motion.v1", r#""true""#),
        ("app.accessibility.force_reduced_motion.v1", "1"),
    ];

    for (key, corrupt_json) in cases {
        connection
            .execute_batch(
                "UPDATE settings SET value_json = '\"merlin-dark\"' WHERE key = 'app.theme_slug.v1';\
                 UPDATE settings SET value_json = '\"compact\"' WHERE key = 'app.density.v1';\
                 UPDATE settings SET value_json = 'true' WHERE key = 'app.accessibility.force_reduced_motion.v1';",
            )
            .expect("restore valid baseline before corruption case");
        connection
            .execute(
                "UPDATE settings SET value_json = ?2 WHERE key = ?1",
                params![key, corrupt_json],
            )
            .expect("inject corrupt setting");
        let recovered = load_application_settings(&database).expect("recover corrupt value");
        assert!(recovered.used_defaults);
        match key {
            "app.theme_slug.v1" => {
                assert_eq!(recovered.theme_slug, ThemeSlug::MerlinDark);
                assert_eq!(recovered.density, Density::Compact);
                assert!(recovered.force_reduced_motion);
            }
            "app.density.v1" => {
                assert_eq!(recovered.density, Density::Default);
                assert_eq!(recovered.theme_slug, ThemeSlug::MerlinDark);
                assert!(recovered.force_reduced_motion);
            }
            _ => {
                assert!(!recovered.force_reduced_motion);
                assert_eq!(recovered.theme_slug, ThemeSlug::MerlinDark);
                assert_eq!(recovered.density, Density::Compact);
            }
        }
        let stored: String = connection
            .query_row(
                "SELECT value_json FROM settings WHERE key = ?1",
                params![key],
                |row| row.get(0),
            )
            .expect("read original corrupt value");
        assert_eq!(stored, corrupt_json, "reads must not repair corrupt data");
    }

    connection
        .execute(
            "UPDATE settings SET value_json = '\"merlin-dark\"' WHERE key = 'app.theme_slug.v1'",
            [],
        )
        .expect("restore valid theme");
    connection
        .execute(
            "UPDATE settings SET value_json = '\"compact\"' WHERE key = 'app.density.v1'",
            [],
        )
        .expect("restore valid density");
    connection
        .execute(
            "DELETE FROM settings WHERE key = 'app.accessibility.force_reduced_motion.v1'",
            [],
        )
        .expect("remove motion setting");
    let missing = load_application_settings(&database).expect("recover missing value");
    assert!(!missing.force_reduced_motion);
    assert!(missing.used_defaults);
    assert_eq!(missing.density, Density::Compact);

    store_application_reduced_motion(&database, true).expect("explicitly repair motion");
    let repaired = load_application_settings(&database).expect("load repaired settings");
    assert!(repaired.force_reduced_motion);
    assert!(!repaired.used_defaults);
}

#[test]
fn explicit_theme_update_repairs_only_its_corrupt_setting() {
    let directory = tempfile::tempdir().expect("temporary data directory");
    let database = AppDatabase::open_in_data_dir(directory.path()).expect("open database");
    store_application_density(&database, "compact").expect("save valid density");
    let connection = Connection::open(database.file_path()).expect("open raw settings");
    connection
        .execute(
            "UPDATE settings SET value_json = '\"corrupt-theme\"' WHERE key = 'app.theme_slug.v1'",
            [],
        )
        .expect("inject corrupt theme");

    let repaired = store_application_theme(&database, "merlin-dark").expect("repair theme");
    assert!(!repaired.used_defaults);
    assert_eq!(repaired.density, Density::Compact);
    let stored: String = connection
        .query_row(
            "SELECT value_json FROM settings WHERE key = 'app.theme_slug.v1'",
            [],
            |row| row.get(0),
        )
        .expect("read repaired theme");
    assert_eq!(stored, r#""merlin-dark""#);
}

#[test]
fn actual_database_failures_are_not_converted_to_preference_defaults() {
    let directory = tempfile::tempdir().expect("temporary data directory");
    let database = AppDatabase::open_in_data_dir(directory.path()).expect("open database");
    let connection = Connection::open(database.file_path()).expect("open raw connection");
    connection
        .execute("DROP TABLE settings", [])
        .expect("simulate unavailable settings storage");
    drop(connection);

    let error = load_application_settings(&database).expect_err("missing table must fail");
    assert_eq!(error.code, AppErrorCode::Database);
    assert_eq!(error.message, "SQLite operation failed");
}

#[test]
fn migration_conflict_safe_seed_preserves_existing_application_values() {
    let directory = tempfile::tempdir().expect("temporary data directory");
    let database_path = directory.path().join("merlin.sqlite3");
    let mut connection = Connection::open(&database_path).expect("open V1 fixture");
    embedded::migrations::runner()
        .set_target(Target::Version(1))
        .run(&mut connection)
        .expect("apply only V1 through Refinery");
    for (key, value) in [
        ("app.theme_slug.v1", r#""merlin-dark""#),
        ("app.density.v1", r#""compact""#),
        ("app.accessibility.force_reduced_motion.v1", "true"),
    ] {
        connection
            .execute(
                "INSERT INTO settings (key, value_json, updated_at) VALUES (?1, ?2, ?3)",
                params![key, value, "2026-01-02T03:04:05Z"],
            )
            .expect("insert pre-existing production value");
    }
    drop(connection);

    let database = AppDatabase::open_file(&database_path).expect("apply V2");
    let current = load_application_settings(&database).expect("load preserved values");
    assert_eq!(current.density, Density::Compact);
    assert!(current.force_reduced_motion);
    assert!(!current.used_defaults);
    let connection = Connection::open(database.file_path()).expect("inspect preserved rows");
    let preserved_timestamp: String = connection
        .query_row(
            "SELECT updated_at FROM settings WHERE key = 'app.density.v1'",
            [],
            |row| row.get(0),
        )
        .expect("read preserved timestamp");
    assert_eq!(preserved_timestamp, "2026-01-02T03:04:05Z");
}
