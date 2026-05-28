use std::path::Path;
use std::sync::OnceLock;

use crate::search::pruning::{GeneratedPruningTableKind, PruningLookupError, PruningTable};

use super::artifacts::{load_generated_table_from_artifacts, load_generated_table_from_dir};
use super::constants::{
    EDGE_ORIENTATION_COORDINATE_COUNT, SLICE_EDGE_PERMUTATION_COORDINATE_COUNT,
    UD_SLICE_EDGE_COMBINATION_COORDINATE_COUNT,
};
use super::coordinates::{Phase1Coordinates, Phase2Coordinates};
use super::move_tables::{Phase1MoveTables, Phase2MoveTables};
use super::{GeneratedPruningTableArtifact, GeneratedTwoPhaseError, TwoPhaseSearchContext};

#[derive(Clone, Debug, Eq, PartialEq)]
pub(super) struct GeneratedPruningTables {
    phase1_corner_edge_orientation: PruningTable,
    phase1_corner_orientation_ud_slice: PruningTable,
    phase1_edge_orientation_ud_slice: PruningTable,
    phase2_corner_permutation_slice_edge_permutation: PruningTable,
    phase2_ud_edge_permutation_slice_edge_permutation: PruningTable,
    pub(super) phase1_move_tables: &'static Phase1MoveTables,
    pub(super) phase2_move_tables: &'static Phase2MoveTables,
}

impl GeneratedPruningTables {
    pub(super) fn load_from_dir(directory: &Path) -> Result<Self, GeneratedTwoPhaseError> {
        Ok(Self {
            phase1_corner_edge_orientation: load_generated_table_from_dir(
                directory,
                GeneratedPruningTableKind::Phase1CornerEdgeOrientation,
            )?,
            phase1_corner_orientation_ud_slice: load_generated_table_from_dir(
                directory,
                GeneratedPruningTableKind::Phase1CornerOrientationUdSlice,
            )?,
            phase1_edge_orientation_ud_slice: load_generated_table_from_dir(
                directory,
                GeneratedPruningTableKind::Phase1EdgeOrientationUdSlice,
            )?,
            phase2_corner_permutation_slice_edge_permutation: load_generated_table_from_dir(
                directory,
                GeneratedPruningTableKind::Phase2CornerPermutationSliceEdgePermutation,
            )?,
            phase2_ud_edge_permutation_slice_edge_permutation: load_generated_table_from_dir(
                directory,
                GeneratedPruningTableKind::Phase2UdEdgePermutationSliceEdgePermutation,
            )?,
            phase1_move_tables: phase1_move_tables()?,
            phase2_move_tables: phase2_move_tables()?,
        })
    }

    pub(super) fn load_from_artifacts(
        artifacts: &[GeneratedPruningTableArtifact<'_>],
    ) -> Result<Self, GeneratedTwoPhaseError> {
        Ok(Self {
            phase1_corner_edge_orientation: load_generated_table_from_artifacts(
                artifacts,
                GeneratedPruningTableKind::Phase1CornerEdgeOrientation,
            )?,
            phase1_corner_orientation_ud_slice: load_generated_table_from_artifacts(
                artifacts,
                GeneratedPruningTableKind::Phase1CornerOrientationUdSlice,
            )?,
            phase1_edge_orientation_ud_slice: load_generated_table_from_artifacts(
                artifacts,
                GeneratedPruningTableKind::Phase1EdgeOrientationUdSlice,
            )?,
            phase2_corner_permutation_slice_edge_permutation: load_generated_table_from_artifacts(
                artifacts,
                GeneratedPruningTableKind::Phase2CornerPermutationSliceEdgePermutation,
            )?,
            phase2_ud_edge_permutation_slice_edge_permutation: load_generated_table_from_artifacts(
                artifacts,
                GeneratedPruningTableKind::Phase2UdEdgePermutationSliceEdgePermutation,
            )?,
            phase1_move_tables: phase1_move_tables()?,
            phase2_move_tables: phase2_move_tables()?,
        })
    }

    pub(super) fn phase1_heuristic_coordinates(
        &self,
        coordinates: Phase1Coordinates,
        context: &mut TwoPhaseSearchContext,
    ) -> Result<usize, GeneratedTwoPhaseError> {
        let corner_edge = table_distance_index(
            "phase1",
            &self.phase1_corner_edge_orientation,
            coordinates.corner_orientation * EDGE_ORIENTATION_COORDINATE_COUNT
                + coordinates.edge_orientation,
            context,
        )?;
        let corner_slice = table_distance_index(
            "phase1",
            &self.phase1_corner_orientation_ud_slice,
            coordinates.corner_orientation * UD_SLICE_EDGE_COMBINATION_COORDINATE_COUNT
                + coordinates.ud_slice,
            context,
        )?;
        let edge_slice = table_distance_index(
            "phase1",
            &self.phase1_edge_orientation_ud_slice,
            coordinates.edge_orientation * UD_SLICE_EDGE_COMBINATION_COORDINATE_COUNT
                + coordinates.ud_slice,
            context,
        )?;

        Ok(corner_edge.max(corner_slice).max(edge_slice))
    }

    pub(super) fn phase2_heuristic_coordinates(
        &self,
        coordinates: Phase2Coordinates,
        context: &mut TwoPhaseSearchContext,
    ) -> Result<usize, GeneratedTwoPhaseError> {
        let corner_slice = table_distance_index(
            "phase2",
            &self.phase2_corner_permutation_slice_edge_permutation,
            coordinates.corner_permutation * SLICE_EDGE_PERMUTATION_COORDINATE_COUNT
                + coordinates.slice_edge_permutation,
            context,
        )?;
        let ud_slice = table_distance_index(
            "phase2",
            &self.phase2_ud_edge_permutation_slice_edge_permutation,
            coordinates.ud_edge_permutation * SLICE_EDGE_PERMUTATION_COORDINATE_COUNT
                + coordinates.slice_edge_permutation,
            context,
        )?;

        Ok(corner_slice.max(ud_slice))
    }
}

fn phase1_move_tables() -> Result<&'static Phase1MoveTables, GeneratedTwoPhaseError> {
    static PHASE1_MOVE_TABLES: OnceLock<Result<Phase1MoveTables, GeneratedTwoPhaseError>> =
        OnceLock::new();

    PHASE1_MOVE_TABLES
        .get_or_init(Phase1MoveTables::generate)
        .as_ref()
        .map_err(Clone::clone)
}

fn phase2_move_tables() -> Result<&'static Phase2MoveTables, GeneratedTwoPhaseError> {
    static PHASE2_MOVE_TABLES: OnceLock<Result<Phase2MoveTables, GeneratedTwoPhaseError>> =
        OnceLock::new();

    PHASE2_MOVE_TABLES
        .get_or_init(Phase2MoveTables::generate)
        .as_ref()
        .map_err(Clone::clone)
}

pub(super) fn table_distance_index(
    phase: &'static str,
    table: &PruningTable,
    index: usize,
    context: &mut TwoPhaseSearchContext,
) -> Result<usize, GeneratedTwoPhaseError> {
    match table.lookup_index(index) {
        Ok(distance) => Ok(usize::from(distance)),
        Err(PruningLookupError::MissingEntry { .. }) => {
            context.record_missing_table_entry();
            Ok(usize::from(table.metadata().generation.max_depth) + 1)
        }
        Err(error) => Err(GeneratedTwoPhaseError::Coordinate {
            phase,
            error: error.to_string(),
        }),
    }
}
