use std::time::{Duration, Instant};

use crate::cube::{Cube, CubieState, Move};
use crate::search::{
    GeneratedTwoPhaseError, GeneratedTwoPhaseMetrics, GeneratedTwoPhaseSolver, SearchBudget,
    SearchOutcome,
};
use crate::solver::{solve_cubie_state, SolveError, SolverConfig, SolverStrategy};

use super::fixtures::real_scramble_fixtures;
use super::labels::format_not_found_message;
use super::types::{
    RealScrambleBenchmarkError, RealScrambleBenchmarkReport, RealScrambleBenchmarkRow,
    RealScrambleBenchmarkStatus, RealScrambleFixture,
};

pub fn run_real_scramble_benchmark(
    config: SolverConfig,
) -> Result<RealScrambleBenchmarkReport, RealScrambleBenchmarkError> {
    let fixtures = real_scramble_fixtures()?;

    run_real_scramble_benchmark_for_fixtures(config, &fixtures)
}

pub fn run_real_scramble_benchmark_for_fixtures(
    config: SolverConfig,
    fixtures: &[RealScrambleFixture],
) -> Result<RealScrambleBenchmarkReport, RealScrambleBenchmarkError> {
    if matches!(
        config.strategy,
        SolverStrategy::GeneratedTwoPhase
            | SolverStrategy::GeneratedTwoPhaseQuality
            | SolverStrategy::GeneratedTwoPhaseMultiprobe
    ) {
        let setup_started = Instant::now();
        let solver = GeneratedTwoPhaseSolver::load_from_dir(config.pruning_table_dir());
        let setup_elapsed = setup_started.elapsed();
        let rows = match solver {
            Ok(solver) => fixtures
                .iter()
                .map(|fixture| run_generated_real_scramble_row(fixture, config.clone(), &solver))
                .collect(),
            Err(error) => fixtures
                .iter()
                .map(|fixture| {
                    generated_error_row(fixture, config.clone(), Duration::ZERO, error.clone())
                })
                .collect(),
        };

        return Ok(RealScrambleBenchmarkReport::new(setup_elapsed, rows));
    }

    let rows = fixtures
        .iter()
        .map(|fixture| run_real_scramble_row(fixture, config.clone()))
        .collect();

    Ok(RealScrambleBenchmarkReport::new(Duration::ZERO, rows))
}

fn run_real_scramble_row(
    fixture: &RealScrambleFixture,
    config: SolverConfig,
) -> RealScrambleBenchmarkRow {
    let started = Instant::now();
    let result = solve_cubie_state(fixture.state.clone(), config.clone());
    let elapsed = started.elapsed();

    match result {
        Ok(result) => {
            let replay_verified = replay_verifies(&fixture.state, result.moves());
            let status = if replay_verified {
                RealScrambleBenchmarkStatus::Success
            } else {
                RealScrambleBenchmarkStatus::UnverifiedSuccess
            };

            RealScrambleBenchmarkRow {
                fixture_id: fixture.id.clone(),
                scramble: fixture.scramble.clone(),
                scramble_len: fixture.scramble_len,
                strategy: config.strategy,
                max_depth: config.max_depth,
                max_nodes: config.max_nodes,
                status,
                solution_length: Some(result.length()),
                explored_nodes: Some(result.explored_nodes()),
                elapsed,
                phase1_nodes: None,
                phase2_nodes: None,
                phase1_depth_attempts: None,
                max_phase1_depth_attempted: None,
                total_depth_attempts: None,
                max_total_depth_attempted: None,
                phase1_ordered_candidates: None,
                phase1_ordering_heuristic_evals: None,
                phase2_ordered_candidates: None,
                phase2_ordering_heuristic_evals: None,
                phase2_calls: None,
                heuristic_prunes: None,
                node_limit_hits: None,
                table_missing_entries: None,
                solutions_found: None,
                best_solution_length: None,
                best_phase1_length: None,
                best_phase2_length: None,
                replay_verified: Some(replay_verified),
                moves: result.moves,
                message: None,
            }
        }
        Err(error) => error_row(fixture, config, elapsed, error),
    }
}

