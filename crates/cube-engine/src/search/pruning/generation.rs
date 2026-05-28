use std::collections::VecDeque;
use std::fs;
use std::path::{Path, PathBuf};

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
use crate::cube::cubies::{Corner, CubieState, Edge, EDGE_COUNT};
use crate::cube::moves::{Move, FACE_MOVES};
use crate::cube::{Cube, CubeValidationError};

use super::artifact::compact_entries_from_table;
use super::errors::{PruningArtifactError, PruningGenerationError, PruningTableCommandError};
use super::metadata::{
    PruningCoordinate, PruningGenerationParameters, PruningPhaseRole, PruningTableMetadata,
};
use super::table::PruningTable;
use super::{PRUNING_TABLE_FORMAT_VERSION, UNREACHED_DISTANCE};

const ARTIFACT_GENERATION_SOURCE: &str = "deterministic generated pruning-table command";
const PHASE1_MOVE_SET: &str = "phase1-face-turn-metric-v1";
const PHASE2_MOVE_SET: &str = "phase2-g1-metric-v1";
const PHASE2_MOVES: [Move; 10] = [
    Move::U,
    Move::U2,
    Move::UPrime,
    Move::D,
    Move::D2,
    Move::DPrime,
    Move::L2,
    Move::R2,
    Move::F2,
    Move::B2,
];

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum GeneratedPruningTableKind {
    Phase1CornerEdgeOrientation,
    Phase1CornerOrientationUdSlice,
    Phase1EdgeOrientationUdSlice,
    Phase2CornerPermutationSliceEdgePermutation,
    Phase2UdEdgePermutationSliceEdgePermutation,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct GeneratedPruningTableSpec {
    pub kind: GeneratedPruningTableKind,
    pub table_name: &'static str,
    pub file_name: &'static str,
    pub table_version: &'static str,
    pub phase_role: PruningPhaseRole,
    pub move_set: &'static str,
}

pub const GENERATED_PRUNING_TABLE_SPECS: [GeneratedPruningTableSpec; 5] = [
    GeneratedPruningTableSpec {
        kind: GeneratedPruningTableKind::Phase1CornerEdgeOrientation,
        table_name: "phase1-corner-edge-orientation",
        file_name: "phase1-corner-edge-orientation.rpt",
        table_version: "generated-phase1-corner-edge-orientation-v2",
        phase_role: PruningPhaseRole::Phase1,
        move_set: PHASE1_MOVE_SET,
    },
    GeneratedPruningTableSpec {
        kind: GeneratedPruningTableKind::Phase1CornerOrientationUdSlice,
        table_name: "phase1-corner-orientation-ud-slice",
        file_name: "phase1-corner-orientation-ud-slice.rpt",
        table_version: "generated-phase1-corner-orientation-ud-slice-v2",
        phase_role: PruningPhaseRole::Phase1,
        move_set: PHASE1_MOVE_SET,
    },
    GeneratedPruningTableSpec {
        kind: GeneratedPruningTableKind::Phase1EdgeOrientationUdSlice,
        table_name: "phase1-edge-orientation-ud-slice",
        file_name: "phase1-edge-orientation-ud-slice.rpt",
        table_version: "generated-phase1-edge-orientation-ud-slice-v2",
        phase_role: PruningPhaseRole::Phase1,
        move_set: PHASE1_MOVE_SET,
    },
    GeneratedPruningTableSpec {
        kind: GeneratedPruningTableKind::Phase2CornerPermutationSliceEdgePermutation,
        table_name: "phase2-corner-permutation-slice-edge-permutation",
        file_name: "phase2-corner-permutation-slice-edge-permutation.rpt",
        table_version: "generated-phase2-corner-permutation-slice-edge-permutation-v2",
        phase_role: PruningPhaseRole::Phase2,
        move_set: PHASE2_MOVE_SET,
    },
    GeneratedPruningTableSpec {
        kind: GeneratedPruningTableKind::Phase2UdEdgePermutationSliceEdgePermutation,
        table_name: "phase2-ud-edge-permutation-slice-edge-permutation",
        file_name: "phase2-ud-edge-permutation-slice-edge-permutation.rpt",
        table_version: "generated-phase2-ud-edge-permutation-slice-edge-permutation-v2",
        phase_role: PruningPhaseRole::Phase2,
        move_set: PHASE2_MOVE_SET,
    },
];

impl GeneratedPruningTableSpec {
    pub fn metadata(&self, max_depth: u8) -> PruningTableMetadata {
        PruningTableMetadata::new(
            PRUNING_TABLE_FORMAT_VERSION,
            self.table_version,
            self.phase_role,
            self.coordinates(),
            PruningGenerationParameters::new(max_depth, self.move_set, ARTIFACT_GENERATION_SOURCE),
        )
    }

    pub fn coordinates(&self) -> Vec<PruningCoordinate> {
        match self.kind {
            GeneratedPruningTableKind::Phase1CornerEdgeOrientation => vec![
                PruningCoordinate::new("corner_orientation", CORNER_ORIENTATION_COORDINATE_COUNT),
                PruningCoordinate::new("edge_orientation", EDGE_ORIENTATION_COORDINATE_COUNT),
            ],
            GeneratedPruningTableKind::Phase1CornerOrientationUdSlice => vec![
                PruningCoordinate::new("corner_orientation", CORNER_ORIENTATION_COORDINATE_COUNT),
                PruningCoordinate::new(
                    "ud_slice_edge_combination",
                    UD_SLICE_EDGE_COMBINATION_COORDINATE_COUNT,
                ),
            ],
            GeneratedPruningTableKind::Phase1EdgeOrientationUdSlice => vec![
                PruningCoordinate::new("edge_orientation", EDGE_ORIENTATION_COORDINATE_COUNT),
                PruningCoordinate::new(
                    "ud_slice_edge_combination",
                    UD_SLICE_EDGE_COMBINATION_COORDINATE_COUNT,
                ),
            ],
            GeneratedPruningTableKind::Phase2CornerPermutationSliceEdgePermutation => vec![
                PruningCoordinate::new("corner_permutation", CORNER_PERMUTATION_COORDINATE_COUNT),
                PruningCoordinate::new(
                    "slice_edge_permutation",
                    SLICE_EDGE_PERMUTATION_COORDINATE_COUNT,
                ),
            ],
            GeneratedPruningTableKind::Phase2UdEdgePermutationSliceEdgePermutation => vec![
                PruningCoordinate::new("ud_edge_permutation", UD_EDGE_PERMUTATION_COORDINATE_COUNT),
                PruningCoordinate::new(
                    "slice_edge_permutation",
                    SLICE_EDGE_PERMUTATION_COORDINATE_COUNT,
                ),
            ],
        }
    }

    pub fn file_path(&self, directory: impl AsRef<Path>) -> PathBuf {
        directory.as_ref().join(self.file_name)
    }

    pub fn generate(&self, max_depth: u8) -> Result<PruningTable, PruningGenerationError> {
        if max_depth == UNREACHED_DISTANCE {
            return Err(PruningGenerationError::MaxDepthUsesSentinel);
        }

        let metadata = self.metadata(max_depth);
        let table_size =
            metadata
                .table_size()
                .map_err(|error| PruningGenerationError::InvalidMetadata {
                    table: self.table_name,
                    error,
                })?;
        let mut entries = vec![UNREACHED_DISTANCE; table_size];
        let mut queue = VecDeque::new();

        entries[0] = 0;
        queue.push_back(0_usize);

        while let Some(index) = queue.pop_front() {
            let distance = entries[index];
            if distance >= max_depth {
                continue;
            }

            let cube = self.cube_from_index(&metadata, index)?;
            for &move_ in self.moves() {
                let mut next_cube = cube.clone();
                next_cube.apply_move(move_);
                let next_index = self.index_for_cube(&metadata, &next_cube)?;

                if entries[next_index] == UNREACHED_DISTANCE {
                    entries[next_index] = distance + 1;
                    queue.push_back(next_index);
                }
            }
        }

        PruningTable::from_dense_entries(metadata, entries).map_err(|error| {
            PruningGenerationError::DenseTable {
                table: self.table_name,
                error,
            }
        })
    }

    pub fn validate_table(
        &self,
        table: &PruningTable,
        path: impl AsRef<Path>,
    ) -> Result<(), PruningArtifactError> {
        let path = path.as_ref();
        let metadata = table.metadata();

        if metadata.format_version != PRUNING_TABLE_FORMAT_VERSION {
            return Err(spec_mismatch(
                path,
                self,
                "format_version",
                PRUNING_TABLE_FORMAT_VERSION.to_string(),
                metadata.format_version.to_string(),
            ));
        }
        if metadata.table_version != self.table_version {
            return Err(spec_mismatch(
                path,
                self,
                "table_version",
                self.table_version.to_owned(),
                metadata.table_version.clone(),
            ));
        }
        if metadata.phase_role != self.phase_role {
            return Err(spec_mismatch(
                path,
                self,
                "phase_role",
                format!("{:?}", self.phase_role),
                format!("{:?}", metadata.phase_role),
            ));
        }
        if metadata.coordinates != self.coordinates() {
            return Err(spec_mismatch(
                path,
                self,
                "coordinates",
                format!("{:?}", self.coordinates()),
                format!("{:?}", metadata.coordinates),
            ));
        }
        if metadata.generation.move_set != self.move_set {
            return Err(spec_mismatch(
                path,
                self,
                "move_set",
                self.move_set.to_owned(),
                metadata.generation.move_set.clone(),
            ));
        }
        if metadata.generation.source != ARTIFACT_GENERATION_SOURCE {
            return Err(spec_mismatch(
                path,
                self,
                "source",
                ARTIFACT_GENERATION_SOURCE.to_owned(),
                metadata.generation.source.clone(),
            ));
        }
        compact_entries_from_table(table).map_err(|error| {
            PruningArtifactError::CompactEntries {
                path: path.to_path_buf(),
                error,
            }
        })?;

        Ok(())
    }

    fn moves(&self) -> &'static [Move] {
        match self.phase_role {
            PruningPhaseRole::Phase1 => &FACE_MOVES,
            PruningPhaseRole::Phase2 => &PHASE2_MOVES,
        }
    }

    fn cube_from_index(
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

    fn index_for_cube(
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

pub fn generate_all_pruning_tables(
    output_dir: impl AsRef<Path>,
    phase1_max_depth: u8,
    phase2_max_depth: u8,
) -> Result<Vec<PathBuf>, PruningTableCommandError> {
    let output_dir = output_dir.as_ref();
    fs::create_dir_all(output_dir).map_err(|error| PruningTableCommandError::CreateOutputDir {
        path: output_dir.to_path_buf(),
        error: error.to_string(),
    })?;

    let mut paths = Vec::with_capacity(GENERATED_PRUNING_TABLE_SPECS.len());
    for spec in GENERATED_PRUNING_TABLE_SPECS {
        let max_depth = match spec.phase_role {
            PruningPhaseRole::Phase1 => phase1_max_depth,
            PruningPhaseRole::Phase2 => phase2_max_depth,
        };
        let path = spec.file_path(output_dir);
        if existing_generated_table_matches(spec, &path, max_depth) {
            paths.push(path);
            continue;
        }

        let table =
            spec.generate(max_depth)
                .map_err(|error| PruningTableCommandError::Generate {
                    table: spec.table_name,
                    error,
                })?;
        table
            .save_artifact(&path)
            .map_err(|error| PruningTableCommandError::Save {
                table: spec.table_name,
                error,
            })?;
        let loaded =
            PruningTable::load_artifact(&path).map_err(|error| PruningTableCommandError::Load {
                table: spec.table_name,
                error,
            })?;
        spec.validate_table(&loaded, &path).map_err(|error| {
            PruningTableCommandError::Validate {
                table: spec.table_name,
                error,
            }
        })?;
        paths.push(path);
    }

    Ok(paths)
}

fn existing_generated_table_matches(
    spec: GeneratedPruningTableSpec,
    path: &Path,
    max_depth: u8,
) -> bool {
    let Ok(table) = PruningTable::load_artifact(path) else {
        return false;
    };

    spec.validate_table(&table, path).is_ok() && table.metadata().generation.max_depth == max_depth
}

fn spec_mismatch(
    path: &Path,
    spec: &GeneratedPruningTableSpec,
    field: &'static str,
    expected: String,
    actual: String,
) -> PruningArtifactError {
    PruningArtifactError::SpecMismatch {
        path: path.to_path_buf(),
        table: spec.table_name,
        field,
        expected,
        actual,
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
