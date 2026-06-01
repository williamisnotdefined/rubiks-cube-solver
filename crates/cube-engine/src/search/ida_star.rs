use std::collections::HashSet;

use super::heuristics::{Heuristic, ZeroHeuristic};
use super::solution::{SearchBudget, SearchOutcome, SearchSolution};
use crate::cube::moves::{Face, FACE_MOVES};
use crate::cube::{Cube, CubieState, Move};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum ThresholdSearchResult {
    Found,
    NextThreshold(usize),
    Exhausted,
    NodeLimitReached,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
struct SearchLimits {
    max_depth: usize,
    max_nodes: Option<usize>,
    threshold: usize,
}

struct ThresholdSearchContext<'a> {
    path_states: &'a mut HashSet<CubieState>,
    path: &'a mut Vec<Move>,
    explored_nodes: &'a mut usize,
}

pub fn solve_ida_star_bounded(start: &Cube, budget: SearchBudget) -> SearchOutcome {
    let heuristic = ZeroHeuristic;
    solve_ida_star_bounded_with_heuristic(start, budget, &heuristic)
}

pub fn solve_ida_star_bounded_with_heuristic<H>(
    start: &Cube,
    budget: SearchBudget,
    heuristic: &H,
) -> SearchOutcome
where
    H: Heuristic,
{
    solve_ida_star_bounded_with_ordered_moves(start, budget, heuristic, |_cube, _moves| {})
}

pub(crate) fn solve_ida_star_bounded_with_ordered_moves<H, F>(
    start: &Cube,
    budget: SearchBudget,
    heuristic: &H,
    mut order_moves: F,
) -> SearchOutcome
where
    H: Heuristic,
    F: FnMut(&Cube, &mut Vec<Move>),
{
    let mut threshold = heuristic.estimate(start);
    if threshold > budget.max_depth {
        return SearchOutcome::NotFoundWithinLimits { explored_nodes: 0 };
    }

    let mut explored_nodes = 0;

    loop {
        let mut path = Vec::new();
        let mut path_states = HashSet::<CubieState>::from([start.state().clone()]);
        let limits = SearchLimits {
            max_depth: budget.max_depth,
            max_nodes: budget.max_nodes,
            threshold,
        };
        let threshold_result = {
            let mut context = ThresholdSearchContext {
                path_states: &mut path_states,
                path: &mut path,
                explored_nodes: &mut explored_nodes,
            };

            search_threshold(
                start,
                limits,
                None,
                heuristic,
                &mut context,
                &mut order_moves,
            )
        };

        match threshold_result {
            ThresholdSearchResult::Found => {
                let solves_start = solution_solves(start, &path);
                debug_assert!(solves_start);
                if !solves_start {
                    return SearchOutcome::NotFoundWithinLimits { explored_nodes };
                }

                return SearchOutcome::Found(SearchSolution::with_metrics(path, explored_nodes));
            }
            ThresholdSearchResult::NextThreshold(next_threshold)
                if next_threshold <= budget.max_depth =>
            {
                threshold = next_threshold;
            }
            ThresholdSearchResult::NextThreshold(_)
            | ThresholdSearchResult::Exhausted
            | ThresholdSearchResult::NodeLimitReached => {
                return SearchOutcome::NotFoundWithinLimits { explored_nodes };
            }
        }
    }
}

fn search_threshold<H>(
    cube: &Cube,
    limits: SearchLimits,
    last_move: Option<Move>,
    heuristic: &H,
    context: &mut ThresholdSearchContext<'_>,
    order_moves: &mut impl FnMut(&Cube, &mut Vec<Move>),
) -> ThresholdSearchResult
where
    H: Heuristic,
{
    if let Some(max_nodes) = limits.max_nodes {
        if *context.explored_nodes >= max_nodes {
            return ThresholdSearchResult::NodeLimitReached;
        }
    }

    *context.explored_nodes += 1;

    let estimated_cost = context.path.len() + heuristic.estimate(cube);
    if estimated_cost > limits.threshold {
        return ThresholdSearchResult::NextThreshold(estimated_cost);
    }

    if cube.is_solved() {
        return ThresholdSearchResult::Found;
    }

    if context.path.len() == limits.max_depth {
        return ThresholdSearchResult::Exhausted;
    }

    let mut next_threshold: Option<usize> = None;
    let mut candidate_moves = legal_candidate_moves(last_move);
    order_moves(cube, &mut candidate_moves);

    for move_ in candidate_moves {
        let mut next_cube = cube.clone();
        next_cube.apply_move(move_);

        if !context.path_states.insert(next_cube.state().clone()) {
            continue;
        }

        context.path.push(move_);

        match search_threshold(
            &next_cube,
            limits,
            Some(move_),
            heuristic,
            context,
            order_moves,
        ) {
            ThresholdSearchResult::Found => return ThresholdSearchResult::Found,
            ThresholdSearchResult::NextThreshold(candidate) => {
                next_threshold =
                    Some(next_threshold.map_or(candidate, |current| current.min(candidate)));
            }
            ThresholdSearchResult::Exhausted => {}
            ThresholdSearchResult::NodeLimitReached => {
                context.path.pop();
                context.path_states.remove(next_cube.state());
                return ThresholdSearchResult::NodeLimitReached;
            }
        }

        context.path.pop();
        context.path_states.remove(next_cube.state());
    }

    next_threshold.map_or(
        ThresholdSearchResult::Exhausted,
        ThresholdSearchResult::NextThreshold,
    )
}

