use std::fmt;
use std::path::Path;
use std::time::{Duration, Instant};

use crate::cube::{
    Algorithm, Cube, CubeValidationError, CubieState, FaceletConversionError, FaceletParseError,
    FaceletString, Move, NotationError,
};
use crate::search::pruning::{PruningPhaseRole, PruningTable, GENERATED_PRUNING_TABLE_SPECS};
use crate::search::{
    load_hybrid_value_outputs, solve_hybrid_move_ordering, HybridMoveOrderingMetrics,
    HybridValueArtifact, HybridValueArtifactStatus, SearchBudget, SearchOutcome,
    DEFAULT_HYBRID_VALUE_OUTPUT_PATH,
};
use crate::solver::{
    playback_facelet_solution, solve_cubie_state, solve_facelet_string, FaceletPlaybackError,
    SolveError, SolveInputError, SolverConfig, SolverStrategy,
};

pub const QUALITY_REPORT_PRUNING_TABLE_DIR: &str = "/tmp/rubiks-cube-solver-pruning-tables";
pub const QUALITY_REPORT_HYBRID_VALUE_OUTPUT_PATH: &str = DEFAULT_HYBRID_VALUE_OUTPUT_PATH;

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

    pub fn to_markdown(&self) -> String {
        let mut output = String::from(
            "# Deterministic Solver Quality Report\n\n\
Fixtures, solver selections, table availability, expectations, generated artifact metadata, and limits are fixed. Generated two-phase rows read local pruning-table artifacts from /tmp/rubiks-cube-solver-pruning-tables by default. Elapsed time is local measurement output; use it as a rough local signal, not as a deterministic value. Compare fixture order, solver selection, expectation, table status, generated artifact depths, compatibility metadata, configured limits, status, solution length, explored nodes, and replay verification for regressions. This report does not claim optimality or a 20-move guarantee.\n\n",
        );

        output.push_str(
            "## Summary\n\n\
Status counts are grouped by solver selection. Elapsed timing stays in the row table because it is local and non-deterministic.\n\n\
| selection | rows | success | generated_tables_unavailable | generated_tables_corrupt_or_incompatible | expected_not_found_within_limits | unexpected_regression | replay_verified_successes | solution_len_range | explored_nodes_total |\n\
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: |\n",
        );

        for selection in QualitySolverSelection::ALL {
            push_quality_summary_row(
                &mut output,
                selection.label(),
                &quality_summary_for_selection(&self.rows, selection),
            );
        }
        push_quality_summary_row(&mut output, "all", &quality_summary_for_all(&self.rows));

        output.push_str(
            "\n## Rows\n\n\
| fixture | group | input | expectation | scramble | selection | strategy | max_depth | max_nodes | table_status | table_depths | table_metadata | status | solution_len | explored_nodes | elapsed_us | replay_verified | solution |\n\
| --- | --- | --- | --- | --- | --- | --- | ---: | ---: | --- | --- | --- | --- | ---: | ---: | ---: | --- | --- |\n",
        );

        for row in &self.rows {
            output.push_str(&format!(
                "| {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} |\n",
                row.fixture_id,
                row.fixture_category.label(),
                row.input_kind.label(),
                row.expectation.label(),
                scramble_label(row.scramble),
                row.solver_selection.label(),
                strategy_label(row.strategy),
                row.max_depth,
                max_nodes_label(row.max_nodes),
                row.table_status.label(),
                optional_str_label(row.generated_table_depths.as_deref()),
                optional_str_label(row.generated_table_metadata.as_deref()),
                row.status.label(),
                optional_usize_label(row.solution_length),
                row.explored_nodes,
                row.elapsed.as_micros(),
                replay_verified_label(row.replay_verified),
                moves_label(&row.moves),
            ));
        }

        output.push_str(
            "\n## Hybrid Move Ordering Experiment\n\n\
Hybrid rows compare the isolated learned-value move-ordering experiment against the `default-bounded-ida-star` fixture budgets. Value outputs are local artifacts at /tmp/rubiks-cube-solver-ml-smoke/value_outputs.tsv by default. The learned values only order legal child moves; they do not validate states, prune branches, change limits, claim admissibility, or replace Rust replay verification. Missing, fallback, or malformed artifacts are reported as experiment statuses without changing product solver defaults.\n\n\
| fixture | group | input | expectation | scramble | baseline_selection | max_depth | max_nodes | artifact_path | artifact_status | artifact_metadata | status | solution_len | explored_nodes | elapsed_us | replay_verified | scored_move_lookups | missing_score_lookups | solution |\n\
| --- | --- | --- | --- | --- | --- | ---: | ---: | --- | --- | --- | --- | ---: | ---: | ---: | --- | ---: | ---: | --- |\n",
        );

        for row in &self.hybrid_rows {
            output.push_str(&format!(
                "| {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} |\n",
                row.fixture_id,
                row.fixture_category.label(),
                row.input_kind.label(),
                row.expectation.label(),
                scramble_label(row.scramble),
                row.baseline_selection.label(),
                row.max_depth,
                max_nodes_label(row.max_nodes),
                row.artifact_path,
                row.artifact_status.label(),
                optional_str_label(row.artifact_metadata.as_deref()),
                row.status.label(),
                optional_usize_label(row.solution_length),
                row.explored_nodes,
                row.elapsed.as_micros(),
                replay_verified_label(row.replay_verified),
                row.scored_move_lookups,
                row.missing_score_lookups,
                moves_label(&row.moves),
            ));
        }

        output
    }
}

