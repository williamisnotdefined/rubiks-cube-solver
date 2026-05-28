use std::collections::HashSet;

mod artifacts;
mod baseline;
mod constants;
mod coordinates;
mod errors;
mod metrics;
mod move_tables;
mod ordering;
mod solver;
mod tables;

pub use artifacts::GeneratedPruningTableArtifact;
pub use baseline::solve_two_phase_baseline;
pub use errors::GeneratedTwoPhaseError;
pub use metrics::{GeneratedTwoPhaseMetrics, GeneratedTwoPhaseSearchResult};
pub use solver::{
    solve_generated_two_phase, solve_generated_two_phase_multiprobe,
    solve_generated_two_phase_quality, solve_generated_two_phase_with_artifacts,
    GeneratedTwoPhaseSolver,
};

use constants::{
    MULTIPROBE_NODE_CAP, PHASE1_MOVE_COUNT, PHASE2_MOVES, PHASE2_MOVE_COUNT,
    QUALITY_DEPTH_16_NODE_CAP, QUALITY_DEPTH_18_NODE_CAP, QUALITY_DEPTH_20_DEEP_NODE_CAP,
    QUALITY_DEPTH_20_DEEP_NODE_THRESHOLD, QUALITY_DEPTH_20_NODE_CAP, QUALITY_PROBE_MAX_DEPTH,
    QUALITY_PROBE_NODE_CAP,
};
use coordinates::{Phase1Coordinates, Phase2Coordinates};
#[cfg(test)]
use move_tables::{Phase1MoveTables, Phase2MoveTables};
use ordering::{MoveOrderingProfile, MULTIPROBE_INVERSE_ORDERING_PROFILES};
#[cfg(test)]
use tables::table_distance_index;
use tables::GeneratedPruningTables;

use super::solution::{SearchBudget, SearchOutcome, SearchSolution};
use crate::cube::moves::{Axis, Face, Move, Turn, FACE_MOVES};
use crate::cube::Cube;

fn solve_generated_two_phase_multiprobe_with_tables(
    start: &Cube,
    budget: SearchBudget,
    tables: &GeneratedPruningTables,
) -> Result<GeneratedTwoPhaseSearchResult, GeneratedTwoPhaseError> {
    let mut metrics = GeneratedTwoPhaseMetrics::default();
    let mut explored_nodes = 0_usize;
    let mut best_solution: Option<SearchSolution> = None;
    let probe_depth = budget.max_depth.min(20);

    let fallback = solve_generated_two_phase_quality_schedule_with_tables(
        start,
        SearchBudget::with_limits(budget.max_depth, budget.max_nodes),
        tables,
    )?;
    if let Some(solution) = record_quality_attempt(fallback, &mut metrics, &mut explored_nodes) {
        if solution.len() <= probe_depth {
            return Ok(GeneratedTwoPhaseSearchResult {
                outcome: SearchOutcome::Found(solution),
                metrics,
            });
        }
        best_solution = Some(solution);
    }

    let inverse_start = start.inverse();
    for profile in MULTIPROBE_INVERSE_ORDERING_PROFILES {
        let remaining_nodes = remaining_node_budget(budget.max_nodes, explored_nodes);
        if remaining_nodes == Some(0) {
            break;
        }

        let attempt_nodes = multiprobe_node_budget(budget.max_nodes, remaining_nodes);
        let attempt = solve_generated_two_phase_quality_with_tables_and_profile(
            &inverse_start,
            SearchBudget::with_limits(probe_depth, attempt_nodes),
            tables,
            profile,
        )?;
        let attempt_nodes = attempt.metrics.explored_nodes();
        metrics = metrics.saturating_add(attempt.metrics);
        explored_nodes = explored_nodes.saturating_add(attempt_nodes);

        if let SearchOutcome::Found(inverse_solution) = attempt.outcome {
            let solution = SearchSolution::with_metrics(
                inverse_solution_moves(inverse_solution.moves()),
                explored_nodes,
            );
            if best_solution
                .as_ref()
                .is_none_or(|best| solution.len() < best.len())
            {
                best_solution = Some(solution);
            }
            if best_solution
                .as_ref()
                .is_some_and(|solution| solution.len() <= probe_depth)
            {
                break;
            }
        }
    }

    if let Some(solution) = best_solution {
        return Ok(GeneratedTwoPhaseSearchResult {
            outcome: SearchOutcome::Found(SearchSolution::with_metrics(
                solution.moves,
                explored_nodes,
            )),
            metrics,
        });
    }

    Ok(GeneratedTwoPhaseSearchResult {
        outcome: SearchOutcome::NotFoundWithinLimits { explored_nodes },
        metrics,
    })
}