fn legal_candidate_moves(last_move: Option<Move>) -> Vec<Move> {
    FACE_MOVES
        .iter()
        .copied()
        .filter(|move_| !should_skip_move(last_move, *move_))
        .collect()
}

fn should_skip_move(last_move: Option<Move>, next_move: Move) -> bool {
    let Some(last_move) = last_move else {
        return false;
    };

    let last_face = last_move.face();
    let next_face = next_move.face();

    last_face == next_face
        || (last_face.axis() == next_face.axis() && face_order(last_face) > face_order(next_face))
}

const fn face_order(face: Face) -> u8 {
    match face {
        Face::U => 0,
        Face::D => 1,
        Face::L => 0,
        Face::R => 1,
        Face::F => 0,
        Face::B => 1,
    }
}

fn solution_solves(start: &Cube, moves: &[Move]) -> bool {
    let mut cube = start.clone();
    cube.apply_moves(moves);
    cube.is_solved()
}

#[cfg(test)]
mod tests {
    use super::{should_skip_move, solve_ida_star_bounded, solve_ida_star_bounded_with_heuristic};
    use crate::cube::moves::FACE_MOVES;
    use crate::cube::{Cube, Move};
    use crate::search::{
        CornerOrientationHeuristic, EdgeOrientationHeuristic, MaxHeuristic,
        MisplacedCubiesHeuristic, SearchBudget, SearchOutcome, ZeroHeuristic,
    };

    #[test]
    fn solved_cube_returns_empty_solution() {
        let solution = found_solution(solve_ida_star_bounded(
            &Cube::solved(),
            SearchBudget::new(0),
        ));

        assert!(solution.is_empty());
        assert_eq!(solution.explored_nodes(), 1);
    }

    #[test]
    fn one_move_scramble_solves() {
        let cube = scrambled(&[Move::R]);
        let solution = found_solution(solve_ida_star_bounded(&cube, SearchBudget::new(1)));

        assert_solution_solves(cube, solution.moves());
    }

    #[test]
    fn two_move_scramble_solves() {
        let cube = scrambled(&[Move::R, Move::U]);
        let solution = found_solution(solve_ida_star_bounded(&cube, SearchBudget::new(2)));

        assert_solution_solves(cube, solution.moves());
    }

    #[test]
    fn insufficient_depth_returns_none() {
        let cube = scrambled(&[Move::R, Move::U]);

        match solve_ida_star_bounded(&cube, SearchBudget::new(1)) {
            SearchOutcome::Found(_) => panic!("two-move scramble should exceed depth one"),
            SearchOutcome::NotFoundWithinLimits { explored_nodes } => {
                assert!(explored_nodes > 0);
            }
        }
    }

    #[test]
    fn ida_star_reports_explored_nodes() {
        let cube = scrambled(&[Move::R, Move::U]);
        let solution = found_solution(solve_ida_star_bounded(&cube, SearchBudget::new(2)));

        assert!(solution.explored_nodes() > 0);
    }

    #[test]
    fn bounded_ida_star_reports_found_solution_with_metrics() {
        let cube = scrambled(&[Move::R]);
        let outcome = solve_ida_star_bounded(&cube, SearchBudget::new(1));
        let explored_nodes = outcome.explored_nodes();

        match outcome {
            SearchOutcome::Found(solution) => {
                assert!(!solution.is_empty());
                assert_eq!(solution.explored_nodes(), explored_nodes);
                assert!(explored_nodes > 0);
                assert_solution_solves(cube, solution.moves());
            }
            SearchOutcome::NotFoundWithinLimits { .. } => {
                panic!("one-move scramble should solve within bounded search")
            }
        }
    }

    #[test]
    fn bounded_ida_star_reports_depth_limit_with_metrics() {
        let cube = scrambled(&[Move::R, Move::U]);

        match solve_ida_star_bounded(&cube, SearchBudget::new(1)) {
            SearchOutcome::Found(_) => panic!("two-move scramble should exceed depth one"),
            SearchOutcome::NotFoundWithinLimits { explored_nodes } => {
                assert!(explored_nodes > 0);
            }
        }
    }

