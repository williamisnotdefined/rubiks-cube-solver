use std::fmt;
use std::time::{Duration, Instant};

use super::{
    cube2_pdb_heuristic, solve_cube2_bounded_ida_star, solve_cube2_pdb_ida_star, Cube2,
    Cube2Algorithm, Cube2Move, Cube2NotationError, Cube2SearchBudget, Cube2SearchOutcome,
    Cube2ValidationError, CUBE2_BOUNDED_IDA_STAR_STRATEGY_ID, CUBE2_PDB_IDA_STAR_STRATEGY_ID,
};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Cube2QualityFixtureCategory {
    Solved,
    Shallow,
    Nontrivial,
    Representative,
    Limit,
}

impl Cube2QualityFixtureCategory {
    pub const fn label(self) -> &'static str {
        match self {
            Self::Solved => "solved",
            Self::Shallow => "shallow",
            Self::Nontrivial => "nontrivial",
            Self::Representative => "representative",
            Self::Limit => "limit",
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Cube2QualityExpectation {
    RequiredSuccess,
    ExpectedNotFoundWithinLimits,
    ExpectedNodeLimitExceeded,
}

impl Cube2QualityExpectation {
    pub const fn label(self) -> &'static str {
        match self {
            Self::RequiredSuccess => "required_success",
            Self::ExpectedNotFoundWithinLimits => "expected_not_found_within_limits",
            Self::ExpectedNodeLimitExceeded => "expected_node_limit_exceeded",
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Cube2QualityFixture {
    pub id: &'static str,
    pub category: Cube2QualityFixtureCategory,
    pub expectation: Cube2QualityExpectation,
    pub scramble: &'static str,
    pub max_depth: usize,
    pub max_nodes: Option<usize>,
    pub cube: Cube2,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Cube2QualitySolverSelection {
    BoundedIdaStar,
    PdbIdaStar,
}

impl Cube2QualitySolverSelection {
    pub const ALL: [Self; 2] = [Self::BoundedIdaStar, Self::PdbIdaStar];

    pub const fn strategy_id(self) -> &'static str {
        match self {
            Self::BoundedIdaStar => CUBE2_BOUNDED_IDA_STAR_STRATEGY_ID,
            Self::PdbIdaStar => CUBE2_PDB_IDA_STAR_STRATEGY_ID,
        }
    }

    fn solve(self, cube: &Cube2, budget: Cube2SearchBudget) -> Cube2SearchOutcome {
        match self {
            Self::BoundedIdaStar => solve_cube2_bounded_ida_star(cube, budget),
            Self::PdbIdaStar => solve_cube2_pdb_ida_star(cube, budget),
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Cube2QualityReportStatus {
    Success,
    ExpectedNotFoundWithinLimits,
    ExpectedNodeLimitExceeded,
    UnexpectedRegression,
}

impl Cube2QualityReportStatus {
    pub const fn label(self) -> &'static str {
        match self {
            Self::Success => "success",
            Self::ExpectedNotFoundWithinLimits => "expected_not_found_within_limits",
            Self::ExpectedNodeLimitExceeded => "expected_node_limit_exceeded",
            Self::UnexpectedRegression => "unexpected_regression",
        }
    }

    pub const fn is_gate_failure(self) -> bool {
        matches!(self, Self::UnexpectedRegression)
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Cube2QualityReportRow {
    pub puzzle_id: &'static str,
    pub puzzle_slug: &'static str,
    pub fixture_id: &'static str,
    pub fixture_category: Cube2QualityFixtureCategory,
    pub expectation: Cube2QualityExpectation,
    pub scramble: &'static str,
    pub solver_selection: Cube2QualitySolverSelection,
    pub strategy_id: &'static str,
    pub max_depth: usize,
    pub max_nodes: Option<usize>,
    pub status: Cube2QualityReportStatus,
    pub solution_length: Option<usize>,
    pub explored_nodes: usize,
    pub elapsed: Duration,
    pub replay_verified: Option<bool>,
    pub moves: Vec<Cube2Move>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Cube2InvalidNotationFixture {
    pub id: &'static str,
    pub notation: &'static str,
    pub rejected_token: &'static str,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Cube2InvalidNotationReportStatus {
    Rejected,
    UnexpectedAccepted,
}

impl Cube2InvalidNotationReportStatus {
    pub const fn label(self) -> &'static str {
        match self {
            Self::Rejected => "rejected",
            Self::UnexpectedAccepted => "unexpected_accepted",
        }
    }

    pub const fn is_gate_failure(self) -> bool {
        matches!(self, Self::UnexpectedAccepted)
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Cube2InvalidNotationReportRow {
    pub fixture_id: &'static str,
    pub notation: &'static str,
    pub expected_rejected_token: &'static str,
    pub rejected_token: Option<String>,
    pub status: Cube2InvalidNotationReportStatus,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Cube2QualityReport {
    rows: Vec<Cube2QualityReportRow>,
    invalid_notation_rows: Vec<Cube2InvalidNotationReportRow>,
}

impl Cube2QualityReport {
    pub fn new(rows: Vec<Cube2QualityReportRow>) -> Self {
        Self {
            rows,
            invalid_notation_rows: Vec::new(),
        }
    }

    pub fn with_invalid_notation_rows(
        rows: Vec<Cube2QualityReportRow>,
        invalid_notation_rows: Vec<Cube2InvalidNotationReportRow>,
    ) -> Self {
        Self {
            rows,
            invalid_notation_rows,
        }
    }

    pub fn rows(&self) -> &[Cube2QualityReportRow] {
        &self.rows
    }

    pub fn invalid_notation_rows(&self) -> &[Cube2InvalidNotationReportRow] {
        &self.invalid_notation_rows
    }

    pub fn has_gate_failures(&self) -> bool {
        self.rows.iter().any(|row| row.status.is_gate_failure())
            || self
                .invalid_notation_rows
                .iter()
                .any(|row| row.status.is_gate_failure())
    }

    pub fn to_markdown(&self) -> String {
        let mut output = String::from(
            "# 2x2 Solver Quality Report\n\n\
Fixtures, strategy selections, expectations, and limits are fixed. Elapsed time is local measurement output; use it as a rough local signal, not as a deterministic value. The report checks replay verification and does not claim optimality.\n\n",
        );

        output.push_str(
            "## Summary\n\n\
| strategy | rows | success | expected_not_found_within_limits | expected_node_limit_exceeded | unexpected_regression | replay_verified_successes | solution_len_range | explored_nodes_total |\n\
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: |\n",
        );

        for selection in Cube2QualitySolverSelection::ALL {
            push_summary_row(
                &mut output,
                selection.strategy_id(),
                &summary_for_selection(self.rows(), selection),
            );
        }
        push_summary_row(&mut output, "all", &summary_for_all(self.rows()));

        output.push_str(
            "\n## Rows\n\n\
| puzzle | fixture | group | expectation | scramble | strategy | max_depth | max_nodes | status | solution_len | explored_nodes | elapsed_us | replay_verified | solution |\n\
| --- | --- | --- | --- | --- | --- | ---: | ---: | --- | ---: | ---: | ---: | --- | --- |\n",
        );

        for row in self.rows() {
            output.push_str(&format!(
                "| {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} |\n",
                row.puzzle_id,
                row.fixture_id,
                row.fixture_category.label(),
                row.expectation.label(),
                scramble_label(row.scramble),
                row.strategy_id,
                row.max_depth,
                max_nodes_label(row.max_nodes),
                row.status.label(),
                optional_usize_label(row.solution_length),
                row.explored_nodes,
                row.elapsed.as_micros(),
                replay_verified_label(row.replay_verified),
                moves_label(&row.moves),
            ));
        }

        output.push_str(
            "\n## Invalid Notation Fixtures\n\n\
| fixture | notation | expected_rejected_token | rejected_token | status |\n\
| --- | --- | --- | --- | --- |\n",
        );

        for row in self.invalid_notation_rows() {
            output.push_str(&format!(
                "| {} | {} | {} | {} | {} |\n",
                row.fixture_id,
                row.notation,
                row.expected_rejected_token,
                row.rejected_token.as_deref().unwrap_or("-"),
                row.status.label(),
            ));
        }

        output
    }
}

#[derive(Debug)]
pub enum Cube2QualityReportError {
    FixtureNotation {
        fixture_id: &'static str,
        error: Cube2NotationError,
    },
    FixtureValidation {
        fixture_id: &'static str,
        error: Cube2ValidationError,
    },
}

impl fmt::Display for Cube2QualityReportError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::FixtureNotation { fixture_id, error } => {
                write!(
                    formatter,
                    "2x2 quality fixture {fixture_id} has invalid notation: {error}"
                )
            }
            Self::FixtureValidation { fixture_id, error } => {
                write!(
                    formatter,
                    "2x2 quality fixture {fixture_id} is invalid: {error}"
                )
            }
        }
    }
}

impl std::error::Error for Cube2QualityReportError {}

pub fn cube2_quality_fixtures() -> Result<Vec<Cube2QualityFixture>, Cube2QualityReportError> {
    [
        Cube2QualityFixtureSpec::new(
            "cube2-solved",
            Cube2QualityFixtureCategory::Solved,
            Cube2QualityExpectation::RequiredSuccess,
            "",
            0,
            Some(1_000),
        ),
        Cube2QualityFixtureSpec::new(
            "cube2-shallow-f",
            Cube2QualityFixtureCategory::Shallow,
            Cube2QualityExpectation::RequiredSuccess,
            "F",
            1,
            Some(10_000),
        ),
        Cube2QualityFixtureSpec::new(
            "cube2-shallow-r-u",
            Cube2QualityFixtureCategory::Shallow,
            Cube2QualityExpectation::RequiredSuccess,
            "R U",
            2,
            Some(100_000),
        ),
        Cube2QualityFixtureSpec::new(
            "cube2-shallow-r-u-f",
            Cube2QualityFixtureCategory::Shallow,
            Cube2QualityExpectation::RequiredSuccess,
            "R U F",
            3,
            Some(500_000),
        ),
        Cube2QualityFixtureSpec::new(
            "cube2-nontrivial-r-u-rprime-uprime",
            Cube2QualityFixtureCategory::Nontrivial,
            Cube2QualityExpectation::RequiredSuccess,
            "R U R' U'",
            4,
            Some(2_000_000),
        ),
        Cube2QualityFixtureSpec::new(
            "cube2-representative-five-move",
            Cube2QualityFixtureCategory::Representative,
            Cube2QualityExpectation::RequiredSuccess,
            "R U F D L",
            5,
            Some(2_000_000),
        ),
        Cube2QualityFixtureSpec::new(
            "cube2-expected-depth-limit",
            Cube2QualityFixtureCategory::Limit,
            Cube2QualityExpectation::ExpectedNotFoundWithinLimits,
            "R U F",
            1,
            Some(500_000),
        ),
        Cube2QualityFixtureSpec::new(
            "cube2-expected-node-limit",
            Cube2QualityFixtureCategory::Limit,
            Cube2QualityExpectation::ExpectedNodeLimitExceeded,
            "R U F",
            3,
            Some(1),
        ),
    ]
    .into_iter()
    .map(Cube2QualityFixtureSpec::build)
    .collect()
}

pub fn cube2_invalid_notation_fixtures() -> Vec<Cube2InvalidNotationFixture> {
    vec![
        Cube2InvalidNotationFixture {
            id: "cube2-invalid-wide-move",
            notation: "Rw",
            rejected_token: "Rw",
        },
        Cube2InvalidNotationFixture {
            id: "cube2-invalid-slice-move",
            notation: "R M",
            rejected_token: "M",
        },
        Cube2InvalidNotationFixture {
            id: "cube2-invalid-rotation",
            notation: "x",
            rejected_token: "x",
        },
        Cube2InvalidNotationFixture {
            id: "cube2-invalid-nxn-wide-move",
            notation: "3Uw",
            rejected_token: "3Uw",
        },
    ]
}

pub fn run_cube2_quality_report() -> Result<Cube2QualityReport, Cube2QualityReportError> {
    let fixtures = cube2_quality_fixtures()?;
    let invalid_notation_fixtures = cube2_invalid_notation_fixtures();

    run_cube2_quality_report_for_fixtures_and_invalid_notation_fixtures(
        &fixtures,
        &invalid_notation_fixtures,
    )
}

pub fn run_cube2_quality_report_for_fixtures(
    fixtures: &[Cube2QualityFixture],
) -> Result<Cube2QualityReport, Cube2QualityReportError> {
    run_cube2_quality_report_for_fixtures_and_invalid_notation_fixtures(fixtures, &[])
}

pub fn run_cube2_quality_report_for_fixtures_and_invalid_notation_fixtures(
    fixtures: &[Cube2QualityFixture],
    invalid_notation_fixtures: &[Cube2InvalidNotationFixture],
) -> Result<Cube2QualityReport, Cube2QualityReportError> {
    let mut rows = Vec::with_capacity(fixtures.len() * Cube2QualitySolverSelection::ALL.len());
    warm_cube2_quality_tables();

    for fixture in fixtures {
        validate_cube2_quality_fixture(fixture)?;

        for selection in Cube2QualitySolverSelection::ALL {
            rows.push(run_cube2_quality_row(fixture, selection));
        }
    }
    let invalid_notation_rows = invalid_notation_fixtures
        .iter()
        .map(run_cube2_invalid_notation_row)
        .collect();

    Ok(Cube2QualityReport::with_invalid_notation_rows(
        rows,
        invalid_notation_rows,
    ))
}

fn run_cube2_invalid_notation_row(
    fixture: &Cube2InvalidNotationFixture,
) -> Cube2InvalidNotationReportRow {
    match Cube2Algorithm::parse(fixture.notation) {
        Ok(_) => Cube2InvalidNotationReportRow {
            fixture_id: fixture.id,
            notation: fixture.notation,
            expected_rejected_token: fixture.rejected_token,
            rejected_token: None,
            status: Cube2InvalidNotationReportStatus::UnexpectedAccepted,
        },
        Err(error) => {
            let rejected_token = error.token().to_owned();
            let status = if rejected_token == fixture.rejected_token {
                Cube2InvalidNotationReportStatus::Rejected
            } else {
                Cube2InvalidNotationReportStatus::UnexpectedAccepted
            };

            Cube2InvalidNotationReportRow {
                fixture_id: fixture.id,
                notation: fixture.notation,
                expected_rejected_token: fixture.rejected_token,
                rejected_token: Some(rejected_token),
                status,
            }
        }
    }
}

fn warm_cube2_quality_tables() {
    let _ = cube2_pdb_heuristic(&Cube2::solved());
}

fn validate_cube2_quality_fixture(
    fixture: &Cube2QualityFixture,
) -> Result<(), Cube2QualityReportError> {
    fixture
        .cube
        .state()
        .validate()
        .map_err(|error| Cube2QualityReportError::FixtureValidation {
            fixture_id: fixture.id,
            error,
        })
}

fn run_cube2_quality_row(
    fixture: &Cube2QualityFixture,
    solver_selection: Cube2QualitySolverSelection,
) -> Cube2QualityReportRow {
    let budget = Cube2SearchBudget {
        max_depth: fixture.max_depth,
        max_nodes: fixture.max_nodes,
    };
    let started = Instant::now();
    let outcome = solver_selection.solve(&fixture.cube, budget);
    let elapsed = started.elapsed();

    match outcome {
        Cube2SearchOutcome::Found(solution) => report_row(
            fixture,
            solver_selection,
            Cube2QualityReportMetrics {
                status: Cube2QualityReportStatus::from_found(solution.replay_verified),
                solution_length: Some(solution.depth),
                explored_nodes: solution.explored_nodes,
                elapsed,
                replay_verified: Some(solution.replay_verified),
                moves: solution.moves,
            },
        ),
        Cube2SearchOutcome::NotFoundWithinLimits { explored_nodes, .. } => report_row(
            fixture,
            solver_selection,
            Cube2QualityReportMetrics {
                status: Cube2QualityReportStatus::from_not_found(fixture.expectation),
                solution_length: None,
                explored_nodes,
                elapsed,
                replay_verified: None,
                moves: Vec::new(),
            },
        ),
        Cube2SearchOutcome::NodeLimitExceeded { explored_nodes, .. } => report_row(
            fixture,
            solver_selection,
            Cube2QualityReportMetrics {
                status: Cube2QualityReportStatus::from_node_limit(fixture.expectation),
                solution_length: None,
                explored_nodes,
                elapsed,
                replay_verified: None,
                moves: Vec::new(),
            },
        ),
    }
}

impl Cube2QualityReportStatus {
    const fn from_found(replay_verified: bool) -> Self {
        if replay_verified {
            Self::Success
        } else {
            Self::UnexpectedRegression
        }
    }

    const fn from_not_found(expectation: Cube2QualityExpectation) -> Self {
        match expectation {
            Cube2QualityExpectation::ExpectedNotFoundWithinLimits => {
                Self::ExpectedNotFoundWithinLimits
            }
            Cube2QualityExpectation::RequiredSuccess
            | Cube2QualityExpectation::ExpectedNodeLimitExceeded => Self::UnexpectedRegression,
        }
    }

    const fn from_node_limit(expectation: Cube2QualityExpectation) -> Self {
        match expectation {
            Cube2QualityExpectation::ExpectedNodeLimitExceeded => Self::ExpectedNodeLimitExceeded,
            Cube2QualityExpectation::RequiredSuccess
            | Cube2QualityExpectation::ExpectedNotFoundWithinLimits => Self::UnexpectedRegression,
        }
    }
}

fn report_row(
    fixture: &Cube2QualityFixture,
    solver_selection: Cube2QualitySolverSelection,
    metrics: Cube2QualityReportMetrics,
) -> Cube2QualityReportRow {
    Cube2QualityReportRow {
        puzzle_id: "cube/2x2x2",
        puzzle_slug: "cube-2x2x2",
        fixture_id: fixture.id,
        fixture_category: fixture.category,
        expectation: fixture.expectation,
        scramble: fixture.scramble,
        solver_selection,
        strategy_id: solver_selection.strategy_id(),
        max_depth: fixture.max_depth,
        max_nodes: fixture.max_nodes,
        status: metrics.status,
        solution_length: metrics.solution_length,
        explored_nodes: metrics.explored_nodes,
        elapsed: metrics.elapsed,
        replay_verified: metrics.replay_verified,
        moves: metrics.moves,
    }
}

struct Cube2QualityReportMetrics {
    status: Cube2QualityReportStatus,
    solution_length: Option<usize>,
    explored_nodes: usize,
    elapsed: Duration,
    replay_verified: Option<bool>,
    moves: Vec<Cube2Move>,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
struct Cube2QualityFixtureSpec {
    id: &'static str,
    category: Cube2QualityFixtureCategory,
    expectation: Cube2QualityExpectation,
    scramble: &'static str,
    max_depth: usize,
    max_nodes: Option<usize>,
}

impl Cube2QualityFixtureSpec {
    const fn new(
        id: &'static str,
        category: Cube2QualityFixtureCategory,
        expectation: Cube2QualityExpectation,
        scramble: &'static str,
        max_depth: usize,
        max_nodes: Option<usize>,
    ) -> Self {
        Self {
            id,
            category,
            expectation,
            scramble,
            max_depth,
            max_nodes,
        }
    }

    fn build(self) -> Result<Cube2QualityFixture, Cube2QualityReportError> {
        let algorithm = Cube2Algorithm::parse(self.scramble).map_err(|error| {
            Cube2QualityReportError::FixtureNotation {
                fixture_id: self.id,
                error,
            }
        })?;
        let mut cube = Cube2::solved();
        algorithm.apply_to(&mut cube);
        cube.state()
            .validate()
            .map_err(|error| Cube2QualityReportError::FixtureValidation {
                fixture_id: self.id,
                error,
            })?;

        Ok(Cube2QualityFixture {
            id: self.id,
            category: self.category,
            expectation: self.expectation,
            scramble: self.scramble,
            max_depth: self.max_depth,
            max_nodes: self.max_nodes,
            cube,
        })
    }
}

#[derive(Default)]
struct Cube2QualityReportSummary {
    rows: usize,
    success: usize,
    expected_not_found_within_limits: usize,
    expected_node_limit_exceeded: usize,
    unexpected_regression: usize,
    replay_verified_successes: usize,
    min_solution_len: Option<usize>,
    max_solution_len: Option<usize>,
    explored_nodes_total: usize,
}

impl Cube2QualityReportSummary {
    fn record(&mut self, row: &Cube2QualityReportRow) {
        self.rows += 1;
        match row.status {
            Cube2QualityReportStatus::Success => self.success += 1,
            Cube2QualityReportStatus::ExpectedNotFoundWithinLimits => {
                self.expected_not_found_within_limits += 1;
            }
            Cube2QualityReportStatus::ExpectedNodeLimitExceeded => {
                self.expected_node_limit_exceeded += 1;
            }
            Cube2QualityReportStatus::UnexpectedRegression => self.unexpected_regression += 1,
        }

        if row.status == Cube2QualityReportStatus::Success && row.replay_verified == Some(true) {
            self.replay_verified_successes += 1;
        }

        if let Some(solution_length) = row.solution_length {
            self.min_solution_len = Some(
                self.min_solution_len
                    .map(|current| current.min(solution_length))
                    .unwrap_or(solution_length),
            );
            self.max_solution_len = Some(
                self.max_solution_len
                    .map(|current| current.max(solution_length))
                    .unwrap_or(solution_length),
            );
        }

        self.explored_nodes_total += row.explored_nodes;
    }

    fn solution_len_range_label(&self) -> String {
        match (self.min_solution_len, self.max_solution_len) {
            (Some(min), Some(max)) => format!("{min}..={max}"),
            _ => "-".to_owned(),
        }
    }
}

fn summary_for_selection(
    rows: &[Cube2QualityReportRow],
    selection: Cube2QualitySolverSelection,
) -> Cube2QualityReportSummary {
    let mut summary = Cube2QualityReportSummary::default();
    for row in rows.iter().filter(|row| row.solver_selection == selection) {
        summary.record(row);
    }
    summary
}

fn summary_for_all(rows: &[Cube2QualityReportRow]) -> Cube2QualityReportSummary {
    let mut summary = Cube2QualityReportSummary::default();
    for row in rows {
        summary.record(row);
    }
    summary
}

fn push_summary_row(output: &mut String, label: &str, summary: &Cube2QualityReportSummary) {
    output.push_str(&format!(
        "| {} | {} | {} | {} | {} | {} | {} | {} | {} |\n",
        label,
        summary.rows,
        summary.success,
        summary.expected_not_found_within_limits,
        summary.expected_node_limit_exceeded,
        summary.unexpected_regression,
        summary.replay_verified_successes,
        summary.solution_len_range_label(),
        summary.explored_nodes_total,
    ));
}

fn scramble_label(scramble: &str) -> &str {
    if scramble.is_empty() {
        "-"
    } else {
        scramble
    }
}

fn max_nodes_label(max_nodes: Option<usize>) -> String {
    max_nodes
        .map(|value| value.to_string())
        .unwrap_or_else(|| "-".to_owned())
}

fn optional_usize_label(value: Option<usize>) -> String {
    value
        .map(|value| value.to_string())
        .unwrap_or_else(|| "-".to_owned())
}

fn replay_verified_label(value: Option<bool>) -> &'static str {
    match value {
        Some(true) => "true",
        Some(false) => "false",
        None => "-",
    }
}

fn moves_label(moves: &[Cube2Move]) -> String {
    if moves.is_empty() {
        "-".to_owned()
    } else {
        Cube2Algorithm::new(moves.to_vec()).to_string()
    }
}

#[cfg(test)]
mod tests {
    use std::collections::HashSet;

    use super::{
        cube2_invalid_notation_fixtures, cube2_quality_fixtures, run_cube2_quality_report,
        run_cube2_quality_report_for_fixtures, Cube2InvalidNotationReportStatus,
        Cube2QualityExpectation, Cube2QualityFixtureCategory, Cube2QualityReportStatus,
        Cube2QualitySolverSelection,
    };

    #[test]
    fn fixture_ids_are_unique_and_scrambles_are_valid() {
        let fixtures = cube2_quality_fixtures().expect("2x2 fixtures should build");
        let invalid_notation_fixtures = cube2_invalid_notation_fixtures();
        let mut ids = HashSet::new();

        for fixture in &fixtures {
            assert!(
                ids.insert(fixture.id),
                "duplicate fixture id {}",
                fixture.id
            );
            fixture
                .cube
                .state()
                .validate()
                .expect("quality fixture should produce a valid 2x2 state");
        }
        for fixture in &invalid_notation_fixtures {
            assert!(
                ids.insert(fixture.id),
                "duplicate fixture id {}",
                fixture.id
            );
        }

        assert!(fixtures
            .iter()
            .any(|fixture| fixture.category == Cube2QualityFixtureCategory::Representative));
    }

    #[test]
    fn report_runs_every_fixture_for_every_strategy() {
        let fixtures = cube2_quality_fixtures().expect("2x2 fixtures should build");
        let report =
            run_cube2_quality_report_for_fixtures(&fixtures).expect("2x2 report should run");

        assert_eq!(
            report.rows().len(),
            fixtures.len() * Cube2QualitySolverSelection::ALL.len()
        );
        assert!(report.invalid_notation_rows().is_empty());
        assert!(!report.has_gate_failures());
    }

    #[test]
    fn solved_fixture_returns_empty_replay_verified_solution() {
        let report = run_cube2_quality_report().expect("2x2 report should run");
        let rows = report
            .rows()
            .iter()
            .filter(|row| row.fixture_id == "cube2-solved")
            .collect::<Vec<_>>();

        assert_eq!(rows.len(), 2);
        for row in rows {
            assert_eq!(row.status, Cube2QualityReportStatus::Success);
            assert_eq!(row.solution_length, Some(0));
            assert_eq!(row.replay_verified, Some(true));
            assert!(row.moves.is_empty());
        }
    }

    #[test]
    fn shallow_and_representative_fixtures_succeed_with_replay() {
        let report = run_cube2_quality_report().expect("2x2 report should run");

        for row in report.rows().iter().filter(|row| {
            row.expectation == Cube2QualityExpectation::RequiredSuccess
                && row.fixture_id != "cube2-solved"
        }) {
            assert_eq!(row.status, Cube2QualityReportStatus::Success);
            assert_eq!(row.replay_verified, Some(true));
            assert!(row.solution_length.unwrap_or_default() > 0);
        }
    }

    #[test]
    fn expected_limit_fixtures_are_not_gate_failures() {
        let report = run_cube2_quality_report().expect("2x2 report should run");

        for row in report
            .rows()
            .iter()
            .filter(|row| row.fixture_category == Cube2QualityFixtureCategory::Limit)
        {
            match row.fixture_id {
                "cube2-expected-depth-limit" => {
                    assert_eq!(
                        row.status,
                        Cube2QualityReportStatus::ExpectedNotFoundWithinLimits
                    );
                }
                "cube2-expected-node-limit" => {
                    assert_eq!(
                        row.status,
                        Cube2QualityReportStatus::ExpectedNodeLimitExceeded
                    );
                }
                _ => panic!("unexpected limit fixture {}", row.fixture_id),
            }
            assert!(!row.status.is_gate_failure());
        }
    }

    #[test]
    fn invalid_notation_fixtures_are_rejected() {
        let report = run_cube2_quality_report().expect("2x2 report should run");
        let rows = report.invalid_notation_rows();

        assert_eq!(rows.len(), cube2_invalid_notation_fixtures().len());
        for row in rows {
            assert_eq!(row.status, Cube2InvalidNotationReportStatus::Rejected);
            assert_eq!(
                row.rejected_token.as_deref(),
                Some(row.expected_rejected_token)
            );
            assert!(!row.status.is_gate_failure());
        }
    }

    #[test]
    fn markdown_contains_summary_and_rows() {
        let report = run_cube2_quality_report().expect("2x2 report should run");
        let markdown = report.to_markdown();

        assert!(markdown.contains("# 2x2 Solver Quality Report"));
        assert!(markdown.contains("## Summary"));
        assert!(markdown.contains("## Rows"));
        assert!(markdown.contains("cube/2x2x2"));
        assert!(markdown.contains("cube2-bounded-ida-star"));
        assert!(markdown.contains("cube2-pdb-ida-star"));
        assert!(markdown.contains("cube2-representative-five-move"));
        assert!(markdown.contains("## Invalid Notation Fixtures"));
        assert!(markdown.contains("cube2-invalid-wide-move"));
        assert!(markdown.contains("rejected"));
    }
}
