use crate::cube::coordinates::{
    corner_orientation_coordinate, corner_permutation_coordinate_from_permutation,
    corner_permutation_from_coordinate, cubie_state_from_corner_orientation_coordinate,
    cubie_state_from_edge_orientation_coordinate, edge_orientation_coordinate,
    slice_edge_permutation_coordinate_from_permutation, slice_edge_permutation_from_coordinate,
    ud_edge_permutation_coordinate_from_permutation, ud_edge_permutation_from_coordinate,
    ud_slice_edge_combination_coordinate, ud_slice_edge_combination_membership_from_coordinate,
    CORNER_ORIENTATION_COORDINATE_COUNT, CORNER_PERMUTATION_COORDINATE_COUNT,
    EDGE_ORIENTATION_COORDINATE_COUNT, SLICE_EDGE_PERMUTATION_COORDINATE_COUNT,
    UD_EDGE_PERMUTATION_COORDINATE_COUNT, UD_SLICE_EDGE_COMBINATION_COORDINATE_COUNT,
};
use crate::cube::cubies::{Corner, Edge};
use crate::cube::moves::FACE_MOVES;
use crate::cube::{Cube, CubeValidationError, CubieState};

use super::constants::{
    PHASE1_MOVE_COUNT, PHASE2_MOVES, PHASE2_MOVE_COUNT, UD_NON_SLICE_EDGES, UD_SLICE_EDGES,
};
use super::coordinates::{Phase1Coordinates, Phase2Coordinates};
use super::GeneratedTwoPhaseError;

#[derive(Clone, Debug, Eq, PartialEq)]
pub(super) struct Phase1MoveTables {
    corner_orientation: Vec<[usize; PHASE1_MOVE_COUNT]>,
    edge_orientation: Vec<[usize; PHASE1_MOVE_COUNT]>,
    ud_slice: Vec<[usize; PHASE1_MOVE_COUNT]>,
}

impl Phase1MoveTables {
    pub(super) fn generate() -> Result<Self, GeneratedTwoPhaseError> {
        Ok(Self {
            corner_orientation: generate_corner_orientation_move_table()?,
            edge_orientation: generate_edge_orientation_move_table()?,
            ud_slice: generate_ud_slice_move_table()?,
        })
    }

