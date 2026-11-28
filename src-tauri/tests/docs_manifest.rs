use std::fs;
use std::path::Path;

use merlin::db::AppDatabase;
use merlin::error::AppErrorCode;
use merlin::filesystem::hash::sha256_bytes;
use merlin::services::docs::{
    DocsEncoding, DocsFileKind, DocsFileStatus, DocsService, MAX_DOCUMENT_BYTES,
};
use merlin::services::projects::{ProjectService, RepositoryConnectOutcome};
use refinery::Target;
use rusqlite::{params, Connection};

mod embedded {
    use refinery::embed_migrations;
    embed_migrations!("migrations");
}

fn project_service(database: &AppDatabase) -> ProjectService<'_> {
    ProjectService::new(database)
}

fn repository_project(database: &AppDatabase, repository: &Path) -> String {
    let project = project_service(database)
        .create_project("Docs project", "Manifest proof")
        .expect("create project");
    let outcome = project_service(database)
        .connect_repository(
            &project.id,
            repository.to_str().expect("repository path"),
            None,
        )
        .expect("connect repository");
    let RepositoryConnectOutcome::Connected { project } = outcome else {
        panic!("repository should connect");
    };
    project_service(database)
        .confirm_docs_root(&project.id, "docs")
        .expect("confirm docs root");
    project.id
}

fn write_fixture_repository(root: &Path) {
    let docs = root.join("docs");
    fs::create_dir_all(docs.join("nested").join("personal")).expect("create nested docs");
    fs::create_dir_all(docs.join(".git")).expect("create git internals");
    fs::write(
        docs.join("guide.md"),
        "# Guide\n\n| Feature | State |\n| --- | --- |\n| Tables | kept |\n\n- [x] Done\n- [ ] Pending\n",
    )
    .expect("write guide");
    fs::write(
        docs.join("nested").join("personal").join("notes.md"),
        "---\ntitle: Personal\n---\n\n# Notes\n\nKeep me.\n",
    )
    .expect("write personal notes");
    fs::write(
        docs.join("nested").join("diagram.mdx"),
        "import { Chart } from './Chart.js'\n\n# Chart\n\n<Chart value={1} />\n",
    )
    .expect("write mdx");
    fs::write(docs.join("asset.bin"), [0_u8, 159, 146, 150]).expect("write binary asset");
    fs::write(docs.join("readme.txt"), "plain text").expect("write text asset");
    fs::write(
        docs.join(".git").join("config"),
        "[remote]\n\turl = secret\n",
    )
    .expect("write git internals");
    fs::write(
        docs.join("bom.md"),
        b"\xEF\xBB\xBF# BOM\r\n\r\nCRLF body.\r\n",
    )
    .expect("write BOM document");
}

#[test]
fn v3_database_upgrades_to_v4_and_preserves_registration() {
    let directory = tempfile::tempdir().expect("temporary data directory");
    let database_path = directory.path().join("merlin.sqlite3");
    {
        let mut connection = Connection::open(&database_path).expect("open V3 fixture");
        embedded::migrations::runner()
            .set_target(Target::Version(3))
            .run(&mut connection)
            .expect("apply migrations through V3");
        connection
            .execute(
                "INSERT INTO projects (id, name, description, status, created_at, updated_at) \
                 VALUES (?1, ?2, ?3, 'planned', ?4, ?4)",
                params![
                    "11111111-1111-4111-8111-111111111111",
                    "Preserved project",
                    "",
                    "2026-11-28T00:00:00Z"
                ],
            )
            .expect("insert project");
        connection
            .execute(
                "INSERT INTO docs_roots (id, project_id, root_kind, relative_path, status, created_at, updated_at) \
                 VALUES (?1, ?2, 'project_store', '', 'active', ?3, ?3)",
                params![
                    "22222222-2222-4222-8222-222222222222",
                    "11111111-1111-4111-8111-111111111111",
                    "2026-11-28T00:00:00Z"
                ],
            )
            .expect("insert docs root");
    }

    let database = AppDatabase::open_in_data_dir(directory.path()).expect("apply V4");
    drop(database);
    let connection = Connection::open(&database_path).expect("inspect upgraded database");
    let migration_count: i64 = connection
        .query_row("SELECT count(*) FROM refinery_schema_history", [], |row| {
            row.get(0)
        })
        .expect("count migrations");
    assert_eq!(migration_count, 4);
    let project_name: String = connection
        .query_row(
            "SELECT name FROM projects WHERE id = '11111111-1111-4111-8111-111111111111'",
            [],
            |row| row.get(0),
        )
        .expect("read preserved project");
    assert_eq!(project_name, "Preserved project");
    let manifest_table: i64 = connection
        .query_row(
            "SELECT count(*) FROM sqlite_master WHERE type = 'table' AND name = 'docs_files'",
            [],
            |row| row.get(0),
        )
        .expect("read docs_files table");
    assert_eq!(manifest_table, 1);
}

