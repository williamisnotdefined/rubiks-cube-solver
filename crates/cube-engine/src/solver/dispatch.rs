use crate::cube::{Cube, Move};
use crate::search::{
    solve_generated_two_phase, solve_generated_two_phase_multiprobe,
    solve_generated_two_phase_quality, solve_generated_two_phase_with_artifacts,
    solve_ida_star_bounded, solve_optimal_bounded_corner_pdb_quality,
    solve_optimal_bounded_pdb16_quality, solve_short_solution_portfolio,
    GeneratedPruningTableArtifact, GeneratedTwoPhaseError, SearchBudget, SearchOutcome,
};

use super::{SolveError, SolveInputError, SolveMetrics, SolveResult, SolverConfig, SolverStrategy};

/// Solve a cube through the configured deterministic search path.
pub fn solve_cube(cube: &Cube, config: SolverConfig) -> Result<SolveResult, SolveError> {
    cube.state().validate().map_err(SolveInputError::from)?;

    let budget = SearchBudget::with_limits(config.max_depth, config.max_nodes);
    let outcome = match config.strategy {
        SolverStrategy::BoundedIdaStar => solve_ida_star_bounded(cube, budget),
        SolverStrategy::GeneratedTwoPhase => {
            match solve_generated_two_phase(cube, budget, config.pruning_table_dir()) {
                Ok(outcome) => outcome,
                Err(error) => {
                    return Err(generated_tables_error(config, error));
                }
            }
        }
        SolverStrategy::GeneratedTwoPhaseQuality => {
            match solve_generated_two_phase_quality(cube, budget, config.pruning_table_dir()) {
                Ok(outcome) => outcome,
                Err(error) => {
                    return Err(generated_tables_error(config, error));
                }
            }
        }
        SolverStrategy::GeneratedTwoPhaseMultiprobe => {
            match solve_generated_two_phase_multiprobe(cube, budget, config.pruning_table_dir()) {
                Ok(outcome) => outcome,
                Err(error) => {
                    return Err(generated_tables_error(config, error));
                }
            }
        }
        SolverStrategy::OptimalBoundedCornerPdb => {
            match solve_optimal_bounded_corner_pdb_quality(cube, budget, config.pruning_table_dir())
            {
                Ok(outcome) => outcome,
                Err(error) => {
                    return Err(generated_tables_error(config, error));
                }
            }
        }
        SolverStrategy::OptimalBoundedPdb16 => {
            match solve_optimal_bounded_pdb16_quality(cube, budget, config.pruning_table_dir()) {
                Ok(outcome) => outcome,
                Err(error) => {
                    return Err(generated_tables_error(config, error));
                }
            }
        }
        SolverStrategy::ShortSolutionPortfolio => {
            match solve_short_solution_portfolio(cube, budget, config.pruning_table_dir()) {
                Ok(outcome) => outcome,
                Err(error) => {
                    return Err(generated_tables_error(config, error));
                }
            }
        }
    };

    solve_search_outcome(cube, config, outcome)
}

/// Solve a cube with generated pruning artifacts supplied directly by the caller.
pub fn solve_cube_with_generated_pruning_tables(
    cube: &Cube,
    max_depth: usize,
    max_nodes: Option<usize>,
    artifacts: &[GeneratedPruningTableArtifact<'_>],
) -> Result<SolveResult, SolveError> {
    cube.state().validate().map_err(SolveInputError::from)?;

    let config =
        SolverConfig::with_strategy(max_depth, max_nodes, SolverStrategy::GeneratedTwoPhase);
    let budget = SearchBudget::with_limits(max_depth, max_nodes);
    let outcome = match solve_generated_two_phase_with_artifacts(cube, budget, artifacts) {
        Ok(outcome) => outcome,
        Err(error) => return Err(generated_tables_error(config, error)),
    };

    solve_search_outcome(cube, config, outcome)
}

fn generated_tables_error(config: SolverConfig, error: GeneratedTwoPhaseError) -> SolveError {
    if error.is_corrupt_or_incompatible() {
        SolveError::GeneratedTablesCorrupt {
            config,
            error: Box::new(error),
        }
    } else {
        SolveError::GeneratedTablesUnavailable {
            config,
            error: Box::new(error),
        }
    }
}

pub(crate) fn solve_search_outcome(
    start: &Cube,
    config: SolverConfig,
    outcome: SearchOutcome,
) -> Result<SolveResult, SolveError> {
    match outcome {
        SearchOutcome::Found(solution) => {
            let explored_nodes = solution.explored_nodes();
            if !solution_solves(start, solution.moves()) {
                return Err(SolveError::NotFoundWithinLimits {
                    config,
                    explored_nodes,
                });
            }

            Ok(SolveResult::with_metrics(
                solution.moves,
                SolveMetrics::new(explored_nodes),
            ))
        }
        SearchOutcome::NotFoundWithinLimits { explored_nodes } => {
            Err(SolveError::NotFoundWithinLimits {
                config,
                explored_nodes,
            })
        }
    }
}

fn solution_solves(start: &Cube, moves: &[Move]) -> bool {
    let mut cube = start.clone();
    cube.apply_moves(moves);
    cube.is_solved()
}