fn run_generated_real_scramble_row(
    fixture: &RealScrambleFixture,
    config: SolverConfig,
    solver: &GeneratedTwoPhaseSolver,
) -> RealScrambleBenchmarkRow {
    let cube = match Cube::try_from_state(fixture.state.clone()) {
        Ok(cube) => cube,
        Err(error) => {
            return RealScrambleBenchmarkRow {
                fixture_id: fixture.id.clone(),
                scramble: fixture.scramble.clone(),
                scramble_len: fixture.scramble_len,
                strategy: config.strategy,
                max_depth: config.max_depth,
                max_nodes: config.max_nodes,
                status: RealScrambleBenchmarkStatus::InvalidFixture,
                solution_length: None,
                explored_nodes: None,
                elapsed: Duration::ZERO,
                phase1_nodes: None,
                phase2_nodes: None,
                phase1_depth_attempts: None,
                max_phase1_depth_attempted: None,
                total_depth_attempts: None,
                max_total_depth_attempted: None,
                phase1_ordered_candidates: None,
                phase1_ordering_heuristic_evals: None,
                phase2_ordered_candidates: None,
                phase2_ordering_heuristic_evals: None,
                phase2_calls: None,
                heuristic_prunes: None,
                node_limit_hits: None,
                table_missing_entries: None,
                solutions_found: None,
                best_solution_length: None,
                best_phase1_length: None,
                best_phase2_length: None,
                replay_verified: None,
                moves: Vec::new(),
                message: Some(error.to_string()),
            };
        }
    };
    let budget = SearchBudget::with_limits(config.max_depth, config.max_nodes);
    let started = Instant::now();
    let result = match config.strategy {
        SolverStrategy::GeneratedTwoPhase => solver.solve(&cube, budget),
        SolverStrategy::GeneratedTwoPhaseQuality => solver.solve_quality(&cube, budget),
        SolverStrategy::GeneratedTwoPhaseMultiprobe => solver.solve_multiprobe(&cube, budget),
        SolverStrategy::BoundedIdaStar
        | SolverStrategy::TwoPhaseBaseline
        | SolverStrategy::OptimalIdaStarOrientationPdb
        | SolverStrategy::OptimalBoundedCornerPdb
        | SolverStrategy::OptimalBoundedPdb16 => unreachable!(
            "non-generated strategies should use the generic real scramble benchmark path"
        ),
    };
    let elapsed = started.elapsed();

    match result {
        Ok(result) => match result.outcome {
            SearchOutcome::Found(solution) => {
                let replay_verified = replay_verifies(&fixture.state, solution.moves());
                let status = if replay_verified {
                    RealScrambleBenchmarkStatus::Success
                } else {
                    RealScrambleBenchmarkStatus::UnverifiedSuccess
                };

                row_with_generated_metrics(
                    fixture,
                    config,
                    status,
                    Some(solution.len()),
                    Some(solution.explored_nodes()),
                    elapsed,
                    Some(replay_verified),
                    solution.moves,
                    None,
                    result.metrics,
                )
            }
            SearchOutcome::NotFoundWithinLimits { explored_nodes } => row_with_generated_metrics(
                fixture,
                config.clone(),
                RealScrambleBenchmarkStatus::NotFoundWithinLimits,
                None,
                Some(explored_nodes),
                elapsed,
                None,
                Vec::new(),
                Some(format_not_found_message(
                    config.max_depth,
                    config.max_nodes,
                    explored_nodes,
                )),
                result.metrics,
            ),
        },
        Err(error) => generated_error_row(fixture, config, elapsed, error),
    }
}

fn error_row(
    fixture: &RealScrambleFixture,
    config: SolverConfig,
    elapsed: Duration,
    error: SolveError,
) -> RealScrambleBenchmarkRow {
    let (status, explored_nodes) = match &error {
        SolveError::InvalidInput { .. } => (RealScrambleBenchmarkStatus::InvalidFixture, None),
        SolveError::GeneratedTablesUnavailable { .. } => (
            RealScrambleBenchmarkStatus::GeneratedTablesUnavailable,
            None,
        ),
        SolveError::GeneratedTablesCorrupt { .. } => (
            RealScrambleBenchmarkStatus::GeneratedTablesCorruptOrIncompatible,
            None,
        ),
        SolveError::NotFoundWithinLimits { explored_nodes, .. } => (
            RealScrambleBenchmarkStatus::NotFoundWithinLimits,
            Some(*explored_nodes),
        ),
    };

    RealScrambleBenchmarkRow {
        fixture_id: fixture.id.clone(),
        scramble: fixture.scramble.clone(),
        scramble_len: fixture.scramble_len,
        strategy: config.strategy,
        max_depth: config.max_depth,
        max_nodes: config.max_nodes,
        status,
        solution_length: None,
        explored_nodes,
        elapsed,
        phase1_nodes: None,
        phase2_nodes: None,
        phase1_depth_attempts: None,
        max_phase1_depth_attempted: None,
        total_depth_attempts: None,
        max_total_depth_attempted: None,
        phase1_ordered_candidates: None,
        phase1_ordering_heuristic_evals: None,
        phase2_ordered_candidates: None,
        phase2_ordering_heuristic_evals: None,
        phase2_calls: None,
        heuristic_prunes: None,
        node_limit_hits: None,
        table_missing_entries: None,
        solutions_found: None,
        best_solution_length: None,
        best_phase1_length: None,
        best_phase2_length: None,
        replay_verified: None,
        moves: Vec::new(),
        message: Some(error.to_string()),
    }
}

