use rusqlite::{params, OptionalExtension, Row};
use uuid::Uuid;

use crate::db::AppDatabase;
use crate::error::AppError;

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct ProjectRecord {
    pub(crate) id: String,
    pub(crate) name: String,
    pub(crate) description: String,
    pub(crate) status: String,
    pub(crate) created_at: String,
    pub(crate) updated_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct RepositoryRecord {
    pub(crate) id: String,
    pub(crate) project_id: String,
    pub(crate) canonical_local_path: String,
    pub(crate) remote_identity: Option<String>,
    pub(crate) default_branch: Option<String>,
    pub(crate) last_observed_head: Option<String>,
    pub(crate) last_observed_branch: Option<String>,
    pub(crate) connection_status: String,
    pub(crate) last_reconciled_at: Option<String>,
    pub(crate) created_at: String,
    pub(crate) updated_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct DocsRootRecord {
    pub(crate) id: String,
    pub(crate) project_id: String,
    pub(crate) root_kind: String,
    pub(crate) relative_path: String,
    pub(crate) status: String,
    pub(crate) created_at: String,
    pub(crate) updated_at: String,
}

pub(crate) struct ProjectsRepository<'a> {
    database: &'a AppDatabase,
}

impl<'a> ProjectsRepository<'a> {
    pub(crate) fn new(database: &'a AppDatabase) -> Self {
        Self { database }
    }

    pub(crate) fn list(&self) -> Result<Vec<ProjectRecord>, AppError> {
        let connection = self.database.lock()?;
        let mut statement = connection.prepare(
            "SELECT id, name, description, status, created_at, updated_at \
             FROM projects ORDER BY name COLLATE NOCASE, id",
        )?;
        let rows = statement.query_map([], project_from_row)?;
        let mut projects = Vec::new();
        for project in rows {
            projects.push(project?);
        }
        Ok(projects)
    }

    pub(crate) fn get(&self, project_id: &str) -> Result<Option<ProjectRecord>, AppError> {
        validate_project_id(project_id)?;
        let connection = self.database.lock()?;
        Ok(connection
            .query_row(
                "SELECT id, name, description, status, created_at, updated_at \
                 FROM projects WHERE id = ?1",
                params![project_id],
                project_from_row,
            )
            .optional()?)
    }

    pub(crate) fn create(
        &self,
        project: &ProjectRecord,
        docs_root: &DocsRootRecord,
    ) -> Result<(), AppError> {
        validate_project_id(&project.id)?;
        let mut connection = self.database.lock()?;
        let transaction = connection.transaction()?;
        transaction.execute(
            "INSERT INTO projects (id, name, description, status, created_at, updated_at) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                project.id,
                project.name,
                project.description,
                project.status,
                project.created_at,
                project.updated_at
            ],
        )?;
        insert_or_replace_docs_root(&transaction, docs_root)?;
        transaction.commit()?;
        Ok(())
    }

    pub(crate) fn get_connection(
        &self,
        project_id: &str,
    ) -> Result<Option<RepositoryRecord>, AppError> {
        validate_project_id(project_id)?;
        let connection = self.database.lock()?;
        Ok(connection
            .query_row(
                &format!(
                    "SELECT {REPOSITORY_COLUMNS} FROM repository_connections r WHERE r.project_id = ?1"
                ),
                params![project_id],
                repository_from_row,
            )
            .optional()?)
    }

    pub(crate) fn find_connection(
        &self,
        canonical_local_path: &str,
        remote_identity: Option<&str>,
    ) -> Result<Option<(ProjectRecord, RepositoryRecord)>, AppError> {
        let connection = self.database.lock()?;
        Ok(connection
            .query_row(
                &format!(
                    "SELECT p.id, p.name, p.description, p.status, p.created_at, p.updated_at, \
                     {REPOSITORY_COLUMNS} \
                     FROM repository_connections r JOIN projects p ON p.id = r.project_id \
                     WHERE r.canonical_local_path = ?1 COLLATE NOCASE \
                        OR (?2 IS NOT NULL AND r.remote_identity = ?2 COLLATE NOCASE) \
                     LIMIT 1"
                ),
                params![canonical_local_path, remote_identity],
                |row| Ok((project_from_row(row)?, repository_from_row_at(row, 6)?)),
            )
            .optional()?)
    }

    pub(crate) fn upsert_connection(
        &self,
        connection_record: &RepositoryRecord,
        reset_docs_root: Option<&DocsRootRecord>,
    ) -> Result<(), AppError> {
        validate_project_id(&connection_record.project_id)?;
        let mut connection = self.database.lock()?;
        let transaction = connection.transaction()?;
        transaction.execute(
            "INSERT INTO repository_connections (\
                id, project_id, canonical_local_path, remote_identity, default_branch, \
                last_observed_head, last_observed_branch, connection_status, last_reconciled_at, \
                created_at, updated_at\
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11) \
             ON CONFLICT(project_id) DO UPDATE SET \
                canonical_local_path = excluded.canonical_local_path, \
                remote_identity = excluded.remote_identity, \
                default_branch = excluded.default_branch, \
                last_observed_head = excluded.last_observed_head, \
                last_observed_branch = excluded.last_observed_branch, \
                connection_status = excluded.connection_status, \
                last_reconciled_at = excluded.last_reconciled_at, \
                updated_at = excluded.updated_at",
            params![
                connection_record.id,
                connection_record.project_id,
                connection_record.canonical_local_path,
                connection_record.remote_identity,
                connection_record.default_branch,
                connection_record.last_observed_head,
                connection_record.last_observed_branch,
                connection_record.connection_status,
                connection_record.last_reconciled_at,
                connection_record.created_at,
                connection_record.updated_at,
            ],
        )?;
        if let Some(docs_root) = reset_docs_root {
            insert_or_replace_docs_root(&transaction, docs_root)?;
        }
        transaction.commit()?;
        Ok(())
    }

    pub(crate) fn get_docs_root(
        &self,
        project_id: &str,
    ) -> Result<Option<DocsRootRecord>, AppError> {
        validate_project_id(project_id)?;
        let connection = self.database.lock()?;
        Ok(connection
            .query_row(
                "SELECT id, project_id, root_kind, relative_path, status, created_at, updated_at \
                 FROM docs_roots WHERE project_id = ?1",
                params![project_id],
                docs_root_from_row,
            )
            .optional()?)
    }

    pub(crate) fn upsert_docs_root(&self, docs_root: &DocsRootRecord) -> Result<(), AppError> {
        validate_project_id(&docs_root.project_id)?;
        let connection = self.database.lock()?;
        insert_or_replace_docs_root(&connection, docs_root)?;
        Ok(())
    }
}

