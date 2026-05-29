use std::fmt;
use std::time::Duration;

use crate::cube::{CubeValidationError, CubieState, Move, NotationError};
use crate::solver::SolverStrategy;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct RealScrambleSpec {
    pub id: &'static str,
    pub scramble: &'static str,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RealScrambleFixture {
    pub id: String,
    pub scramble: String,
    pub scramble_len: usize,
    pub state: CubieState,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct GeneratedRealScrambleConfig {
    pub count: usize,
    pub seed: u64,
    pub scramble_depth: usize,
    pub include_committed: bool,
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
    pub fixture_id: String,
    pub scramble: String,
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
    pub total_depth_attempts: Option<usize>,
    pub max_total_depth_attempted: Option<usize>,
    pub phase1_ordered_candidates: Option<usize>,
    pub phase1_ordering_heuristic_evals: Option<usize>,
    pub phase2_ordered_candidates: Option<usize>,
    pub phase2_ordering_heuristic_evals: Option<usize>,
    pub phase2_calls: Option<usize>,
    pub heuristic_prunes: Option<usize>,
    pub node_limit_hits: Option<usize>,
    pub table_missing_entries: Option<usize>,
    pub solutions_found: Option<usize>,
    pub best_solution_length: Option<usize>,
    pub best_phase1_length: Option<usize>,
    pub best_phase2_length: Option<usize>,
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
        fixture_id: String,
        error: NotationError,
    },
    CubieValidation {
        fixture_id: String,
        error: CubeValidationError,
    },
    UnableToGenerateUniqueFixtures {
        requested: usize,
        generated: usize,
        attempts: usize,
        scramble_depth: usize,
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
            Self::UnableToGenerateUniqueFixtures {
                requested,
                generated,
                attempts,
                scramble_depth,
            } => write!(
                formatter,
                "could not generate {requested} unique real-scramble benchmark fixtures at depth {scramble_depth}: generated {generated} after {attempts} attempts"
            ),
        }
    }
}

impl std::error::Error for RealScrambleBenchmarkError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::Notation { error, .. } => Some(error),
            Self::CubieValidation { error, .. } => Some(error),
            Self::UnableToGenerateUniqueFixtures { .. } => None,
        }
    }
}