#[test]
fn scan_builds_a_bounded_manifest_and_survives_restart() {
    let data = tempfile::tempdir().expect("temporary data directory");
    let repository = tempfile::tempdir().expect("temporary repository");
    write_fixture_repository(repository.path());
    let database = AppDatabase::open_in_data_dir(data.path()).expect("open database");
    let project_id = repository_project(&database, repository.path());
    let service = DocsService::new(&database);

    let manifest = service.scan_manifest(&project_id).expect("scan manifest");
    assert!(manifest.scanned_at.is_some());
    let paths: Vec<&str> = manifest
        .files
        .iter()
        .map(|file| file.relative_path.as_str())
        .collect();
    assert!(paths.contains(&"guide.md"));
    assert!(paths.contains(&"nested/personal/notes.md"));
    assert!(paths.contains(&"nested/diagram.mdx"));
    assert!(paths.contains(&"asset.bin"));
    assert!(paths.contains(&"readme.txt"));
    assert!(paths.contains(&"bom.md"));
    assert!(!paths.iter().any(|path| path.starts_with(".git")));

    let guide = manifest
        .files
        .iter()
        .find(|file| file.relative_path == "guide.md")
        .expect("guide entry");
    assert_eq!(guide.kind, DocsFileKind::Markdown);
    assert_eq!(guide.status, DocsFileStatus::Present);
    assert_eq!(guide.encoding, DocsEncoding::Utf8);
    assert!(guide
        .features
        .contains(&merlin::services::docs::MarkdownFeature::Table));
    assert!(guide
        .features
        .contains(&merlin::services::docs::MarkdownFeature::TaskList));
    let expected_hash = sha256_bytes(
        fs::read(repository.path().join("docs").join("guide.md"))
            .expect("read guide bytes")
            .as_slice(),
    );
    assert_eq!(guide.content_hash.as_deref(), Some(expected_hash.as_str()));
    assert!(guide.modified_at.is_some());
    #[cfg(windows)]
    assert!(guide.file_identity.is_some());

    let notes = manifest
        .files
        .iter()
        .find(|file| file.relative_path == "nested/personal/notes.md")
        .expect("personal notes entry");
    assert!(notes
        .features
        .contains(&merlin::services::docs::MarkdownFeature::Frontmatter));

    let diagram = manifest
        .files
        .iter()
        .find(|file| file.relative_path == "nested/diagram.mdx")
        .expect("mdx entry");
    assert_eq!(diagram.kind, DocsFileKind::Mdx);
    assert!(diagram
        .features
        .contains(&merlin::services::docs::MarkdownFeature::Mdx));

    let asset = manifest
        .files
        .iter()
        .find(|file| file.relative_path == "asset.bin")
        .expect("binary asset entry");
    assert_eq!(asset.kind, DocsFileKind::File);
    assert_eq!(asset.encoding, DocsEncoding::Unsupported);
    assert!(asset.content_hash.is_some());

    let bom = manifest
        .files
        .iter()
        .find(|file| file.relative_path == "bom.md")
        .expect("BOM entry");
    assert_eq!(bom.encoding, DocsEncoding::Utf8Bom);
    assert!(bom
        .features
        .contains(&merlin::services::docs::MarkdownFeature::Crlf));

    drop(database);
    let database = AppDatabase::open_in_data_dir(data.path()).expect("reopen database");
    let persisted = DocsService::new(&database)
        .get_manifest(&project_id)
        .expect("load persisted manifest");
    assert_eq!(persisted.files.len(), manifest.files.len());
    assert_eq!(persisted.scanned_at, manifest.scanned_at);
}

#[test]
fn read_document_is_byte_exact_and_confined() {
    let data = tempfile::tempdir().expect("temporary data directory");
    let repository = tempfile::tempdir().expect("temporary repository");
    write_fixture_repository(repository.path());
    let database = AppDatabase::open_in_data_dir(data.path()).expect("open database");
    let project_id = repository_project(&database, repository.path());
    let service = DocsService::new(&database);
    service.scan_manifest(&project_id).expect("scan manifest");

    let guide_bytes = fs::read(repository.path().join("docs").join("guide.md")).expect("guide");
    let document = service
        .read_document(&project_id, "guide.md")
        .expect("read guide");
    assert_eq!(document.source.as_bytes(), guide_bytes.as_slice());
    assert_eq!(document.content_hash, sha256_bytes(&guide_bytes));
    assert_eq!(document.kind, DocsFileKind::Markdown);

    let bom = service
        .read_document(&project_id, "bom.md")
        .expect("read BOM document");
    assert!(bom.source.starts_with('\u{feff}'));
    assert!(bom.source.contains("\r\n"));
    assert_eq!(bom.encoding, DocsEncoding::Utf8Bom);

    for rejected in [
        "asset.bin",
        "../outside.md",
        ".git/config",
        "nested/../../outside.md",
    ] {
        let error = service
            .read_document(&project_id, rejected)
            .expect_err("unsafe path must be rejected");
        assert_eq!(error.code, AppErrorCode::InvalidDocsFile);
    }
    let absolute = repository.path().join("docs").join("guide.md");
    let error = service
        .read_document(&project_id, absolute.to_str().expect("absolute path"))
        .expect_err("absolute path must be rejected");
    assert_eq!(error.code, AppErrorCode::InvalidDocsFile);

    fs::remove_file(repository.path().join("docs").join("guide.md")).expect("remove guide");
    let rescan = service.scan_manifest(&project_id).expect("rescan");
    let missing = rescan
        .files
        .iter()
        .find(|file| file.relative_path == "guide.md")
        .expect("missing entry remains");
    assert_eq!(missing.status, DocsFileStatus::Missing);
}

