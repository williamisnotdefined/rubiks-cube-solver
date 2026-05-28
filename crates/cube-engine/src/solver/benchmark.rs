use std::fmt;
use std::time::{Duration, Instant};

use crate::cube::{
    Algorithm, Cube, CubeValidationError, CubieState, Move, NotationError, Scramble,
};
use crate::search::{
    GeneratedTwoPhaseError, GeneratedTwoPhaseMetrics, GeneratedTwoPhaseSolver, SearchBudget,
    SearchOutcome,
};
use crate::solver::{solve_cubie_state, SolveError, SolverConfig, SolverStrategy};

pub const REAL_SCRAMBLE_SPECS: [RealScrambleSpec; 9] = [
    RealScrambleSpec {
        id: "real-01",
        scramble: "B U L U D B' U' R' U' B U2 F' L2 B2 R2 D2 L2 D2 R2 F D2",
    },
    RealScrambleSpec {
        id: "real-02",
        scramble: "F' U L' D2 L' D2 F' B R B2 U2 D F2 B2 L2 U B2 R2 D' L2 U2",
    },
    RealScrambleSpec {
        id: "real-03",
        scramble: "L2 F2 D2 L B2 R B2 F2 D2 R D' L' R U2 F L2 B2 L U",
    },
    RealScrambleSpec {
        id: "real-04",
        scramble: "F2 D F' U2 L' B R F' L D2 R U2 R F2 R' F2 R2 F2 L' F2",
    },
    RealScrambleSpec {
        id: "real-05-duplicate-of-real-04",
        scramble: "F2 D F' U2 L' B R F' L D2 R U2 R F2 R' F2 R2 F2 L' F2",
    },
    RealScrambleSpec {
        id: "real-06",
        scramble: "L D' F L2 F' U2 B' D2 B2 U2 L2 B2 F' D' L' F2 D' F U F",
    },
    RealScrambleSpec {
        id: "real-07",
        scramble: "L D' R2 D2 R2 B' L2 D2 F' L2 R2 D2 F U' F L' B' U' R2 D' B'",
    },
    RealScrambleSpec {
        id: "real-08",
        scramble: "U2 B2 D2 F D2 R2 B' D2 U2 F' D2 F' D' F' D2 L' F D U2 L' F'",
    },
    RealScrambleSpec {
        id: "real-09",
        scramble: "F L' D2 R' B' D' F2 R F2 U' R2 B2 U2 D' F2 B2 R2 U L2 F' R'",
    },
];

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct RealScrambleSpec {
    pub id: &'static str,
    pub scramble: &'static str,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RealScrambleFixture {
    pub id: &'static str,
    pub scramble: &'static str,
    pub scramble_len: usize,
    pub state: CubieState,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum RealScrambleBenchmarkStatus {
    Success,
    GeneratedTablesUnavailable,
    GeneratedTablesCorruptOrIncompatible,
    NotFoundWithinLimits,
    InvalidFixture,
    UnverifiedSuccess,
}

impl RealScrambleBenchmarkStatus {
    pub const fn label(self) -> &'static str {
        match self {
            Self::Success => "success",
            Self::GeneratedTablesUnavailable => "generated_tables_unavailable",
            Self::GeneratedTablesCorruptOrIncompatible => {
                "generated_tables_corrupt_or_incompatible"
            }
            Self::NotFoundWithinLimits => "not_found_within_limits",
            Self::InvalidFixture => "invalid_fixture",
            Self::UnverifiedSuccess => "unverified_success",
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RealScrambleBenchmarkRow {
    pub fixture_id: &'static str,
    pub scramble: &'static str,
    pub scramble_len: usize,
    pub strategy: SolverStrategy,
    pub max_depth: usize,
    pub max_nodes: Option<usize>,
    pub status: RealScrambleBenchmarkStatus,
    pub solution_length: Option<usize>,
    pub explored_nodes: Option<usize>,
    pub elapsed: Duration,
    pub phase1_nodes: Option<usize>,
    pub phase2_nodes: Option<usize>,
    pub phase1_depth_attempts: Option<usize>,
    pub max_phase1_depth_attempted: Option<usize>,
    pub phase1_ordered_candidates: Option<usize>,
    pub phase1_ordering_heuristic_evals: Option<usize>,
    pub phase2_ordered_candidates: Option<usize>,
    pub phase2_ordering_heuristic_evals: Option<usize>,
    pub phase2_calls: Option<usize>,
    pub heuristic_prunes: Option<usize>,
    pub node_limit_hits: Option<usize>,
    pub table_missing_entries: Option<usize>,
    pub replay_verified: Option<bool>,
    pub moves: Vec<Move>,
    pub message: Option<String>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RealScrambleBenchmarkReport {
    setup_elapsed: Duration,
    rows: Vec<RealScrambleBenchmarkRow>,
}

impl RealScrambleBenchmarkReport {
    pub fn new(setup_elapsed: Duration, rows: Vec<RealScrambleBenchmarkRow>) -> Self {
        Self {
            setup_elapsed,
            rows,
        }
    }

    pub fn rows(&self) -> &[RealScrambleBenchmarkRow] {
        &self.rows
    }

    pub const fn setup_elapsed(&self) -> Duration {
        self.setup_elapsed
    }

    pub fn success_count(&self) -> usize {
        self.rows
            .iter()
            .filter(|row| row.status == RealScrambleBenchmarkStatus::Success)
            .count()
    }

    pub fn summary(&self) -> RealScrambleBenchmarkSummary {
        let mut summary = RealScrambleBenchmarkSummary::default();
        for row in &self.rows {
            summary.record(row);
        }

        summary
    }

    pub fn replay_verified_success_count(&self) -> usize {
        self.summary().replay_verified_successes
    }

    pub fn failure_count(&self) -> usize {
        self.summary().failures
    }

    pub fn to_markdown(&self) -> String {
        let summary = self.summary();
        let mut output = String::from(
            "# Real Scramble Solver Benchmark\n\n\
This benchmark converts each scramble into a cubie state and gives only that state to the configured solver. It does not pass the inverse scramble to the solver. Every reported success is replay verified from the benchmark state. Setup time is separated from per-scramble search time.\n\n",
        );
        output.push_str(&format!(
            "Setup elapsed: {} us\n\n\
## Summary\n\n\
Only replay-verified successes are counted in solution-length buckets. The buckets are exclusive, so their total equals `replay_verified_successes`.\n\n\
| rows | success | failures | replay_verified_successes | unverified_successes | len_0_to_16 | len_17_to_18 | len_19_to_20 | len_gt_20 | explored_nodes_total | elapsed_us_total |\n\
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |\n\
| {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} |\n\n\
## Rows\n\n\
| fixture | scramble_len | strategy | max_depth | max_nodes | status | solution_len | explored_nodes | elapsed_us | phase1_nodes | phase2_nodes | phase1_depth_attempts | max_phase1_depth | phase1_ordered_candidates | phase1_ordering_heuristic_evals | phase2_ordered_candidates | phase2_ordering_heuristic_evals | phase2_calls | heuristic_prunes | node_limit_hits | table_missing_entries | replay_verified | solution | message |\n\
| --- | ---: | --- | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |\n",
            self.setup_elapsed.as_micros(),
            summary.rows,
            summary.success,
            summary.failures,
            summary.replay_verified_successes,
            summary.unverified_successes,
            summary.solution_len_0_to_16,
            summary.solution_len_17_to_18,
            summary.solution_len_19_to_20,
            summary.solution_len_gt_20,
            summary.explored_nodes_total,
            summary.elapsed.as_micros(),
        ));

        for row in &self.rows {
            output.push_str(&format!(
                "| {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} |\n",
                row.fixture_id,
                row.scramble_len,
                row.strategy.id(),
                row.max_depth,
                max_nodes_label(row.max_nodes),
                row.status.label(),
                optional_usize_label(row.solution_length),
                optional_usize_label(row.explored_nodes),
                row.elapsed.as_micros(),
                optional_usize_label(row.phase1_nodes),
                optional_usize_label(row.phase2_nodes),
                optional_usize_label(row.phase1_depth_attempts),
                optional_usize_label(row.max_phase1_depth_attempted),
                optional_usize_label(row.phase1_ordered_candidates),
                optional_usize_label(row.phase1_ordering_heuristic_evals),
                optional_usize_label(row.phase2_ordered_candidates),
                optional_usize_label(row.phase2_ordering_heuristic_evals),
                optional_usize_label(row.phase2_calls),
                optional_usize_label(row.heuristic_prunes),
                optional_usize_label(row.node_limit_hits),
                optional_usize_label(row.table_missing_entries),
                optional_bool_label(row.replay_verified),
                moves_label(&row.moves),
                row.message.as_deref().unwrap_or(""),
            ));
        }

        output
    }
}

#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct RealScrambleBenchmarkSummary {
    pub rows: usize,
    pub success: usize,
    pub failures: usize,
    pub replay_verified_successes: usize,
    pub unverified_successes: usize,
    pub solution_len_0_to_16: usize,
    pub solution_len_17_to_18: usize,
    pub solution_len_19_to_20: usize,
    pub solution_len_gt_20: usize,
    pub explored_nodes_total: usize,
    pub elapsed: Duration,
}

impl RealScrambleBenchmarkSummary {
    fn record(&mut self, row: &RealScrambleBenchmarkRow) {
        self.rows += 1;
        self.explored_nodes_total += row.explored_nodes.unwrap_or(0);
        self.elapsed = self.elapsed.saturating_add(row.elapsed);

        if row.status == RealScrambleBenchmarkStatus::Success {
            self.success += 1;
        }
        if row.status == RealScrambleBenchmarkStatus::UnverifiedSuccess
            || (row.status == RealScrambleBenchmarkStatus::Success
                && row.replay_verified != Some(true))
        {
            self.unverified_successes += 1;
        }
        if row.status != RealScrambleBenchmarkStatus::Success || row.replay_verified != Some(true) {
            self.failures += 1;
            return;
        }

        let Some(solution_length) = row.solution_length else {
            self.failures += 1;
            return;
        };

        self.replay_verified_successes += 1;
        match solution_length {
            0..=16 => self.solution_len_0_to_16 += 1,
            17..=18 => self.solution_len_17_to_18 += 1,
            19..=20 => self.solution_len_19_to_20 += 1,
            21.. => self.solution_len_gt_20 += 1,
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum RealScrambleBenchmarkError {
    Notation {
        fixture_id: &'static str,
        error: NotationError,
    },
    CubieValidation {
        fixture_id: &'static str,
        error: CubeValidationError,
    },
}

impl fmt::Display for RealScrambleBenchmarkError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Notation { fixture_id, error } => {
                write!(
                    formatter,
                    "benchmark fixture {fixture_id} has invalid notation: {error}"
                )
            }
            Self::CubieValidation { fixture_id, error } => write!(
                formatter,
                "benchmark fixture {fixture_id} produced an invalid cubie state: {error}"
            ),
        }
    }
}

impl std::error::Error for RealScrambleBenchmarkError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::Notation { error, .. } => Some(error),
            Self::CubieValidation { error, .. } => Some(error),
        }
    }
}

