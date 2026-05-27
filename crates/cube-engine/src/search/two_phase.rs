use std::collections::HashSet;
use std::fmt;
use std::path::{Path, PathBuf};
use std::sync::OnceLock;

use super::pruning::{
    GeneratedPruningTableKind, GeneratedPruningTableSpec, PruningArtifactError, PruningCoordinate,
    PruningGenerationParameters, PruningLookupError, PruningPhaseRole, PruningTable,
    PruningTableMetadata, GENERATED_PRUNING_TABLE_SPECS,
};
use super::solution::{SearchBudget, SearchOutcome, SearchSolution};
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
use crate::cube::moves::{Face, Move, FACE_MOVES};
use crate::cube::{Cube, CubeValidationError, CubieState};

const TINY_PHASE1_DEPTH1_FIXTURE: &str =
    include_str!("../../tests/fixtures/pruning_tables/tiny_phase1_depth1.txt");

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
const PHASE1_MOVE_COUNT: usize = FACE_MOVES.len();
const PHASE2_MOVE_COUNT: usize = PHASE2_MOVES.len();
const UD_SLICE_EDGES: [Edge; 4] = [Edge::Fr, Edge::Fl, Edge::Bl, Edge::Br];
const UD_NON_SLICE_EDGES: [Edge; 8] = [
    Edge::Ur,
    Edge::Uf,
    Edge::Ul,
    Edge::Ub,
    Edge::Dr,
    Edge::Df,
    Edge::Dl,
    Edge::Db,
];

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum GeneratedTwoPhaseError {
    MissingSpec {
        kind: GeneratedPruningTableKind,
    },
    TableMissing {
        table: &'static str,
        path: PathBuf,
    },
    TableUnavailable {
        table: &'static str,
        path: PathBuf,
        error: Box<PruningArtifactError>,
    },
    TableCorrupt {
        table: &'static str,
        path: PathBuf,
        error: Box<PruningArtifactError>,
    },
    TableIncompatible {
        table: &'static str,
        path: PathBuf,
        error: Box<PruningArtifactError>,
    },
    Coordinate {
        phase: &'static str,
        error: String,
    },
}

impl fmt::Display for GeneratedTwoPhaseError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::MissingSpec { kind } => {
                write!(
                    formatter,
                    "generated two-phase table spec is missing: {kind:?}"
                )
            }
            Self::TableMissing { table, path } => write!(
                formatter,
                "generated two-phase table {table} is missing at {}",
                path.display()
            ),
            Self::TableUnavailable { table, path, error } => write!(
                formatter,
                "generated two-phase table {table} is unavailable at {}: {error}",
                path.display()
            ),
            Self::TableCorrupt { table, path, error } => write!(
                formatter,
                "generated two-phase table {table} at {} is corrupt: {error}",
                path.display()
            ),
            Self::TableIncompatible { table, path, error } => write!(
                formatter,
                "generated two-phase table {table} at {} is incompatible: {error}",
                path.display()
            ),
            Self::Coordinate { phase, error } => {
                write!(
                    formatter,
                    "generated two-phase {phase} coordinate failed: {error}"
                )
            }
        }
    }
}

impl std::error::Error for GeneratedTwoPhaseError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::TableUnavailable { error, .. }
            | Self::TableCorrupt { error, .. }
            | Self::TableIncompatible { error, .. } => Some(error.as_ref()),
            Self::MissingSpec { .. } | Self::TableMissing { .. } | Self::Coordinate { .. } => None,
        }
    }
}

impl GeneratedTwoPhaseError {
    pub fn is_corrupt_or_incompatible(&self) -> bool {
        matches!(
            self,
            Self::TableCorrupt { .. } | Self::TableIncompatible { .. }
        )
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct GeneratedPruningTableArtifact<'a> {
    pub available: bool,
    pub bytes: &'a [u8],
}

impl<'a> GeneratedPruningTableArtifact<'a> {
    pub const fn available(bytes: &'a [u8]) -> Self {
        Self {
            available: true,
            bytes,
        }
    }

