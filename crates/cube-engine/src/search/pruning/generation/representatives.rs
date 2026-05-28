use crate::cube::coordinates::{
    corner_orientation_coordinate, corner_permutation_coordinate_from_permutation,
    corner_permutation_from_coordinate, cubie_state_from_corner_orientation_coordinate,
    cubie_state_from_edge_orientation_coordinate, edge_orientation_coordinate,
    slice_edge_permutation_coordinate_from_permutation, slice_edge_permutation_from_coordinate,
    ud_edge_permutation_coordinate_from_permutation, ud_edge_permutation_from_coordinate,
    ud_slice_edge_combination_coordinate, ud_slice_edge_combination_membership_from_coordinate,
};
use crate::cube::cubies::{Corner, CubieState, Edge, EDGE_COUNT};
use crate::cube::{Cube, CubeValidationError};

use super::super::errors::PruningGenerationError;
use super::super::metadata::PruningTableMetadata;
use super::specs::{GeneratedPruningTableKind, GeneratedPruningTableSpec};

impl GeneratedPruningTableSpec {
    pub(super) fn cube_from_index(
        &self,
        metadata: &PruningTableMetadata,
        index: usize,
    ) -> Result<Cube, PruningGenerationError> {
        let coordinates = metadata.coordinates_from_index(index).map_err(|_| {
            PruningGenerationError::CoordinateLookup {
                table: self.table_name,
                index,
            }
        })?;

        match self.kind {
            GeneratedPruningTableKind::Phase1CornerEdgeOrientation => {
                let mut state = CubieState::solved();
                state.corner_orientation =
                    cubie_state_from_corner_orientation_coordinate(coordinates[0])
                        .map_err(|error| PruningGenerationError::CoordinateError {
                            table: self.table_name,
                            message: error.to_string(),
                        })?
                        .corner_orientation;
                state.edge_orientation =
                    cubie_state_from_edge_orientation_coordinate(coordinates[1])
                        .map_err(|error| PruningGenerationError::CoordinateError {
                            table: self.table_name,
                            message: error.to_string(),
                        })?
                        .edge_orientation;

                cube_from_representative_state(self, index, state)
            }
            GeneratedPruningTableKind::Phase1CornerOrientationUdSlice => {
                let mut state = CubieState::solved();
                state.corner_orientation =
                    cubie_state_from_corner_orientation_coordinate(coordinates[0])
                        .map_err(|error| PruningGenerationError::CoordinateError {
                            table: self.table_name,
                            message: error.to_string(),
                        })?
                        .corner_orientation;
                state.edge_permutation = edge_permutation_from_ud_slice_coordinate(coordinates[1])
                    .map_err(|error| PruningGenerationError::CoordinateError {
                        table: self.table_name,
                        message: error.to_string(),
                    })?;

                cube_from_representative_state(self, index, state)
            }
            GeneratedPruningTableKind::Phase1EdgeOrientationUdSlice => {
                let mut state = CubieState::solved();
                state.edge_orientation =
                    cubie_state_from_edge_orientation_coordinate(coordinates[0])
                        .map_err(|error| PruningGenerationError::CoordinateError {
                            table: self.table_name,
                            message: error.to_string(),
                        })?
                        .edge_orientation;
                state.edge_permutation = edge_permutation_from_ud_slice_coordinate(coordinates[1])
                    .map_err(|error| PruningGenerationError::CoordinateError {
                        table: self.table_name,
                        message: error.to_string(),
                    })?;

                cube_from_representative_state(self, index, state)
            }
            GeneratedPruningTableKind::Phase2CornerPermutationSliceEdgePermutation => {
                let mut state = CubieState::solved();
                state.corner_permutation = corner_permutation_from_coordinate(coordinates[0])
                    .map_err(|error| PruningGenerationError::CoordinateError {
                        table: self.table_name,
                        message: error.to_string(),
                    })?;
                apply_slice_edge_permutation(&mut state, coordinates[1])?;

                cube_from_state_adjusting_ud_edge_parity(self, index, state)
            }
            GeneratedPruningTableKind::Phase2UdEdgePermutationSliceEdgePermutation => {
                let mut state = CubieState::solved();
                let ud_edges =
                    ud_edge_permutation_from_coordinate(coordinates[0]).map_err(|error| {
                        PruningGenerationError::CoordinateError {
                            table: self.table_name,
                            message: error.to_string(),
                        }
                    })?;
                state.edge_permutation[..8].copy_from_slice(&ud_edges);
                apply_slice_edge_permutation(&mut state, coordinates[1])?;

                cube_from_state_adjusting_corner_parity(self, index, state)
            }
        }
    }