pub fn real_scramble_fixtures() -> Result<Vec<RealScrambleFixture>, RealScrambleBenchmarkError> {
    REAL_SCRAMBLE_SPECS
        .iter()
        .map(|spec| build_real_scramble_fixture(*spec))
        .collect()
}

pub fn run_real_scramble_benchmark(
    config: SolverConfig,
) -> Result<RealScrambleBenchmarkReport, RealScrambleBenchmarkError> {
    let fixtures = real_scramble_fixtures()?;

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

fn build_real_scramble_fixture(
    spec: RealScrambleSpec,
) -> Result<RealScrambleFixture, RealScrambleBenchmarkError> {
    let scramble =
        Scramble::parse(spec.scramble).map_err(|error| RealScrambleBenchmarkError::Notation {
            fixture_id: spec.id,
            error,
        })?;
    let mut cube = Cube::solved();
    scramble.apply_to(&mut cube);
    let state = cube.state().clone();
    state
        .validate()
        .map_err(|error| RealScrambleBenchmarkError::CubieValidation {
            fixture_id: spec.id,
            error,
        })?;

    Ok(RealScrambleFixture {
        id: spec.id,
        scramble: spec.scramble,
        scramble_len: scramble.len(),
        state,
    })
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
                fixture_id: fixture.id,
                scramble: fixture.scramble,
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
                phase1_ordered_candidates: None,
                phase1_ordering_heuristic_evals: None,
                phase2_ordered_candidates: None,
                phase2_ordering_heuristic_evals: None,
                phase2_calls: None,
                heuristic_prunes: None,
                node_limit_hits: None,
                table_missing_entries: None,
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
                fixture_id: fixture.id,
                scramble: fixture.scramble,
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
                phase1_ordered_candidates: None,
                phase1_ordering_heuristic_evals: None,
                phase2_ordered_candidates: None,
                phase2_ordering_heuristic_evals: None,
                phase2_calls: None,
                heuristic_prunes: None,
                node_limit_hits: None,
                table_missing_entries: None,
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
        | SolverStrategy::OptimalBoundedCornerPdb => unreachable!(
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
        fixture_id: fixture.id,
        scramble: fixture.scramble,
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
        phase1_ordered_candidates: None,
        phase1_ordering_heuristic_evals: None,
        phase2_ordered_candidates: None,
        phase2_ordering_heuristic_evals: None,
        phase2_calls: None,
        heuristic_prunes: None,
        node_limit_hits: None,
        table_missing_entries: None,
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
        fixture_id: fixture.id,
        scramble: fixture.scramble,
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
        phase1_ordered_candidates: Some(metrics.phase1_ordered_candidates),
        phase1_ordering_heuristic_evals: Some(metrics.phase1_ordering_heuristic_evals),
        phase2_ordered_candidates: Some(metrics.phase2_ordered_candidates),
        phase2_ordering_heuristic_evals: Some(metrics.phase2_ordering_heuristic_evals),
        phase2_calls: Some(metrics.phase2_calls),
        heuristic_prunes: Some(metrics.heuristic_prunes),
        node_limit_hits: Some(metrics.node_limit_hits),
        table_missing_entries: Some(metrics.table_missing_entries),
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
        fixture_id: fixture.id,
        scramble: fixture.scramble,
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
        phase1_ordered_candidates: None,
        phase1_ordering_heuristic_evals: None,
        phase2_ordered_candidates: None,
        phase2_ordering_heuristic_evals: None,
        phase2_calls: None,
        heuristic_prunes: None,
        node_limit_hits: None,
        table_missing_entries: None,
        replay_verified: None,
        moves: Vec::new(),
        message: Some(error.to_string()),
    }
}

fn format_not_found_message(
    max_depth: usize,
    max_nodes: Option<usize>,
    explored_nodes: usize,
) -> String {
    match max_nodes {
        Some(max_nodes) => format!(
            "no solution found within limits: max_depth={max_depth}, max_nodes={max_nodes}, explored_nodes={explored_nodes}"
        ),
        None => format!(
            "no solution found within limits: max_depth={max_depth}, max_nodes=unlimited, explored_nodes={explored_nodes}"
        ),
    }
}

fn replay_verifies(state: &CubieState, moves: &[Move]) -> bool {
    let Ok(mut cube) = Cube::try_from_state(state.clone()) else {
        return false;
    };

    cube.apply_moves(moves);
    cube.is_solved()
}

fn moves_label(moves: &[Move]) -> String {
    if moves.is_empty() {
        return String::new();
    }

    Algorithm::new(moves.to_vec()).to_string()
}

fn max_nodes_label(max_nodes: Option<usize>) -> String {
    max_nodes.map_or_else(|| "unlimited".to_owned(), |value| value.to_string())
}

fn optional_usize_label(value: Option<usize>) -> String {
    value.map_or_else(String::new, |value| value.to_string())
}

fn optional_bool_label(value: Option<bool>) -> &'static str {
    match value {
        Some(true) => "true",
        Some(false) => "false",
        None => "",
    }
}

