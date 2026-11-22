use serde::Serialize;

use crate::db::settings::{SettingsRepository, StoredSetting, StoredSettingKey};
use crate::db::AppDatabase;
use crate::error::{AppError, AppErrorCode};

pub const APPLICATION_SETTINGS_VERSION: u8 = 1;
pub const DEFAULT_THEME_SLUG: &str = "merlin-dark";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
pub enum ThemeSlug {
    #[serde(rename = "merlin-dark")]
    MerlinDark,
}

impl ThemeSlug {
    fn parse(value: &str) -> Option<Self> {
        match value {
            DEFAULT_THEME_SLUG => Some(Self::MerlinDark),
            _ => None,
        }
    }

    fn as_str(self) -> &'static str {
        match self {
            Self::MerlinDark => DEFAULT_THEME_SLUG,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum Density {
    Default,
    Compact,
}

impl Density {
    fn parse(value: &str) -> Option<Self> {
        match value {
            "default" => Some(Self::Default),
            "compact" => Some(Self::Compact),
            _ => None,
        }
    }

    fn as_str(self) -> &'static str {
        match self {
            Self::Default => "default",
            Self::Compact => "compact",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ApplicationSettingsSnapshot {
    pub version: u8,
    pub theme_slug: ThemeSlug,
    pub density: Density,
    pub force_reduced_motion: bool,
    pub used_defaults: bool,
}

impl Default for ApplicationSettingsSnapshot {
    fn default() -> Self {
        Self {
            version: APPLICATION_SETTINGS_VERSION,
            theme_slug: ThemeSlug::MerlinDark,
            density: Density::Default,
            force_reduced_motion: false,
            used_defaults: false,
        }
    }
}

pub struct SettingsService<'a> {
    repository: SettingsRepository<'a>,
}

impl<'a> SettingsService<'a> {
    pub fn new(database: &'a AppDatabase) -> Self {
        Self {
            repository: SettingsRepository::new(database),
        }
    }

    pub fn load(&self) -> Result<ApplicationSettingsSnapshot, AppError> {
        let stored = self.repository.load()?;
        let (theme_slug, default_theme) =
            decode_theme(raw_value(&stored, StoredSettingKey::ThemeSlug));
        let (density, default_density) =
            decode_density(raw_value(&stored, StoredSettingKey::Density));
        let (force_reduced_motion, default_motion) =
            decode_motion(raw_value(&stored, StoredSettingKey::ForceReducedMotion));

        Ok(ApplicationSettingsSnapshot {
            theme_slug,
            density,
            force_reduced_motion,
            used_defaults: default_theme || default_density || default_motion,
            ..ApplicationSettingsSnapshot::default()
        })
    }

    pub fn set_theme(&self, value: &str) -> Result<ApplicationSettingsSnapshot, AppError> {
        let theme =
            ThemeSlug::parse(value).ok_or_else(|| invalid("theme setting is unsupported"))?;
        self.repository.save(
            StoredSettingKey::ThemeSlug,
            &serde_json::to_string(theme.as_str())
                .map_err(|_| invalid("theme setting cannot be serialized"))?,
        )?;
        self.load()
    }

    pub fn set_density(&self, value: &str) -> Result<ApplicationSettingsSnapshot, AppError> {
        let density =
            Density::parse(value).ok_or_else(|| invalid("density setting is unsupported"))?;
        self.repository.save(
            StoredSettingKey::Density,
            &serde_json::to_string(density.as_str())
                .map_err(|_| invalid("density setting cannot be serialized"))?,
        )?;
        self.load()
    }

    pub fn set_force_reduced_motion(
        &self,
        value: bool,
    ) -> Result<ApplicationSettingsSnapshot, AppError> {
        self.repository.save(
            StoredSettingKey::ForceReducedMotion,
            if value { "true" } else { "false" },
        )?;
        self.load()
    }
}

fn raw_value(stored: &[StoredSetting], key: StoredSettingKey) -> Option<&str> {
    stored
        .iter()
        .find(|setting| setting.key == key)
        .map(|setting| setting.value_json.as_str())
}

fn decode_theme(value_json: Option<&str>) -> (ThemeSlug, bool) {
    let decoded = value_json
        .and_then(|value| serde_json::from_str::<String>(value).ok())
        .and_then(|value| ThemeSlug::parse(&value));
    match decoded {
        Some(theme) => (theme, false),
        None => (ThemeSlug::MerlinDark, true),
    }
}

fn decode_density(value_json: Option<&str>) -> (Density, bool) {
    let decoded = value_json
        .and_then(|value| serde_json::from_str::<String>(value).ok())
        .and_then(|value| Density::parse(&value));
    match decoded {
        Some(density) => (density, false),
        None => (Density::Default, true),
    }
}

fn decode_motion(value_json: Option<&str>) -> (bool, bool) {
    let decoded = value_json.and_then(|value| serde_json::from_str::<bool>(value).ok());
    match decoded {
        Some(value) => (value, false),
        None => (false, true),
    }
}

fn invalid(message: &'static str) -> AppError {
    AppError::new(AppErrorCode::InvalidSettings, message)
}
