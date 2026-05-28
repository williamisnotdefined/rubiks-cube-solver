use crate::cube::coordinates::{
    corner_orientation_coordinate, corner_permutation_coordinate_from_permutation,
    edge_orientation_coordinate, slice_edge_permutation_coordinate_from_permutation,
    ud_edge_permutation_coordinate_from_permutation, ud_slice_edge_combination_coordinate,
};
use crate::cube::Cube;

use super::GeneratedTwoPhaseError;

#[derive(Clone, Copy, Debug, Eq, Hash, PartialEq)]
pub(super) struct Phase1Coordinates {
    pub corner_orientation: usize,
    pub edge_orientation: usize,
    pub ud_slice: usize,
}

#[derive(Clone, Copy, Debug, Eq, Hash, PartialEq)]
pub(super) struct Phase2Coordinates {
    pub corner_permutation: usize,
    pub ud_edge_permutation: usize,
    pub slice_edge_permutation: usize,
}

impl Phase2Coordinates {
    pub(super) fn try_from_cube(cube: &Cube) -> Result<Self, GeneratedTwoPhaseError> {
        let state = cube.state();

        Ok(Self {
            corner_permutation: corner_permutation_coordinate_from_permutation(
                &state.corner_permutation,
            )
            .map_err(|error| GeneratedTwoPhaseError::Coordinate {
                phase: "phase2",
                error: error.to_string(),
            })?,
            ud_edge_permutation: ud_edge_permutation_coordinate_from_permutation(
                &state.edge_permutation,
            )
            .map_err(|error| GeneratedTwoPhaseError::Coordinate {
                phase: "phase2",
                error: error.to_string(),
            })?,
            slice_edge_permutation: slice_edge_permutation_coordinate_from_permutation(
                &state.edge_permutation,
            )
            .map_err(|error| GeneratedTwoPhaseError::Coordinate {
                phase: "phase2",
                error: error.to_string(),
            })?,
        })
    }

    pub(super) const fn is_goal(self) -> bool {
        self.corner_permutation == 0
            && self.ud_edge_permutation == 0
            && self.slice_edge_permutation == 0
    }
}

impl Phase1Coordinates {
    pub(super) fn try_from_cube(cube: &Cube) -> Result<Self, GeneratedTwoPhaseError> {
        let state = cube.state();

        Ok(Self {
            corner_orientation: corner_orientation_coordinate(state).map_err(|error| {
                GeneratedTwoPhaseError::Coordinate {
                    phase: "phase1",
                    error: error.to_string(),
                }
            })?,
            edge_orientation: edge_orientation_coordinate(state).map_err(|error| {
                GeneratedTwoPhaseError::Coordinate {
                    phase: "phase1",
                    error: error.to_string(),
                }
            })?,
            ud_slice: ud_slice_edge_combination_coordinate(state).map_err(|error| {
                GeneratedTwoPhaseError::Coordinate {
                    phase: "phase1",
                    error: error.to_string(),
                }
            })?,
        })
    }

    pub(super) const fn is_goal(self) -> bool {
        self.corner_orientation == 0 && self.edge_orientation == 0 && self.ud_slice == 0
    }
}
