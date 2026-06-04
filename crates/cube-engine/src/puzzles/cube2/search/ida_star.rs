use super::pdb::cube2_pdb_heuristic;
use crate::puzzles::cube2::{Cube2, Cube2Move, Cube2State, CUBE2_FACE_MOVES};

pub const CUBE2_BOUNDED_IDA_STAR_STRATEGY_ID: &str = "cube2-bounded-ida-star";
pub const CUBE2_PDB_IDA_STAR_STRATEGY_ID: &str = "cube2-pdb-ida-star";

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct Cube2SearchBudget {
    pub max_depth: usize,
    pub max_nodes: Option<usize>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Cube2SearchSolution {
    pub moves: Vec<Cube2Move>,
    pub explored_nodes: usize,
    pub depth: usize,
    pub replay_verified: bool,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Cube2SearchOutcome {
    Found(Cube2SearchSolution),
    NotFoundWithinLimits {
        explored_nodes: usize,
        max_depth: usize,
    },
    NodeLimitExceeded {
        explored_nodes: usize,
        max_depth: usize,
        max_nodes: usize,
    },
}

enum DepthSearchOutcome {
    Found(Vec<Cube2Move>),
    NotFound,
    NodeLimitExceeded,
}

pub fn solve_cube2_bounded_ida_star(cube: &Cube2, budget: Cube2SearchBudget) -> Cube2SearchOutcome {
    solve_cube2_bounded_ida_star_with_heuristic(cube, budget, cube2_trivial_lower_bound)
}

pub fn solve_cube2_pdb_ida_star(cube: &Cube2, budget: Cube2SearchBudget) -> Cube2SearchOutcome {
    solve_cube2_bounded_ida_star_with_heuristic(cube, budget, cube2_pdb_heuristic)
}

fn solve_cube2_bounded_ida_star_with_heuristic(
    cube: &Cube2,
    budget: Cube2SearchBudget,
    heuristic: fn(&Cube2) -> usize,
) -> Cube2SearchOutcome {
    if cube.is_solved() {
        return Cube2SearchOutcome::Found(Cube2SearchSolution {
            moves: Vec::new(),
            explored_nodes: 0,
            depth: 0,
            replay_verified: true,
        });
    }

    let mut explored_nodes = 0;

    for depth_limit in 0..=budget.max_depth {
        let mut path = Vec::with_capacity(depth_limit);
        let mut path_states = vec![cube.state().clone()];

        match depth_limited_search(
            cube,
            depth_limit,
            None,
            &mut path,
            &mut path_states,
            budget.max_nodes,
            &mut explored_nodes,
            heuristic,
        ) {
            DepthSearchOutcome::Found(moves) => {
                let replay_verified = replay_verifies(cube, &moves);

                if !replay_verified {
                    return Cube2SearchOutcome::NotFoundWithinLimits {
                        explored_nodes,
                        max_depth: budget.max_depth,
                    };
                }

                return Cube2SearchOutcome::Found(Cube2SearchSolution {
                    depth: moves.len(),
                    moves,
                    explored_nodes,
                    replay_verified,
                });
            }
            DepthSearchOutcome::NotFound => {}
            DepthSearchOutcome::NodeLimitExceeded => {
                return Cube2SearchOutcome::NodeLimitExceeded {
                    explored_nodes,
                    max_depth: budget.max_depth,
                    max_nodes: budget
                        .max_nodes
                        .expect("node limit outcome requires configured max_nodes"),
                };
            }
        }
    }

    Cube2SearchOutcome::NotFoundWithinLimits {
        explored_nodes,
        max_depth: budget.max_depth,
    }
}

fn depth_limited_search(
    cube: &Cube2,
    depth_remaining: usize,
    previous_move: Option<Cube2Move>,
    path: &mut Vec<Cube2Move>,
    path_states: &mut Vec<Cube2State>,
    max_nodes: Option<usize>,
    explored_nodes: &mut usize,
    heuristic: fn(&Cube2) -> usize,
) -> DepthSearchOutcome {
    if visit_node(max_nodes, explored_nodes).is_err() {
        return DepthSearchOutcome::NodeLimitExceeded;
    }

    if cube.is_solved() {
        return DepthSearchOutcome::Found(path.clone());
    }

    if depth_remaining == 0 || heuristic(cube) > depth_remaining {
        return DepthSearchOutcome::NotFound;
    }

    for candidate in CUBE2_FACE_MOVES {
        if previous_move
            .map(|move_| move_.face() == candidate.face())
            .unwrap_or(false)
        {
            continue;
        }

        let mut next = cube.clone();
        next.apply_move(candidate);

        if path_states.iter().any(|state| state == next.state()) {
            continue;
        }

        path.push(candidate);
        path_states.push(next.state().clone());

        match depth_limited_search(
            &next,
            depth_remaining - 1,
            Some(candidate),
            path,
            path_states,
            max_nodes,
            explored_nodes,
            heuristic,
        ) {
            DepthSearchOutcome::Found(moves) => return DepthSearchOutcome::Found(moves),
            DepthSearchOutcome::NotFound => {}
            DepthSearchOutcome::NodeLimitExceeded => return DepthSearchOutcome::NodeLimitExceeded,
        }

        path_states.pop();
        path.pop();
    }

    DepthSearchOutcome::NotFound
}

fn visit_node(max_nodes: Option<usize>, explored_nodes: &mut usize) -> Result<(), ()> {
    if let Some(max_nodes) = max_nodes {
        if *explored_nodes >= max_nodes {
            return Err(());
        }
    }

    *explored_nodes += 1;

    Ok(())
}

fn cube2_trivial_lower_bound(cube: &Cube2) -> usize {
    usize::from(!cube.is_solved())
}

fn replay_verifies(cube: &Cube2, moves: &[Cube2Move]) -> bool {
    let mut replay = cube.clone();
    replay.apply_moves(moves);

    replay.is_solved()
}

#[cfg(test)]
mod tests {
    use super::{
        solve_cube2_bounded_ida_star, solve_cube2_pdb_ida_star, Cube2SearchBudget,
        Cube2SearchOutcome, CUBE2_BOUNDED_IDA_STAR_STRATEGY_ID, CUBE2_PDB_IDA_STAR_STRATEGY_ID,
    };
    use crate::puzzles::cube2::{Cube2, Cube2Algorithm, Cube2Move};

    #[test]
    fn strategy_id_is_stable() {
        assert_eq!(CUBE2_BOUNDED_IDA_STAR_STRATEGY_ID, "cube2-bounded-ida-star");
        assert_eq!(CUBE2_PDB_IDA_STAR_STRATEGY_ID, "cube2-pdb-ida-star");
    }

    #[test]
    fn solved_state_returns_empty_solution() {
        let outcome = solve_cube2_bounded_ida_star(
            &Cube2::solved(),
            Cube2SearchBudget {
                max_depth: 0,
                max_nodes: Some(1),
            },
        );

        let Cube2SearchOutcome::Found(solution) = outcome else {
            panic!("solved 2x2 should return a solution");
        };

        assert!(solution.moves.is_empty());
        assert_eq!(solution.depth, 0);
        assert_eq!(solution.explored_nodes, 0);
        assert!(solution.replay_verified);
    }

    #[test]
    fn one_move_scramble_solves() {
        let cube = scrambled_cube("F");
        let outcome = solve_cube2_bounded_ida_star(&cube, budget(1, Some(1_000)));

        let solution = expect_solution(outcome);
        assert_eq!(solution.depth, 1);
        assert_eq!(solution.moves, vec![Cube2Move::FPrime]);
        assert_solution_replays(&cube, &solution.moves);
        assert!(solution.replay_verified);
    }

    #[test]
    fn two_move_scramble_solves() {
        let cube = scrambled_cube("R U");
        let outcome = solve_cube2_bounded_ida_star(&cube, budget(2, Some(10_000)));

        let solution = expect_solution(outcome);
        assert_eq!(solution.depth, 2);
        assert_solution_replays(&cube, &solution.moves);
        assert!(solution.replay_verified);
    }

    #[test]
    fn three_move_scramble_solves() {
        let cube = scrambled_cube("R U F");
        let outcome = solve_cube2_bounded_ida_star(&cube, budget(3, Some(100_000)));

        let solution = expect_solution(outcome);
        assert_eq!(solution.depth, 3);
        assert_solution_replays(&cube, &solution.moves);
        assert!(solution.replay_verified);
    }

    #[test]
    fn max_depth_zero_only_solves_solved_state() {
        let cube = scrambled_cube("F");
        let outcome = solve_cube2_bounded_ida_star(&cube, budget(0, Some(1_000)));

        assert!(matches!(
            outcome,
            Cube2SearchOutcome::NotFoundWithinLimits {
                explored_nodes: 1,
                max_depth: 0,
            }
        ));
    }

    #[test]
    fn insufficient_depth_returns_not_found() {
        let cube = scrambled_cube("R U");
        let outcome = solve_cube2_bounded_ida_star(&cube, budget(1, Some(1_000)));

        assert!(matches!(
            outcome,
            Cube2SearchOutcome::NotFoundWithinLimits {
                explored_nodes: _,
                max_depth: 1,
            }
        ));
    }

    #[test]
    fn node_budget_returns_node_limit_exceeded() {
        let cube = scrambled_cube("R U F");
        let outcome = solve_cube2_bounded_ida_star(&cube, budget(3, Some(1)));

        assert_eq!(
            outcome,
            Cube2SearchOutcome::NodeLimitExceeded {
                explored_nodes: 1,
                max_depth: 3,
                max_nodes: 1,
            }
        );
    }

    #[test]
    fn zero_node_budget_returns_node_limit_without_visiting_nodes() {
        let cube = scrambled_cube("F");
        let outcome = solve_cube2_bounded_ida_star(&cube, budget(1, Some(0)));

        assert_eq!(
            outcome,
            Cube2SearchOutcome::NodeLimitExceeded {
                explored_nodes: 0,
                max_depth: 1,
                max_nodes: 0,
            }
        );
    }

    #[test]
    fn same_face_pruning_still_solves_half_turn_scramble() {
        let cube = scrambled_cube("R2");
        let outcome = solve_cube2_bounded_ida_star(&cube, budget(1, Some(1_000)));

        let solution = expect_solution(outcome);
        assert_eq!(solution.depth, 1);
        assert_eq!(solution.moves, vec![Cube2Move::R2]);
        assert_solution_replays(&cube, &solution.moves);
    }

    #[test]
    fn solution_moves_are_legal_cube2_moves() {
        let cube = scrambled_cube("L F U");
        let outcome = solve_cube2_bounded_ida_star(&cube, budget(3, Some(100_000)));

        let solution = expect_solution(outcome);
        assert!(solution
            .moves
            .iter()
            .all(|move_| move_.notation().len() <= 2));
        assert_solution_replays(&cube, &solution.moves);
    }

    #[test]
    fn pdb_solver_solves_solved_state() {
        let outcome = solve_cube2_pdb_ida_star(
            &Cube2::solved(),
            Cube2SearchBudget {
                max_depth: 0,
                max_nodes: Some(1),
            },
        );

        let solution = expect_solution(outcome);
        assert!(solution.moves.is_empty());
        assert!(solution.replay_verified);
    }

    #[test]
    fn pdb_solver_solves_three_move_scramble() {
        let cube = scrambled_cube("R U F");
        let outcome = solve_cube2_pdb_ida_star(&cube, budget(3, Some(1_000)));

        let solution = expect_solution(outcome);
        assert_eq!(solution.depth, 3);
        assert!(solution.explored_nodes <= 1_000);
        assert_solution_replays(&cube, &solution.moves);
        assert!(solution.replay_verified);
    }

    #[test]
    fn pdb_solver_solves_deeper_scramble_with_reasonable_budget() {
        let cube = scrambled_cube("R U F L B");
        let outcome = solve_cube2_pdb_ida_star(&cube, budget(5, Some(25_000)));

        let solution = expect_solution(outcome);
        assert!(solution.depth <= 5);
        assert!(solution.explored_nodes <= 25_000);
        assert_solution_replays(&cube, &solution.moves);
        assert!(solution.replay_verified);
    }

    #[test]
    fn pdb_solver_preserves_insufficient_depth_failure() {
        let cube = scrambled_cube("R U F");
        let outcome = solve_cube2_pdb_ida_star(&cube, budget(2, Some(1_000)));

        assert!(matches!(
            outcome,
            Cube2SearchOutcome::NotFoundWithinLimits {
                explored_nodes: _,
                max_depth: 2,
            }
        ));
    }

    #[test]
    fn pdb_solver_preserves_node_budget() {
        let cube = scrambled_cube("R U F L B");
        let outcome = solve_cube2_pdb_ida_star(&cube, budget(5, Some(1)));

        assert_eq!(
            outcome,
            Cube2SearchOutcome::NodeLimitExceeded {
                explored_nodes: 1,
                max_depth: 5,
                max_nodes: 1,
            }
        );
    }

    fn budget(max_depth: usize, max_nodes: Option<usize>) -> Cube2SearchBudget {
        Cube2SearchBudget {
            max_depth,
            max_nodes,
        }
    }

    fn scrambled_cube(algorithm: &str) -> Cube2 {
        let algorithm = Cube2Algorithm::parse(algorithm).expect("2x2 algorithm should parse");
        let mut cube = Cube2::solved();

        algorithm.apply_to(&mut cube);

        cube
    }

    fn expect_solution(outcome: Cube2SearchOutcome) -> super::Cube2SearchSolution {
        match outcome {
            Cube2SearchOutcome::Found(solution) => solution,
            Cube2SearchOutcome::NotFoundWithinLimits { .. } => {
                panic!("expected 2x2 solution, got not found")
            }
            Cube2SearchOutcome::NodeLimitExceeded { .. } => {
                panic!("expected 2x2 solution, got node limit")
            }
        }
    }

    fn assert_solution_replays(cube: &Cube2, moves: &[Cube2Move]) {
        let mut replay = cube.clone();
        replay.apply_moves(moves);

        assert!(replay.is_solved());
    }
}
