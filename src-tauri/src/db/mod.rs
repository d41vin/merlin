pub mod path;
pub mod projects;
pub mod settings;
pub mod sync;

pub use path::DATABASE_FILE_NAME;

use std::path::{Path, PathBuf};
use std::sync::{Mutex, MutexGuard};
use std::time::Duration;

use rusqlite::{params, Connection, OptionalExtension};
use serde_json::json;
use time::{format_description::well_known::Rfc3339, OffsetDateTime};

use crate::error::{AppError, AppErrorCode};
use crate::security::credentials::CredentialReference;
use crate::services::layout::PanelLayout;
use path::{database_file_in_directory, prepare_data_directory};
use sync::{operation_from_row, SyncOperation, SyncState, OPERATION_COLUMNS};

mod embedded {
    use refinery::embed_migrations;
    embed_migrations!("migrations");
}

const LAYOUT_SETTING_KEY: &str = "preflight.panel_layout.v1";
const CREDENTIAL_REFERENCE_PROOF_KEY: &str = "preflight.credential_reference_proof";

pub struct AppDatabase {
    connection: Mutex<Connection>,
    file_path: PathBuf,
    data_directory: PathBuf,
}

impl AppDatabase {
    pub fn open_in_data_dir(data_directory: &Path) -> Result<Self, AppError> {
        let directory = prepare_data_directory(data_directory)?;
        let database_file = database_file_in_directory(&directory)?;
        Self::open_file(&database_file)
    }

    pub fn open_file(file_path: &Path) -> Result<Self, AppError> {
        let mut connection = Connection::open(file_path)?;
        connection.busy_timeout(Duration::from_secs(5))?;
        connection.execute_batch(
            "PRAGMA foreign_keys = ON;\
             PRAGMA journal_mode = WAL;",
        )?;
        embedded::migrations::runner()
            .run(&mut connection)
            .map_err(|_| AppError::database())?;

        let data_directory = file_path
            .parent()
            .ok_or_else(|| {
                AppError::new(
                    AppErrorCode::PathOutsideRoot,
                    "application database must have a parent directory",
                )
            })?
            .to_path_buf();

        Ok(Self {
            connection: Mutex::new(connection),
            file_path: file_path.to_path_buf(),
            data_directory,
        })
    }

    pub fn file_path(&self) -> &Path {
        &self.file_path
    }

    pub fn data_directory(&self) -> &Path {
        &self.data_directory
    }

    pub fn load_layout(&self) -> Result<Option<PanelLayout>, AppError> {
        let connection = self.lock()?;
        let stored = connection
            .query_row(
                "SELECT value_json FROM settings WHERE key = ?1",
                params![LAYOUT_SETTING_KEY],
                |row| row.get::<_, String>(0),
            )
            .optional()?;
        drop(connection);

        stored
            .map(|value| serde_json::from_str::<PanelLayout>(&value).map_err(AppError::from))
            .transpose()
    }

    pub fn save_layout(&self, layout: &PanelLayout) -> Result<(), AppError> {
        layout.validate()?;
        let value = serde_json::to_string(layout).map_err(|_| {
            AppError::new(AppErrorCode::InvalidLayout, "layout cannot be serialized")
        })?;
        let timestamp = utc_timestamp()?;
        let connection = self.lock()?;
        connection.execute(
            "INSERT INTO settings (key, value_json, updated_at) VALUES (?1, ?2, ?3) \
             ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, \
             updated_at = excluded.updated_at",
            params![LAYOUT_SETTING_KEY, value, timestamp],
        )?;
        Ok(())
    }

    /// Phase 0-only reference persistence proof. No credential value is accepted here.
    pub fn save_credential_reference_for_proof(
        &self,
        reference: &CredentialReference,
    ) -> Result<(), AppError> {
        let value = serde_json::to_string(&json!({ "credentialReference": reference.as_str() }))?;
        let timestamp = utc_timestamp()?;
        let connection = self.lock()?;
        connection.execute(
            "INSERT INTO settings (key, value_json, updated_at) VALUES (?1, ?2, ?3) \
             ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, \
             updated_at = excluded.updated_at",
            params![CREDENTIAL_REFERENCE_PROOF_KEY, value, timestamp],
        )?;
        Ok(())
    }

