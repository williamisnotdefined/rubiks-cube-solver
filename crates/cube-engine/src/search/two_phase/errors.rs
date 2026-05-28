use std::fmt;
use std::path::PathBuf;

use crate::search::pruning::{GeneratedPruningTableKind, PruningArtifactError};

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum GeneratedTwoPhaseError {
    MissingSpec {
        kind: GeneratedPruningTableKind,
    },
    TableMissing {
        table: &'static str,
        path: PathBuf,
    },
    TableUnavailable {
        table: &'static str,
        path: PathBuf,
        error: Box<PruningArtifactError>,
    },
    TableCorrupt {
        table: &'static str,
        path: PathBuf,
        error: Box<PruningArtifactError>,
    },
    TableIncompatible {
        table: &'static str,
        path: PathBuf,
        error: Box<PruningArtifactError>,
    },
    Coordinate {
        phase: &'static str,
        error: String,
    },
}

impl fmt::Display for GeneratedTwoPhaseError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::MissingSpec { kind } => {
                write!(
                    formatter,
                    "generated two-phase table spec is missing: {kind:?}"
                )
            }
            Self::TableMissing { table, path } => write!(
                formatter,
                "generated two-phase table {table} is missing at {}",
                path.display()
            ),
            Self::TableUnavailable { table, path, error } => write!(
                formatter,
                "generated two-phase table {table} is unavailable at {}: {error}",
                path.display()
            ),
            Self::TableCorrupt { table, path, error } => write!(
                formatter,
                "generated two-phase table {table} at {} is corrupt: {error}",
                path.display()
            ),
            Self::TableIncompatible { table, path, error } => write!(
                formatter,
                "generated two-phase table {table} at {} is incompatible: {error}",
                path.display()
            ),
            Self::Coordinate { phase, error } => {
                write!(
                    formatter,
                    "generated two-phase {phase} coordinate failed: {error}"
                )
            }
        }
    }
}

impl std::error::Error for GeneratedTwoPhaseError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::TableUnavailable { error, .. }
            | Self::TableCorrupt { error, .. }
            | Self::TableIncompatible { error, .. } => Some(error.as_ref()),
            Self::MissingSpec { .. } | Self::TableMissing { .. } | Self::Coordinate { .. } => None,
        }
    }
}

impl GeneratedTwoPhaseError {
    pub fn is_corrupt_or_incompatible(&self) -> bool {
        matches!(
            self,
            Self::TableCorrupt { .. } | Self::TableIncompatible { .. }
        )
    }
}