#[allow(clippy::too_many_arguments)]
fn row_with_generated_metrics(
    fixture: &RealScrambleFixture,
    config: SolverConfig,
    status: RealScrambleBenchmarkStatus,
    solution_length: Option<usize>,
    explored_nodes: Option<usize>,
    elapsed: Duration,
    replay_verified: Option<bool>,
    moves: Vec<Move>,
    message: Option<String>,
    metrics: GeneratedTwoPhaseMetrics,
) -> RealScrambleBenchmarkRow {
    RealScrambleBenchmarkRow {
        fixture_id: fixture.id.clone(),
        scramble: fixture.scramble.clone(),
        scramble_len: fixture.scramble_len,
        strategy: config.strategy,
        max_depth: config.max_depth,
        max_nodes: config.max_nodes,
        status,
        solution_length,
        explored_nodes,
        elapsed,
        phase1_nodes: Some(metrics.phase1_nodes),
        phase2_nodes: Some(metrics.phase2_nodes),
        phase1_depth_attempts: Some(metrics.phase1_depth_attempts),
        max_phase1_depth_attempted: metrics.max_phase1_depth_attempted,
        total_depth_attempts: Some(metrics.total_depth_attempts),
        max_total_depth_attempted: metrics.max_total_depth_attempted,
        phase1_ordered_candidates: Some(metrics.phase1_ordered_candidates),
        phase1_ordering_heuristic_evals: Some(metrics.phase1_ordering_heuristic_evals),
        phase2_ordered_candidates: Some(metrics.phase2_ordered_candidates),
        phase2_ordering_heuristic_evals: Some(metrics.phase2_ordering_heuristic_evals),
        phase2_calls: Some(metrics.phase2_calls),
        heuristic_prunes: Some(metrics.heuristic_prunes),
        node_limit_hits: Some(metrics.node_limit_hits),
        table_missing_entries: Some(metrics.table_missing_entries),
        solutions_found: Some(metrics.solutions_found),
        best_solution_length: metrics.best_solution_length,
        best_phase1_length: metrics.best_phase1_length,
        best_phase2_length: metrics.best_phase2_length,
        replay_verified,
        moves,
        message,
    }
}

fn generated_error_row(
    fixture: &RealScrambleFixture,
    config: SolverConfig,
    elapsed: Duration,
    error: GeneratedTwoPhaseError,
) -> RealScrambleBenchmarkRow {
    let status = if error.is_corrupt_or_incompatible() {
        RealScrambleBenchmarkStatus::GeneratedTablesCorruptOrIncompatible
    } else {
        RealScrambleBenchmarkStatus::GeneratedTablesUnavailable
    };

    RealScrambleBenchmarkRow {
        fixture_id: fixture.id.clone(),
        scramble: fixture.scramble.clone(),
        scramble_len: fixture.scramble_len,
        strategy: config.strategy,
        max_depth: config.max_depth,
        max_nodes: config.max_nodes,
        status,
        solution_length: None,
        explored_nodes: None,
        elapsed,
        phase1_nodes: None,
        phase2_nodes: None,
        phase1_depth_attempts: None,
        max_phase1_depth_attempted: None,
        total_depth_attempts: None,
        max_total_depth_attempted: None,
        phase1_ordered_candidates: None,
        phase1_ordering_heuristic_evals: None,
        phase2_ordered_candidates: None,
        phase2_ordering_heuristic_evals: None,
        phase2_calls: None,
        heuristic_prunes: None,
        node_limit_hits: None,
        table_missing_entries: None,
        solutions_found: None,
        best_solution_length: None,
        best_phase1_length: None,
        best_phase2_length: None,
        replay_verified: None,
        moves: Vec::new(),
        message: Some(error.to_string()),
    }
}

fn replay_verifies(state: &CubieState, moves: &[Move]) -> bool {
    let Ok(mut cube) = Cube::try_from_state(state.clone()) else {
        return false;
    };

    cube.apply_moves(moves);
    cube.is_solved()
}