#[derive(Clone, Debug, Default, Eq, PartialEq)]
struct QualityReportSummary {
    rows: usize,
    success: usize,
    generated_tables_unavailable: usize,
    generated_tables_corrupt_or_incompatible: usize,
    expected_not_found_within_limits: usize,
    unexpected_regression: usize,
    replay_verified_successes: usize,
    solution_len_min: Option<usize>,
    solution_len_max: Option<usize>,
    explored_nodes_total: usize,
}

impl QualityReportSummary {
    fn record(&mut self, row: &QualityReportRow) {
        self.rows += 1;
        match row.status {
            QualityReportStatus::Success => self.success += 1,
            QualityReportStatus::GeneratedTablesUnavailable => {
                self.generated_tables_unavailable += 1;
            }
            QualityReportStatus::GeneratedTablesCorruptOrIncompatible => {
                self.generated_tables_corrupt_or_incompatible += 1;
            }
            QualityReportStatus::ExpectedNotFoundWithinLimits => {
                self.expected_not_found_within_limits += 1;
            }
            QualityReportStatus::UnexpectedRegression => self.unexpected_regression += 1,
        }
        if row.status == QualityReportStatus::Success && row.replay_verified == Some(true) {
            self.replay_verified_successes += 1;
        }
        if let Some(solution_length) = row.solution_length {
            self.solution_len_min = Some(match self.solution_len_min {
                Some(current) => current.min(solution_length),
                None => solution_length,
            });
            self.solution_len_max = Some(match self.solution_len_max {
                Some(current) => current.max(solution_length),
                None => solution_length,
            });
        }
        self.explored_nodes_total += row.explored_nodes;
    }

    fn solution_len_range_label(&self) -> String {
        match (self.solution_len_min, self.solution_len_max) {
            (Some(min), Some(max)) if min == max => min.to_string(),
            (Some(min), Some(max)) => format!("{min}-{max}"),
            _ => "-".to_owned(),
        }
    }
}

fn quality_summary_for_selection(
    rows: &[QualityReportRow],
    selection: QualitySolverSelection,
) -> QualityReportSummary {
    let mut summary = QualityReportSummary::default();
    for row in rows.iter().filter(|row| row.solver_selection == selection) {
        summary.record(row);
    }

    summary
}

fn quality_summary_for_all(rows: &[QualityReportRow]) -> QualityReportSummary {
    let mut summary = QualityReportSummary::default();
    for row in rows {
        summary.record(row);
    }

    summary
}

fn push_quality_summary_row(
    output: &mut String,
    selection_label: &str,
    summary: &QualityReportSummary,
) {
    output.push_str(&format!(
        "| {} | {} | {} | {} | {} | {} | {} | {} | {} | {} |\n",
        selection_label,
        summary.rows,
        summary.success,
        summary.generated_tables_unavailable,
        summary.generated_tables_corrupt_or_incompatible,
        summary.expected_not_found_within_limits,
        summary.unexpected_regression,
        summary.replay_verified_successes,
        summary.solution_len_range_label(),
        summary.explored_nodes_total,
    ));
}

#[derive(Debug)]
pub enum QualityReportError {
    FixtureNotation {
        fixture_id: &'static str,
        error: NotationError,
    },
    FixtureCubieValidation {
        fixture_id: &'static str,
        error: CubeValidationError,
    },
    FixtureFaceletParse {
        fixture_id: &'static str,
        error: FaceletParseError,
    },
    FixtureFaceletConversion {
        fixture_id: &'static str,
        error: Box<FaceletConversionError>,
    },
    FixtureRoundTripMismatch {
        fixture_id: &'static str,
    },
    UnexpectedInvalidInput {
        fixture_id: &'static str,
        solver_selection: QualitySolverSelection,
        error: Box<SolveInputError>,
    },
    ReplayFailure {
        fixture_id: &'static str,
        solver_selection: QualitySolverSelection,
        error: Box<FaceletPlaybackError>,
    },
    UnverifiedSuccess {
        fixture_id: &'static str,
        solver_selection: QualitySolverSelection,
    },
}

