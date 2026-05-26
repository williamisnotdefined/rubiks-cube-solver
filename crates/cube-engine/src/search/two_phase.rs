use super::pruning::{
    PruningCoordinate, PruningGenerationParameters, PruningPhaseRole, PruningTable,
    PruningTableMetadata,
};
use super::solution::{SearchBudget, SearchOutcome, SearchSolution};
use crate::cube::coordinates::{
    corner_orientation_coordinate, corner_permutation_coordinate_from_permutation,
    edge_orientation_coordinate, slice_edge_permutation_coordinate_from_permutation,
    ud_edge_permutation_coordinate_from_permutation, ud_slice_edge_combination_coordinate,
    CORNER_ORIENTATION_COORDINATE_COUNT, EDGE_ORIENTATION_COORDINATE_COUNT,
    UD_SLICE_EDGE_COMBINATION_COORDINATE_COUNT,
};
use crate::cube::moves::FACE_MOVES;
use crate::cube::Cube;

const TINY_PHASE1_DEPTH1_FIXTURE: &str =
    include_str!("../../tests/fixtures/pruning_tables/tiny_phase1_depth1.txt");

/// Deterministic two-phase baseline backed only by the tiny committed phase-1 fixture.
///
/// This is intentionally not a full generated-table solver. Until full phase-1 and phase-2
/// tables exist, it only returns solved states and fixture-covered one-move states.
pub fn solve_two_phase_baseline(start: &Cube, budget: SearchBudget) -> SearchOutcome {
    let mut explored_nodes = 0;

    if !has_node_budget(budget, explored_nodes) {
        return SearchOutcome::NotFoundWithinLimits { explored_nodes };
    }

    explored_nodes += 1;

    let table = match PruningTable::from_fixture_str(TINY_PHASE1_DEPTH1_FIXTURE) {
        Ok(table) => table,
        Err(_) => return SearchOutcome::NotFoundWithinLimits { explored_nodes },
    };
    let phase1_coordinates = match phase1_coordinates(start) {
        Some(coordinates) => coordinates,
        None => return SearchOutcome::NotFoundWithinLimits { explored_nodes },
    };
    let phase1_distance =
        match table.checked_lookup(&expected_tiny_phase1_metadata(), &phase1_coordinates) {
            Ok(distance) => usize::from(distance),
            Err(_) => return SearchOutcome::NotFoundWithinLimits { explored_nodes },
        };

    if phase1_distance > budget.max_depth {
        return SearchOutcome::NotFoundWithinLimits { explored_nodes };
    }

    if start.is_solved() && phase2_coordinates_are_solved(start) {
        return SearchOutcome::Found(SearchSolution::with_metrics(Vec::new(), explored_nodes));
    }

    if phase1_distance != 1 || budget.max_depth == 0 {
        return SearchOutcome::NotFoundWithinLimits { explored_nodes };
    }

    for move_ in FACE_MOVES {
        if !has_node_budget(budget, explored_nodes) {
            return SearchOutcome::NotFoundWithinLimits { explored_nodes };
        }

        explored_nodes += 1;

        let mut candidate = start.clone();
        candidate.apply_move(move_);

        if candidate.is_solved() && phase2_coordinates_are_solved(&candidate) {
            return SearchOutcome::Found(SearchSolution::with_metrics(vec![move_], explored_nodes));
        }
    }

    SearchOutcome::NotFoundWithinLimits { explored_nodes }
}

fn has_node_budget(budget: SearchBudget, explored_nodes: usize) -> bool {
    match budget.max_nodes {
        Some(max_nodes) => explored_nodes < max_nodes,
        None => true,
    }
}

fn phase1_coordinates(cube: &Cube) -> Option<[usize; 3]> {
    Some([
        corner_orientation_coordinate(cube.state()).ok()?,
        edge_orientation_coordinate(cube.state()).ok()?,
        ud_slice_edge_combination_coordinate(cube.state()).ok()?,
    ])
}

fn phase2_coordinates_are_solved(cube: &Cube) -> bool {
    let state = cube.state();

    matches!(
        corner_permutation_coordinate_from_permutation(&state.corner_permutation),
        Ok(0)
    ) && matches!(
        slice_edge_permutation_coordinate_from_permutation(&state.edge_permutation),
        Ok(0)
    ) && matches!(
        ud_edge_permutation_coordinate_from_permutation(&state.edge_permutation),
        Ok(0)
    )
}

fn expected_tiny_phase1_metadata() -> PruningTableMetadata {
    PruningTableMetadata::new(
        1,
        "tiny-phase1-depth1-v1",
        PruningPhaseRole::Phase1,
        vec![
            PruningCoordinate::new("corner_orientation", CORNER_ORIENTATION_COORDINATE_COUNT),
            PruningCoordinate::new("edge_orientation", EDGE_ORIENTATION_COORDINATE_COUNT),
            PruningCoordinate::new(
                "ud_slice_edge_combination",
                UD_SLICE_EDGE_COMBINATION_COORDINATE_COUNT,
            ),
        ],
        PruningGenerationParameters::new(
            1,
            "face-turn-metric-depth1",
            "committed deterministic test fixture",
        ),
    )
}
