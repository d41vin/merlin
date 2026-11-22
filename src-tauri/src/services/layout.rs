use serde::{Deserialize, Serialize};

use crate::error::{PreflightError, PreflightErrorCode};

pub const PANEL_LAYOUT_VERSION: u8 = 1;
pub const ORDERED_PANEL_IDS: [&str; 4] = ["docs", "todos", "activity", "resources"];

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PanelLayout {
    pub version: u8,
    pub panels: Vec<PanelState>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PanelState {
    /// Kept as a string so malformed identifiers reach typed validation rather than an enum shortcut.
    pub id: String,
    pub size: f64,
    pub restore_size: f64,
    pub collapsed: bool,
}

impl PanelLayout {
    pub fn validate(&self) -> Result<(), PreflightError> {
        if self.version != PANEL_LAYOUT_VERSION {
            return Err(invalid("layout version must be 1"));
        }

        if self.panels.len() != ORDERED_PANEL_IDS.len() {
            return Err(invalid("layout must contain exactly four panels"));
        }

        for (index, panel) in self.panels.iter().enumerate() {
            if panel.id != ORDERED_PANEL_IDS[index] {
                return Err(invalid(
                    "panel identifiers must be unique and ordered as docs, todos, activity, resources",
                ));
            }

            if !panel.size.is_finite() || !(0.0..=100.0).contains(&panel.size) {
                return Err(invalid("panel sizes must be finite and between 0 and 100"));
            }

            if !panel.restore_size.is_finite()
                || panel.restore_size <= 0.0
                || panel.restore_size > 100.0
            {
                return Err(invalid(
                    "restore sizes must be finite, greater than 0, and at most 100",
                ));
            }

            if panel.collapsed != (panel.size == 0.0) {
                return Err(invalid(
                    "collapsed must be true exactly when the corresponding size is zero",
                ));
            }
        }

        let total: f64 = self.panels.iter().map(|panel| panel.size).sum();
        if !total.is_finite() || (total - 100.0).abs() > 0.01 {
            return Err(invalid("panel sizes must sum to 100 within 0.01"));
        }

        Ok(())
    }
}

fn invalid(message: &str) -> PreflightError {
    PreflightError::new(PreflightErrorCode::InvalidLayout, message)
}