impl fmt::Display for QualityReportError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::FixtureNotation { fixture_id, error } => {
                write!(formatter, "quality fixture {fixture_id} has invalid notation: {error}")
            }
            Self::FixtureCubieValidation { fixture_id, error } => write!(
                formatter,
                "quality fixture {fixture_id} generated an invalid cubie state: {error}"
            ),
            Self::FixtureFaceletParse { fixture_id, error } => write!(
                formatter,
                "quality fixture {fixture_id} generated invalid facelets: {error}"
            ),
            Self::FixtureFaceletConversion { fixture_id, error } => write!(
                formatter,
                "quality fixture {fixture_id} facelets did not convert to cubies: {error}"
            ),
            Self::FixtureRoundTripMismatch { fixture_id } => write!(
                formatter,
                "quality fixture {fixture_id} facelets did not round-trip to the generated cubie state"
            ),
            Self::UnexpectedInvalidInput {
                fixture_id,
                solver_selection,
                error,
            } => write!(
                formatter,
                "quality fixture {fixture_id} was rejected by {}: {error}",
                solver_selection.label()
            ),
            Self::ReplayFailure {
                fixture_id,
                solver_selection,
                error,
            } => write!(
                formatter,
                "quality fixture {fixture_id} could not replay solution from {}: {error}",
                solver_selection.label()
            ),
            Self::UnverifiedSuccess {
                fixture_id,
                solver_selection,
            } => write!(
                formatter,
                "quality fixture {fixture_id} returned an unverified success from {}",
                solver_selection.label()
            ),
        }
    }
}

impl std::error::Error for QualityReportError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::FixtureNotation { error, .. } => Some(error),
            Self::FixtureCubieValidation { error, .. } => Some(error),
            Self::FixtureFaceletParse { error, .. } => Some(error),
            Self::FixtureFaceletConversion { error, .. } => Some(error.as_ref()),
            Self::UnexpectedInvalidInput { error, .. } => Some(error.as_ref()),
            Self::ReplayFailure { error, .. } => Some(error.as_ref()),
            Self::FixtureRoundTripMismatch { .. } | Self::UnverifiedSuccess { .. } => None,
        }
    }
}

