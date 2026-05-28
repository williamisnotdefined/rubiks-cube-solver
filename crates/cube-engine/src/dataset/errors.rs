use std::fmt;

use crate::cube::CubeValidationError;

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DatasetGenerationError {
    InvalidGeneratedState {
        state: String,
        error: CubeValidationError,
    },
    UnverifiedSolutionLabel {
        state: String,
        scramble: String,
        verified_solution: String,
    },
    UnableToGenerateUniqueExamples {
        requested: usize,
        generated: usize,
        attempts: usize,
        max_scramble_depth: usize,
    },
}

impl fmt::Display for DatasetGenerationError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidGeneratedState { state, error } => write!(
                formatter,
                "generated invalid cubie state {state:?}: {error}"
            ),
            Self::UnverifiedSolutionLabel {
                state,
                scramble,
                verified_solution,
            } => write!(
                formatter,
                "verified solution label {verified_solution:?} for state {state:?} from scramble {scramble:?} did not solve the cube"
            ),
            Self::UnableToGenerateUniqueExamples {
                requested,
                generated,
                attempts,
                max_scramble_depth,
            } => write!(
                formatter,
                "could not generate {requested} unique examples with max scramble depth {max_scramble_depth}; generated {generated} after {attempts} attempts"
            ),
        }
    }
}

impl std::error::Error for DatasetGenerationError {}
