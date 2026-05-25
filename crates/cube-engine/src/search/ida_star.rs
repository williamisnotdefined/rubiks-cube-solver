use std::collections::HashSet;

use super::heuristics::{Heuristic, ZeroHeuristic};
use super::solution::SearchSolution;
use crate::cube::moves::FACE_MOVES;
use crate::cube::{Cube, CubieState, Move};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum ThresholdSearchResult {
    Found,
    NextThreshold(usize),
    Exhausted,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
struct SearchLimits {
    max_depth: usize,
    threshold: usize,
}

pub fn solve_ida_star(start: &Cube, max_depth: usize) -> Option<SearchSolution> {
    let heuristic = ZeroHeuristic;
    solve_with_heuristic(start, max_depth, &heuristic)
}

fn solve_with_heuristic<H>(start: &Cube, max_depth: usize, heuristic: &H) -> Option<SearchSolution>
where
    H: Heuristic,
{
    let mut threshold = heuristic.estimate(start);
    if threshold > max_depth {
        return None;
    }

    let mut explored_nodes = 0;

    loop {
        let mut path = Vec::new();
        let mut path_states = HashSet::<CubieState>::from([start.state().clone()]);
        let limits = SearchLimits {
            max_depth,
            threshold,
        };

        match search_threshold(
            start,
            limits,
            None,
            heuristic,
            &mut path_states,
            &mut path,
            &mut explored_nodes,
        ) {
            ThresholdSearchResult::Found => {
                let solves_start = solution_solves(start, &path);
                debug_assert!(solves_start);
                if !solves_start {
                    return None;
                }

                return Some(SearchSolution::with_metrics(path, explored_nodes));
            }
            ThresholdSearchResult::NextThreshold(next_threshold) if next_threshold <= max_depth => {
                threshold = next_threshold;
            }
            ThresholdSearchResult::NextThreshold(_) | ThresholdSearchResult::Exhausted => {
                return None;
            }
        }
    }
}

fn search_threshold<H>(
    cube: &Cube,
    limits: SearchLimits,
    last_move: Option<Move>,
    heuristic: &H,
    path_states: &mut HashSet<CubieState>,
    path: &mut Vec<Move>,
    explored_nodes: &mut usize,
) -> ThresholdSearchResult
where
    H: Heuristic,
{
    *explored_nodes += 1;

    let estimated_cost = path.len() + heuristic.estimate(cube);
    if estimated_cost > limits.threshold {
        return ThresholdSearchResult::NextThreshold(estimated_cost);
    }

    if cube.is_solved() {
        return ThresholdSearchResult::Found;
    }

    if path.len() == limits.max_depth {
        return ThresholdSearchResult::Exhausted;
    }

    let mut next_threshold: Option<usize> = None;

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

        match search_threshold(
            &next_cube,
            limits,
            Some(move_),
            heuristic,
            path_states,
            path,
            explored_nodes,
        ) {
            ThresholdSearchResult::Found => return ThresholdSearchResult::Found,
            ThresholdSearchResult::NextThreshold(candidate) => {
                next_threshold =
                    Some(next_threshold.map_or(candidate, |current| current.min(candidate)));
            }
            ThresholdSearchResult::Exhausted => {}
        }

        path.pop();
        path_states.remove(next_cube.state());
    }

    next_threshold.map_or(
        ThresholdSearchResult::Exhausted,
        ThresholdSearchResult::NextThreshold,
    )
}

fn should_skip_move(last_move: Option<Move>, next_move: Move) -> bool {
    last_move.is_some_and(|last_move| last_move.face() == next_move.face())
}

fn solution_solves(start: &Cube, moves: &[Move]) -> bool {
    let mut cube = start.clone();
    cube.apply_moves(moves);
    cube.is_solved()
}

#[cfg(test)]
mod tests {
    use super::solve_ida_star;
    use crate::cube::moves::FACE_MOVES;
    use crate::cube::{Cube, Move};

    #[test]
    fn solved_cube_returns_empty_solution() {
        let solution = solve_ida_star(&Cube::solved(), 0).expect("solved cube should solve");

        assert!(solution.is_empty());
        assert_eq!(solution.explored_nodes(), 1);
    }

    #[test]
    fn one_move_scramble_solves() {
        let cube = scrambled(&[Move::R]);
        let solution = solve_ida_star(&cube, 1).expect("one-move scramble should solve");

        assert_solution_solves(cube, solution.moves());
    }

    #[test]
    fn two_move_scramble_solves() {
        let cube = scrambled(&[Move::R, Move::U]);
        let solution = solve_ida_star(&cube, 2).expect("two-move scramble should solve");

        assert_solution_solves(cube, solution.moves());
    }

    #[test]
    fn insufficient_depth_returns_none() {
        let cube = scrambled(&[Move::R, Move::U]);

        assert_eq!(solve_ida_star(&cube, 1), None);
    }

    #[test]
    fn ida_star_reports_explored_nodes() {
        let cube = scrambled(&[Move::R, Move::U]);
        let solution = solve_ida_star(&cube, 2).expect("two-move scramble should solve");

        assert!(solution.explored_nodes() > 0);
    }

    #[test]
    fn solution_uses_face_moves_only() {
        let cube = scrambled(&[Move::R, Move::U]);
        let solution = solve_ida_star(&cube, 2).expect("two-move scramble should solve");

        assert!(solution
            .moves()
            .iter()
            .all(|move_| FACE_MOVES.contains(move_)));
    }

    #[test]
    fn solution_preserves_valid_state_when_applied() {
        let mut cube = scrambled(&[Move::R, Move::U]);
        let solution = solve_ida_star(&cube, 2).expect("two-move scramble should solve");

        solution.apply_to(&mut cube);

        assert!(cube.state().is_valid());
        assert!(cube.is_solved());
    }

    #[test]
    fn root_export_solves_shallow_scramble() {
        let cube = scrambled(&[Move::R]);
        let solution = crate::solve_ida_star(&cube, 1).expect("one-move scramble should solve");

        assert_solution_solves(cube, solution.moves());
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
}
