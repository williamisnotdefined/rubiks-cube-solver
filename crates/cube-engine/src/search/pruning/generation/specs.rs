use std::path::{Path, PathBuf};

use crate::cube::coordinates::{
    CORNER_ORIENTATION_COORDINATE_COUNT, CORNER_PERMUTATION_COORDINATE_COUNT,
    EDGE_ORIENTATION_COORDINATE_COUNT, SLICE_EDGE_PERMUTATION_COORDINATE_COUNT,
    UD_EDGE_PERMUTATION_COORDINATE_COUNT, UD_SLICE_EDGE_COMBINATION_COORDINATE_COUNT,
};
use crate::cube::moves::{Move, FACE_MOVES};

use super::super::metadata::{
    PruningCoordinate, PruningGenerationParameters, PruningPhaseRole, PruningTableMetadata,
};
use super::super::PRUNING_TABLE_FORMAT_VERSION;

pub(super) const ARTIFACT_GENERATION_SOURCE: &str = "deterministic generated pruning-table command";
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

    pub(super) fn moves(&self) -> &'static [Move] {
        match self.phase_role {
            PruningPhaseRole::Phase1 => &FACE_MOVES,
            PruningPhaseRole::Phase2 => &PHASE2_MOVES,
        }
    }
}