const REPOSITORY_COLUMNS: &str = "r.id, r.project_id, r.canonical_local_path, r.remote_identity, \
    r.default_branch, r.last_observed_head, r.last_observed_branch, r.connection_status, \
    r.last_reconciled_at, r.created_at, r.updated_at";

fn insert_or_replace_docs_root(
    connection: &rusqlite::Connection,
    docs_root: &DocsRootRecord,
) -> Result<(), AppError> {
    connection.execute(
        "INSERT INTO docs_roots (id, project_id, root_kind, relative_path, status, created_at, updated_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7) \
         ON CONFLICT(project_id) DO UPDATE SET \
            root_kind = excluded.root_kind, \
            relative_path = excluded.relative_path, \
            status = excluded.status, \
            updated_at = excluded.updated_at",
        params![
            docs_root.id,
            docs_root.project_id,
            docs_root.root_kind,
            docs_root.relative_path,
            docs_root.status,
            docs_root.created_at,
            docs_root.updated_at
        ],
    )?;
    Ok(())
}

fn project_from_row(row: &Row<'_>) -> rusqlite::Result<ProjectRecord> {
    Ok(ProjectRecord {
        id: row.get(0)?,
        name: row.get(1)?,
        description: row.get(2)?,
        status: row.get(3)?,
        created_at: row.get(4)?,
        updated_at: row.get(5)?,
    })
}

fn repository_from_row(row: &Row<'_>) -> rusqlite::Result<RepositoryRecord> {
    repository_from_row_at(row, 0)
}

fn repository_from_row_at(row: &Row<'_>, offset: usize) -> rusqlite::Result<RepositoryRecord> {
    Ok(RepositoryRecord {
        id: row.get(offset)?,
        project_id: row.get(offset + 1)?,
        canonical_local_path: row.get(offset + 2)?,
        remote_identity: row.get(offset + 3)?,
        default_branch: row.get(offset + 4)?,
        last_observed_head: row.get(offset + 5)?,
        last_observed_branch: row.get(offset + 6)?,
        connection_status: row.get(offset + 7)?,
        last_reconciled_at: row.get(offset + 8)?,
        created_at: row.get(offset + 9)?,
        updated_at: row.get(offset + 10)?,
    })
}

fn docs_root_from_row(row: &Row<'_>) -> rusqlite::Result<DocsRootRecord> {
    Ok(DocsRootRecord {
        id: row.get(0)?,
        project_id: row.get(1)?,
        root_kind: row.get(2)?,
        relative_path: row.get(3)?,
        status: row.get(4)?,
        created_at: row.get(5)?,
        updated_at: row.get(6)?,
    })
}

fn validate_project_id(project_id: &str) -> Result<(), AppError> {
    let parsed = Uuid::parse_str(project_id).map_err(|_| {
        AppError::new(
            crate::error::AppErrorCode::InvalidProject,
            "invalid project ID",
        )
    })?;
    if parsed.to_string() != project_id {
        return Err(AppError::new(
            crate::error::AppErrorCode::InvalidProject,
            "invalid project ID",
        ));
    }
    Ok(())
}