pub fn quality_fixtures() -> Result<Vec<QualityFixture>, QualityReportError> {
    [
        QualityFixtureSpec::new(
            "solved-facelets",
            QualityFixtureCategory::Solved,
            QualityInputKind::Facelet,
            QualityExpectation::RequiredSuccess,
            "",
            0,
            Some(1_000),
        ),
        QualityFixtureSpec::new(
            "solved-cubie",
            QualityFixtureCategory::Solved,
            QualityInputKind::Cubie,
            QualityExpectation::RequiredSuccess,
            "",
            0,
            Some(1_000),
        ),
        QualityFixtureSpec::new(
            "shallow-facelets-f",
            QualityFixtureCategory::Shallow,
            QualityInputKind::Facelet,
            QualityExpectation::RequiredSuccess,
            "F",
            1,
            Some(10_000),
        ),
        QualityFixtureSpec::new(
            "shallow-cubie-r-u",
            QualityFixtureCategory::Shallow,
            QualityInputKind::Cubie,
            QualityExpectation::RequiredSuccess,
            "R U",
            2,
            Some(10_000),
        )
        .with_solver_expectations(QualityFixtureExpectations::new(
            QualityExpectation::RequiredSuccess,
            QualityExpectation::ExpectedNotFoundWithinLimits,
            QualityExpectation::RequiredSuccess,
        )),
        QualityFixtureSpec::new(
            "nontrivial-facelets-r-u-rprime-uprime",
            QualityFixtureCategory::Nontrivial,
            QualityInputKind::Facelet,
            QualityExpectation::RequiredSuccess,
            "R U R' U'",
            4,
            Some(1_000_000),
        )
        .with_solver_expectations(QualityFixtureExpectations::new(
            QualityExpectation::RequiredSuccess,
            QualityExpectation::ExpectedNotFoundWithinLimits,
            QualityExpectation::RequiredSuccess,
        )),
        QualityFixtureSpec::new(
            "nontrivial-cubie-r-u-rprime-uprime",
            QualityFixtureCategory::Nontrivial,
            QualityInputKind::Cubie,
            QualityExpectation::RequiredSuccess,
            "R U R' U'",
            4,
            Some(1_000_000),
        )
        .with_solver_expectations(QualityFixtureExpectations::new(
            QualityExpectation::RequiredSuccess,
            QualityExpectation::ExpectedNotFoundWithinLimits,
            QualityExpectation::RequiredSuccess,
        )),
        QualityFixtureSpec::new(
            "mid-depth-facelets-five-move",
            QualityFixtureCategory::MidDepth,
            QualityInputKind::Facelet,
            QualityExpectation::ExpectedNotFoundWithinLimits,
            "R U R' U' F",
            4,
            Some(100_000),
        ),
        QualityFixtureSpec::new(
            "mid-depth-cubie-five-move",
            QualityFixtureCategory::MidDepth,
            QualityInputKind::Cubie,
            QualityExpectation::ExpectedNotFoundWithinLimits,
            "F R U R' U'",
            4,
            Some(100_000),
        ),
        QualityFixtureSpec::new(
            "generated-mid-depth-facelets-phase2-five-move",
            QualityFixtureCategory::MidDepth,
            QualityInputKind::Facelet,
            QualityExpectation::ExpectedNotFoundWithinLimits,
            "U R2 F2 D L2",
            6,
            Some(1_000_000),
        )
        .with_solver_expectations(QualityFixtureExpectations::new(
            QualityExpectation::ExpectedNotFoundWithinLimits,
            QualityExpectation::ExpectedNotFoundWithinLimits,
            QualityExpectation::RequiredSuccess,
        )),
        QualityFixtureSpec::new(
            "generated-mid-depth-cubie-phase2-five-move",
            QualityFixtureCategory::MidDepth,
            QualityInputKind::Cubie,
            QualityExpectation::ExpectedNotFoundWithinLimits,
            "U R2 F2 D L2",
            6,
            Some(1_000_000),
        )
        .with_solver_expectations(QualityFixtureExpectations::new(
            QualityExpectation::ExpectedNotFoundWithinLimits,
            QualityExpectation::ExpectedNotFoundWithinLimits,
            QualityExpectation::RequiredSuccess,
        )),
        QualityFixtureSpec::new(
            "generated-harder-facelets-phase2-eight-move",
            QualityFixtureCategory::Harder,
            QualityInputKind::Facelet,
            QualityExpectation::ExpectedNotFoundWithinLimits,
            "U R2 F2 D L2 B2 U2 R2",
            8,
            Some(1_000_000),
        )
        .with_solver_expectations(QualityFixtureExpectations::new(
            QualityExpectation::ExpectedNotFoundWithinLimits,
            QualityExpectation::ExpectedNotFoundWithinLimits,
            QualityExpectation::RequiredSuccess,
        )),
        QualityFixtureSpec::new(
            "generated-harder-cubie-phase2-eight-move",
            QualityFixtureCategory::Harder,
            QualityInputKind::Cubie,
            QualityExpectation::ExpectedNotFoundWithinLimits,
            "U R2 F2 D L2 B2 U2 R2",
            8,
            Some(1_000_000),
        )
        .with_solver_expectations(QualityFixtureExpectations::new(
            QualityExpectation::ExpectedNotFoundWithinLimits,
            QualityExpectation::ExpectedNotFoundWithinLimits,
            QualityExpectation::RequiredSuccess,
        )),
        QualityFixtureSpec::new(
            "harder-facelets-six-move",
            QualityFixtureCategory::Harder,
            QualityInputKind::Facelet,
            QualityExpectation::ExpectedNotFoundWithinLimits,
            "F R U R' U' F'",
            2,
            Some(50_000),
        ),
        QualityFixtureSpec::new(
            "harder-cubie-nine-move",
            QualityFixtureCategory::Harder,
            QualityInputKind::Cubie,
            QualityExpectation::ExpectedNotFoundWithinLimits,
            "R U R' U' F2 D L' B U2",
            2,
            Some(50_000),
        ),
    ]
    .into_iter()
    .map(QualityFixtureSpec::build)
    .collect()
}

pub fn run_quality_report() -> Result<QualityReport, QualityReportError> {
    let fixtures = quality_fixtures()?;

    run_quality_report_for_fixtures(&fixtures)
}

pub fn run_quality_report_with_hybrid_value_outputs_path(
    hybrid_value_outputs_path: impl AsRef<Path>,
) -> Result<QualityReport, QualityReportError> {
    let fixtures = quality_fixtures()?;

    run_quality_report_for_fixtures_with_pruning_table_dir_and_hybrid_value_outputs_path(
        &fixtures,
        Path::new(QUALITY_REPORT_PRUNING_TABLE_DIR),
        hybrid_value_outputs_path,
    )
}

pub fn run_quality_report_for_fixtures(
    fixtures: &[QualityFixture],
) -> Result<QualityReport, QualityReportError> {
    run_quality_report_for_fixtures_with_pruning_table_dir(
        fixtures,
        QUALITY_REPORT_PRUNING_TABLE_DIR,
    )
}

pub fn run_quality_report_for_fixtures_with_pruning_table_dir(
    fixtures: &[QualityFixture],
    generated_pruning_table_dir: impl AsRef<Path>,
) -> Result<QualityReport, QualityReportError> {
    run_quality_report_for_fixtures_with_pruning_table_dir_and_hybrid_value_outputs_path(
        fixtures,
        generated_pruning_table_dir,
        QUALITY_REPORT_HYBRID_VALUE_OUTPUT_PATH,
    )
}