#[test]
fn large_and_invalid_encoding_documents_are_listed_but_not_opened() {
    let data = tempfile::tempdir().expect("temporary data directory");
    let repository = tempfile::tempdir().expect("temporary repository");
    write_fixture_repository(repository.path());
    let docs = repository.path().join("docs");
    fs::write(
        docs.join("large.md"),
        vec![b'a'; MAX_DOCUMENT_BYTES as usize + 1],
    )
    .expect("write large document");
    fs::write(docs.join("invalid.md"), [0xFF_u8, 0xFE, 0x00, 0x41])
        .expect("write invalid document");
    let database = AppDatabase::open_in_data_dir(data.path()).expect("open database");
    let project_id = repository_project(&database, repository.path());
    let service = DocsService::new(&database);

    let manifest = service.scan_manifest(&project_id).expect("scan manifest");
    let large = manifest
        .files
        .iter()
        .find(|file| file.relative_path == "large.md")
        .expect("large entry");
    assert_eq!(large.status, DocsFileStatus::TooLarge);
    assert!(large.content_hash.is_none());
    let invalid = manifest
        .files
        .iter()
        .find(|file| file.relative_path == "invalid.md")
        .expect("invalid entry");
    assert_eq!(invalid.status, DocsFileStatus::InvalidEncoding);
    assert!(invalid.content_hash.is_some());

    for path in ["large.md", "invalid.md"] {
        let error = service
            .read_document(&project_id, path)
            .expect_err("unreadable document must fail");
        assert_eq!(error.code, AppErrorCode::InvalidDocsFile);
    }
}

#[test]
fn skipped_or_missing_docs_root_is_not_scanned_as_empty() {
    let data = tempfile::tempdir().expect("temporary data directory");
    let repository = tempfile::tempdir().expect("temporary repository");
    fs::create_dir(repository.path().join("docs")).expect("create docs");
    let database = AppDatabase::open_in_data_dir(data.path()).expect("open database");
    let project = project_service(&database)
        .create_project("Skipped docs", "")
        .expect("create project");
    project_service(&database)
        .connect_repository(&project.id, repository.path().to_str().expect("path"), None)
        .expect("connect repository");
    project_service(&database)
        .skip_docs_root(&project.id)
        .expect("skip docs root");
    let error = DocsService::new(&database)
        .scan_manifest(&project.id)
        .expect_err("skipped root must not scan");
    assert_eq!(error.code, AppErrorCode::InvalidDocsRoot);

    project_service(&database)
        .confirm_docs_root(&project.id, "docs")
        .expect("confirm docs root");
    fs::remove_dir(repository.path().join("docs")).expect("remove docs root");
    let error = DocsService::new(&database)
        .scan_manifest(&project.id)
        .expect_err("missing root must not scan");
    assert_eq!(error.code, AppErrorCode::InvalidDocsRoot);
}

#[cfg(windows)]
#[test]
fn linked_items_are_not_traversed_or_read_when_the_os_permits_the_fixture() {
    use std::os::windows::fs::symlink_dir;

    let data = tempfile::tempdir().expect("temporary data directory");
    let repository = tempfile::tempdir().expect("temporary repository");
    let outside = tempfile::tempdir().expect("outside directory");
    write_fixture_repository(repository.path());
    fs::write(outside.path().join("outside-secret.md"), "# Outside\n").expect("write outside");
    if symlink_dir(
        outside.path(),
        repository.path().join("docs").join("linked"),
    )
    .is_err()
    {
        eprintln!("symlink fixture skipped because the OS denied link creation");
        return;
    }
    let database = AppDatabase::open_in_data_dir(data.path()).expect("open database");
    let project_id = repository_project(&database, repository.path());
    let service = DocsService::new(&database);
    let manifest = service.scan_manifest(&project_id).expect("scan manifest");
    let linked = manifest
        .files
        .iter()
        .find(|file| file.relative_path == "linked")
        .expect("linked entry");
    assert_eq!(linked.status, DocsFileStatus::UnsupportedLink);
    assert!(!manifest
        .files
        .iter()
        .any(|file| file.relative_path == "linked/outside-secret.md"));
    let error = service
        .read_document(&project_id, "linked/outside-secret.md")
        .expect_err("link escape must not be read");
    assert_eq!(error.code, AppErrorCode::InvalidDocsFile);
}