fn inverse_solution_moves(moves: &[Move]) -> Vec<Move> {
    moves.iter().rev().map(|move_| move_.inverse()).collect()
}

fn solve_generated_two_phase_quality_schedule_with_tables(
    start: &Cube,
    budget: SearchBudget,
    tables: &GeneratedPruningTables,
) -> Result<GeneratedTwoPhaseSearchResult, GeneratedTwoPhaseError> {
    let mut metrics = GeneratedTwoPhaseMetrics::default();
    let mut explored_nodes = 0_usize;
    let probe =
        solve_generated_two_phase_quality_with_tables(start, quality_probe_budget(budget), tables)?;

    if let Some(solution) = record_quality_attempt(probe, &mut metrics, &mut explored_nodes) {
        return Ok(GeneratedTwoPhaseSearchResult {
            outcome: SearchOutcome::Found(solution),
            metrics,
        });
    }

    for depth_limit in quality_depth_schedule(budget.max_depth) {
        let remaining_nodes = remaining_node_budget(budget.max_nodes, explored_nodes);
        if remaining_nodes == Some(0) {
            break;
        }
        let attempt_nodes = if depth_limit == budget.max_depth {
            remaining_nodes
        } else {
            quality_depth_node_budget(budget.max_nodes, remaining_nodes, depth_limit)
        };

        let attempt = solve_generated_two_phase_with_tables(
            start,
            SearchBudget::with_limits(depth_limit, attempt_nodes),
            tables,
        )?;
        if let Some(solution) = record_quality_attempt(attempt, &mut metrics, &mut explored_nodes) {
            return Ok(GeneratedTwoPhaseSearchResult {
                outcome: SearchOutcome::Found(solution),
                metrics,
            });
        }
    }

    Ok(GeneratedTwoPhaseSearchResult {
        outcome: SearchOutcome::NotFoundWithinLimits { explored_nodes },
        metrics,
    })
}

fn record_quality_attempt(
    attempt: GeneratedTwoPhaseSearchResult,
    metrics: &mut GeneratedTwoPhaseMetrics,
    explored_nodes: &mut usize,
) -> Option<SearchSolution> {
    let attempt_nodes = attempt.metrics.explored_nodes();
    *metrics = metrics.saturating_add(attempt.metrics);
    *explored_nodes = explored_nodes.saturating_add(attempt_nodes);

    match attempt.outcome {
        SearchOutcome::Found(solution) => Some(SearchSolution::with_metrics(
            solution.moves,
            *explored_nodes,
        )),
        SearchOutcome::NotFoundWithinLimits { .. } => None,
    }
}

fn quality_depth_schedule(max_depth: usize) -> Vec<usize> {
    let mut depths = Vec::new();

    for depth in [16, 18, 20, max_depth] {
        let depth = depth.min(max_depth);
        if depths.last() != Some(&depth) {
            depths.push(depth);
        }
    }

    depths
}

fn quality_probe_budget(budget: SearchBudget) -> SearchBudget {
    SearchBudget::with_limits(
        budget.max_depth.min(QUALITY_PROBE_MAX_DEPTH),
        quality_probe_node_budget(budget.max_nodes),
    )
}

fn quality_probe_node_budget(max_nodes: Option<usize>) -> Option<usize> {
    match max_nodes {
        Some(0) => Some(0),
        Some(max_nodes) => {
            let proportional = (max_nodes / 10).max(1_000);
            Some(proportional.min(QUALITY_PROBE_NODE_CAP).min(max_nodes))
        }
        None => Some(QUALITY_PROBE_NODE_CAP),
    }
}

fn multiprobe_node_budget(
    max_nodes: Option<usize>,
    remaining_nodes: Option<usize>,
) -> Option<usize> {
    match max_nodes {
        Some(0) => Some(0),
        Some(max_nodes) => {
            let candidate = (max_nodes / 10)
                .clamp(1_000, MULTIPROBE_NODE_CAP)
                .min(max_nodes);
            Some(remaining_nodes.map_or(candidate, |remaining| candidate.min(remaining)))
        }
        None => Some(MULTIPROBE_NODE_CAP),
    }
}