#[cfg(test)]
mod tests {
    use std::time::Duration;

    use super::{
        real_scramble_fixtures, run_real_scramble_benchmark, RealScrambleBenchmarkReport,
        RealScrambleBenchmarkRow, RealScrambleBenchmarkStatus, REAL_SCRAMBLE_SPECS,
    };
    use crate::cube::Move;
    use crate::solver::{SolverConfig, SolverStrategy};

    #[test]
    fn real_scramble_fixtures_are_valid_unsolved_states() {
        let fixtures = real_scramble_fixtures().expect("real scramble fixtures should build");

        assert_eq!(fixtures.len(), REAL_SCRAMBLE_SPECS.len());
        assert!(fixtures.iter().all(|fixture| fixture.scramble_len >= 19));
        assert!(fixtures.iter().all(|fixture| fixture.state.is_valid()));
        assert!(fixtures
            .iter()
            .all(|fixture| fixture.state != crate::CubieState::solved()));
    }

    #[test]
    fn real_scramble_benchmark_uses_configured_state_solver_limits() {
        let report = run_real_scramble_benchmark(SolverConfig::with_strategy(
            0,
            Some(1),
            SolverStrategy::TwoPhaseBaseline,
        ))
        .expect("benchmark report should run");

        assert_eq!(report.rows().len(), REAL_SCRAMBLE_SPECS.len());
        assert_eq!(report.success_count(), 0);
        assert_eq!(report.setup_elapsed().as_micros(), 0);
        assert!(report.rows().iter().all(|row| row.moves.is_empty()));
    }

