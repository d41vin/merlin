use merlin::commands::layout::{load_persisted_layout, store_persisted_layout};
use merlin::db::{AppDatabase, DATABASE_FILE_NAME};
use merlin::error::AppErrorCode;
use merlin::services::layout::{PanelLayout, PanelState, PANEL_LAYOUT_VERSION};
use rusqlite::Connection;
use serde_json::json;

fn valid_layout() -> PanelLayout {
    PanelLayout {
        version: PANEL_LAYOUT_VERSION,
        panels: vec![
            panel("docs", 40.0, 40.0, false),
            panel("todos", 0.0, 20.0, true),
            panel("activity", 35.0, 35.0, false),
            panel("resources", 25.0, 25.0, false),
        ],
    }
}

fn panel(id: &str, size: f64, restore_size: f64, collapsed: bool) -> PanelState {
    PanelState {
        id: id.to_owned(),
        size,
        restore_size,
        collapsed,
    }
}

#[test]
fn migration_restart_and_layout_round_trip_are_persistent_and_idempotent() {
    let directory = tempfile::tempdir().expect("temporary data directory");
    let expected_database = std::fs::canonicalize(directory.path())
        .expect("canonical temporary directory")
        .join(DATABASE_FILE_NAME);

    {
        let database =
            AppDatabase::open_in_data_dir(directory.path()).expect("fresh migrated database");
        assert_eq!(database.file_path(), expected_database);
        assert_eq!(
            load_persisted_layout(&database).expect("initial read"),
            None
        );
        store_persisted_layout(&database, valid_layout()).expect("save valid layout");
        assert_eq!(
            load_persisted_layout(&database).expect("read saved layout"),
            Some(valid_layout())
        );
    }

    {
        let database = AppDatabase::open_in_data_dir(directory.path())
            .expect("restart must apply migrations idempotently");
        assert_eq!(
            load_persisted_layout(&database).expect("restart read"),
            Some(valid_layout())
        );
    }

    let connection = Connection::open(&expected_database).expect("inspect proof schema");
    let migration_count: i64 = connection
        .query_row("SELECT count(*) FROM refinery_schema_history", [], |row| {
            row.get(0)
        })
        .expect("two recorded migrations");
    assert_eq!(migration_count, 3);
    for table in ["settings", "sync_operations"] {
        let count: i64 = connection
            .query_row(
                "SELECT count(*) FROM sqlite_master WHERE type = 'table' AND name = ?1",
                [table],
                |row| row.get(0),
            )
            .expect("table existence query");
        assert_eq!(count, 1, "missing {table}");
    }
}

#[test]
fn frontend_camel_case_snapshot_deserializes_and_uses_sqlite_json() {
    let directory = tempfile::tempdir().expect("temporary data directory");
    let database = AppDatabase::open_in_data_dir(directory.path()).expect("database");
    let layout = valid_layout();
    let arguments = json!({ "layout": layout.clone() });
    let decoded: PanelLayout =
        serde_json::from_value(arguments["layout"].clone()).expect("invoke snapshot payload");
    store_persisted_layout(&database, decoded).expect("store typed payload");

    let connection = Connection::open(database.file_path()).expect("raw settings inspection");
    let stored: String = connection
        .query_row(
            "SELECT value_json FROM settings WHERE key = 'preflight.panel_layout.v1'",
            [],
            |row| row.get(0),
        )
        .expect("stored layout JSON");
    let value: serde_json::Value = serde_json::from_str(&stored).expect("valid JSON");
    assert_eq!(value["version"], 1);
    assert_eq!(value["panels"][0]["id"], "docs");
    assert!(value["panels"][0].get("restoreSize").is_some());
    assert!(value["panels"][0].get("restore_size").is_none());
}

#[test]
fn malformed_layouts_are_rejected_without_replacing_the_last_valid_snapshot() {
    let directory = tempfile::tempdir().expect("temporary data directory");
    let database = AppDatabase::open_in_data_dir(directory.path()).expect("database");
    store_persisted_layout(&database, valid_layout()).expect("baseline valid layout");

    let mut cases = Vec::new();
    let mut wrong_version = valid_layout();
    wrong_version.version = 2;
    cases.push(wrong_version);
    let mut wrong_count = valid_layout();
    wrong_count.panels.pop();
    cases.push(wrong_count);
    let mut wrong_order = valid_layout();
    wrong_order.panels.swap(0, 1);
    cases.push(wrong_order);
    let mut duplicate = valid_layout();
    duplicate.panels[1].id = "docs".to_owned();
    cases.push(duplicate);
    let mut unknown = valid_layout();
    unknown.panels[0].id = "other".to_owned();
    cases.push(unknown);
    let mut nan = valid_layout();
    nan.panels[0].size = f64::NAN;
    cases.push(nan);
    let mut infinite_restore = valid_layout();
    infinite_restore.panels[0].restore_size = f64::INFINITY;
    cases.push(infinite_restore);
    let mut negative = valid_layout();
    negative.panels[0].size = -1.0;
    cases.push(negative);
    let mut too_large = valid_layout();
    too_large.panels[0].size = 101.0;
    cases.push(too_large);
    let mut bad_sum = valid_layout();
    bad_sum.panels[0].size = 39.0;
    cases.push(bad_sum);
    let mut bad_collapse = valid_layout();
    bad_collapse.panels[1].collapsed = false;
    cases.push(bad_collapse);
    let mut uncollapsed_zero = valid_layout();
    uncollapsed_zero.panels[0].size = 0.0;
    uncollapsed_zero.panels[1].size = 40.0;
    uncollapsed_zero.panels[1].collapsed = false;
    cases.push(uncollapsed_zero);
    let mut zero_restore = valid_layout();
    zero_restore.panels[1].restore_size = 0.0;
    cases.push(zero_restore);

    for case in cases {
        let error = store_persisted_layout(&database, case).expect_err("invalid layout accepted");
        assert_eq!(error.code, AppErrorCode::InvalidLayout);
        assert_eq!(
            load_persisted_layout(&database).expect("read unchanged baseline"),
            Some(valid_layout())
        );
    }

    let mut invalid = valid_layout();
    invalid.version = 0;
    let error = store_persisted_layout(&database, invalid).expect_err("invalid version accepted");
    let serialized = serde_json::to_value(error).expect("serializable command error");
    assert_eq!(serialized["code"], "invalid_layout");
    assert!(serialized["message"].is_string());
}
