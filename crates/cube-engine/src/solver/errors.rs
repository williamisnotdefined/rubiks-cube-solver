use std::fmt;

use crate::cube::{CubeValidationError, FaceletConversionError, FaceletParseError, NotationError};
use crate::search::GeneratedTwoPhaseError;

use super::SolverConfig;

/// Playback failures preserve the structured parser and validation errors underneath.
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum FaceletPlaybackError {
    CubieValidation { error: CubeValidationError },
    FaceletParse { error: FaceletParseError },
    FaceletConversion { error: FaceletConversionError },
    Notation { error: NotationError },
}

impl fmt::Display for FaceletPlaybackError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::CubieValidation { error } => write!(formatter, "invalid cubie state: {error}"),
            Self::FaceletParse { error } => write!(formatter, "invalid facelet input: {error}"),
            Self::FaceletConversion { error } => {
                write!(formatter, "facelet conversion failed: {error}")
            }
            Self::Notation { error } => write!(formatter, "invalid move notation: {error}"),
        }
    }
}

impl std::error::Error for FaceletPlaybackError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::CubieValidation { error } => Some(error),
            Self::FaceletParse { error } => Some(error),
            Self::FaceletConversion { error } => Some(error),
            Self::Notation { error } => Some(error),
        }
    }
}

impl From<CubeValidationError> for FaceletPlaybackError {
    fn from(error: CubeValidationError) -> Self {
        Self::CubieValidation { error }
    }
}

impl From<FaceletParseError> for FaceletPlaybackError {
    fn from(error: FaceletParseError) -> Self {
        Self::FaceletParse { error }
    }
}

impl From<FaceletConversionError> for FaceletPlaybackError {
    fn from(error: FaceletConversionError) -> Self {
        Self::FaceletConversion { error }
    }
}

impl From<NotationError> for FaceletPlaybackError {
    fn from(error: NotationError) -> Self {
        Self::Notation { error }
    }
}

/// Input failures that must remain distinct from search-limit failures.
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum SolveInputError {
    CubieValidation { error: CubeValidationError },
    FaceletParse { error: FaceletParseError },
    FaceletConversion { error: FaceletConversionError },
}

impl fmt::Display for SolveInputError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::CubieValidation { error } => write!(formatter, "invalid cubie state: {error}"),
            Self::FaceletParse { error } => write!(formatter, "invalid facelet input: {error}"),
            Self::FaceletConversion { error } => {
                write!(formatter, "facelet conversion failed: {error}")
            }
        }
    }
}

impl std::error::Error for SolveInputError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::CubieValidation { error } => Some(error),
            Self::FaceletParse { error } => Some(error),
            Self::FaceletConversion { error } => Some(error),
        }
    }
}

impl From<CubeValidationError> for SolveInputError {
    fn from(error: CubeValidationError) -> Self {
        Self::CubieValidation { error }
    }
}

impl From<FaceletParseError> for SolveInputError {
    fn from(error: FaceletParseError) -> Self {
        Self::FaceletParse { error }
    }
}

impl From<FaceletConversionError> for SolveInputError {
    fn from(error: FaceletConversionError) -> Self {
        Self::FaceletConversion { error }
    }
}

/// Public solver failure that separates invalid inputs from exhausted search limits.
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum SolveError {
    InvalidInput {
        error: SolveInputError,
    },
    GeneratedTablesUnavailable {
        config: SolverConfig,
        error: Box<GeneratedTwoPhaseError>,
    },
    GeneratedTablesCorrupt {
        config: SolverConfig,
        error: Box<GeneratedTwoPhaseError>,
    },
    NotFoundWithinLimits {
        config: SolverConfig,
        explored_nodes: usize,
    },
}

impl fmt::Display for SolveError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidInput { error } => write!(formatter, "invalid solver input: {error}"),
            Self::GeneratedTablesUnavailable { config, error } => write!(
                formatter,
                "generated two-phase pruning tables are unavailable for strategy {}: {error}",
                config.strategy.id()
            ),
            Self::GeneratedTablesCorrupt { config, error } => write!(
                formatter,
                "generated two-phase pruning tables are corrupt or incompatible for strategy {}: {error}",
                config.strategy.id()
            ),
            Self::NotFoundWithinLimits {
                config,
                explored_nodes,
            } => match config.max_nodes {
                Some(max_nodes) => write!(
                    formatter,
                    "no solution found within limits: max_depth={}, max_nodes={}, explored_nodes={}",
                    config.max_depth, max_nodes, explored_nodes
                ),
                None => write!(
                    formatter,
                    "no solution found within limits: max_depth={}, max_nodes=unlimited, explored_nodes={}",
                    config.max_depth, explored_nodes
                ),
            },
        }
    }
}

impl std::error::Error for SolveError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::InvalidInput { error } => Some(error),
            Self::GeneratedTablesUnavailable { error, .. }
            | Self::GeneratedTablesCorrupt { error, .. } => Some(error.as_ref()),
            Self::NotFoundWithinLimits { .. } => None,
        }
    }
}

impl From<SolveInputError> for SolveError {
    fn from(error: SolveInputError) -> Self {
        Self::InvalidInput { error }
    }
}