pub fn run_quality_report_for_fixtures_with_pruning_table_dir_and_hybrid_value_outputs_path(
    fixtures: &[QualityFixture],
    generated_pruning_table_dir: impl AsRef<Path>,
    hybrid_value_outputs_path: impl AsRef<Path>,
) -> Result<QualityReport, QualityReportError> {
    let generated_pruning_table_dir = generated_pruning_table_dir.as_ref();
    let hybrid_value_outputs_path = hybrid_value_outputs_path.as_ref();
    let generated_table_summary = generated_table_summary(generated_pruning_table_dir).ok();
    let hybrid_artifact = load_hybrid_value_outputs(hybrid_value_outputs_path);
    let mut rows = Vec::with_capacity(fixtures.len() * QualitySolverSelection::ALL.len());
    let mut hybrid_rows = Vec::with_capacity(fixtures.len());

    for fixture in fixtures {
        validate_quality_fixture(fixture)?;

        for solver_selection in QualitySolverSelection::ALL {
            rows.push(run_quality_row(
                fixture,
                solver_selection,
                generated_pruning_table_dir,
                generated_table_summary.as_ref(),
            )?);
        }
        hybrid_rows.push(run_hybrid_quality_row(
            fixture,
            hybrid_value_outputs_path,
            &hybrid_artifact,
        )?);
    }

    Ok(QualityReport::with_hybrid_rows(rows, hybrid_rows))
}

