use std::collections::HashSet;
use std::fmt;
use std::path::{Path, PathBuf};

use super::pruning::{
    GeneratedPruningTableKind, GeneratedPruningTableSpec, PruningArtifactError, PruningCoordinate,
    PruningGenerationParameters, PruningLookupError, PruningPhaseRole, PruningTable,
    PruningTableMetadata, GENERATED_PRUNING_TABLE_SPECS,
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
use crate::cube::{Cube, CubieState, Move};

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

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum GeneratedTwoPhaseError {
    MissingSpec {
        kind: GeneratedPruningTableKind,
    },
    TableUnavailable {
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
            Self::TableUnavailable { table, path, error } => write!(
                formatter,
                "generated two-phase table {table} is unavailable at {}: {error}",
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
            Self::TableUnavailable { error, .. } | Self::TableIncompatible { error, .. } => {
                Some(error.as_ref())
            }
            Self::MissingSpec { .. } | Self::Coordinate { .. } => None,
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
    let tables = GeneratedPruningTables::load_from_dir(table_dir)?;
    let mut context = TwoPhaseSearchContext::new(budget.max_nodes);
    let phase1_minimum = tables.phase1_heuristic(start)?;

    if phase1_minimum > budget.max_depth {
        return Ok(SearchOutcome::NotFoundWithinLimits {
            explored_nodes: context.explored_nodes,
        });
    }

    for phase1_limit in phase1_minimum..=budget.max_depth {
        let mut path = Vec::new();
        let mut path_states = HashSet::<CubieState>::from([start.state().clone()]);

        let mut phase1_search = Phase1Search {
            budget,
            phase1_limit,
            tables: &tables,
            context: &mut context,
        };

        match search_phase1(start, None, &mut phase1_search, &mut path_states, &mut path)? {
            TwoPhaseSearchResult::Found(moves) => {
                return Ok(SearchOutcome::Found(SearchSolution::with_metrics(
                    moves,
                    context.explored_nodes,
                )));
            }
            TwoPhaseSearchResult::Exhausted => {}
            TwoPhaseSearchResult::NodeLimitReached => {
                return Ok(SearchOutcome::NotFoundWithinLimits {
                    explored_nodes: context.explored_nodes,
                });
            }
        }
    }

    Ok(SearchOutcome::NotFoundWithinLimits {
        explored_nodes: context.explored_nodes,
    })
}

#[derive(Clone, Debug, Eq, PartialEq)]
struct GeneratedPruningTables {
    phase1_corner_edge_orientation: PruningTable,
    phase1_corner_orientation_ud_slice: PruningTable,
    phase1_edge_orientation_ud_slice: PruningTable,
    phase2_corner_permutation_slice_edge_permutation: PruningTable,
    phase2_ud_edge_permutation_slice_edge_permutation: PruningTable,
}

impl GeneratedPruningTables {
    fn load_from_dir(directory: &Path) -> Result<Self, GeneratedTwoPhaseError> {
        Ok(Self {
            phase1_corner_edge_orientation: load_generated_table(
                directory,
                GeneratedPruningTableKind::Phase1CornerEdgeOrientation,
            )?,
            phase1_corner_orientation_ud_slice: load_generated_table(
                directory,
                GeneratedPruningTableKind::Phase1CornerOrientationUdSlice,
            )?,
            phase1_edge_orientation_ud_slice: load_generated_table(
                directory,
                GeneratedPruningTableKind::Phase1EdgeOrientationUdSlice,
            )?,
            phase2_corner_permutation_slice_edge_permutation: load_generated_table(
                directory,
                GeneratedPruningTableKind::Phase2CornerPermutationSliceEdgePermutation,
            )?,
            phase2_ud_edge_permutation_slice_edge_permutation: load_generated_table(
                directory,
                GeneratedPruningTableKind::Phase2UdEdgePermutationSliceEdgePermutation,
            )?,
        })
    }

    fn phase1_heuristic(&self, cube: &Cube) -> Result<usize, GeneratedTwoPhaseError> {
        let [corner_orientation, edge_orientation, ud_slice] = phase1_coordinates_checked(cube)?;
        let distances = [
            table_distance(
                "phase1",
                &self.phase1_corner_edge_orientation,
                &[corner_orientation, edge_orientation],
            )?,
            table_distance(
                "phase1",
                &self.phase1_corner_orientation_ud_slice,
                &[corner_orientation, ud_slice],
            )?,
            table_distance(
                "phase1",
                &self.phase1_edge_orientation_ud_slice,
                &[edge_orientation, ud_slice],
            )?,
        ];

        Ok(distances.into_iter().max().unwrap_or(0))
    }

    fn phase2_heuristic(&self, cube: &Cube) -> Result<usize, GeneratedTwoPhaseError> {
        let state = cube.state();
        let corner_permutation = corner_permutation_coordinate_from_permutation(
            &state.corner_permutation,
        )
        .map_err(|error| GeneratedTwoPhaseError::Coordinate {
            phase: "phase2",
            error: error.to_string(),
        })?;
        let slice_edge_permutation = slice_edge_permutation_coordinate_from_permutation(
            &state.edge_permutation,
        )
        .map_err(|error| GeneratedTwoPhaseError::Coordinate {
            phase: "phase2",
            error: error.to_string(),
        })?;
        let ud_edge_permutation = ud_edge_permutation_coordinate_from_permutation(
            &state.edge_permutation,
        )
        .map_err(|error| GeneratedTwoPhaseError::Coordinate {
            phase: "phase2",
            error: error.to_string(),
        })?;
        let distances = [
            table_distance(
                "phase2",
                &self.phase2_corner_permutation_slice_edge_permutation,
                &[corner_permutation, slice_edge_permutation],
            )?,
            table_distance(
                "phase2",
                &self.phase2_ud_edge_permutation_slice_edge_permutation,
                &[ud_edge_permutation, slice_edge_permutation],
            )?,
        ];

        Ok(distances.into_iter().max().unwrap_or(0))
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
struct TwoPhaseSearchContext {
    explored_nodes: usize,
    max_nodes: Option<usize>,
}

impl TwoPhaseSearchContext {
    const fn new(max_nodes: Option<usize>) -> Self {
        Self {
            explored_nodes: 0,
            max_nodes,
        }
    }

    fn visit(&mut self) -> bool {
        if self
            .max_nodes
            .is_some_and(|max_nodes| self.explored_nodes >= max_nodes)
        {
            return false;
        }

        self.explored_nodes += 1;

        true
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
enum TwoPhaseSearchResult {
    Found(Vec<Move>),
    Exhausted,
    NodeLimitReached,
}

struct Phase1Search<'a> {
    budget: SearchBudget,
    phase1_limit: usize,
    tables: &'a GeneratedPruningTables,
    context: &'a mut TwoPhaseSearchContext,
}

fn search_phase1(
    cube: &Cube,
    last_move: Option<Move>,
    search: &mut Phase1Search<'_>,
    path_states: &mut HashSet<CubieState>,
    path: &mut Vec<Move>,
) -> Result<TwoPhaseSearchResult, GeneratedTwoPhaseError> {
    if !search.context.visit() {
        return Ok(TwoPhaseSearchResult::NodeLimitReached);
    }

    if path.len() + search.tables.phase1_heuristic(cube)? > search.phase1_limit {
        return Ok(TwoPhaseSearchResult::Exhausted);
    }

    if is_phase1_goal(cube)? {
        let remaining_depth = search.budget.max_depth.saturating_sub(path.len());
        match solve_phase2_from(
            cube,
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

    for move_ in FACE_MOVES {
        if should_skip_move(last_move, move_) {
            continue;
        }

        let mut next_cube = cube.clone();
        next_cube.apply_move(move_);
        if !path_states.insert(next_cube.state().clone()) {
            continue;
        }

        path.push(move_);
        let result = search_phase1(&next_cube, Some(move_), search, path_states, path)?;
        path.pop();
        path_states.remove(next_cube.state());

        match result {
            TwoPhaseSearchResult::Found(_) | TwoPhaseSearchResult::NodeLimitReached => {
                return Ok(result);
            }
            TwoPhaseSearchResult::Exhausted => {}
        }
    }

    Ok(TwoPhaseSearchResult::Exhausted)
}

fn solve_phase2_from(
    cube: &Cube,
    remaining_depth: usize,
    last_phase1_move: Option<Move>,
    tables: &GeneratedPruningTables,
    context: &mut TwoPhaseSearchContext,
) -> Result<TwoPhaseSearchResult, GeneratedTwoPhaseError> {
    let phase2_minimum = tables.phase2_heuristic(cube)?;
    if phase2_minimum > remaining_depth {
        return Ok(TwoPhaseSearchResult::Exhausted);
    }

    for phase2_limit in phase2_minimum..=remaining_depth {
        let mut path = Vec::new();
        let mut path_states = HashSet::<CubieState>::from([cube.state().clone()]);

        match search_phase2(
            cube,
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
    cube: &Cube,
    phase2_limit: usize,
    last_move: Option<Move>,
    tables: &GeneratedPruningTables,
    context: &mut TwoPhaseSearchContext,
    path_states: &mut HashSet<CubieState>,
    path: &mut Vec<Move>,
) -> Result<TwoPhaseSearchResult, GeneratedTwoPhaseError> {
    if !context.visit() {
        return Ok(TwoPhaseSearchResult::NodeLimitReached);
    }

    if path.len() + tables.phase2_heuristic(cube)? > phase2_limit {
        return Ok(TwoPhaseSearchResult::Exhausted);
    }

    if cube.is_solved() {
        return Ok(TwoPhaseSearchResult::Found(path.clone()));
    }

    if path.len() == phase2_limit {
        return Ok(TwoPhaseSearchResult::Exhausted);
    }

    for move_ in PHASE2_MOVES {
        if should_skip_move(last_move, move_) {
            continue;
        }

        let mut next_cube = cube.clone();
        next_cube.apply_move(move_);
        if !path_states.insert(next_cube.state().clone()) {
            continue;
        }

        path.push(move_);
        let result = search_phase2(
            &next_cube,
            phase2_limit,
            Some(move_),
            tables,
            context,
            path_states,
            path,
        )?;
        path.pop();
        path_states.remove(next_cube.state());

        match result {
            TwoPhaseSearchResult::Found(_) | TwoPhaseSearchResult::NodeLimitReached => {
                return Ok(result);
            }
            TwoPhaseSearchResult::Exhausted => {}
        }
    }

    Ok(TwoPhaseSearchResult::Exhausted)
}

fn load_generated_table(
    directory: &Path,
    kind: GeneratedPruningTableKind,
) -> Result<PruningTable, GeneratedTwoPhaseError> {
    let spec = generated_spec(kind)?;
    let path = spec.file_path(directory);
    let table = PruningTable::load_artifact(&path).map_err(|error| {
        GeneratedTwoPhaseError::TableUnavailable {
            table: spec.table_name,
            path: path.clone(),
            error: Box::new(error),
        }
    })?;
    spec.validate_table(&table, &path).map_err(|error| {
        GeneratedTwoPhaseError::TableIncompatible {
            table: spec.table_name,
            path,
            error: Box::new(error),
        }
    })?;

    Ok(table)
}

fn generated_spec(
    kind: GeneratedPruningTableKind,
) -> Result<&'static GeneratedPruningTableSpec, GeneratedTwoPhaseError> {
    GENERATED_PRUNING_TABLE_SPECS
        .iter()
        .find(|spec| spec.kind == kind)
        .ok_or(GeneratedTwoPhaseError::MissingSpec { kind })
}

fn table_distance(
    phase: &'static str,
    table: &PruningTable,
    coordinates: &[usize],
) -> Result<usize, GeneratedTwoPhaseError> {
    match table.checked_lookup_coordinates(coordinates) {
        Ok(distance) => Ok(usize::from(distance)),
        Err(PruningLookupError::MissingEntry { .. }) => Ok(0),
        Err(error) => Err(GeneratedTwoPhaseError::Coordinate {
            phase,
            error: error.to_string(),
        }),
    }
}

fn phase1_coordinates_checked(cube: &Cube) -> Result<[usize; 3], GeneratedTwoPhaseError> {
    let state = cube.state();

    Ok([
        corner_orientation_coordinate(state).map_err(|error| {
            GeneratedTwoPhaseError::Coordinate {
                phase: "phase1",
                error: error.to_string(),
            }
        })?,
        edge_orientation_coordinate(state).map_err(|error| GeneratedTwoPhaseError::Coordinate {
            phase: "phase1",
            error: error.to_string(),
        })?,
        ud_slice_edge_combination_coordinate(state).map_err(|error| {
            GeneratedTwoPhaseError::Coordinate {
                phase: "phase1",
                error: error.to_string(),
            }
        })?,
    ])
}

fn is_phase1_goal(cube: &Cube) -> Result<bool, GeneratedTwoPhaseError> {
    Ok(phase1_coordinates_checked(cube)? == [0, 0, 0])
}

fn should_skip_move(last_move: Option<Move>, next_move: Move) -> bool {
    last_move.is_some_and(|last_move| last_move.face() == next_move.face())
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
