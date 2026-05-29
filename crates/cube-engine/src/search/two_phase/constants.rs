use crate::cube::cubies::Edge;
use crate::cube::moves::{Move, FACE_MOVES};

pub(super) const TINY_PHASE1_DEPTH1_FIXTURE: &str =
    include_str!("../../../tests/fixtures/pruning_tables/tiny_phase1_depth1.txt");

pub(super) const PHASE2_MOVES: [Move; 10] = [
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

pub(super) const PHASE1_MOVE_COUNT: usize = FACE_MOVES.len();
pub(super) const PHASE2_MOVE_COUNT: usize = PHASE2_MOVES.len();
pub(super) const EDGE_ORIENTATION_COORDINATE_COUNT: usize =
    crate::cube::coordinates::EDGE_ORIENTATION_COORDINATE_COUNT;
pub(super) const SLICE_EDGE_PERMUTATION_COORDINATE_COUNT: usize =
    crate::cube::coordinates::SLICE_EDGE_PERMUTATION_COORDINATE_COUNT;
pub(super) const UD_SLICE_EDGE_COMBINATION_COORDINATE_COUNT: usize =
    crate::cube::coordinates::UD_SLICE_EDGE_COMBINATION_COORDINATE_COUNT;
pub(super) const QUALITY_PROBE_MAX_DEPTH: usize = 16;
pub(super) const QUALITY_PROBE_NODE_CAP: usize = 3_000_000;
pub(super) const QUALITY_DEPTH_16_NODE_CAP: usize = 3_000_000;
pub(super) const QUALITY_DEPTH_18_NODE_CAP: usize = 1_000_000;
pub(super) const QUALITY_DEPTH_20_NODE_CAP: usize = 3_000_000;
pub(super) const QUALITY_DEPTH_20_DEEP_NODE_THRESHOLD: usize = 50_000_000;
pub(super) const QUALITY_DEPTH_20_DEEP_NODE_CAP: usize = 40_000_000;
pub(super) const MULTIPROBE_TARGET_DEPTH: usize = 16;
pub(super) const MULTIPROBE_NODE_CAP: usize = 2_000_000;
pub(super) const UD_SLICE_EDGES: [Edge; 4] = [Edge::Fr, Edge::Fl, Edge::Bl, Edge::Br];
pub(super) const UD_NON_SLICE_EDGES: [Edge; 8] = [
    Edge::Ur,
    Edge::Uf,
    Edge::Ul,
    Edge::Ub,
    Edge::Dr,
    Edge::Df,
    Edge::Dl,
    Edge::Db,
];
