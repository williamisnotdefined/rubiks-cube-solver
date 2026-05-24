use std::collections::HashSet;

use super::solution::SearchSolution;
use crate::cube::moves::FACE_MOVES;
use crate::cube::{Cube, CubieState, Move};

#[derive(Clone, Debug, Eq, PartialEq)]
struct DepthLimitedResult {
    moves: Option<Vec<Move>>,
    explored_nodes: usize,
}

pub fn depth_limited_search(start: &Cube, depth_limit: usize) -> Option<SearchSolution> {
    let result = depth_limited_search_result(start, depth_limit);

    result
        .moves
        .map(|moves| SearchSolution::with_metrics(moves, result.explored_nodes))
}

pub fn solve_iddfs(start: &Cube, max_depth: usize) -> Option<SearchSolution> {
    let mut explored_nodes = 0;

    for depth_limit in 0..=max_depth {
        let result = depth_limited_search_result(start, depth_limit);
        explored_nodes += result.explored_nodes;

        if let Some(moves) = result.moves {
            return Some(SearchSolution::with_metrics(moves, explored_nodes));
        }
    }

    None
}

fn depth_limited_search_result(start: &Cube, depth_limit: usize) -> DepthLimitedResult {
    let mut path = Vec::new();
    let mut path_states = HashSet::<CubieState>::from([start.state().clone()]);
    let mut explored_nodes = 0;

    let found = search_depth_first(
        start,
        depth_limit,
        None,
        &mut path_states,
        &mut path,
        &mut explored_nodes,
    );

    DepthLimitedResult {
        moves: found.then_some(path),
        explored_nodes,
    }
}

fn search_depth_first(
    cube: &Cube,
    remaining_depth: usize,
    last_move: Option<Move>,
    path_states: &mut HashSet<CubieState>,
    path: &mut Vec<Move>,
    explored_nodes: &mut usize,
) -> bool {
    *explored_nodes += 1;

    if cube.is_solved() {
        return true;
    }

    if remaining_depth == 0 {
        return false;
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

        if search_depth_first(
            &next_cube,
            remaining_depth - 1,
            Some(move_),
            path_states,
            path,
            explored_nodes,
        ) {
            return true;
        }

        path.pop();
        path_states.remove(next_cube.state());
    }

    false
}

fn should_skip_move(last_move: Option<Move>, next_move: Move) -> bool {
    last_move.is_some_and(|last_move| last_move.face() == next_move.face())
}

#[cfg(test)]
mod tests {
    use super::{depth_limited_search, solve_iddfs};
    use crate::cube::moves::FACE_MOVES;
    use crate::cube::{Cube, Move};
    use crate::search::solve_bfs;

    #[test]
    fn solved_cube_returns_empty_solution() {
        let solution = solve_iddfs(&Cube::solved(), 0).expect("solved cube should solve");

        assert!(solution.is_empty());
        assert_eq!(solution.explored_nodes(), 1);
    }

    #[test]
    fn depth_limited_search_solves_at_exact_limit() {
        let cube = scrambled(&[Move::R, Move::U]);
        let solution = depth_limited_search(&cube, 2).expect("two-move scramble should solve");

        assert_solution_solves(cube, solution.moves());
    }

    #[test]
    fn one_move_scramble_solves() {
        let cube = scrambled(&[Move::R]);
        let solution = solve_iddfs(&cube, 1).expect("one-move scramble should solve");

        assert_solution_solves(cube, solution.moves());
    }

    #[test]
    fn two_move_scramble_solves() {
        let cube = scrambled(&[Move::R, Move::U]);
        let solution = solve_iddfs(&cube, 2).expect("two-move scramble should solve");

        assert_solution_solves(cube, solution.moves());
    }

    #[test]
    fn three_move_scramble_solves() {
        let cube = scrambled(&[Move::R, Move::U, Move::F]);
        let solution = solve_iddfs(&cube, 3).expect("three-move scramble should solve");

        assert_solution_solves(cube, solution.moves());
    }

    #[test]
    fn insufficient_depth_returns_none() {
        let cube = scrambled(&[Move::R, Move::U]);

        assert_eq!(solve_iddfs(&cube, 1), None);
    }

    #[test]
    fn solution_uses_face_moves_only() {
        let cube = scrambled(&[Move::R, Move::U, Move::F]);
        let solution = solve_iddfs(&cube, 3).expect("three-move scramble should solve");

        assert!(solution
            .moves()
            .iter()
            .all(|move_| FACE_MOVES.contains(move_)));
    }

    #[test]
    fn solution_preserves_valid_state_when_applied() {
        let mut cube = scrambled(&[Move::R, Move::U, Move::F]);
        let solution = solve_iddfs(&cube, 3).expect("three-move scramble should solve");

        solution.apply_to(&mut cube);

        assert!(cube.state().is_valid());
        assert!(cube.is_solved());
    }

    #[test]
    fn bfs_and_iddfs_both_solve_shallow_scramble() {
        let cube = scrambled(&[Move::R, Move::U, Move::F]);
        let bfs_solution = solve_bfs(&cube, 3).expect("BFS should solve shallow scramble");
        let iddfs_solution = solve_iddfs(&cube, 3).expect("IDDFS should solve shallow scramble");

        assert_solution_solves(cube.clone(), bfs_solution.moves());
        assert_solution_solves(cube, iddfs_solution.moves());
    }

    #[test]
    fn iddfs_reports_explored_nodes() {
        let cube = scrambled(&[Move::R, Move::U]);
        let solution = solve_iddfs(&cube, 2).expect("two-move scramble should solve");

        assert!(solution.explored_nodes() > 0);
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
