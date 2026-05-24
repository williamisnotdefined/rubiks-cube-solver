use std::collections::{HashSet, VecDeque};

use super::solution::SearchSolution;
use crate::cube::moves::FACE_MOVES;
use crate::cube::{Cube, CubieState, Move};

#[derive(Clone, Debug, Eq, PartialEq)]
struct SearchNode {
    cube: Cube,
    moves: Vec<Move>,
    last_move: Option<Move>,
}

pub fn solve_bfs(start: &Cube, max_depth: usize) -> Option<SearchSolution> {
    if start.is_solved() {
        return Some(SearchSolution::with_metrics(Vec::new(), 1));
    }

    let mut visited = HashSet::<CubieState>::from([start.state().clone()]);
    let mut queue = VecDeque::from([SearchNode {
        cube: start.clone(),
        moves: Vec::new(),
        last_move: None,
    }]);

    while let Some(node) = queue.pop_front() {
        if node.moves.len() == max_depth {
            continue;
        }

        for move_ in FACE_MOVES {
            if should_skip_move(node.last_move, move_) {
                continue;
            }

            let mut next_cube = node.cube.clone();
            next_cube.apply_move(move_);

            if !visited.insert(next_cube.state().clone()) {
                continue;
            }

            let mut next_moves = node.moves.clone();
            next_moves.push(move_);

            if next_cube.is_solved() {
                return Some(SearchSolution::with_metrics(next_moves, visited.len()));
            }

            queue.push_back(SearchNode {
                cube: next_cube,
                moves: next_moves,
                last_move: Some(move_),
            });
        }
    }

    None
}

fn should_skip_move(last_move: Option<Move>, next_move: Move) -> bool {
    last_move.is_some_and(|last_move| last_move.face() == next_move.face())
}

#[cfg(test)]
mod tests {
    use super::solve_bfs;
    use crate::cube::moves::FACE_MOVES;
    use crate::cube::{Cube, Move};

    #[test]
    fn solved_cube_returns_empty_solution() {
        let solution = solve_bfs(&Cube::solved(), 0).expect("solved cube should solve");

        assert!(solution.is_empty());
    }

    #[test]
    fn one_move_scramble_solves() {
        let cube = scrambled(&[Move::R]);
        let solution = solve_bfs(&cube, 1).expect("one-move scramble should solve");

        assert_solution_solves(cube, &solution.moves);
    }

    #[test]
    fn two_move_scramble_solves() {
        let cube = scrambled(&[Move::R, Move::U]);
        let solution = solve_bfs(&cube, 2).expect("two-move scramble should solve");

        assert_solution_solves(cube, &solution.moves);
    }

    #[test]
    fn three_move_scramble_solves() {
        let cube = scrambled(&[Move::R, Move::U, Move::F]);
        let solution = solve_bfs(&cube, 3).expect("three-move scramble should solve");

        assert_solution_solves(cube, &solution.moves);
    }

    #[test]
    fn insufficient_depth_returns_none() {
        let cube = scrambled(&[Move::R, Move::U]);

        assert_eq!(solve_bfs(&cube, 1), None);
    }

    #[test]
    fn solution_uses_face_moves_only() {
        let cube = scrambled(&[Move::R, Move::U, Move::F]);
        let solution = solve_bfs(&cube, 3).expect("three-move scramble should solve");

        assert!(solution
            .moves()
            .iter()
            .all(|move_| FACE_MOVES.contains(move_)));
    }

    #[test]
    fn solution_preserves_valid_state_when_applied() {
        let mut cube = scrambled(&[Move::R, Move::U, Move::F]);
        let solution = solve_bfs(&cube, 3).expect("three-move scramble should solve");

        solution.apply_to(&mut cube);

        assert!(cube.state().is_valid());
        assert!(cube.is_solved());
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