    pub const fn unavailable() -> Self {
        Self {
            available: false,
            bytes: &[],
        }
    }
}

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

pub fn solve_generated_two_phase(
    start: &Cube,
    budget: SearchBudget,
    table_dir: &Path,
) -> Result<SearchOutcome, GeneratedTwoPhaseError> {
    let solver = GeneratedTwoPhaseSolver::load_from_dir(table_dir)?;

    solver.solve(start, budget).map(|result| result.outcome)
}

pub fn solve_generated_two_phase_with_artifacts(
    start: &Cube,
    budget: SearchBudget,
    artifacts: &[GeneratedPruningTableArtifact<'_>],
) -> Result<SearchOutcome, GeneratedTwoPhaseError> {
    let solver = GeneratedTwoPhaseSolver::load_from_artifacts(artifacts)?;

    solver.solve(start, budget).map(|result| result.outcome)
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct GeneratedTwoPhaseMetrics {
    pub phase1_nodes: usize,
    pub phase2_nodes: usize,
    pub phase1_depth_attempts: usize,
    pub max_phase1_depth_attempted: Option<usize>,
    pub phase1_ordered_candidates: usize,
    pub phase1_ordering_heuristic_evals: usize,
    pub phase2_ordered_candidates: usize,
    pub phase2_ordering_heuristic_evals: usize,
    pub phase2_calls: usize,
    pub heuristic_prunes: usize,
    pub node_limit_hits: usize,
    pub table_missing_entries: usize,
}

impl GeneratedTwoPhaseMetrics {
    pub const fn explored_nodes(self) -> usize {
        self.phase1_nodes + self.phase2_nodes
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct GeneratedTwoPhaseSearchResult {
    pub outcome: SearchOutcome,
    pub metrics: GeneratedTwoPhaseMetrics,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct GeneratedTwoPhaseSolver {
    tables: GeneratedPruningTables,
}

impl GeneratedTwoPhaseSolver {
    pub fn load_from_dir(directory: &Path) -> Result<Self, GeneratedTwoPhaseError> {
        Ok(Self {
            tables: GeneratedPruningTables::load_from_dir(directory)?,
        })
    }

    pub fn load_from_artifacts(
        artifacts: &[GeneratedPruningTableArtifact<'_>],
    ) -> Result<Self, GeneratedTwoPhaseError> {
        Ok(Self {
            tables: GeneratedPruningTables::load_from_artifacts(artifacts)?,
        })
    }

    pub fn solve(
        &self,
        start: &Cube,
        budget: SearchBudget,
    ) -> Result<GeneratedTwoPhaseSearchResult, GeneratedTwoPhaseError> {
        solve_generated_two_phase_with_tables(start, budget, &self.tables)
    }
}

fn solve_generated_two_phase_with_tables(
    start: &Cube,
    budget: SearchBudget,
    tables: &GeneratedPruningTables,
) -> Result<GeneratedTwoPhaseSearchResult, GeneratedTwoPhaseError> {
    let mut context = TwoPhaseSearchContext::new(budget.max_nodes);
    let start_coordinates = Phase1Coordinates::try_from_cube(start)?;
    let phase1_minimum = tables.phase1_heuristic_coordinates(start_coordinates, &mut context)?;

    if phase1_minimum > budget.max_depth {
        return Ok(context.finish(SearchOutcome::NotFoundWithinLimits {
            explored_nodes: context.explored_nodes(),
        }));
    }

    for phase1_limit in phase1_minimum..=budget.max_depth {
        context.record_phase1_depth_attempt(phase1_limit);
        let mut path = Vec::new();

        let mut phase1_search = Phase1Search {
            budget,
            phase1_limit,
            start,
            tables,
            context: &mut context,
        };

        match search_phase1(start_coordinates, None, &mut phase1_search, &mut path)? {
            TwoPhaseSearchResult::Found(moves) => {
                return Ok(
                    context.finish(SearchOutcome::Found(SearchSolution::with_metrics(
                        moves,
                        context.explored_nodes(),
                    ))),
                );
            }
            TwoPhaseSearchResult::Exhausted => {}
            TwoPhaseSearchResult::NodeLimitReached => {
                return Ok(context.finish(SearchOutcome::NotFoundWithinLimits {
                    explored_nodes: context.explored_nodes(),
                }));
            }
        }
    }

    Ok(context.finish(SearchOutcome::NotFoundWithinLimits {
        explored_nodes: context.explored_nodes(),
    }))
}

#[derive(Clone, Debug, Eq, PartialEq)]
struct GeneratedPruningTables {
    phase1_corner_edge_orientation: PruningTable,
    phase1_corner_orientation_ud_slice: PruningTable,
    phase1_edge_orientation_ud_slice: PruningTable,
    phase2_corner_permutation_slice_edge_permutation: PruningTable,
    phase2_ud_edge_permutation_slice_edge_permutation: PruningTable,
    phase1_move_tables: &'static Phase1MoveTables,
    phase2_move_tables: &'static Phase2MoveTables,
}

impl GeneratedPruningTables {
    fn load_from_dir(directory: &Path) -> Result<Self, GeneratedTwoPhaseError> {
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

    fn load_from_artifacts(
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

    fn phase1_heuristic_coordinates(
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

    fn phase2_heuristic_coordinates(
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

#[derive(Clone, Copy, Debug, Eq, Hash, PartialEq)]
struct Phase1Coordinates {
    corner_orientation: usize,
    edge_orientation: usize,
    ud_slice: usize,
}

#[derive(Clone, Copy, Debug, Eq, Hash, PartialEq)]
struct Phase2Coordinates {
    corner_permutation: usize,
    ud_edge_permutation: usize,
    slice_edge_permutation: usize,
}

impl Phase2Coordinates {
    fn try_from_cube(cube: &Cube) -> Result<Self, GeneratedTwoPhaseError> {
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

    const fn is_goal(self) -> bool {
        self.corner_permutation == 0
            && self.ud_edge_permutation == 0
            && self.slice_edge_permutation == 0
    }
}

impl Phase1Coordinates {
    fn try_from_cube(cube: &Cube) -> Result<Self, GeneratedTwoPhaseError> {
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

    const fn is_goal(self) -> bool {
        self.corner_orientation == 0 && self.edge_orientation == 0 && self.ud_slice == 0
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
struct Phase1MoveTables {
    corner_orientation: Vec<[usize; PHASE1_MOVE_COUNT]>,
    edge_orientation: Vec<[usize; PHASE1_MOVE_COUNT]>,
    ud_slice: Vec<[usize; PHASE1_MOVE_COUNT]>,
}

impl Phase1MoveTables {
    fn generate() -> Result<Self, GeneratedTwoPhaseError> {
        Ok(Self {
            corner_orientation: generate_corner_orientation_move_table()?,
            edge_orientation: generate_edge_orientation_move_table()?,
            ud_slice: generate_ud_slice_move_table()?,
        })
    }

    fn next(&self, coordinates: Phase1Coordinates, move_index: usize) -> Phase1Coordinates {
        Phase1Coordinates {
            corner_orientation: self.corner_orientation[coordinates.corner_orientation][move_index],
            edge_orientation: self.edge_orientation[coordinates.edge_orientation][move_index],
            ud_slice: self.ud_slice[coordinates.ud_slice][move_index],
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
struct Phase2MoveTables {
    corner_permutation: Vec<[usize; PHASE2_MOVE_COUNT]>,
    ud_edge_permutation: Vec<[usize; PHASE2_MOVE_COUNT]>,
    slice_edge_permutation: Vec<[usize; PHASE2_MOVE_COUNT]>,
}

impl Phase2MoveTables {
    fn generate() -> Result<Self, GeneratedTwoPhaseError> {
        Ok(Self {
            corner_permutation: generate_corner_permutation_move_table()?,
            ud_edge_permutation: generate_ud_edge_permutation_move_table()?,
            slice_edge_permutation: generate_slice_edge_permutation_move_table()?,
        })
    }

    fn next(&self, coordinates: Phase2Coordinates, move_index: usize) -> Phase2Coordinates {
        Phase2Coordinates {
            corner_permutation: self.corner_permutation[coordinates.corner_permutation][move_index],
            ud_edge_permutation: self.ud_edge_permutation[coordinates.ud_edge_permutation]
                [move_index],
            slice_edge_permutation: self.slice_edge_permutation[coordinates.slice_edge_permutation]
                [move_index],
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
struct TwoPhaseSearchContext {
    max_nodes: Option<usize>,
    metrics: GeneratedTwoPhaseMetrics,
}

impl TwoPhaseSearchContext {
    const fn new(max_nodes: Option<usize>) -> Self {
        Self {
            max_nodes,
            metrics: GeneratedTwoPhaseMetrics {
                phase1_nodes: 0,
                phase2_nodes: 0,
                phase1_depth_attempts: 0,
                max_phase1_depth_attempted: None,
                phase1_ordered_candidates: 0,
                phase1_ordering_heuristic_evals: 0,
                phase2_ordered_candidates: 0,
                phase2_ordering_heuristic_evals: 0,
                phase2_calls: 0,
                heuristic_prunes: 0,
                node_limit_hits: 0,
                table_missing_entries: 0,
            },
        }
    }

    fn explored_nodes(&self) -> usize {
        self.metrics.explored_nodes()
    }

    fn finish(&self, outcome: SearchOutcome) -> GeneratedTwoPhaseSearchResult {
        GeneratedTwoPhaseSearchResult {
            outcome,
            metrics: self.metrics,
        }
    }

    fn visit_phase1(&mut self) -> bool {
        self.visit_with(|metrics| metrics.phase1_nodes += 1)
    }

    fn visit_phase2(&mut self) -> bool {
        self.visit_with(|metrics| metrics.phase2_nodes += 1)
    }

    fn visit_with(&mut self, increment: impl FnOnce(&mut GeneratedTwoPhaseMetrics)) -> bool {
        if self
            .max_nodes
            .is_some_and(|max_nodes| self.explored_nodes() >= max_nodes)
        {
            self.metrics.node_limit_hits += 1;
            return false;
        }

        increment(&mut self.metrics);

        true
    }

    fn record_phase1_depth_attempt(&mut self, depth: usize) {
        self.metrics.phase1_depth_attempts += 1;
        self.metrics.max_phase1_depth_attempted = Some(depth);
    }

    fn record_phase2_call(&mut self) {
        self.metrics.phase2_calls += 1;
    }

    fn record_phase1_ordered_candidates(&mut self, count: usize) {
        self.metrics.phase1_ordered_candidates += count;
    }

    fn record_phase1_ordering_heuristic_eval(&mut self) {
        self.metrics.phase1_ordering_heuristic_evals += 1;
    }

    fn record_phase2_ordered_candidates(&mut self, count: usize) {
        self.metrics.phase2_ordered_candidates += count;
    }

    fn record_phase2_ordering_heuristic_eval(&mut self) {
        self.metrics.phase2_ordering_heuristic_evals += 1;
    }

    fn record_heuristic_prune(&mut self) {
        self.metrics.heuristic_prunes += 1;
    }

    fn record_missing_table_entry(&mut self) {
        self.metrics.table_missing_entries += 1;
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
enum TwoPhaseSearchResult {
    Found(Vec<Move>),
    Exhausted,
    NodeLimitReached,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
struct Phase1Candidate {
    move_index: usize,
    move_: Move,
    coordinates: Phase1Coordinates,
    heuristic: usize,
    estimated_total: usize,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
struct Phase2Candidate {
    move_index: usize,
    move_: Move,
    coordinates: Phase2Coordinates,
    heuristic: usize,
    estimated_total: usize,
}

struct Phase1Search<'a> {
    budget: SearchBudget,
    phase1_limit: usize,
    start: &'a Cube,
    tables: &'a GeneratedPruningTables,
    context: &'a mut TwoPhaseSearchContext,
}

fn search_phase1(
    coordinates: Phase1Coordinates,
    last_move: Option<Move>,
    search: &mut Phase1Search<'_>,
    path: &mut Vec<Move>,
) -> Result<TwoPhaseSearchResult, GeneratedTwoPhaseError> {
    if !search.context.visit_phase1() {
        return Ok(TwoPhaseSearchResult::NodeLimitReached);
    }

    if path.len()
        + search
            .tables
            .phase1_heuristic_coordinates(coordinates, search.context)?
        > search.phase1_limit
    {
        search.context.record_heuristic_prune();
        return Ok(TwoPhaseSearchResult::Exhausted);
    }

    if coordinates.is_goal() {
        let remaining_depth = search.budget.max_depth.saturating_sub(path.len());
        let phase1_cube = cube_after_moves(search.start, path);
        match solve_phase2_from(
            &phase1_cube,
            remaining_depth,
            last_move,
            search.tables,
            search.context,
        )? {
            TwoPhaseSearchResult::Found(phase2_moves) => {
                let mut solution = path.clone();
                solution.extend(phase2_moves);

                return Ok(TwoPhaseSearchResult::Found(solution));
            }
            TwoPhaseSearchResult::NodeLimitReached => {
                return Ok(TwoPhaseSearchResult::NodeLimitReached);
            }
            TwoPhaseSearchResult::Exhausted => {}
        }
    }

    if path.len() == search.phase1_limit {
        return Ok(TwoPhaseSearchResult::Exhausted);
    }

    for candidate in phase1_ordered_candidates(coordinates, last_move, path.len(), search)? {
        path.push(candidate.move_);
        let result = search_phase1(candidate.coordinates, Some(candidate.move_), search, path)?;
        path.pop();

        match result {
            TwoPhaseSearchResult::Found(_) | TwoPhaseSearchResult::NodeLimitReached => {
                return Ok(result);
            }
            TwoPhaseSearchResult::Exhausted => {}
        }
    }

    Ok(TwoPhaseSearchResult::Exhausted)
}

fn phase1_ordered_candidates(
    coordinates: Phase1Coordinates,
    last_move: Option<Move>,
    path_len: usize,
    search: &mut Phase1Search<'_>,
) -> Result<Vec<Phase1Candidate>, GeneratedTwoPhaseError> {
    let mut candidates = Vec::with_capacity(FACE_MOVES.len());

    for (move_index, move_) in phase1_candidate_moves(last_move) {
        let next_coordinates = search
            .tables
            .phase1_move_tables
            .next(coordinates, move_index);
        let heuristic = search
            .tables
            .phase1_heuristic_coordinates(next_coordinates, search.context)?;
        search.context.record_phase1_ordering_heuristic_eval();
        candidates.push(Phase1Candidate {
            move_index,
            move_,
            coordinates: next_coordinates,
            heuristic,
            estimated_total: path_len + 1 + heuristic,
        });
    }

    sort_phase1_candidates(&mut candidates);
    search
        .context
        .record_phase1_ordered_candidates(candidates.len());

    Ok(candidates)
}

fn phase1_candidate_moves(last_move: Option<Move>) -> impl Iterator<Item = (usize, Move)> {
    FACE_MOVES
        .into_iter()
        .enumerate()
        .filter(move |(_, move_)| !should_skip_move(last_move, *move_))
}

fn sort_phase1_candidates(candidates: &mut [Phase1Candidate]) {
    candidates.sort_by_key(|candidate| {
        (
            candidate.estimated_total,
            candidate.heuristic,
            candidate.move_index,
        )
    });
}

fn solve_phase2_from(
    cube: &Cube,
    remaining_depth: usize,
    last_phase1_move: Option<Move>,
    tables: &GeneratedPruningTables,
    context: &mut TwoPhaseSearchContext,
) -> Result<TwoPhaseSearchResult, GeneratedTwoPhaseError> {
    context.record_phase2_call();
    let start_coordinates = Phase2Coordinates::try_from_cube(cube)?;
    let phase2_minimum = tables.phase2_heuristic_coordinates(start_coordinates, context)?;
    if phase2_minimum > remaining_depth {
        context.record_heuristic_prune();
        return Ok(TwoPhaseSearchResult::Exhausted);
    }

    for phase2_limit in phase2_minimum..=remaining_depth {
        let mut path = Vec::new();
        let mut path_states = HashSet::<Phase2Coordinates>::from([start_coordinates]);

        match search_phase2(
            start_coordinates,
            phase2_limit,
            last_phase1_move,
            tables,
            context,
            &mut path_states,
            &mut path,
        )? {
            TwoPhaseSearchResult::Found(moves) => return Ok(TwoPhaseSearchResult::Found(moves)),
            TwoPhaseSearchResult::Exhausted => {}
            TwoPhaseSearchResult::NodeLimitReached => {
                return Ok(TwoPhaseSearchResult::NodeLimitReached);
            }
        }
    }

    Ok(TwoPhaseSearchResult::Exhausted)
}

fn search_phase2(
    coordinates: Phase2Coordinates,
    phase2_limit: usize,
    last_move: Option<Move>,
    tables: &GeneratedPruningTables,
    context: &mut TwoPhaseSearchContext,
    path_states: &mut HashSet<Phase2Coordinates>,
    path: &mut Vec<Move>,
) -> Result<TwoPhaseSearchResult, GeneratedTwoPhaseError> {
    if !context.visit_phase2() {
        return Ok(TwoPhaseSearchResult::NodeLimitReached);
    }

    if path.len() + tables.phase2_heuristic_coordinates(coordinates, context)? > phase2_limit {
        context.record_heuristic_prune();
        return Ok(TwoPhaseSearchResult::Exhausted);
    }

    if coordinates.is_goal() {
        return Ok(TwoPhaseSearchResult::Found(path.clone()));
    }

    if path.len() == phase2_limit {
        return Ok(TwoPhaseSearchResult::Exhausted);
    }

    for candidate in phase2_ordered_candidates(coordinates, last_move, path.len(), tables, context)?
    {
        if !path_states.insert(candidate.coordinates) {
            continue;
        }

        path.push(candidate.move_);
        let result = search_phase2(
            candidate.coordinates,
            phase2_limit,
            Some(candidate.move_),
            tables,
            context,
            path_states,
            path,
        )?;
        path.pop();
        path_states.remove(&candidate.coordinates);

        match result {
            TwoPhaseSearchResult::Found(_) | TwoPhaseSearchResult::NodeLimitReached => {
                return Ok(result);
            }
            TwoPhaseSearchResult::Exhausted => {}
        }
    }

    Ok(TwoPhaseSearchResult::Exhausted)
}

fn phase2_ordered_candidates(
    coordinates: Phase2Coordinates,
    last_move: Option<Move>,
    path_len: usize,
    tables: &GeneratedPruningTables,
    context: &mut TwoPhaseSearchContext,
) -> Result<Vec<Phase2Candidate>, GeneratedTwoPhaseError> {
    let mut candidates = Vec::with_capacity(PHASE2_MOVES.len());

    for (move_index, move_) in phase2_candidate_moves(last_move) {
        let next_coordinates = tables.phase2_move_tables.next(coordinates, move_index);
        let heuristic = tables.phase2_heuristic_coordinates(next_coordinates, context)?;
        context.record_phase2_ordering_heuristic_eval();
        candidates.push(Phase2Candidate {
            move_index,
            move_,
            coordinates: next_coordinates,
            heuristic,
            estimated_total: path_len + 1 + heuristic,
        });
    }

    sort_phase2_candidates(&mut candidates);
    context.record_phase2_ordered_candidates(candidates.len());

    Ok(candidates)
}

fn phase2_candidate_moves(last_move: Option<Move>) -> impl Iterator<Item = (usize, Move)> {
    PHASE2_MOVES
        .into_iter()
        .enumerate()
        .filter(move |(_, move_)| !should_skip_move(last_move, *move_))
}

fn sort_phase2_candidates(candidates: &mut [Phase2Candidate]) {
    candidates.sort_by_key(|candidate| {
        (
            candidate.estimated_total,
            candidate.heuristic,
            candidate.move_index,
        )
    });
}

fn load_generated_table_from_dir(
    directory: &Path,
    kind: GeneratedPruningTableKind,
) -> Result<PruningTable, GeneratedTwoPhaseError> {
    let spec = generated_spec(kind)?;
    let path = spec.file_path(directory);
    let table = match PruningTable::load_artifact(&path) {
        Ok(table) => table,
        Err(error) if pruning_artifact_is_unavailable(&error) => {
            return Err(GeneratedTwoPhaseError::TableUnavailable {
                table: spec.table_name,
                path,
                error: Box::new(error),
            });
        }
        Err(error) => {
            return Err(GeneratedTwoPhaseError::TableCorrupt {
                table: spec.table_name,
                path,
                error: Box::new(error),
            });
        }
    };
    validate_generated_table(spec, &path, table)
}

fn load_generated_table_from_artifacts(
    artifacts: &[GeneratedPruningTableArtifact<'_>],
    kind: GeneratedPruningTableKind,
) -> Result<PruningTable, GeneratedTwoPhaseError> {
    let (index, spec) = generated_spec_with_index(kind)?;
    let path = PathBuf::from(spec.file_name);
    let Some(artifact) = artifacts.get(index) else {
        return Err(GeneratedTwoPhaseError::TableMissing {
            table: spec.table_name,
            path,
        });
    };

    if !artifact.available {
        return Err(GeneratedTwoPhaseError::TableMissing {
            table: spec.table_name,
            path,
        });
    }

    let table = PruningTable::from_artifact_bytes(&path, artifact.bytes).map_err(|error| {
        GeneratedTwoPhaseError::TableCorrupt {
            table: spec.table_name,
            path: path.clone(),
            error: Box::new(error),
        }
    })?;

    validate_generated_table(spec, &path, table)
}

fn validate_generated_table(
    spec: &GeneratedPruningTableSpec,
    path: &Path,
    table: PruningTable,
) -> Result<PruningTable, GeneratedTwoPhaseError> {
    spec.validate_table(&table, path).map_err(|error| {
        GeneratedTwoPhaseError::TableIncompatible {
            table: spec.table_name,
            path: path.to_path_buf(),
            error: Box::new(error),
        }
    })?;

    table
        .into_dense()
        .map_err(|error| GeneratedTwoPhaseError::Coordinate {
            phase: "generated_table_load",
            error: error.to_string(),
        })
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

fn cube_after_moves(start: &Cube, moves: &[Move]) -> Cube {
    let mut cube = start.clone();
    cube.apply_moves(moves);

    cube
}

fn pruning_artifact_is_unavailable(error: &PruningArtifactError) -> bool {
    matches!(error, PruningArtifactError::Io { .. })
}

fn generated_spec(
    kind: GeneratedPruningTableKind,
) -> Result<&'static GeneratedPruningTableSpec, GeneratedTwoPhaseError> {
    generated_spec_with_index(kind).map(|(_, spec)| spec)
}

fn generated_spec_with_index(
    kind: GeneratedPruningTableKind,
) -> Result<(usize, &'static GeneratedPruningTableSpec), GeneratedTwoPhaseError> {
    GENERATED_PRUNING_TABLE_SPECS
        .iter()
        .enumerate()
        .find(|(_, spec)| spec.kind == kind)
        .ok_or(GeneratedTwoPhaseError::MissingSpec { kind })
}

fn table_distance_index(
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

fn should_skip_move(last_move: Option<Move>, next_move: Move) -> bool {
    last_move.is_some_and(|last_move| {
        let last_face = last_move.face();
        let next_face = next_move.face();

        last_face == next_face
            || (last_face.axis() == next_face.axis()
                && canonical_face_order(last_face) > canonical_face_order(next_face))
    })
}

fn canonical_face_order(face: Face) -> u8 {
    match face {
        Face::U | Face::L | Face::F => 0,
        Face::D | Face::R | Face::B => 1,
    }
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

#[cfg(test)]
mod tests {
    use super::{
        phase1_candidate_moves, phase2_candidate_moves, should_skip_move, sort_phase1_candidates,
        sort_phase2_candidates, table_distance_index, Phase1Candidate, Phase1Coordinates,
        Phase1MoveTables, Phase2Candidate, Phase2Coordinates, Phase2MoveTables,
        TwoPhaseSearchContext, FACE_MOVES, PHASE2_MOVES,
    };
    use crate::cube::{Cube, Move};
    use crate::search::pruning::{
        PruningCoordinate, PruningGenerationParameters, PruningPhaseRole, PruningTable,
        PruningTableMetadata,
    };

    #[test]
    fn missing_depth_limited_table_entry_is_lower_bound_above_generated_depth() {
        let metadata = PruningTableMetadata::new(
            2,
            "test-depth-limited-v1",
            PruningPhaseRole::Phase1,
            vec![PruningCoordinate::new("coordinate", 2)],
            PruningGenerationParameters::new(6, "test-moves", "test"),
        );
        let table = PruningTable::from_dense_entries(metadata, vec![0, u8::MAX])
            .expect("test table should be valid");
        let mut context = TwoPhaseSearchContext::new(None);

        assert_eq!(
            table_distance_index("phase1", &table, 1, &mut context),
            Ok(7)
        );
        assert_eq!(context.metrics.table_missing_entries, 1);
    }

    #[test]
    fn move_pruning_skips_same_face_turns() {
        assert!(should_skip_move(Some(Move::R), Move::R2));
        assert!(should_skip_move(Some(Move::U), Move::UPrime));
        assert!(should_skip_move(Some(Move::F2), Move::FPrime));
    }

    #[test]
    fn move_pruning_canonicalizes_opposite_faces_on_same_axis() {
        assert!(!should_skip_move(Some(Move::U), Move::D));
        assert!(should_skip_move(Some(Move::D), Move::U));
        assert!(!should_skip_move(Some(Move::L), Move::R));
        assert!(should_skip_move(Some(Move::R), Move::L));
        assert!(!should_skip_move(Some(Move::F), Move::B));
        assert!(should_skip_move(Some(Move::B), Move::F));
    }

    #[test]
    fn move_pruning_keeps_different_axes_available() {
        assert!(!should_skip_move(None, Move::U));
        assert!(!should_skip_move(Some(Move::U), Move::R));
        assert!(!should_skip_move(Some(Move::F), Move::D));
        assert!(!should_skip_move(Some(Move::L2), Move::BPrime));
    }

    #[test]
    fn phase1_candidate_moves_exclude_pruned_moves() {
        let after_d = phase1_candidate_moves(Some(Move::D)).collect::<Vec<_>>();
        let after_d_moves = after_d.iter().map(|(_, move_)| *move_).collect::<Vec<_>>();

        assert!(!after_d_moves.contains(&Move::U));
        assert!(!after_d_moves.contains(&Move::UPrime));
        assert!(!after_d_moves.contains(&Move::U2));
        assert!(!after_d_moves.contains(&Move::D));
        assert!(!after_d_moves.contains(&Move::DPrime));
        assert!(!after_d_moves.contains(&Move::D2));

        let after_u_moves = phase1_candidate_moves(Some(Move::U))
            .map(|(_, move_)| move_)
            .collect::<Vec<_>>();
        assert!(after_u_moves.contains(&Move::D));
        assert!(after_u_moves.contains(&Move::DPrime));
        assert!(after_u_moves.contains(&Move::D2));
    }

    #[test]
    fn phase1_candidates_sort_by_estimated_total_then_heuristic_then_move_order() {
        let coordinates = Phase1Coordinates {
            corner_orientation: 0,
            edge_orientation: 0,
            ud_slice: 0,
        };
        let mut candidates = vec![
            Phase1Candidate {
                move_index: 4,
                move_: Move::DPrime,
                coordinates,
                heuristic: 3,
                estimated_total: 5,
            },
            Phase1Candidate {
                move_index: 2,
                move_: Move::U2,
                coordinates,
                heuristic: 2,
                estimated_total: 5,
            },
            Phase1Candidate {
                move_index: 1,
                move_: Move::UPrime,
                coordinates,
                heuristic: 2,
                estimated_total: 5,
            },
            Phase1Candidate {
                move_index: 0,
                move_: Move::U,
                coordinates,
                heuristic: 1,
                estimated_total: 7,
            },
        ];

        sort_phase1_candidates(&mut candidates);

        assert_eq!(
            candidates
                .iter()
                .map(|candidate| candidate.move_)
                .collect::<Vec<_>>(),
            vec![Move::UPrime, Move::U2, Move::DPrime, Move::U]
        );
    }

    #[test]
    fn phase2_candidate_moves_exclude_pruned_moves() {
        let after_r_moves = phase2_candidate_moves(Some(Move::R2))
            .map(|(_, move_)| move_)
            .collect::<Vec<_>>();

        assert!(!after_r_moves.contains(&Move::L2));
        assert!(!after_r_moves.contains(&Move::R2));
        assert!(after_r_moves.contains(&Move::U));
        assert!(after_r_moves.contains(&Move::D));
        assert!(after_r_moves.contains(&Move::F2));
    }

    #[test]
    fn phase2_candidates_sort_by_estimated_total_then_heuristic_then_move_order() {
        let coordinates = Phase2Coordinates {
            corner_permutation: 0,
            ud_edge_permutation: 0,
            slice_edge_permutation: 0,
        };
        let mut candidates = vec![
            Phase2Candidate {
                move_index: 5,
                move_: Move::D2,
                coordinates,
                heuristic: 3,
                estimated_total: 5,
            },
            Phase2Candidate {
                move_index: 2,
                move_: Move::U2,
                coordinates,
                heuristic: 2,
                estimated_total: 5,
            },
            Phase2Candidate {
                move_index: 1,
                move_: Move::UPrime,
                coordinates,
                heuristic: 2,
                estimated_total: 5,
            },
            Phase2Candidate {
                move_index: 0,
                move_: Move::U,
                coordinates,
                heuristic: 1,
                estimated_total: 7,
            },
        ];

        sort_phase2_candidates(&mut candidates);

        assert_eq!(
            candidates
                .iter()
                .map(|candidate| candidate.move_)
                .collect::<Vec<_>>(),
            vec![Move::UPrime, Move::U2, Move::D2, Move::U]
        );
    }

    #[test]
    fn phase1_move_tables_match_cube_move_semantics_for_sample_states() {
        let tables = Phase1MoveTables::generate().expect("phase1 move tables should build");
        let samples = [
            Vec::new(),
            vec![Move::R, Move::U],
            vec![Move::F, Move::R, Move::UPrime, Move::B2],
            vec![Move::L2, Move::DPrime, Move::F, Move::U2, Move::RPrime],
        ];

        for moves in samples {
            let mut cube = Cube::solved();
            cube.apply_moves(&moves);
            let coordinates = Phase1Coordinates::try_from_cube(&cube)
                .expect("sample cube should have phase1 coordinates");

            for (move_index, move_) in FACE_MOVES.into_iter().enumerate() {
                let mut next_cube = cube.clone();
                next_cube.apply_move(move_);
                let expected = Phase1Coordinates::try_from_cube(&next_cube)
                    .expect("moved sample cube should have phase1 coordinates");

                assert_eq!(
                    tables.next(coordinates, move_index),
                    expected,
                    "phase1 move table should match cube semantics for {move_:?} after {moves:?}"
                );
            }
        }
    }

    #[test]
    fn phase2_move_tables_match_cube_move_semantics_for_sample_g1_states() {
        let tables = Phase2MoveTables::generate().expect("phase2 move tables should build");
        let samples = [
            Vec::new(),
            vec![Move::U, Move::R2, Move::F2, Move::D],
            vec![Move::L2, Move::DPrime, Move::B2, Move::U2, Move::R2],
            vec![
                Move::U,
                Move::DPrime,
                Move::L2,
                Move::F2,
                Move::B2,
                Move::R2,
            ],
        ];

        for moves in samples {
            let mut cube = Cube::solved();
            cube.apply_moves(&moves);
            let coordinates = Phase2Coordinates::try_from_cube(&cube)
                .expect("sample G1 cube should have phase2 coordinates");

            for (move_index, move_) in PHASE2_MOVES.into_iter().enumerate() {
                let mut next_cube = cube.clone();
                next_cube.apply_move(move_);
                let expected = Phase2Coordinates::try_from_cube(&next_cube)
                    .expect("moved sample G1 cube should have phase2 coordinates");

                assert_eq!(
                    tables.next(coordinates, move_index),
                    expected,
                    "phase2 move table should match cube semantics for {move_:?} after {moves:?}"
                );
            }
        }
    }
}
