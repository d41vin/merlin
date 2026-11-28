use rusqlite::{params, OptionalExtension, Row};
use uuid::Uuid;

use crate::db::AppDatabase;
use crate::error::AppError;

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct DocsFileRecord {
    pub(crate) id: String,
    pub(crate) project_id: String,
    pub(crate) docs_root_id: String,
    pub(crate) relative_path: String,
    pub(crate) kind: String,
    pub(crate) size_bytes: i64,
    pub(crate) modified_at: Option<String>,
    pub(crate) file_identity: Option<String>,
    pub(crate) content_hash: Option<String>,
    pub(crate) encoding: String,
    pub(crate) features_json: String,
    pub(crate) status: String,
    pub(crate) first_seen_at: String,
    pub(crate) last_seen_at: String,
    pub(crate) updated_at: String,
}

pub(crate) struct DocsFilesRepository<'a> {
    database: &'a AppDatabase,
}

impl<'a> DocsFilesRepository<'a> {
    pub(crate) fn new(database: &'a AppDatabase) -> Self {
        Self { database }
    }

    pub(crate) fn list(
        &self,
        project_id: &str,
        docs_root_id: &str,
    ) -> Result<Vec<DocsFileRecord>, AppError> {
        let connection = self.database.lock()?;
        let mut statement = connection.prepare(&format!(
            "SELECT {DOCS_FILE_COLUMNS} FROM docs_files \
             WHERE project_id = ?1 AND docs_root_id = ?2 \
             ORDER BY relative_path COLLATE NOCASE, relative_path"
        ))?;
        let rows = statement.query_map(params![project_id, docs_root_id], docs_file_from_row)?;
        let mut files = Vec::new();
        for file in rows {
            files.push(file?);
        }
        Ok(files)
    }

    pub(crate) fn replace_manifest(
        &self,
        project_id: &str,
        docs_root_id: &str,
        files: &[DocsFileRecord],
        timestamp: &str,
    ) -> Result<(), AppError> {
        let mut connection = self.database.lock()?;
        let transaction = connection.transaction()?;
        for file in files {
            transaction.execute(
                "INSERT INTO docs_files (\
                    id, project_id, docs_root_id, relative_path, kind, size_bytes, modified_at, \
                    file_identity, content_hash, encoding, features_json, status, first_seen_at, \
                    last_seen_at, updated_at\
                 ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?13, ?13) \
                 ON CONFLICT(docs_root_id, relative_path) DO UPDATE SET \
                    kind = excluded.kind, \
                    size_bytes = excluded.size_bytes, \
                    modified_at = excluded.modified_at, \
                    file_identity = excluded.file_identity, \
                    content_hash = excluded.content_hash, \
                    encoding = excluded.encoding, \
                    features_json = excluded.features_json, \
                    status = excluded.status, \
                    last_seen_at = excluded.last_seen_at, \
                    updated_at = excluded.updated_at",
                params![
                    file.id,
                    project_id,
                    docs_root_id,
                    file.relative_path,
                    file.kind,
                    file.size_bytes,
                    file.modified_at,
                    file.file_identity,
                    file.content_hash,
                    file.encoding,
                    file.features_json,
                    file.status,
                    timestamp,
                ],
            )?;
        }
        transaction.execute(
            "UPDATE docs_files SET status = 'missing', updated_at = ?3 \
             WHERE project_id = ?1 AND docs_root_id = ?2 AND last_seen_at <> ?3 \
                AND status <> 'missing'",
            params![project_id, docs_root_id, timestamp],
        )?;
        transaction.commit()?;
        Ok(())
    }

    pub(crate) fn record_manifest_scan(
        &self,
        project_id: &str,
        docs_root_id: &str,
        scanned_at: &str,
        file_count: usize,
    ) -> Result<(), AppError> {
        let connection = self.database.lock()?;
        connection.execute(
            "INSERT INTO docs_manifest_state (docs_root_id, project_id, scanned_at, file_count, updated_at) \
             VALUES (?1, ?2, ?3, ?4, ?3) \
             ON CONFLICT(docs_root_id) DO UPDATE SET \
                project_id = excluded.project_id, \
                scanned_at = excluded.scanned_at, \
                file_count = excluded.file_count, \
                updated_at = excluded.updated_at",
            params![
                docs_root_id,
                project_id,
                scanned_at,
                i64::try_from(file_count).unwrap_or(i64::MAX)
            ],
        )?;
        Ok(())
    }

    pub(crate) fn manifest_scanned_at(
        &self,
        project_id: &str,
        docs_root_id: &str,
    ) -> Result<Option<String>, AppError> {
        let connection = self.database.lock()?;
        Ok(connection
            .query_row(
                "SELECT scanned_at FROM docs_manifest_state \
                 WHERE project_id = ?1 AND docs_root_id = ?2",
                params![project_id, docs_root_id],
                |row| row.get::<_, String>(0),
            )
            .optional()?)
    }
}

fn new_file_id() -> String {
    Uuid::new_v4().to_string()
}

impl DocsFileRecord {
    #[allow(clippy::too_many_arguments)]
    pub(crate) fn new_scan_entry(
        project_id: &str,
        docs_root_id: &str,
        relative_path: String,
        kind: &str,
        size_bytes: u64,
        modified_at: Option<String>,
        file_identity: Option<String>,
        content_hash: Option<String>,
        encoding: &str,
        features_json: String,
        status: &str,
        timestamp: &str,
    ) -> Self {
        Self {
            id: new_file_id(),
            project_id: project_id.to_owned(),
            docs_root_id: docs_root_id.to_owned(),
            relative_path,
            kind: kind.to_owned(),
            size_bytes: i64::try_from(size_bytes).unwrap_or(i64::MAX),
            modified_at,
            file_identity,
            content_hash,
            encoding: encoding.to_owned(),
            features_json,
            status: status.to_owned(),
            first_seen_at: timestamp.to_owned(),
            last_seen_at: timestamp.to_owned(),
            updated_at: timestamp.to_owned(),
        }
    }
}

const DOCS_FILE_COLUMNS: &str = "id, project_id, docs_root_id, relative_path, kind, size_bytes, \
    modified_at, file_identity, content_hash, encoding, features_json, status, first_seen_at, \
    last_seen_at, updated_at";

fn docs_file_from_row(row: &Row<'_>) -> rusqlite::Result<DocsFileRecord> {
    Ok(DocsFileRecord {
        id: row.get(0)?,
        project_id: row.get(1)?,
        docs_root_id: row.get(2)?,
        relative_path: row.get(3)?,
        kind: row.get(4)?,
        size_bytes: row.get(5)?,
        modified_at: row.get(6)?,
        file_identity: row.get(7)?,
        content_hash: row.get(8)?,
        encoding: row.get(9)?,
        features_json: row.get(10)?,
        status: row.get(11)?,
        first_seen_at: row.get(12)?,
        last_seen_at: row.get(13)?,
        updated_at: row.get(14)?,
    })
}