    #[test]
    fn bounded_ida_star_enforces_node_limit() {
        let cube = scrambled(&[Move::R]);

        assert_eq!(
            solve_ida_star_bounded(&cube, SearchBudget::with_limits(1, Some(0))),
            SearchOutcome::NotFoundWithinLimits { explored_nodes: 0 }
        );
        assert_eq!(
            solve_ida_star_bounded(&cube, SearchBudget::with_limits(1, Some(1))),
            SearchOutcome::NotFoundWithinLimits { explored_nodes: 1 }
        );
    }

    #[test]
    fn move_pruning_canonicalizes_same_axis_branches() {
        assert!(should_skip_move(Some(Move::U), Move::U2));
        assert!(!should_skip_move(Some(Move::U), Move::D));
        assert!(should_skip_move(Some(Move::D), Move::U));
        assert!(!should_skip_move(Some(Move::L), Move::R));
        assert!(should_skip_move(Some(Move::R), Move::L));
        assert!(!should_skip_move(Some(Move::F), Move::B));
        assert!(should_skip_move(Some(Move::B), Move::F));
        assert!(!should_skip_move(Some(Move::U), Move::R));
    }

    #[test]
    fn solution_uses_face_moves_only() {
        let cube = scrambled(&[Move::R, Move::U]);
        let solution = found_solution(solve_ida_star_bounded(&cube, SearchBudget::new(2)));

        assert!(solution
            .moves()
            .iter()
            .all(|move_| FACE_MOVES.contains(move_)));
    }

    #[test]
    fn heuristic_guided_solution_uses_face_moves_only() {
        let cube = scrambled(&[Move::R, Move::U]);
        let heuristic = MaxHeuristic::new(MisplacedCubiesHeuristic, CornerOrientationHeuristic);
        let solution = found_solution(solve_ida_star_bounded_with_heuristic(
            &cube,
            SearchBudget::new(2),
            &heuristic,
        ));

        assert!(solution
            .moves()
            .iter()
            .all(|move_| FACE_MOVES.contains(move_)));
    }

    #[test]
    fn solution_preserves_valid_state_when_applied() {
        let mut cube = scrambled(&[Move::R, Move::U]);
        let solution = found_solution(solve_ida_star_bounded(&cube, SearchBudget::new(2)));

        solution.apply_to(&mut cube);

        assert!(cube.state().is_valid());
        assert!(cube.is_solved());
    }

    #[test]
    fn max_heuristic_solves_shallow_scramble() {
        let cube = scrambled(&[Move::R, Move::U]);
        let heuristic = MaxHeuristic::new(
            MisplacedCubiesHeuristic,
            MaxHeuristic::new(CornerOrientationHeuristic, EdgeOrientationHeuristic),
        );
        let solution = found_solution(solve_ida_star_bounded_with_heuristic(
            &cube,
            SearchBudget::new(2),
            &heuristic,
        ));

        assert_solution_solves(cube, solution.moves());
    }

    #[test]
    fn heuristic_guided_api_accepts_current_simple_heuristics() {
        let cube = scrambled(&[Move::R]);

        assert_solution_solves(
            cube.clone(),
            found_solution(solve_ida_star_bounded_with_heuristic(
                &cube,
                SearchBudget::new(1),
                &ZeroHeuristic,
            ))
            .moves(),
        );
        assert_solution_solves(
            cube.clone(),
            found_solution(solve_ida_star_bounded_with_heuristic(
                &cube,
                SearchBudget::new(1),
                &MisplacedCubiesHeuristic,
            ))
            .moves(),
        );
        assert_solution_solves(
            cube.clone(),
            found_solution(solve_ida_star_bounded_with_heuristic(
                &cube,
                SearchBudget::new(1),
                &CornerOrientationHeuristic,
            ))
            .moves(),
        );
        assert_solution_solves(
            cube.clone(),
            found_solution(solve_ida_star_bounded_with_heuristic(
                &cube,
                SearchBudget::new(1),
                &EdgeOrientationHeuristic,
            ))
            .moves(),
        );
    }

    #[test]
    fn root_export_bounded_ida_star_reports_found_solution() {
        let cube = scrambled(&[Move::R]);
        let outcome = crate::solve_ida_star_bounded(&cube, crate::SearchBudget::new(1));

        match outcome {
            crate::SearchOutcome::Found(solution) => assert_solution_solves(cube, solution.moves()),
            crate::SearchOutcome::NotFoundWithinLimits { .. } => {
                panic!("one-move scramble should solve through root bounded export")
            }
        }
    }

    fn scrambled(moves: &[Move]) -> Cube {
        let mut cube = Cube::solved();
        cube.apply_moves(moves);
        cube
    }

    fn assert_solution_solves(mut cube: Cube, solution: &[Move]) {
        cube.apply_moves(solution);

        assert!(cube.is_solved());
    }

    fn found_solution(outcome: SearchOutcome) -> crate::search::SearchSolution {
        match outcome {
            SearchOutcome::Found(solution) => solution,
            SearchOutcome::NotFoundWithinLimits { .. } => {
                panic!("expected bounded IDA* to find a solution")
            }
        }
    }
}
