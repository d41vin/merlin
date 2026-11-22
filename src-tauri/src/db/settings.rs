use rusqlite::params;

use crate::db::{utc_timestamp, AppDatabase};
use crate::error::AppError;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum StoredSettingKey {
    ThemeSlug,
    Density,
    ForceReducedMotion,
}

impl StoredSettingKey {
    pub(crate) const ALL: [Self; 3] = [Self::ThemeSlug, Self::Density, Self::ForceReducedMotion];

    pub(crate) fn as_str(self) -> &'static str {
        match self {
            Self::ThemeSlug => "app.theme_slug.v1",
            Self::Density => "app.density.v1",
            Self::ForceReducedMotion => "app.accessibility.force_reduced_motion.v1",
        }
    }

    fn parse(value: &str) -> Option<Self> {
        Self::ALL
            .into_iter()
            .find(|candidate| candidate.as_str() == value)
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct StoredSetting {
    pub(crate) key: StoredSettingKey,
    pub(crate) value_json: String,
}

pub(crate) struct SettingsRepository<'a> {
    database: &'a AppDatabase,
}

impl<'a> SettingsRepository<'a> {
    pub(crate) fn new(database: &'a AppDatabase) -> Self {
        Self { database }
    }

    pub(crate) fn load(&self) -> Result<Vec<StoredSetting>, AppError> {
        let connection = self.database.lock()?;
        let mut statement =
            connection.prepare("SELECT key, value_json FROM settings WHERE key IN (?1, ?2, ?3)")?;
        let rows = statement.query_map(
            params![
                StoredSettingKey::ThemeSlug.as_str(),
                StoredSettingKey::Density.as_str(),
                StoredSettingKey::ForceReducedMotion.as_str(),
            ],
            |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)),
        )?;

        let mut stored = Vec::with_capacity(StoredSettingKey::ALL.len());
        for row in rows {
            let (key, value_json) = row?;
            let key = StoredSettingKey::parse(&key).ok_or_else(AppError::database)?;
            stored.push(StoredSetting { key, value_json });
        }
        Ok(stored)
    }

    pub(crate) fn save(&self, key: StoredSettingKey, value_json: &str) -> Result<(), AppError> {
        let timestamp = utc_timestamp()?;
        let connection = self.database.lock()?;
        let affected = connection.execute(
            "INSERT INTO settings (key, value_json, updated_at) VALUES (?1, ?2, ?3) \
             ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, \
             updated_at = excluded.updated_at",
            params![key.as_str(), value_json, timestamp],
        )?;
        if affected != 1 {
            return Err(AppError::database());
        }
        Ok(())
    }
}
