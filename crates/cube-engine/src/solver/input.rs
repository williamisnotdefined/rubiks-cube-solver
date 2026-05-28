use crate::cube::{Cube, CubieState, FaceletString};
use crate::search::GeneratedPruningTableArtifact;

use super::{
    solve_cube, solve_cube_with_generated_pruning_tables, SolveError, SolveInputError, SolveResult,
    SolverConfig,
};

/// Solve a validated cubie state through the configured deterministic search path.
pub fn solve_cubie_state(
    state: CubieState,
    config: SolverConfig,
) -> Result<SolveResult, SolveError> {
    state.validate().map_err(SolveInputError::from)?;

    let cube = Cube::try_from_state(state).map_err(SolveInputError::from)?;
    solve_cube(&cube, config)
}

/// Validate a user-facing 54-character facelet string without running search.
pub fn validate_facelet_string(input: &str) -> Result<(), SolveInputError> {
    let state = validated_facelet_state(input)?;

    state.validate().map_err(SolveInputError::from)
}

/// Solve a user-facing 54-character facelet string through the cubie solver path.
pub fn solve_facelet_string(input: &str, config: SolverConfig) -> Result<SolveResult, SolveError> {
    let state = validated_facelet_state(input)?;

    solve_cubie_state(state, config)
}

/// Solve a user-facing facelet string with browser-provided generated pruning artifacts.
pub fn solve_facelet_string_with_generated_pruning_tables(
    input: &str,
    max_depth: usize,
    max_nodes: Option<usize>,
    artifacts: &[GeneratedPruningTableArtifact<'_>],
) -> Result<SolveResult, SolveError> {
    let state = validated_facelet_state(input)?;

    solve_cubie_state_with_generated_pruning_tables(state, max_depth, max_nodes, artifacts)
}

/// Solve a validated cubie state with browser-provided generated pruning artifacts.
pub fn solve_cubie_state_with_generated_pruning_tables(
    state: CubieState,
    max_depth: usize,
    max_nodes: Option<usize>,
    artifacts: &[GeneratedPruningTableArtifact<'_>],
) -> Result<SolveResult, SolveError> {
    state.validate().map_err(SolveInputError::from)?;

    let cube = Cube::try_from_state(state).map_err(SolveInputError::from)?;
    solve_cube_with_generated_pruning_tables(&cube, max_depth, max_nodes, artifacts)
}

fn validated_facelet_state(input: &str) -> Result<CubieState, SolveInputError> {
    let facelets = FaceletString::parse(input).map_err(SolveInputError::from)?;

    facelets.to_cubie_state().map_err(SolveInputError::from)
}