    pub fn insert_sync_operation(&self, operation: &SyncOperation) -> Result<(), AppError> {
        let source_path = database_path(&operation.source_path)?;
        let destination_path = database_path(&operation.destination_path)?;
        let staging_path = database_path(&operation.staging_path)?;
        let snapshot_path = database_path(&operation.snapshot_path)?;
        let connection = self.lock()?;
        connection.execute(
            "INSERT INTO sync_operations (\
                operation_id, source_side, destination_side, source_path, destination_path, \
                staging_path, snapshot_path, baseline_hash, expected_source_hash, \
                expected_destination_hash, intended_result_hash, repository_context, state, \
                created_at, updated_at\
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
            params![
                operation.operation_id,
                operation.source_side.as_str(),
                operation.destination_side.as_str(),
                source_path,
                destination_path,
                staging_path,
                snapshot_path,
                operation.baseline_hash,
                operation.expected_source_hash,
                operation.expected_destination_hash,
                operation.intended_result_hash,
                operation.repository_context,
                operation.state.as_str(),
                operation.created_at,
                operation.updated_at,
            ],
        )?;
        Ok(())
    }

    pub fn get_sync_operation(
        &self,
        operation_id: &str,
    ) -> Result<Option<SyncOperation>, AppError> {
        validate_operation_id(operation_id)?;
        let connection = self.lock()?;
        let sql =
            format!("SELECT {OPERATION_COLUMNS} FROM sync_operations WHERE operation_id = ?1");
        Ok(connection
            .query_row(&sql, params![operation_id], operation_from_row)
            .optional()?)
    }

    pub fn update_sync_state(
        &self,
        operation_id: &str,
        state: SyncState,
    ) -> Result<String, AppError> {
        validate_operation_id(operation_id)?;
        let timestamp = utc_timestamp()?;
        let connection = self.lock()?;
        let affected = connection.execute(
            "UPDATE sync_operations SET state = ?2, updated_at = ?3 WHERE operation_id = ?1",
            params![operation_id, state.as_str(), timestamp],
        )?;
        if affected != 1 {
            return Err(AppError::database());
        }
        Ok(timestamp)
    }

    pub fn list_incomplete_sync_operations(&self) -> Result<Vec<SyncOperation>, AppError> {
        let connection = self.lock()?;
        let sql = format!(
            "SELECT {OPERATION_COLUMNS} FROM sync_operations \
             WHERE state != 'committed' ORDER BY created_at, operation_id"
        );
        let mut statement = connection.prepare(&sql)?;
        let rows = statement.query_map([], operation_from_row)?;
        let mut operations = Vec::new();
        for operation in rows {
            operations.push(operation?);
        }
        Ok(operations)
    }

    fn lock(&self) -> Result<MutexGuard<'_, Connection>, AppError> {
        self.connection
            .lock()
            .map_err(|_| AppError::new(AppErrorCode::Database, "SQLite connection lock failed"))
    }
}

fn database_path(path: &Path) -> Result<&str, AppError> {
    path.to_str().ok_or_else(|| {
        AppError::new(
            AppErrorCode::PathUnavailable,
            "Phase 0 recovery records require UTF-8 paths",
        )
    })
}

fn validate_operation_id(operation_id: &str) -> Result<(), AppError> {
    uuid::Uuid::parse_str(operation_id)
        .map_err(|_| AppError::new(AppErrorCode::RecoveryRequired, "invalid sync operation ID"))?;
    if operation_id.len() != 36 {
        return Err(AppError::new(
            AppErrorCode::RecoveryRequired,
            "invalid sync operation ID",
        ));
    }
    Ok(())
}

pub(crate) fn utc_timestamp() -> Result<String, AppError> {
    OffsetDateTime::now_utc()
        .format(&Rfc3339)
        .map_err(|_| AppError::database())
}

#[cfg(test)]
mod tests {
    use super::AppDatabase;

    #[test]
    fn connection_has_required_sqlite_safety_settings() {
        let directory = tempfile::tempdir().expect("temporary directory");
        let database =
            AppDatabase::open_in_data_dir(directory.path()).expect("database should open");
        let connection = database.lock().expect("connection lock");
        let foreign_keys: i64 = connection
            .query_row("PRAGMA foreign_keys", [], |row| row.get(0))
            .expect("foreign key setting");
        let journal_mode: String = connection
            .query_row("PRAGMA journal_mode", [], |row| row.get(0))
            .expect("journal mode setting");
        let busy_timeout: i64 = connection
            .query_row("PRAGMA busy_timeout", [], |row| row.get(0))
            .expect("busy timeout setting");
        assert_eq!(foreign_keys, 1);
        assert_eq!(journal_mode.to_ascii_lowercase(), "wal");
        assert_eq!(busy_timeout, 5_000);
    }
}