    pub(super) fn next(
        &self,
        coordinates: Phase1Coordinates,
        move_index: usize,
    ) -> Phase1Coordinates {
        Phase1Coordinates {
            corner_orientation: self.corner_orientation[coordinates.corner_orientation][move_index],
            edge_orientation: self.edge_orientation[coordinates.edge_orientation][move_index],
            ud_slice: self.ud_slice[coordinates.ud_slice][move_index],
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub(super) struct Phase2MoveTables {
    corner_permutation: Vec<[usize; PHASE2_MOVE_COUNT]>,
    ud_edge_permutation: Vec<[usize; PHASE2_MOVE_COUNT]>,
    slice_edge_permutation: Vec<[usize; PHASE2_MOVE_COUNT]>,
}

impl Phase2MoveTables {
    pub(super) fn generate() -> Result<Self, GeneratedTwoPhaseError> {
        Ok(Self {
            corner_permutation: generate_corner_permutation_move_table()?,
            ud_edge_permutation: generate_ud_edge_permutation_move_table()?,
            slice_edge_permutation: generate_slice_edge_permutation_move_table()?,
        })
    }

    pub(super) fn next(
        &self,
        coordinates: Phase2Coordinates,
        move_index: usize,
    ) -> Phase2Coordinates {
        Phase2Coordinates {
            corner_permutation: self.corner_permutation[coordinates.corner_permutation][move_index],
            ud_edge_permutation: self.ud_edge_permutation[coordinates.ud_edge_permutation]
                [move_index],
            slice_edge_permutation: self.slice_edge_permutation[coordinates.slice_edge_permutation]
                [move_index],
        }
    }
}

fn generate_corner_orientation_move_table(
) -> Result<Vec<[usize; PHASE1_MOVE_COUNT]>, GeneratedTwoPhaseError> {
    let mut table = Vec::with_capacity(CORNER_ORIENTATION_COORDINATE_COUNT);

    for index in 0..CORNER_ORIENTATION_COORDINATE_COUNT {
        let state = cubie_state_from_corner_orientation_coordinate(index).map_err(|error| {
            GeneratedTwoPhaseError::Coordinate {
                phase: "phase1_corner_orientation_move_table",
                error: error.to_string(),
            }
        })?;
        let cube = cube_from_phase1_representative_state(
            "phase1_corner_orientation_move_table",
            index,
            state,
        )?;
        table.push(phase1_coordinate_move_row(&cube, |cube| {
            corner_orientation_coordinate(cube.state()).map_err(|error| error.to_string())
        })?);
    }

    Ok(table)
}

fn generate_edge_orientation_move_table(
) -> Result<Vec<[usize; PHASE1_MOVE_COUNT]>, GeneratedTwoPhaseError> {
    let mut table = Vec::with_capacity(EDGE_ORIENTATION_COORDINATE_COUNT);

    for index in 0..EDGE_ORIENTATION_COORDINATE_COUNT {
        let state = cubie_state_from_edge_orientation_coordinate(index).map_err(|error| {
            GeneratedTwoPhaseError::Coordinate {
                phase: "phase1_edge_orientation_move_table",
                error: error.to_string(),
            }
        })?;
        let cube = cube_from_phase1_representative_state(
            "phase1_edge_orientation_move_table",
            index,
            state,
        )?;
        table.push(phase1_coordinate_move_row(&cube, |cube| {
            edge_orientation_coordinate(cube.state()).map_err(|error| error.to_string())
        })?);
    }

    Ok(table)
}

fn generate_ud_slice_move_table() -> Result<Vec<[usize; PHASE1_MOVE_COUNT]>, GeneratedTwoPhaseError>
{
    let mut table = Vec::with_capacity(UD_SLICE_EDGE_COMBINATION_COORDINATE_COUNT);

    for index in 0..UD_SLICE_EDGE_COMBINATION_COORDINATE_COUNT {
        let state = cubie_state_from_ud_slice_coordinate(index)?;
        let cube =
            cube_from_phase1_representative_state("phase1_ud_slice_move_table", index, state)?;
        table.push(phase1_coordinate_move_row(&cube, |cube| {
            ud_slice_edge_combination_coordinate(cube.state()).map_err(|error| error.to_string())
        })?);
    }

    Ok(table)
}

fn generate_corner_permutation_move_table(
) -> Result<Vec<[usize; PHASE2_MOVE_COUNT]>, GeneratedTwoPhaseError> {
    let mut table = Vec::with_capacity(CORNER_PERMUTATION_COORDINATE_COUNT);

    for index in 0..CORNER_PERMUTATION_COORDINATE_COUNT {
        let mut state = CubieState::solved();
        state.corner_permutation = corner_permutation_from_coordinate(index).map_err(|error| {
            GeneratedTwoPhaseError::Coordinate {
                phase: "phase2_corner_permutation_move_table",
                error: error.to_string(),
            }
        })?;
        let cube = cube_from_phase2_representative_state_adjusting_ud_edge_parity(
            "phase2_corner_permutation_move_table",
            index,
            state,
        )?;
        table.push(phase2_coordinate_move_row(&cube, |cube| {
            corner_permutation_coordinate_from_permutation(&cube.state().corner_permutation)
                .map_err(|error| error.to_string())
        })?);
    }

    Ok(table)
}

fn generate_ud_edge_permutation_move_table(
) -> Result<Vec<[usize; PHASE2_MOVE_COUNT]>, GeneratedTwoPhaseError> {
    let mut table = Vec::with_capacity(UD_EDGE_PERMUTATION_COORDINATE_COUNT);

    for index in 0..UD_EDGE_PERMUTATION_COORDINATE_COUNT {
        let mut state = CubieState::solved();
        let ud_edges = ud_edge_permutation_from_coordinate(index).map_err(|error| {
            GeneratedTwoPhaseError::Coordinate {
                phase: "phase2_ud_edge_permutation_move_table",
                error: error.to_string(),
            }
        })?;
        state.edge_permutation[..8].copy_from_slice(&ud_edges);
        let cube = cube_from_phase2_representative_state_adjusting_corner_parity(
            "phase2_ud_edge_permutation_move_table",
            index,
            state,
        )?;
        table.push(phase2_coordinate_move_row(&cube, |cube| {
            ud_edge_permutation_coordinate_from_permutation(&cube.state().edge_permutation)
                .map_err(|error| error.to_string())
        })?);
    }

    Ok(table)
}

fn generate_slice_edge_permutation_move_table(
) -> Result<Vec<[usize; PHASE2_MOVE_COUNT]>, GeneratedTwoPhaseError> {
    let mut table = Vec::with_capacity(SLICE_EDGE_PERMUTATION_COORDINATE_COUNT);

    for index in 0..SLICE_EDGE_PERMUTATION_COORDINATE_COUNT {
        let mut state = CubieState::solved();
        let slice_edges = slice_edge_permutation_from_coordinate(index).map_err(|error| {
            GeneratedTwoPhaseError::Coordinate {
                phase: "phase2_slice_edge_permutation_move_table",
                error: error.to_string(),
            }
        })?;
        state.edge_permutation[8..].copy_from_slice(&slice_edges);
        let cube = cube_from_phase2_representative_state_adjusting_corner_parity(
            "phase2_slice_edge_permutation_move_table",
            index,
            state,
        )?;
        table.push(phase2_coordinate_move_row(&cube, |cube| {
            slice_edge_permutation_coordinate_from_permutation(&cube.state().edge_permutation)
                .map_err(|error| error.to_string())
        })?);
    }

    Ok(table)
}

fn phase1_coordinate_move_row(
    cube: &Cube,
    coordinate: impl Fn(&Cube) -> Result<usize, String>,
) -> Result<[usize; PHASE1_MOVE_COUNT], GeneratedTwoPhaseError> {
    let mut row = [0; PHASE1_MOVE_COUNT];

    for (move_index, move_) in FACE_MOVES.into_iter().enumerate() {
        let mut next_cube = cube.clone();
        next_cube.apply_move(move_);
        row[move_index] =
            coordinate(&next_cube).map_err(|error| GeneratedTwoPhaseError::Coordinate {
                phase: "phase1_move_table",
                error,
            })?;
    }

    Ok(row)
}

fn phase2_coordinate_move_row(
    cube: &Cube,
    coordinate: impl Fn(&Cube) -> Result<usize, String>,
) -> Result<[usize; PHASE2_MOVE_COUNT], GeneratedTwoPhaseError> {
    let mut row = [0; PHASE2_MOVE_COUNT];

    for (move_index, move_) in PHASE2_MOVES.into_iter().enumerate() {
        let mut next_cube = cube.clone();
        next_cube.apply_move(move_);
        row[move_index] =
            coordinate(&next_cube).map_err(|error| GeneratedTwoPhaseError::Coordinate {
                phase: "phase2_move_table",
                error,
            })?;
    }

    Ok(row)
}

fn cubie_state_from_ud_slice_coordinate(
    index: usize,
) -> Result<CubieState, GeneratedTwoPhaseError> {
    let membership =
        ud_slice_edge_combination_membership_from_coordinate(index).map_err(|error| {
            GeneratedTwoPhaseError::Coordinate {
                phase: "phase1_ud_slice_move_table",
                error: error.to_string(),
            }
        })?;
    let mut state = CubieState::solved();
    let mut slice_edges = UD_SLICE_EDGES.into_iter();
    let mut non_slice_edges = UD_NON_SLICE_EDGES.into_iter();

    for (position, is_slice) in membership.iter().copied().enumerate() {
        state.edge_permutation[position] = if is_slice {
            slice_edges
                .next()
                .ok_or_else(|| GeneratedTwoPhaseError::Coordinate {
                    phase: "phase1_ud_slice_move_table",
                    error: "UD-slice membership selected too many slice edges".to_owned(),
                })?
        } else {
            non_slice_edges
                .next()
                .ok_or_else(|| GeneratedTwoPhaseError::Coordinate {
                    phase: "phase1_ud_slice_move_table",
                    error: "UD-slice membership selected too many non-slice edges".to_owned(),
                })?
        };
    }

    Ok(state)
}

fn cube_from_phase1_representative_state(
    phase: &'static str,
    index: usize,
    mut state: CubieState,
) -> Result<Cube, GeneratedTwoPhaseError> {
    match Cube::try_from_state(state.clone()) {
        Ok(cube) => Ok(cube),
        Err(CubeValidationError::InvalidPermutationParity { .. }) => {
            state
                .corner_permutation
                .swap(Corner::Urf.index(), Corner::Ufl.index());
            Cube::try_from_state(state).map_err(|error| GeneratedTwoPhaseError::Coordinate {
                phase,
                error: format!("representative state {index} is invalid: {error}"),
            })
        }
        Err(error) => Err(GeneratedTwoPhaseError::Coordinate {
            phase,
            error: format!("representative state {index} is invalid: {error}"),
        }),
    }
}

fn cube_from_phase2_representative_state_adjusting_corner_parity(
    phase: &'static str,
    index: usize,
    mut state: CubieState,
) -> Result<Cube, GeneratedTwoPhaseError> {
    match Cube::try_from_state(state.clone()) {
        Ok(cube) => Ok(cube),
        Err(CubeValidationError::InvalidPermutationParity { .. }) => {
            state
                .corner_permutation
                .swap(Corner::Urf.index(), Corner::Ufl.index());
            Cube::try_from_state(state).map_err(|error| GeneratedTwoPhaseError::Coordinate {
                phase,
                error: format!("representative state {index} is invalid: {error}"),
            })
        }
        Err(error) => Err(GeneratedTwoPhaseError::Coordinate {
            phase,
            error: format!("representative state {index} is invalid: {error}"),
        }),
    }
}

fn cube_from_phase2_representative_state_adjusting_ud_edge_parity(
    phase: &'static str,
    index: usize,
    mut state: CubieState,
) -> Result<Cube, GeneratedTwoPhaseError> {
    match Cube::try_from_state(state.clone()) {
        Ok(cube) => Ok(cube),
        Err(CubeValidationError::InvalidPermutationParity { .. }) => {
            state
                .edge_permutation
                .swap(Edge::Ur.index(), Edge::Uf.index());
            Cube::try_from_state(state).map_err(|error| GeneratedTwoPhaseError::Coordinate {
                phase,
                error: format!("representative state {index} is invalid: {error}"),
            })
        }
        Err(error) => Err(GeneratedTwoPhaseError::Coordinate {
            phase,
            error: format!("representative state {index} is invalid: {error}"),
        }),
    }
}