    pub(super) fn index_for_cube(
        &self,
        metadata: &PruningTableMetadata,
        cube: &Cube,
    ) -> Result<usize, PruningGenerationError> {
        let state = cube.state();
        let coordinates =
            match self.kind {
                GeneratedPruningTableKind::Phase1CornerEdgeOrientation => vec![
                    corner_orientation_coordinate(state).map_err(|error| {
                        PruningGenerationError::CoordinateError {
                            table: self.table_name,
                            message: error.to_string(),
                        }
                    })?,
                    edge_orientation_coordinate(state).map_err(|error| {
                        PruningGenerationError::CoordinateError {
                            table: self.table_name,
                            message: error.to_string(),
                        }
                    })?,
                ],
                GeneratedPruningTableKind::Phase1CornerOrientationUdSlice => vec![
                    corner_orientation_coordinate(state).map_err(|error| {
                        PruningGenerationError::CoordinateError {
                            table: self.table_name,
                            message: error.to_string(),
                        }
                    })?,
                    ud_slice_edge_combination_coordinate(state).map_err(|error| {
                        PruningGenerationError::CoordinateError {
                            table: self.table_name,
                            message: error.to_string(),
                        }
                    })?,
                ],
                GeneratedPruningTableKind::Phase1EdgeOrientationUdSlice => vec![
                    edge_orientation_coordinate(state).map_err(|error| {
                        PruningGenerationError::CoordinateError {
                            table: self.table_name,
                            message: error.to_string(),
                        }
                    })?,
                    ud_slice_edge_combination_coordinate(state).map_err(|error| {
                        PruningGenerationError::CoordinateError {
                            table: self.table_name,
                            message: error.to_string(),
                        }
                    })?,
                ],
                GeneratedPruningTableKind::Phase2CornerPermutationSliceEdgePermutation => vec![
                    corner_permutation_coordinate_from_permutation(&state.corner_permutation)
                        .map_err(|error| PruningGenerationError::CoordinateError {
                            table: self.table_name,
                            message: error.to_string(),
                        })?,
                    slice_edge_permutation_coordinate_from_permutation(&state.edge_permutation)
                        .map_err(|error| PruningGenerationError::CoordinateError {
                            table: self.table_name,
                            message: error.to_string(),
                        })?,
                ],
                GeneratedPruningTableKind::Phase2UdEdgePermutationSliceEdgePermutation => vec![
                    ud_edge_permutation_coordinate_from_permutation(&state.edge_permutation)
                        .map_err(|error| PruningGenerationError::CoordinateError {
                            table: self.table_name,
                            message: error.to_string(),
                        })?,
                    slice_edge_permutation_coordinate_from_permutation(&state.edge_permutation)
                        .map_err(|error| PruningGenerationError::CoordinateError {
                            table: self.table_name,
                            message: error.to_string(),
                        })?,
                ],
            };

        metadata.coordinate_index(&coordinates).map_err(|error| {
            PruningGenerationError::CoordinateError {
                table: self.table_name,
                message: error.to_string(),
            }
        })
    }
}

fn edge_permutation_from_ud_slice_coordinate(index: usize) -> Result<[Edge; EDGE_COUNT], String> {
    let membership = ud_slice_edge_combination_membership_from_coordinate(index)
        .map_err(|error| error.to_string())?;
    let mut permutation = Edge::ALL;
    let mut slice_edges = [Edge::Fr, Edge::Fl, Edge::Bl, Edge::Br].into_iter();
    let mut ud_edges = [
        Edge::Ur,
        Edge::Uf,
        Edge::Ul,
        Edge::Ub,
        Edge::Dr,
        Edge::Df,
        Edge::Dl,
        Edge::Db,
    ]
    .into_iter();

    for (position, is_slice) in membership.iter().copied().enumerate() {
        permutation[position] = if is_slice {
            slice_edges
                .next()
                .ok_or_else(|| "UD-slice membership selected too many slice edges".to_owned())?
        } else {
            ud_edges
                .next()
                .ok_or_else(|| "UD-slice membership selected too many U/D edges".to_owned())?
        };
    }

    Ok(permutation)
}

fn apply_slice_edge_permutation(
    state: &mut CubieState,
    coordinate: usize,
) -> Result<(), PruningGenerationError> {
    let slice_edges = slice_edge_permutation_from_coordinate(coordinate).map_err(|error| {
        PruningGenerationError::CoordinateError {
            table: "slice-edge-permutation",
            message: error.to_string(),
        }
    })?;
    state.edge_permutation[8..].copy_from_slice(&slice_edges);

    Ok(())
}

fn cube_from_representative_state(
    spec: &GeneratedPruningTableSpec,
    index: usize,
    state: CubieState,
) -> Result<Cube, PruningGenerationError> {
    cube_from_state_adjusting_corner_parity(spec, index, state)
}

fn cube_from_state_adjusting_corner_parity(
    spec: &GeneratedPruningTableSpec,
    index: usize,
    mut state: CubieState,
) -> Result<Cube, PruningGenerationError> {
    match Cube::try_from_state(state.clone()) {
        Ok(cube) => Ok(cube),
        Err(CubeValidationError::InvalidPermutationParity { .. }) => {
            state
                .corner_permutation
                .swap(Corner::Urf.index(), Corner::Ufl.index());
            Cube::try_from_state(state).map_err(|error| {
                PruningGenerationError::InvalidRepresentative {
                    table: spec.table_name,
                    index,
                    error,
                }
            })
        }
        Err(error) => Err(PruningGenerationError::InvalidRepresentative {
            table: spec.table_name,
            index,
            error,
        }),
    }
}

fn cube_from_state_adjusting_ud_edge_parity(
    spec: &GeneratedPruningTableSpec,
    index: usize,
    mut state: CubieState,
) -> Result<Cube, PruningGenerationError> {
    match Cube::try_from_state(state.clone()) {
        Ok(cube) => Ok(cube),
        Err(CubeValidationError::InvalidPermutationParity { .. }) => {
            state
                .edge_permutation
                .swap(Edge::Ur.index(), Edge::Uf.index());
            Cube::try_from_state(state).map_err(|error| {
                PruningGenerationError::InvalidRepresentative {
                    table: spec.table_name,
                    index,
                    error,
                }
            })
        }
        Err(error) => Err(PruningGenerationError::InvalidRepresentative {
            table: spec.table_name,
            index,
            error,
        }),
    }
}