fn quality_depth_node_budget(
    max_nodes: Option<usize>,
    remaining_nodes: Option<usize>,
    depth_limit: usize,
) -> Option<usize> {
    let candidate = match max_nodes {
        Some(0) => 0,
        Some(max_nodes) if depth_limit <= 16 => (max_nodes / 20)
            .clamp(1_000, QUALITY_DEPTH_16_NODE_CAP)
            .min(max_nodes),
        Some(max_nodes) if depth_limit <= 18 => (max_nodes / 10)
            .clamp(1_000, QUALITY_DEPTH_18_NODE_CAP)
            .min(max_nodes),
        Some(max_nodes)
            if depth_limit <= 20 && max_nodes >= QUALITY_DEPTH_20_DEEP_NODE_THRESHOLD =>
        {
            (max_nodes.saturating_mul(4) / 5)
                .clamp(QUALITY_DEPTH_20_NODE_CAP, QUALITY_DEPTH_20_DEEP_NODE_CAP)
                .min(max_nodes)
        }
        Some(max_nodes) => (max_nodes.saturating_mul(3) / 10)
            .clamp(1_000, QUALITY_DEPTH_20_NODE_CAP)
            .min(max_nodes),
        None if depth_limit <= 16 => QUALITY_DEPTH_16_NODE_CAP,
        None if depth_limit <= 18 => QUALITY_DEPTH_18_NODE_CAP,
        None => QUALITY_DEPTH_20_NODE_CAP,
    };

    Some(remaining_nodes.map_or(candidate, |remaining| candidate.min(remaining)))
}

fn remaining_node_budget(max_nodes: Option<usize>, spent_nodes: usize) -> Option<usize> {
    max_nodes.map(|max_nodes| max_nodes.saturating_sub(spent_nodes))
}

fn solve_generated_two_phase_with_tables(
    start: &Cube,
    budget: SearchBudget,
    tables: &GeneratedPruningTables,
) -> Result<GeneratedTwoPhaseSearchResult, GeneratedTwoPhaseError> {
    solve_generated_two_phase_with_tables_and_profile(
        start,
        budget,
        tables,
        MoveOrderingProfile::Default,
    )
}

