use std::time::Duration;

use crate::cube::{CubieState, Move};
use crate::solver::{SolverConfig, SolverStrategy};

use super::QUALITY_REPORT_PRUNING_TABLE_DIR;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum QualityFixtureCategory {
    Solved,
    Shallow,
    Nontrivial,
    MidDepth,
    Harder,
}

impl QualityFixtureCategory {
    pub const fn label(self) -> &'static str {
        match self {
            Self::Solved => "solved",
            Self::Shallow => "shallow",
            Self::Nontrivial => "nontrivial",
            Self::MidDepth => "mid_depth",
            Self::Harder => "harder",
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum QualityExpectation {
    RequiredSuccess,
    ExpectedNotFoundWithinLimits,
}

impl QualityExpectation {
    pub const fn label(self) -> &'static str {
        match self {
            Self::RequiredSuccess => "required_success",
            Self::ExpectedNotFoundWithinLimits => "expected_not_found_within_limits",
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum QualityInputKind {
    Facelet,
    Cubie,
}

impl QualityInputKind {
    pub const fn label(self) -> &'static str {
        match self {
            Self::Facelet => "facelet",
            Self::Cubie => "cubie",
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct QualityFixture {
    pub id: &'static str,
    pub category: QualityFixtureCategory,
    pub input_kind: QualityInputKind,
    pub expectation: QualityExpectation,
    pub solver_expectations: QualityFixtureExpectations,
    pub scramble: &'static str,
    pub max_depth: usize,
    pub max_nodes: Option<usize>,
    pub state: CubieState,
    pub facelets: String,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum QualitySolverSelection {
    DefaultBoundedIdaStar,
    ExplicitTwoPhaseBaseline,
    GeneratedTwoPhase,
}

impl QualitySolverSelection {
    pub const ALL: [Self; 3] = [
        Self::DefaultBoundedIdaStar,
        Self::ExplicitTwoPhaseBaseline,
        Self::GeneratedTwoPhase,
    ];

    pub const fn label(self) -> &'static str {
        match self {
            Self::DefaultBoundedIdaStar => "default-bounded-ida-star",
            Self::ExplicitTwoPhaseBaseline => "explicit-two-phase-baseline",
            Self::GeneratedTwoPhase => "generated-two-phase",
        }
    }

    pub const fn strategy(self) -> SolverStrategy {
        match self {
            Self::DefaultBoundedIdaStar => SolverStrategy::BoundedIdaStar,
            Self::ExplicitTwoPhaseBaseline => SolverStrategy::TwoPhaseBaseline,
            Self::GeneratedTwoPhase => SolverStrategy::GeneratedTwoPhase,
        }
    }

    pub fn config(self, max_depth: usize, max_nodes: Option<usize>) -> SolverConfig {
        match self {
            Self::DefaultBoundedIdaStar => SolverConfig::with_limits(max_depth, max_nodes),
            Self::ExplicitTwoPhaseBaseline => {
                SolverConfig::with_strategy(max_depth, max_nodes, SolverStrategy::TwoPhaseBaseline)
            }
            Self::GeneratedTwoPhase => {
                SolverConfig::with_strategy(max_depth, max_nodes, SolverStrategy::GeneratedTwoPhase)
                    .with_pruning_table_dir(QUALITY_REPORT_PRUNING_TABLE_DIR)
            }
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct QualityFixtureExpectations {
    pub default_bounded_ida_star: QualityExpectation,
    pub explicit_two_phase_baseline: QualityExpectation,
    pub generated_two_phase: QualityExpectation,
}

impl QualityFixtureExpectations {
    pub const fn new(
        default_bounded_ida_star: QualityExpectation,
        explicit_two_phase_baseline: QualityExpectation,
        generated_two_phase: QualityExpectation,
    ) -> Self {
        Self {
            default_bounded_ida_star,
            explicit_two_phase_baseline,
            generated_two_phase,
        }
    }

    pub const fn same(expectation: QualityExpectation) -> Self {
        Self::new(expectation, expectation, expectation)
    }

    pub const fn for_selection(
        self,
        solver_selection: QualitySolverSelection,
    ) -> QualityExpectation {
        match solver_selection {
            QualitySolverSelection::DefaultBoundedIdaStar => self.default_bounded_ida_star,
            QualitySolverSelection::ExplicitTwoPhaseBaseline => self.explicit_two_phase_baseline,
            QualitySolverSelection::GeneratedTwoPhase => self.generated_two_phase,
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct QualityGeneratedTableSummary {
    pub depths: String,
    pub metadata: String,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum QualityTableStatus {
    NotRequired,
    Available,
    Unavailable,
    CorruptOrIncompatible,
}

impl QualityTableStatus {
    pub const fn label(self) -> &'static str {
        match self {
            Self::NotRequired => "not_required",
            Self::Available => "available",
            Self::Unavailable => "unavailable",
            Self::CorruptOrIncompatible => "corrupt_or_incompatible",
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum QualityReportStatus {
    Success,
    GeneratedTablesUnavailable,
    GeneratedTablesCorruptOrIncompatible,
    ExpectedNotFoundWithinLimits,
    UnexpectedRegression,
}

impl QualityReportStatus {
    pub const fn label(self) -> &'static str {
        match self {
            Self::Success => "success",
            Self::GeneratedTablesUnavailable => "generated_tables_unavailable",
            Self::GeneratedTablesCorruptOrIncompatible => {
                "generated_tables_corrupt_or_incompatible"
            }
            Self::ExpectedNotFoundWithinLimits => "expected_not_found_within_limits",
            Self::UnexpectedRegression => "unexpected_regression",
        }
    }

    pub const fn is_gate_failure(self) -> bool {
        matches!(
            self,
            Self::GeneratedTablesUnavailable
                | Self::GeneratedTablesCorruptOrIncompatible
                | Self::UnexpectedRegression
        )
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum QualityHybridArtifactStatus {
    Available,
    Missing,
    DependencyFallback,
    Malformed,
}

impl QualityHybridArtifactStatus {
    pub const fn label(self) -> &'static str {
        match self {
            Self::Available => "available",
            Self::Missing => "missing",
            Self::DependencyFallback => "dependency_fallback",
            Self::Malformed => "malformed",
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum QualityHybridReportStatus {
    Success,
    ArtifactUnavailable,
    ArtifactDependencyFallback,
    ArtifactMalformed,
    ExpectedNotFoundWithinLimits,
    UnexpectedRegression,
}

impl QualityHybridReportStatus {
    pub const fn label(self) -> &'static str {
        match self {
            Self::Success => "success",
            Self::ArtifactUnavailable => "artifact_unavailable",
            Self::ArtifactDependencyFallback => "artifact_dependency_fallback",
            Self::ArtifactMalformed => "artifact_malformed",
            Self::ExpectedNotFoundWithinLimits => "expected_not_found_within_limits",
            Self::UnexpectedRegression => "unexpected_regression",
        }
    }

    pub const fn is_gate_failure(self) -> bool {
        matches!(
            self,
            Self::ArtifactUnavailable | Self::ArtifactMalformed | Self::UnexpectedRegression
        )
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct QualityReportRow {
    pub fixture_id: &'static str,
    pub fixture_category: QualityFixtureCategory,
    pub input_kind: QualityInputKind,
    pub expectation: QualityExpectation,
    pub scramble: &'static str,
    pub solver_selection: QualitySolverSelection,
    pub strategy: SolverStrategy,
    pub max_depth: usize,
    pub max_nodes: Option<usize>,
    pub table_status: QualityTableStatus,
    pub generated_table_depths: Option<String>,
    pub generated_table_metadata: Option<String>,
    pub status: QualityReportStatus,
    pub solution_length: Option<usize>,
    pub explored_nodes: usize,
    pub elapsed: Duration,
    pub replay_verified: Option<bool>,
    pub moves: Vec<Move>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct QualityHybridReportRow {
    pub fixture_id: &'static str,
    pub fixture_category: QualityFixtureCategory,
    pub input_kind: QualityInputKind,
    pub expectation: QualityExpectation,
    pub scramble: &'static str,
    pub baseline_selection: QualitySolverSelection,
    pub max_depth: usize,
    pub max_nodes: Option<usize>,
    pub artifact_path: String,
    pub artifact_status: QualityHybridArtifactStatus,
    pub artifact_metadata: Option<String>,
    pub status: QualityHybridReportStatus,
    pub solution_length: Option<usize>,
    pub explored_nodes: usize,
    pub elapsed: Duration,
    pub replay_verified: Option<bool>,
    pub scored_move_lookups: usize,
    pub missing_score_lookups: usize,
    pub model_score_evals: usize,
    pub moves: Vec<Move>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct QualityReport {
    rows: Vec<QualityReportRow>,
    hybrid_rows: Vec<QualityHybridReportRow>,
}

impl QualityReport {
    pub fn new(rows: Vec<QualityReportRow>) -> Self {
        Self {
            rows,
            hybrid_rows: Vec::new(),
        }
    }

    pub fn with_hybrid_rows(
        rows: Vec<QualityReportRow>,
        hybrid_rows: Vec<QualityHybridReportRow>,
    ) -> Self {
        Self { rows, hybrid_rows }
    }

    pub fn rows(&self) -> &[QualityReportRow] {
        &self.rows
    }

    pub fn hybrid_rows(&self) -> &[QualityHybridReportRow] {
        &self.hybrid_rows
    }

    pub fn has_gate_failures(&self) -> bool {
        self.rows.iter().any(|row| row.status.is_gate_failure())
            || self
                .hybrid_rows
                .iter()
                .any(|row| row.status.is_gate_failure())
    }
}
