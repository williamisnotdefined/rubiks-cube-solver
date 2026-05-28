use std::fmt;

use crate::cube::{CubeValidationError, FaceletConversionError, FaceletParseError, NotationError};
use crate::solver::{FaceletPlaybackError, SolveInputError};

use super::types::QualitySolverSelection;

#[derive(Debug)]
pub enum QualityReportError {
    FixtureNotation {
        fixture_id: &'static str,
        error: NotationError,
    },
    FixtureCubieValidation {
        fixture_id: &'static str,
        error: CubeValidationError,
    },
    FixtureFaceletParse {
        fixture_id: &'static str,
        error: FaceletParseError,
    },
    FixtureFaceletConversion {
        fixture_id: &'static str,
        error: Box<FaceletConversionError>,
    },
    FixtureRoundTripMismatch {
        fixture_id: &'static str,
    },
    UnexpectedInvalidInput {
        fixture_id: &'static str,
        solver_selection: QualitySolverSelection,
        error: Box<SolveInputError>,
    },
    ReplayFailure {
        fixture_id: &'static str,
        solver_selection: QualitySolverSelection,
        error: Box<FaceletPlaybackError>,
    },
    UnverifiedSuccess {
        fixture_id: &'static str,
        solver_selection: QualitySolverSelection,
    },
}

impl fmt::Display for QualityReportError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::FixtureNotation { fixture_id, error } => {
                write!(formatter, "quality fixture {fixture_id} has invalid notation: {error}")
            }
            Self::FixtureCubieValidation { fixture_id, error } => write!(
                formatter,
                "quality fixture {fixture_id} generated an invalid cubie state: {error}"
            ),
            Self::FixtureFaceletParse { fixture_id, error } => write!(
                formatter,
                "quality fixture {fixture_id} generated invalid facelets: {error}"
            ),
            Self::FixtureFaceletConversion { fixture_id, error } => write!(
                formatter,
                "quality fixture {fixture_id} facelets did not convert to cubies: {error}"
            ),
            Self::FixtureRoundTripMismatch { fixture_id } => write!(
                formatter,
                "quality fixture {fixture_id} facelets did not round-trip to the generated cubie state"
            ),
            Self::UnexpectedInvalidInput {
                fixture_id,
                solver_selection,
                error,
            } => write!(
                formatter,
                "quality fixture {fixture_id} was rejected by {}: {error}",
                solver_selection.label()
            ),
            Self::ReplayFailure {
                fixture_id,
                solver_selection,
                error,
            } => write!(
                formatter,
                "quality fixture {fixture_id} could not replay solution from {}: {error}",
                solver_selection.label()
            ),
            Self::UnverifiedSuccess {
                fixture_id,
                solver_selection,
            } => write!(
                formatter,
                "quality fixture {fixture_id} returned an unverified success from {}",
                solver_selection.label()
            ),
        }
    }
}

impl std::error::Error for QualityReportError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::FixtureNotation { error, .. } => Some(error),
            Self::FixtureCubieValidation { error, .. } => Some(error),
            Self::FixtureFaceletParse { error, .. } => Some(error),
            Self::FixtureFaceletConversion { error, .. } => Some(error.as_ref()),
            Self::UnexpectedInvalidInput { error, .. } => Some(error.as_ref()),
            Self::ReplayFailure { error, .. } => Some(error.as_ref()),
            Self::FixtureRoundTripMismatch { .. } | Self::UnverifiedSuccess { .. } => None,
        }
    }
}