fn validate_quality_fixture(fixture: &QualityFixture) -> Result<(), QualityReportError> {
    fixture
        .state
        .validate()
        .map_err(|error| QualityReportError::FixtureCubieValidation {
            fixture_id: fixture.id,
            error,
        })?;

    let parsed = FaceletString::parse(&fixture.facelets).map_err(|error| {
        QualityReportError::FixtureFaceletParse {
            fixture_id: fixture.id,
            error,
        }
    })?;
    let recovered =
        parsed
            .to_cubie_state()
            .map_err(|error| QualityReportError::FixtureFaceletConversion {
                fixture_id: fixture.id,
                error: Box::new(error),
            })?;

    if recovered != fixture.state {
        return Err(QualityReportError::FixtureRoundTripMismatch {
            fixture_id: fixture.id,
        });
    }

    let cube = Cube::try_from_state(fixture.state.clone()).map_err(|error| {
        QualityReportError::FixtureCubieValidation {
            fixture_id: fixture.id,
            error,
        }
    })?;
    if FaceletString::from_cube(&cube).to_string() != fixture.facelets {
        return Err(QualityReportError::FixtureRoundTripMismatch {
            fixture_id: fixture.id,
        });
    }

    Ok(())
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
struct QualityFixtureSpec {
    id: &'static str,
    category: QualityFixtureCategory,
    input_kind: QualityInputKind,
    expectation: QualityExpectation,
    solver_expectations: QualityFixtureExpectations,
    scramble: &'static str,
    max_depth: usize,
    max_nodes: Option<usize>,
}

impl QualityFixtureSpec {
    const fn new(
        id: &'static str,
        category: QualityFixtureCategory,
        input_kind: QualityInputKind,
        expectation: QualityExpectation,
        scramble: &'static str,
        max_depth: usize,
        max_nodes: Option<usize>,
    ) -> Self {
        Self {
            id,
            category,
            input_kind,
            expectation,
            solver_expectations: QualityFixtureExpectations::same(expectation),
            scramble,
            max_depth,
            max_nodes,
        }
    }

    const fn with_solver_expectations(
        mut self,
        solver_expectations: QualityFixtureExpectations,
    ) -> Self {
        self.solver_expectations = solver_expectations;

        self
    }

    fn build(self) -> Result<QualityFixture, QualityReportError> {
        let mut cube = Cube::solved();
        if !self.scramble.is_empty() {
            let algorithm = Algorithm::parse(self.scramble).map_err(|error| {
                QualityReportError::FixtureNotation {
                    fixture_id: self.id,
                    error,
                }
            })?;
            algorithm.apply_to(&mut cube);
        }

        let state = cube.state().clone();
        state
            .validate()
            .map_err(|error| QualityReportError::FixtureCubieValidation {
                fixture_id: self.id,
                error,
            })?;

        let facelets = validated_facelets(self.id, &cube, &state)?;

        Ok(QualityFixture {
            id: self.id,
            category: self.category,
            input_kind: self.input_kind,
            expectation: self.expectation,
            solver_expectations: self.solver_expectations,
            scramble: self.scramble,
            max_depth: self.max_depth,
            max_nodes: self.max_nodes,
            state,
            facelets,
        })
    }
}

fn validated_facelets(
    fixture_id: &'static str,
    cube: &Cube,
    state: &CubieState,
) -> Result<String, QualityReportError> {
    let rendered = FaceletString::from_cube(cube).to_string();
    let parsed = FaceletString::parse(&rendered)
        .map_err(|error| QualityReportError::FixtureFaceletParse { fixture_id, error })?;
    let recovered =
        parsed
            .to_cubie_state()
            .map_err(|error| QualityReportError::FixtureFaceletConversion {
                fixture_id,
                error: Box::new(error),
            })?;

    if &recovered != state {
        return Err(QualityReportError::FixtureRoundTripMismatch { fixture_id });
    }

    Ok(rendered)
}

fn generated_table_summary(directory: &Path) -> Result<QualityGeneratedTableSummary, ()> {
    let mut phase1_depths = Vec::new();
    let mut phase2_depths = Vec::new();
    let mut format_versions = Vec::new();
    let mut table_versions = Vec::new();
    let mut move_sets = Vec::new();
    let mut sources = Vec::new();
    let mut coordinate_profiles = Vec::new();

    for spec in GENERATED_PRUNING_TABLE_SPECS {
        let path = spec.file_path(directory);
        let table = PruningTable::load_artifact(&path).map_err(|_| ())?;
        spec.validate_table(&table, &path).map_err(|_| ())?;
        let metadata = table.metadata();

        match metadata.phase_role {
            PruningPhaseRole::Phase1 => phase1_depths.push(metadata.generation.max_depth),
            PruningPhaseRole::Phase2 => phase2_depths.push(metadata.generation.max_depth),
        }
        if !format_versions.contains(&metadata.format_version) {
            format_versions.push(metadata.format_version);
        }
        table_versions.push(metadata.table_version.clone());
        if !move_sets.contains(&metadata.generation.move_set) {
            move_sets.push(metadata.generation.move_set.clone());
        }
        if !sources.contains(&metadata.generation.source) {
            sources.push(metadata.generation.source.clone());
        }
        coordinate_profiles.push(format!(
            "{}[{}]",
            metadata.table_version,
            coordinate_profile_label(metadata)
        ));
    }

    Ok(QualityGeneratedTableSummary {
        depths: format!(
            "phase1={};phase2={}",
            u8_list_label(&phase1_depths),
            u8_list_label(&phase2_depths)
        ),
        metadata: format!(
            "format={};tables={};versions={};move_sets={};sources={};coordinates={}",
            u16_list_label(&format_versions),
            GENERATED_PRUNING_TABLE_SPECS.len(),
            table_versions.join(","),
            move_sets.join(","),
            sources.join(","),
            coordinate_profiles.join(",")
        ),
    })
}

fn coordinate_profile_label(metadata: &crate::search::pruning::PruningTableMetadata) -> String {
    metadata
        .coordinates
        .iter()
        .map(|coordinate| format!("{}:{}", coordinate.name, coordinate.dimension))
        .collect::<Vec<_>>()
        .join("+")
}

fn run_quality_row(
    fixture: &QualityFixture,
    solver_selection: QualitySolverSelection,
    generated_pruning_table_dir: &Path,
    generated_table_summary: Option<&QualityGeneratedTableSummary>,
) -> Result<QualityReportRow, QualityReportError> {
    let expectation = expectation_for(fixture, solver_selection);
    let mut config = solver_selection.config(fixture.max_depth, fixture.max_nodes);
    if config.strategy == SolverStrategy::GeneratedTwoPhase {
        config = config.with_pruning_table_dir(generated_pruning_table_dir.to_path_buf());
    }
    let started = Instant::now();
    let result = match fixture.input_kind {
        QualityInputKind::Facelet => solve_facelet_string(&fixture.facelets, config.clone()),
        QualityInputKind::Cubie => solve_cubie_state(fixture.state.clone(), config.clone()),
    };
    let elapsed = started.elapsed();

    match result {
        Ok(result) => {
            let replay_verified = replay_verifies(fixture, result.moves());
            let status = if replay_verified {
                QualityReportStatus::Success
            } else {
                QualityReportStatus::UnexpectedRegression
            };

            Ok(report_row(
                fixture,
                solver_selection,
                expectation,
                &config,
                table_status_for_success(config.strategy),
                generated_table_summary,
                status,
                Some(result.length()),
                result.explored_nodes(),
                elapsed,
                Some(replay_verified),
                result.moves,
            ))
        }
        Err(SolveError::NotFoundWithinLimits { explored_nodes, .. }) => {
            let status = match expectation {
                QualityExpectation::RequiredSuccess => QualityReportStatus::UnexpectedRegression,
                QualityExpectation::ExpectedNotFoundWithinLimits => {
                    QualityReportStatus::ExpectedNotFoundWithinLimits
                }
            };

            Ok(report_row(
                fixture,
                solver_selection,
                expectation,
                &config,
                table_status_for_success(config.strategy),
                generated_table_summary,
                status,
                None,
                explored_nodes,
                elapsed,
                None,
                Vec::new(),
            ))
        }
        Err(SolveError::GeneratedTablesUnavailable { .. }) => Ok(report_row(
            fixture,
            solver_selection,
            expectation,
            &config,
            QualityTableStatus::Unavailable,
            generated_table_summary,
            QualityReportStatus::GeneratedTablesUnavailable,
            None,
            0,
            elapsed,
            None,
            Vec::new(),
        )),
        Err(SolveError::GeneratedTablesCorrupt { .. }) => Ok(report_row(
            fixture,
            solver_selection,
            expectation,
            &config,
            QualityTableStatus::CorruptOrIncompatible,
            generated_table_summary,
            QualityReportStatus::GeneratedTablesCorruptOrIncompatible,
            None,
            0,
            elapsed,
            None,
            Vec::new(),
        )),
        Err(SolveError::InvalidInput { .. }) => Ok(report_row(
            fixture,
            solver_selection,
            expectation,
            &config,
            table_status_for_success(config.strategy),
            generated_table_summary,
            QualityReportStatus::UnexpectedRegression,
            None,
            0,
            elapsed,
            None,
            Vec::new(),
        )),
    }
}

fn run_hybrid_quality_row(
    fixture: &QualityFixture,
    hybrid_value_outputs_path: &Path,
    artifact: &HybridValueArtifact,
) -> Result<QualityHybridReportRow, QualityReportError> {
    let expectation = expectation_for(fixture, QualitySolverSelection::DefaultBoundedIdaStar);
    let artifact_status = quality_hybrid_artifact_status(artifact.status());
    let artifact_metadata = artifact.metadata_label();

    let HybridValueArtifact::Available(value_table) = artifact else {
        return Ok(hybrid_report_row(
            fixture,
            expectation,
            hybrid_value_outputs_path,
            artifact_status,
            artifact_metadata,
            unavailable_hybrid_status(artifact_status),
            None,
            0,
            Duration::ZERO,
            None,
            HybridMoveOrderingMetrics::default(),
            Vec::new(),
        ));
    };

    let cube = Cube::try_from_state(fixture.state.clone()).map_err(|error| {
        QualityReportError::FixtureCubieValidation {
            fixture_id: fixture.id,
            error,
        }
    })?;
    let started = Instant::now();
    let result = solve_hybrid_move_ordering(
        &cube,
        SearchBudget::with_limits(fixture.max_depth, fixture.max_nodes),
        value_table,
    );
    let elapsed = started.elapsed();

    match result.outcome {
        SearchOutcome::Found(solution) => {
            let replay_verified = replay_verifies(fixture, solution.moves());
            let status = if replay_verified {
                QualityHybridReportStatus::Success
            } else {
                QualityHybridReportStatus::UnexpectedRegression
            };

            Ok(hybrid_report_row(
                fixture,
                expectation,
                hybrid_value_outputs_path,
                artifact_status,
                artifact_metadata,
                status,
                Some(solution.len()),
                solution.explored_nodes(),
                elapsed,
                Some(replay_verified),
                result.metrics,
                solution.moves,
            ))
        }
        SearchOutcome::NotFoundWithinLimits { explored_nodes } => {
            let status = match expectation {
                QualityExpectation::RequiredSuccess => {
                    QualityHybridReportStatus::UnexpectedRegression
                }
                QualityExpectation::ExpectedNotFoundWithinLimits => {
                    QualityHybridReportStatus::ExpectedNotFoundWithinLimits
                }
            };

            Ok(hybrid_report_row(
                fixture,
                expectation,
                hybrid_value_outputs_path,
                artifact_status,
                artifact_metadata,
                status,
                None,
                explored_nodes,
                elapsed,
                None,
                result.metrics,
                Vec::new(),
            ))
        }
    }
}

#[allow(clippy::too_many_arguments)]
fn hybrid_report_row(
    fixture: &QualityFixture,
    expectation: QualityExpectation,
    hybrid_value_outputs_path: &Path,
    artifact_status: QualityHybridArtifactStatus,
    artifact_metadata: Option<String>,
    status: QualityHybridReportStatus,
    solution_length: Option<usize>,
    explored_nodes: usize,
    elapsed: Duration,
    replay_verified: Option<bool>,
    metrics: HybridMoveOrderingMetrics,
    moves: Vec<Move>,
) -> QualityHybridReportRow {
    QualityHybridReportRow {
        fixture_id: fixture.id,
        fixture_category: fixture.category,
        input_kind: fixture.input_kind,
        expectation,
        scramble: fixture.scramble,
        baseline_selection: QualitySolverSelection::DefaultBoundedIdaStar,
        max_depth: fixture.max_depth,
        max_nodes: fixture.max_nodes,
        artifact_path: hybrid_value_outputs_path.display().to_string(),
        artifact_status,
        artifact_metadata,
        status,
        solution_length,
        explored_nodes,
        elapsed,
        replay_verified,
        scored_move_lookups: metrics.scored_move_lookups,
        missing_score_lookups: metrics.missing_score_lookups,
        moves,
    }
}

fn quality_hybrid_artifact_status(
    status: HybridValueArtifactStatus,
) -> QualityHybridArtifactStatus {
    match status {
        HybridValueArtifactStatus::Available => QualityHybridArtifactStatus::Available,
        HybridValueArtifactStatus::Missing => QualityHybridArtifactStatus::Missing,
        HybridValueArtifactStatus::DependencyFallback => {
            QualityHybridArtifactStatus::DependencyFallback
        }
        HybridValueArtifactStatus::Malformed => QualityHybridArtifactStatus::Malformed,
    }
}

fn unavailable_hybrid_status(
    artifact_status: QualityHybridArtifactStatus,
) -> QualityHybridReportStatus {
    match artifact_status {
        QualityHybridArtifactStatus::Available => QualityHybridReportStatus::UnexpectedRegression,
        QualityHybridArtifactStatus::Missing => QualityHybridReportStatus::ArtifactUnavailable,
        QualityHybridArtifactStatus::DependencyFallback => {
            QualityHybridReportStatus::ArtifactDependencyFallback
        }
        QualityHybridArtifactStatus::Malformed => QualityHybridReportStatus::ArtifactMalformed,
    }
}

#[allow(clippy::too_many_arguments)]
fn report_row(
    fixture: &QualityFixture,
    solver_selection: QualitySolverSelection,
    expectation: QualityExpectation,
    config: &SolverConfig,
    table_status: QualityTableStatus,
    generated_table_summary: Option<&QualityGeneratedTableSummary>,
    status: QualityReportStatus,
    solution_length: Option<usize>,
    explored_nodes: usize,
    elapsed: Duration,
    replay_verified: Option<bool>,
    moves: Vec<Move>,
) -> QualityReportRow {
    let (generated_table_depths, generated_table_metadata) = if config.strategy
        == SolverStrategy::GeneratedTwoPhase
        && table_status == QualityTableStatus::Available
    {
        generated_table_summary
            .map(|summary| (Some(summary.depths.clone()), Some(summary.metadata.clone())))
            .unwrap_or((None, None))
    } else {
        (None, None)
    };

    QualityReportRow {
        fixture_id: fixture.id,
        fixture_category: fixture.category,
        input_kind: fixture.input_kind,
        expectation,
        scramble: fixture.scramble,
        solver_selection,
        strategy: config.strategy,
        max_depth: config.max_depth,
        max_nodes: config.max_nodes,
        table_status,
        generated_table_depths,
        generated_table_metadata,
        status,
        solution_length,
        explored_nodes,
        elapsed,
        replay_verified,
        moves,
    }
}

fn expectation_for(
    fixture: &QualityFixture,
    solver_selection: QualitySolverSelection,
) -> QualityExpectation {
    fixture.solver_expectations.for_selection(solver_selection)
}

fn replay_verifies(fixture: &QualityFixture, moves: &[Move]) -> bool {
    match fixture.input_kind {
        QualityInputKind::Facelet => playback_facelet_solution(
            &fixture.facelets,
            &Algorithm::new(moves.to_vec()).to_string(),
        )
        .map(|result| result.final_is_solved())
        .unwrap_or(false),
        QualityInputKind::Cubie => {
            let Ok(mut cube) = Cube::try_from_state(fixture.state.clone()) else {
                return false;
            };
            cube.apply_moves(moves);

            cube.is_solved()
        }
    }
}

fn strategy_label(strategy: SolverStrategy) -> &'static str {
    strategy.id()
}

