use std::fs;
use std::path::Path;

use merlin::db::AppDatabase;
use merlin::error::AppErrorCode;
use merlin::services::projects::{
    DocsRootKind, DocsRootStatus, ProjectService, ProjectStatus, RepositoryConnectOutcome,
    PROJECT_STORE_DIRECTORIES,
};
use refinery::Target;
use rusqlite::{params, Connection};

mod embedded {
    use refinery::embed_migrations;
    embed_migrations!("migrations");
}

fn project_service(database: &AppDatabase) -> ProjectService<'_> {
    ProjectService::new(database)
}

fn create_project(
    database: &AppDatabase,
    name: &str,
) -> merlin::services::projects::ProjectSummary {
    project_service(database)
        .create_project(name, "Test project")
        .expect("create project")
}

#[test]
fn v2_database_upgrades_to_v3_and_preserves_settings_and_history() {
    let directory = tempfile::tempdir().expect("temporary data directory");
    let database_path = directory.path().join("merlin.sqlite3");
    let v1_history = {
        let mut connection = Connection::open(&database_path).expect("open V2 fixture");
        embedded::migrations::runner()
            .set_target(Target::Version(2))
            .run(&mut connection)
            .expect("apply V1 and V2 through Refinery");
        connection
            .execute(
                "INSERT INTO settings (key, value_json, updated_at) VALUES (?1, ?2, ?3)",
                params!["custom.setting", r#"{"value":42}"#, "2026-01-02T03:04:05Z"],
            )
            .expect("insert custom setting");
        connection
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
            .expect("read V1 history")
    };

    let database = AppDatabase::open_in_data_dir(directory.path()).expect("apply V3");
    drop(database);
    let connection = Connection::open(&database_path).expect("inspect upgraded database");
    let migration_count: i64 = connection
        .query_row("SELECT count(*) FROM refinery_schema_history", [], |row| {
            row.get(0)
        })
        .expect("count migrations");
    assert_eq!(migration_count, 3);
    let preserved: String = connection
        .query_row(
            "SELECT value_json FROM settings WHERE key = 'custom.setting'",
            [],
            |row| row.get(0),
        )
        .expect("read custom setting");
    assert_eq!(preserved, r#"{"value":42}"#);
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
        .expect("read preserved V1 history");
    assert_eq!(current_v1_history, v1_history);
}

#[test]
fn project_without_repository_creates_project_store_and_survives_reopen() {
    let directory = tempfile::tempdir().expect("temporary data directory");
    let database = AppDatabase::open_in_data_dir(directory.path()).expect("open database");
    let created = create_project(&database, "Store-backed project");

    assert_eq!(created.status, ProjectStatus::Planned);
    assert!(created.project_store_ready);
    let docs_root = created.docs_root.expect("project-store docs root");
    assert_eq!(docs_root.kind, DocsRootKind::ProjectStore);
    assert_eq!(docs_root.status, DocsRootStatus::Active);
    assert!(docs_root.available);
    assert_eq!(
        Path::new(&docs_root.path).parent(),
        Some(Path::new(&created.project_store_path))
    );
    for directory_name in PROJECT_STORE_DIRECTORIES {
        assert!(Path::new(&created.project_store_path)
            .join(directory_name)
            .is_dir());
    }
    drop(database);

    let database = AppDatabase::open_in_data_dir(directory.path()).expect("reopen database");
    let reopened = project_service(&database)
        .get_project(&created.id)
        .expect("reload project");
    assert_eq!(reopened.id, created.id);
    assert_eq!(reopened.name, "Store-backed project");
    assert!(reopened.project_store_ready);
}

#[test]
fn repository_docs_root_is_detected_confirmed_and_never_created_implicitly() {
    let data = tempfile::tempdir().expect("temporary data directory");
    let repository = tempfile::tempdir().expect("temporary repository");
    fs::create_dir(repository.path().join("docs")).expect("create detected docs folder");
    let database = AppDatabase::open_in_data_dir(data.path()).expect("open database");
    let project = create_project(&database, "Repository project");

    let outcome = project_service(&database)
        .connect_repository(
            &project.id,
            repository.path().to_str().expect("repository path"),
            None,
        )
        .expect("connect repository");
    let RepositoryConnectOutcome::Connected { project: connected } = outcome else {
        panic!("expected a connected repository");
    };
    assert!(connected.repository.as_ref().expect("repository").available);
    assert_eq!(
        connected.docs_root.as_ref().expect("docs root").status,
        DocsRootStatus::Skipped
    );

    let detection = project_service(&database)
        .detect_docs_root(&project.id)
        .expect("detect docs root");
    assert_eq!(detection.candidate_relative_path.as_deref(), Some("docs"));

    let confirmed = project_service(&database)
        .confirm_docs_root(&project.id, "docs")
        .expect("confirm docs root");
    let docs_root = confirmed.docs_root.clone().expect("confirmed docs root");
    assert_eq!(docs_root.kind, DocsRootKind::Repository);
    assert_eq!(docs_root.status, DocsRootStatus::Active);
    assert_eq!(docs_root.relative_path, "docs");
    assert_eq!(
        Path::new(&docs_root.path),
        repository
            .path()
            .join("docs")
            .canonicalize()
            .expect("canonical docs")
    );
    project_service(&database)
        .confirm_docs_root(&project.id, "docs")
        .expect("confirm docs root again");
    let connection = Connection::open(database.file_path()).expect("inspect docs roots");
    let root_count: i64 = connection
        .query_row(
            "SELECT count(*) FROM docs_roots WHERE project_id = ?1",
            params![project.id],
            |row| row.get(0),
        )
        .expect("count docs roots");
    assert_eq!(root_count, 1);
    fs::remove_dir(repository.path().join("docs")).expect("remove docs folder");
    let missing = project_service(&database)
        .get_project(&project.id)
        .expect("reload missing docs root");
    let missing_root = missing.docs_root.expect("missing docs root");
    assert_eq!(missing_root.status, DocsRootStatus::Missing);
    assert!(!missing_root.available);
}

#[test]
fn docs_root_skip_and_create_require_explicit_actions() {
    let data = tempfile::tempdir().expect("temporary data directory");
    let repository = tempfile::tempdir().expect("temporary repository");
    let database = AppDatabase::open_in_data_dir(data.path()).expect("open database");
    let project = create_project(&database, "Repository project");

    project_service(&database)
        .connect_repository(
            &project.id,
            repository.path().to_str().expect("repository path"),
            None,
        )
        .expect("connect repository");
    assert!(!repository.path().join("docs").exists());

    let detection = project_service(&database)
        .detect_docs_root(&project.id)
        .expect("detect docs root");
    assert_eq!(detection.candidate_relative_path, None);

    let skipped = project_service(&database)
        .skip_docs_root(&project.id)
        .expect("skip docs root");
    assert_eq!(
        skipped.docs_root.as_ref().expect("docs root").status,
        DocsRootStatus::Skipped
    );
    assert!(!repository.path().join("docs").exists());

    let created = project_service(&database)
        .create_docs_root(&project.id)
        .expect("create docs root");
    assert!(repository.path().join("docs").is_dir());
    assert_eq!(
        created.docs_root.as_ref().expect("docs root").kind,
        DocsRootKind::Repository
    );
}

#[test]
fn duplicate_repository_path_or_remote_identity_returns_existing_project() {
    let data = tempfile::tempdir().expect("temporary data directory");
    let first_repository = tempfile::tempdir().expect("first repository");
    let second_repository = tempfile::tempdir().expect("second repository");
    let database = AppDatabase::open_in_data_dir(data.path()).expect("open database");
    let first = create_project(&database, "First project");
    let second = create_project(&database, "Second project");
    let first_path = first_repository.path().to_str().expect("first path");
    let second_path = second_repository.path().to_str().expect("second path");

    project_service(&database)
        .connect_repository(
            &first.id,
            first_path,
            Some("https://example.com/team/repo.git"),
        )
        .expect("connect first repository");

    let duplicate_path = project_service(&database)
        .connect_repository(&second.id, first_path, None)
        .expect("attempt duplicate path");
    match duplicate_path {
        RepositoryConnectOutcome::AlreadyConnected {
            existing_project_id,
            existing_project_name,
        } => {
            assert_eq!(existing_project_id, first.id);
            assert_eq!(existing_project_name, "First project");
        }
        _ => panic!("duplicate path should not connect a second project"),
    }

    let duplicate_remote = project_service(&database)
        .connect_repository(
            &second.id,
            second_path,
            Some("https://example.com/team/repo.git"),
        )
        .expect("attempt duplicate remote identity");
    match duplicate_remote {
        RepositoryConnectOutcome::AlreadyConnected {
            existing_project_id,
            ..
        } => assert_eq!(existing_project_id, first.id),
        _ => panic!("duplicate remote identity should not connect a second project"),
    }
}

#[test]
fn path_validation_rejects_relative_missing_and_escape_attempts() {
    let data = tempfile::tempdir().expect("temporary data directory");
    let repository = tempfile::tempdir().expect("temporary repository");
    let outside = tempfile::tempdir().expect("outside directory");
    let database = AppDatabase::open_in_data_dir(data.path()).expect("open database");
    let project = create_project(&database, "Path validation");

    let relative = project_service(&database)
        .connect_repository(&project.id, "relative/path", None)
        .expect_err("relative path must be rejected");
    assert_eq!(relative.code, AppErrorCode::InvalidRepository);

    let missing = project_service(&database)
        .connect_repository(
            &project.id,
            outside
                .path()
                .join("missing-repository")
                .to_str()
                .expect("missing path"),
            None,
        )
        .expect_err("missing path must be rejected");
    assert_eq!(missing.code, AppErrorCode::InvalidRepository);

    project_service(&database)
        .connect_repository(
            &project.id,
            repository.path().to_str().expect("repository path"),
            None,
        )
        .expect("connect repository");

    let traversal = project_service(&database)
        .confirm_docs_root(&project.id, "../outside")
        .expect_err("traversal must be rejected");
    assert_eq!(traversal.code, AppErrorCode::InvalidDocsRoot);

    let absolute = project_service(&database)
        .confirm_docs_root(&project.id, outside.path().to_str().expect("outside path"))
        .expect_err("absolute docs path must be rejected");
    assert_eq!(absolute.code, AppErrorCode::InvalidDocsRoot);

    let missing_folder = project_service(&database)
        .confirm_docs_root(&project.id, "not-created")
        .expect_err("missing docs folder must be rejected");
    assert_eq!(missing_folder.code, AppErrorCode::InvalidDocsRoot);
}

#[test]
fn repository_must_not_contain_or_be_inside_application_data() {
    let data = tempfile::tempdir().expect("temporary data directory");
    let application_data = data.path().join("application-data");
    fs::create_dir(&application_data).expect("create application data");
    let database = AppDatabase::open_in_data_dir(&application_data).expect("open database");
    let project = create_project(&database, "Containment");

    let inside = project_service(&database)
        .connect_repository(
            &project.id,
            application_data.to_str().expect("application data path"),
            None,
        )
        .expect_err("repository inside application data must be rejected");
    assert_eq!(inside.code, AppErrorCode::InvalidRepository);

    let contains = project_service(&database)
        .connect_repository(
            &project.id,
            data.path().to_str().expect("data parent path"),
            None,
        )
        .expect_err("repository containing application data must be rejected");
    assert_eq!(contains.code, AppErrorCode::InvalidRepository);
}

#[test]
fn project_store_creation_is_idempotent_and_isolated() {
    let data = tempfile::tempdir().expect("temporary data directory");
    let database = AppDatabase::open_in_data_dir(data.path()).expect("open database");
    let first = create_project(&database, "First");
    let second = create_project(&database, "Second");
    assert_ne!(first.project_store_path, second.project_store_path);
    assert!(Path::new(&first.project_store_path).is_dir());
    assert!(Path::new(&second.project_store_path).is_dir());
    let data_root = data.path().canonicalize().expect("canonical data root");
    assert!(Path::new(&first.project_store_path).starts_with(&data_root));
    assert!(Path::new(&second.project_store_path).starts_with(&data_root));

    drop(database);
    let database = AppDatabase::open_in_data_dir(data.path()).expect("reopen database");
    let reopened = project_service(&database)
        .get_project(&first.id)
        .expect("reload first project");
    assert!(reopened.project_store_ready);
    assert!(Path::new(&reopened.project_store_path)
        .join("docs")
        .is_dir());
}

#[cfg(windows)]
#[test]
fn docs_root_symlink_escape_is_rejected_when_the_os_permits_the_fixture() {
    use std::os::windows::fs::symlink_dir;

    let data = tempfile::tempdir().expect("temporary data directory");
    let repository = tempfile::tempdir().expect("temporary repository");
    let outside = tempfile::tempdir().expect("outside directory");
    if symlink_dir(outside.path(), repository.path().join("linked-docs")).is_err() {
        eprintln!("symlink escape fixture skipped because the OS denied symlink creation");
        return;
    }
    let database = AppDatabase::open_in_data_dir(data.path()).expect("open database");
    let project = create_project(&database, "Symlink escape");
    project_service(&database)
        .connect_repository(
            &project.id,
            repository.path().to_str().expect("repository path"),
            None,
        )
        .expect("connect repository");

    let error = project_service(&database)
        .confirm_docs_root(&project.id, "linked-docs")
        .expect_err("symlink escape must be rejected");
    assert_eq!(error.code, AppErrorCode::InvalidDocsRoot);
}