    #[test]
    fn real_scramble_benchmark_reports_generated_setup_failures_once() {
        let missing_dir =
            std::env::temp_dir().join("rubiks-cube-solver-missing-real-scramble-generated-tables");
        let _ = std::fs::remove_dir_all(&missing_dir);
        let report = run_real_scramble_benchmark(
            SolverConfig::with_strategy(30, Some(1), SolverStrategy::GeneratedTwoPhase)
                .with_pruning_table_dir(missing_dir),
        )
        .expect("benchmark report should run with missing generated tables");

        assert_eq!(report.rows().len(), REAL_SCRAMBLE_SPECS.len());
        assert!(report.rows().iter().all(|row| {
            row.status == RealScrambleBenchmarkStatus::GeneratedTablesUnavailable
                && row.phase1_nodes.is_none()
                && row.phase2_nodes.is_none()
        }));
        let markdown = report.to_markdown();
        assert!(markdown.contains("Setup elapsed:"));
        assert!(markdown.contains("phase1_nodes"));
        assert!(markdown.contains("table_missing_entries"));
    }

    #[test]
    fn real_scramble_benchmark_summary_counts_quality_buckets() {
        let report = RealScrambleBenchmarkReport::new(
            Duration::from_micros(7),
            vec![
                benchmark_row(
                    RealScrambleBenchmarkStatus::Success,
                    Some(16),
                    Some(10),
                    Some(true),
                    3,
                ),
                benchmark_row(
                    RealScrambleBenchmarkStatus::Success,
                    Some(18),
                    Some(20),
                    Some(true),
                    4,
                ),
                benchmark_row(
                    RealScrambleBenchmarkStatus::Success,
                    Some(20),
                    Some(30),
                    Some(true),
                    5,
                ),
                benchmark_row(
                    RealScrambleBenchmarkStatus::Success,
                    Some(21),
                    Some(40),
                    Some(true),
                    6,
                ),
                benchmark_row(
                    RealScrambleBenchmarkStatus::UnverifiedSuccess,
                    Some(12),
                    Some(50),
                    Some(false),
                    7,
                ),
                benchmark_row(
                    RealScrambleBenchmarkStatus::NotFoundWithinLimits,
                    None,
                    Some(60),
                    None,
                    8,
                ),
            ],
        );
        let summary = report.summary();

        assert_eq!(summary.rows, 6);
        assert_eq!(summary.success, 4);
        assert_eq!(summary.failures, 2);
        assert_eq!(summary.replay_verified_successes, 4);
        assert_eq!(summary.unverified_successes, 1);
        assert_eq!(summary.solution_len_0_to_16, 1);
        assert_eq!(summary.solution_len_17_to_18, 1);
        assert_eq!(summary.solution_len_19_to_20, 1);
        assert_eq!(summary.solution_len_gt_20, 1);
        assert_eq!(summary.explored_nodes_total, 210);
        assert_eq!(summary.elapsed.as_micros(), 33);
        assert_eq!(report.failure_count(), 2);
        assert_eq!(report.replay_verified_success_count(), 4);

        let markdown = report.to_markdown();
        assert!(markdown.contains("## Summary"));
        assert!(markdown.contains("len_0_to_16"));
        assert!(markdown.contains("replay_verified_successes"));
        assert!(markdown.contains("## Rows"));
    }

    fn benchmark_row(
        status: RealScrambleBenchmarkStatus,
        solution_length: Option<usize>,
        explored_nodes: Option<usize>,
        replay_verified: Option<bool>,
        elapsed_us: u64,
    ) -> RealScrambleBenchmarkRow {
        RealScrambleBenchmarkRow {
            fixture_id: "test",
            scramble: "R U",
            scramble_len: 2,
            strategy: SolverStrategy::GeneratedTwoPhase,
            max_depth: 30,
            max_nodes: Some(1_000),
            status,
            solution_length,
            explored_nodes,
            elapsed: Duration::from_micros(elapsed_us),
            phase1_nodes: None,
            phase2_nodes: None,
            phase1_depth_attempts: None,
            max_phase1_depth_attempted: None,
            phase1_ordered_candidates: None,
            phase1_ordering_heuristic_evals: None,
            phase2_ordered_candidates: None,
            phase2_ordering_heuristic_evals: None,
            phase2_calls: None,
            heuristic_prunes: None,
            node_limit_hits: None,
            table_missing_entries: None,
            replay_verified,
            moves: solution_length.map_or_else(Vec::new, |_| vec![Move::U]),
            message: None,
        }
    }
}