fn solve_generated_two_phase_with_tables_and_profile(
    start: &Cube,
    budget: SearchBudget,
    tables: &GeneratedPruningTables,
    ordering_profile: MoveOrderingProfile,
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
            ordering_profile,
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

fn solve_generated_two_phase_quality_with_tables(
    start: &Cube,
    budget: SearchBudget,
    tables: &GeneratedPruningTables,
) -> Result<GeneratedTwoPhaseSearchResult, GeneratedTwoPhaseError> {
    solve_generated_two_phase_quality_with_tables_and_profile(
        start,
        budget,
        tables,
        MoveOrderingProfile::Default,
    )
}

fn solve_generated_two_phase_quality_with_tables_and_profile(
    start: &Cube,
    budget: SearchBudget,
    tables: &GeneratedPruningTables,
    ordering_profile: MoveOrderingProfile,
) -> Result<GeneratedTwoPhaseSearchResult, GeneratedTwoPhaseError> {
    let mut context = TwoPhaseSearchContext::new(budget.max_nodes);
    let start_coordinates = Phase1Coordinates::try_from_cube(start)?;
    let phase1_minimum = tables.phase1_heuristic_coordinates(start_coordinates, &mut context)?;

    if phase1_minimum > budget.max_depth {
        return Ok(context.finish(SearchOutcome::NotFoundWithinLimits {
            explored_nodes: context.explored_nodes(),
        }));
    }

    for total_limit in phase1_minimum..=budget.max_depth {
        context.record_total_depth_attempt(total_limit);
        context.record_phase1_depth_attempt(total_limit);
        let total_budget = SearchBudget::with_limits(total_limit, budget.max_nodes);
        let mut path = Vec::new();

        let mut phase1_search = Phase1Search {
            budget: total_budget,
            phase1_limit: total_limit,
            start,
            tables,
            ordering_profile,
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

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(super) struct TwoPhaseSearchContext {
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
                total_depth_attempts: 0,
                max_total_depth_attempted: None,
                phase1_ordered_candidates: 0,
                phase1_ordering_heuristic_evals: 0,
                phase2_ordered_candidates: 0,
                phase2_ordering_heuristic_evals: 0,
                phase2_calls: 0,
                heuristic_prunes: 0,
                node_limit_hits: 0,
                table_missing_entries: 0,
                solutions_found: 0,
                best_solution_length: None,
                best_phase1_length: None,
                best_phase2_length: None,
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

    fn record_total_depth_attempt(&mut self, depth: usize) {
        self.metrics.total_depth_attempts += 1;
        self.metrics.max_total_depth_attempted = Some(depth);
    }

    fn record_solution_candidate(&mut self, phase1_length: usize, phase2_length: usize) {
        let solution_length = phase1_length + phase2_length;
        self.metrics.solutions_found += 1;

        if self
            .metrics
            .best_solution_length
            .is_none_or(|current| solution_length < current)
        {
            self.metrics.best_solution_length = Some(solution_length);
            self.metrics.best_phase1_length = Some(phase1_length);
            self.metrics.best_phase2_length = Some(phase2_length);
        }
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

    pub(super) fn record_missing_table_entry(&mut self) {
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
    ordering_profile: MoveOrderingProfile,
    context: &'a mut TwoPhaseSearchContext,
}

struct Phase2Search<'a> {
    phase2_limit: usize,
    tables: &'a GeneratedPruningTables,
    ordering_profile: MoveOrderingProfile,
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
            search.ordering_profile,
            search.context,
        )? {
            TwoPhaseSearchResult::Found(phase2_moves) => {
                search
                    .context
                    .record_solution_candidate(path.len(), phase2_moves.len());
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

    sort_phase1_candidates_with_profile(&mut candidates, search.ordering_profile);
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

#[cfg(test)]
fn sort_phase1_candidates(candidates: &mut [Phase1Candidate]) {
    sort_phase1_candidates_with_profile(candidates, MoveOrderingProfile::Default);
}

fn sort_phase1_candidates_with_profile(
    candidates: &mut [Phase1Candidate],
    profile: MoveOrderingProfile,
) {
    candidates.sort_by_key(|candidate| phase1_sort_key(*candidate, profile));
}

fn phase1_sort_key(
    candidate: Phase1Candidate,
    profile: MoveOrderingProfile,
) -> (usize, usize, usize, usize) {
    candidate_sort_key(
        candidate.estimated_total,
        candidate.heuristic,
        candidate.move_index,
        candidate.move_,
        PHASE1_MOVE_COUNT,
        profile,
    )
}

fn solve_phase2_from(
    cube: &Cube,
    remaining_depth: usize,
    last_phase1_move: Option<Move>,
    tables: &GeneratedPruningTables,
    ordering_profile: MoveOrderingProfile,
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
        let mut phase2_search = Phase2Search {
            phase2_limit,
            tables,
            ordering_profile,
            context,
        };

        match search_phase2(
            start_coordinates,
            last_phase1_move,
            &mut phase2_search,
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
    last_move: Option<Move>,
    search: &mut Phase2Search<'_>,
    path_states: &mut HashSet<Phase2Coordinates>,
    path: &mut Vec<Move>,
) -> Result<TwoPhaseSearchResult, GeneratedTwoPhaseError> {
    if !search.context.visit_phase2() {
        return Ok(TwoPhaseSearchResult::NodeLimitReached);
    }

    if path.len()
        + search
            .tables
            .phase2_heuristic_coordinates(coordinates, search.context)?
        > search.phase2_limit
    {
        search.context.record_heuristic_prune();
        return Ok(TwoPhaseSearchResult::Exhausted);
    }

    if coordinates.is_goal() {
        return Ok(TwoPhaseSearchResult::Found(path.clone()));
    }

    if path.len() == search.phase2_limit {
        return Ok(TwoPhaseSearchResult::Exhausted);
    }

    for candidate in phase2_ordered_candidates(
        coordinates,
        last_move,
        path.len(),
        search.tables,
        search.ordering_profile,
        search.context,
    )? {
        if !path_states.insert(candidate.coordinates) {
            continue;
        }

        path.push(candidate.move_);
        let result = search_phase2(
            candidate.coordinates,
            Some(candidate.move_),
            search,
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
    ordering_profile: MoveOrderingProfile,
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

    sort_phase2_candidates_with_profile(&mut candidates, ordering_profile);
    context.record_phase2_ordered_candidates(candidates.len());

    Ok(candidates)
}

fn phase2_candidate_moves(last_move: Option<Move>) -> impl Iterator<Item = (usize, Move)> {
    PHASE2_MOVES
        .into_iter()
        .enumerate()
        .filter(move |(_, move_)| !should_skip_move(last_move, *move_))
}

#[cfg(test)]
fn sort_phase2_candidates(candidates: &mut [Phase2Candidate]) {
    sort_phase2_candidates_with_profile(candidates, MoveOrderingProfile::Default);
}

fn sort_phase2_candidates_with_profile(
    candidates: &mut [Phase2Candidate],
    profile: MoveOrderingProfile,
) {
    candidates.sort_by_key(|candidate| phase2_sort_key(*candidate, profile));
}

fn phase2_sort_key(
    candidate: Phase2Candidate,
    profile: MoveOrderingProfile,
) -> (usize, usize, usize, usize) {
    candidate_sort_key(
        candidate.estimated_total,
        candidate.heuristic,
        candidate.move_index,
        candidate.move_,
        PHASE2_MOVE_COUNT,
        profile,
    )
}

fn candidate_sort_key(
    estimated_total: usize,
    heuristic: usize,
    move_index: usize,
    move_: Move,
    move_count: usize,
    profile: MoveOrderingProfile,
) -> (usize, usize, usize, usize) {
    match profile {
        MoveOrderingProfile::Default => (estimated_total, heuristic, move_index, 0),
        MoveOrderingProfile::Reverse => (
            estimated_total,
            heuristic,
            move_count.saturating_sub(1).saturating_sub(move_index),
            0,
        ),
        MoveOrderingProfile::HalfTurnsFirst => {
            (estimated_total, turn_priority(move_), heuristic, move_index)
        }
        MoveOrderingProfile::AxisZFirst => (
            estimated_total,
            axis_priority(move_, [Axis::Z, Axis::Y, Axis::X]),
            heuristic,
            move_index,
        ),
        MoveOrderingProfile::AxisXFirst => (
            estimated_total,
            axis_priority(move_, [Axis::X, Axis::Z, Axis::Y]),
            heuristic,
            move_index,
        ),
    }
}

fn turn_priority(move_: Move) -> usize {
    match move_.turn() {
        Turn::Half => 0,
        Turn::Clockwise => 1,
        Turn::CounterClockwise => 2,
    }
}

fn axis_priority(move_: Move, ordered_axes: [Axis; 3]) -> usize {
    ordered_axes
        .into_iter()
        .position(|axis| axis == move_.axis())
        .unwrap_or(ordered_axes.len())
}

fn cube_after_moves(start: &Cube, moves: &[Move]) -> Cube {
    let mut cube = start.clone();
    cube.apply_moves(moves);

    cube
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

#[cfg(test)]
mod tests {
    use super::{
        inverse_solution_moves, multiprobe_node_budget, phase1_candidate_moves,
        phase2_candidate_moves, quality_depth_node_budget, quality_depth_schedule,
        quality_probe_budget, record_quality_attempt, should_skip_move, sort_phase1_candidates,
        sort_phase1_candidates_with_profile, sort_phase2_candidates, table_distance_index,
        GeneratedTwoPhaseMetrics, GeneratedTwoPhaseSearchResult, MoveOrderingProfile,
        Phase1Candidate, Phase1Coordinates, Phase1MoveTables, Phase2Candidate, Phase2Coordinates,
        Phase2MoveTables, TwoPhaseSearchContext, FACE_MOVES, PHASE2_MOVES,
    };
    use crate::cube::{Cube, Move};
    use crate::search::pruning::{
        PruningCoordinate, PruningGenerationParameters, PruningPhaseRole, PruningTable,
        PruningTableMetadata,
    };
    use crate::search::{SearchBudget, SearchOutcome, SearchSolution};

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
    fn search_context_records_quality_depths_and_best_solution_candidate() {
        let mut context = TwoPhaseSearchContext::new(None);

        context.record_total_depth_attempt(16);
        context.record_total_depth_attempt(18);
        context.record_solution_candidate(5, 7);
        context.record_solution_candidate(4, 6);

        assert_eq!(context.metrics.total_depth_attempts, 2);
        assert_eq!(context.metrics.max_total_depth_attempted, Some(18));
        assert_eq!(context.metrics.solutions_found, 2);
        assert_eq!(context.metrics.best_solution_length, Some(10));
        assert_eq!(context.metrics.best_phase1_length, Some(4));
        assert_eq!(context.metrics.best_phase2_length, Some(6));
    }

    #[test]
    fn quality_probe_budget_uses_short_depth_and_small_node_slice() {
        assert_eq!(
            quality_probe_budget(SearchBudget::with_limits(30, Some(10_000_000))),
            SearchBudget::with_limits(16, Some(1_000_000))
        );
        assert_eq!(
            quality_probe_budget(SearchBudget::with_limits(12, Some(500))),
            SearchBudget::with_limits(12, Some(500))
        );
        assert_eq!(
            quality_probe_budget(SearchBudget::with_limits(30, None)),
            SearchBudget::with_limits(16, Some(1_000_000))
        );
    }

    #[test]
    fn quality_depth_schedule_targets_gods_number_buckets_before_full_depth() {
        assert_eq!(quality_depth_schedule(0), vec![0]);
        assert_eq!(quality_depth_schedule(17), vec![16, 17]);
        assert_eq!(quality_depth_schedule(20), vec![16, 18, 20]);
        assert_eq!(quality_depth_schedule(30), vec![16, 18, 20, 30]);
    }

    #[test]
    fn quality_depth_node_budget_slices_short_depth_attempts() {
        assert_eq!(
            quality_depth_node_budget(Some(10_000_000), Some(9_000_000), 16),
            Some(500_000)
        );
        assert_eq!(
            quality_depth_node_budget(Some(10_000_000), Some(9_000_000), 18),
            Some(1_000_000)
        );
        assert_eq!(
            quality_depth_node_budget(Some(10_000_000), Some(9_000_000), 20),
            Some(3_000_000)
        );
        assert_eq!(
            quality_depth_node_budget(Some(50_000_000), Some(49_000_000), 20),
            Some(40_000_000)
        );
        assert_eq!(
            quality_depth_node_budget(Some(10_000_000), Some(250), 20),
            Some(250)
        );
    }

    #[test]
    fn multiprobe_node_budget_preserves_fallback_budget() {
        assert_eq!(
            multiprobe_node_budget(Some(10_000_000), Some(9_000_000)),
            Some(1_000_000)
        );
        assert_eq!(
            multiprobe_node_budget(Some(10_000_000), Some(500)),
            Some(500)
        );
        assert_eq!(multiprobe_node_budget(None, None), Some(1_000_000));
    }

    #[test]
    fn inverse_solution_moves_reverses_and_inverts_moves() {
        assert_eq!(
            inverse_solution_moves(&[Move::R, Move::U2, Move::FPrime]),
            vec![Move::F, Move::U2, Move::RPrime]
        );
    }

    #[test]
    fn record_quality_attempt_combines_explored_nodes_and_metrics() {
        let mut metrics = GeneratedTwoPhaseMetrics {
            phase1_nodes: 7,
            phase2_nodes: 3,
            total_depth_attempts: 1,
            max_total_depth_attempted: Some(16),
            ..GeneratedTwoPhaseMetrics::default()
        };
        let mut explored_nodes = metrics.explored_nodes();
        let attempt = GeneratedTwoPhaseSearchResult {
            outcome: SearchOutcome::Found(SearchSolution::with_metrics(vec![Move::U], 4)),
            metrics: GeneratedTwoPhaseMetrics {
                phase1_nodes: 3,
                phase2_nodes: 1,
                solutions_found: 1,
                best_solution_length: Some(1),
                best_phase1_length: Some(0),
                best_phase2_length: Some(1),
                ..GeneratedTwoPhaseMetrics::default()
            },
        };

        let solution = record_quality_attempt(attempt, &mut metrics, &mut explored_nodes)
            .expect("found attempt should return a cumulative solution");

        assert_eq!(metrics.explored_nodes(), 14);
        assert_eq!(metrics.total_depth_attempts, 1);
        assert_eq!(metrics.max_total_depth_attempted, Some(16));
        assert_eq!(metrics.solutions_found, 1);
        assert_eq!(metrics.best_solution_length, Some(1));
        assert_eq!(explored_nodes, 14);
        assert_eq!(solution.explored_nodes(), 14);
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
    fn phase1_multiprobe_profile_can_prioritize_half_turns() {
        let coordinates = Phase1Coordinates {
            corner_orientation: 0,
            edge_orientation: 0,
            ud_slice: 0,
        };
        let mut candidates = vec![
            Phase1Candidate {
                move_index: 0,
                move_: Move::U,
                coordinates,
                heuristic: 2,
                estimated_total: 5,
            },
            Phase1Candidate {
                move_index: 1,
                move_: Move::U2,
                coordinates,
                heuristic: 2,
                estimated_total: 5,
            },
        ];

        sort_phase1_candidates_with_profile(&mut candidates, MoveOrderingProfile::HalfTurnsFirst);

        assert_eq!(
            candidates
                .iter()
                .map(|candidate| candidate.move_)
                .collect::<Vec<_>>(),
            vec![Move::U2, Move::U]
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