fn table_status_for_success(strategy: SolverStrategy) -> QualityTableStatus {
    match strategy {
        SolverStrategy::GeneratedTwoPhase => QualityTableStatus::Available,
        SolverStrategy::BoundedIdaStar | SolverStrategy::TwoPhaseBaseline => {
            QualityTableStatus::NotRequired
        }
    }
}

fn scramble_label(scramble: &str) -> &str {
    if scramble.is_empty() {
        "-"
    } else {
        scramble
    }
}

fn max_nodes_label(max_nodes: Option<usize>) -> String {
    max_nodes.map_or_else(|| "unlimited".to_owned(), |max_nodes| max_nodes.to_string())
}

fn optional_str_label(value: Option<&str>) -> &str {
    value.unwrap_or("-")
}

fn optional_usize_label(value: Option<usize>) -> String {
    value.map_or_else(|| "-".to_owned(), |value| value.to_string())
}

fn u8_list_label(values: &[u8]) -> String {
    values
        .iter()
        .map(u8::to_string)
        .collect::<Vec<_>>()
        .join("/")
}

fn u16_list_label(values: &[u16]) -> String {
    values
        .iter()
        .map(u16::to_string)
        .collect::<Vec<_>>()
        .join("/")
}

fn replay_verified_label(value: Option<bool>) -> &'static str {
    match value {
        Some(true) => "true",
        Some(false) => "false",
        None => "-",
    }
}

fn moves_label(moves: &[Move]) -> String {
    if moves.is_empty() {
        "-".to_owned()
    } else {
        Algorithm::new(moves.to_vec()).to_string()
    }
}
