use std::collections::HashSet;

use crate::cube::moves::{Move, FACE_MOVES};
use crate::cube::Cube;
use crate::search::solution::{SearchBudget, SearchOutcome, SearchSolution};

use super::candidates::{
    phase1_candidate_moves, phase2_candidate_moves, sort_phase1_candidates_with_profile,
    sort_phase2_candidates_with_profile, Phase1Candidate, Phase2Candidate,
};
use super::context::TwoPhaseSearchContext;
use super::coordinates::{Phase1Coordinates, Phase2Coordinates};
use super::metrics::GeneratedTwoPhaseSearchResult;
use super::ordering::MoveOrderingProfile;
use super::tables::GeneratedPruningTables;
use super::GeneratedTwoPhaseError;

pub(super) fn solve_generated_two_phase_with_tables(
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

pub(super) fn solve_generated_two_phase_with_tables_and_profile(
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

pub(super) fn solve_generated_two_phase_quality_with_tables(
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

pub(super) fn solve_generated_two_phase_quality_with_tables_and_profile(
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

#[derive(Clone, Debug, Eq, PartialEq)]
enum TwoPhaseSearchResult {
    Found(Vec<Move>),
    Exhausted,
    NodeLimitReached,
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
    let mut candidates = Vec::new();

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

fn cube_after_moves(start: &Cube, moves: &[Move]) -> Cube {
    let mut cube = start.clone();
    cube.apply_moves(moves);

    cube
}
