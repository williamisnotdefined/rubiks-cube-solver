use std::fmt;
use std::time::{Duration, Instant};

use crate::cube::{
    Algorithm, Cube, CubeValidationError, CubieState, FaceletConversionError, FaceletParseError,
    FaceletString, Move, NotationError,
};
use crate::solver::{
    playback_facelet_solution, solve_cubie_state, solve_facelet_string, FaceletPlaybackError,
    SolveError, SolveInputError, SolverConfig, SolverStrategy,
};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum QualityFixtureCategory {
    Solved,
    Shallow,
    Harder,
}

impl QualityFixtureCategory {
    pub const fn label(self) -> &'static str {
        match self {
            Self::Solved => "solved",
            Self::Shallow => "shallow",
            Self::Harder => "harder",
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
    pub scramble: &'static str,
    pub max_depth: usize,
    pub max_nodes: Option<usize>,
    pub state: CubieState,
    pub facelets: Option<String>,
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

    pub const fn config(self, max_depth: usize, max_nodes: Option<usize>) -> SolverConfig {
        match self {
            Self::DefaultBoundedIdaStar => SolverConfig::with_limits(max_depth, max_nodes),
            Self::ExplicitTwoPhaseBaseline => {
                SolverConfig::with_strategy(max_depth, max_nodes, SolverStrategy::TwoPhaseBaseline)
            }
            Self::GeneratedTwoPhase => {
                SolverConfig::with_strategy(max_depth, max_nodes, SolverStrategy::GeneratedTwoPhase)
            }
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum QualityTableStatus {
    NotRequired,
    Available,
    Unavailable,
}

impl QualityTableStatus {
    pub const fn label(self) -> &'static str {
        match self {
            Self::NotRequired => "not_required",
            Self::Available => "available",
            Self::Unavailable => "unavailable",
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum QualityReportStatus {
    Success,
    GeneratedTablesUnavailable,
    NotFoundWithinLimits,
}

impl QualityReportStatus {
    pub const fn label(self) -> &'static str {
        match self {
            Self::Success => "success",
            Self::GeneratedTablesUnavailable => "generated_tables_unavailable",
            Self::NotFoundWithinLimits => "not_found_within_limits",
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct QualityReportRow {
    pub fixture_id: &'static str,
    pub fixture_category: QualityFixtureCategory,
    pub input_kind: QualityInputKind,
    pub scramble: &'static str,
    pub solver_selection: QualitySolverSelection,
    pub strategy: SolverStrategy,
    pub max_depth: usize,
    pub max_nodes: Option<usize>,
    pub table_status: QualityTableStatus,
    pub status: QualityReportStatus,
    pub solution_length: Option<usize>,
    pub explored_nodes: usize,
    pub elapsed: Duration,
    pub replay_verified: Option<bool>,
    pub moves: Vec<Move>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct QualityReport {
    rows: Vec<QualityReportRow>,
}

impl QualityReport {
    pub fn new(rows: Vec<QualityReportRow>) -> Self {
        Self { rows }
    }

    pub fn rows(&self) -> &[QualityReportRow] {
        &self.rows
    }

    pub fn to_markdown(&self) -> String {
        let mut output = String::from(
            "# Deterministic Solver Quality Report\n\n\
Fixtures, solver selections, table availability, and limits are fixed. Elapsed time is local measurement output; use it as a rough local signal, not as a deterministic value. Compare fixture order, solver selection, table status, configured limits, status, solution length, explored nodes, and replay verification for regressions. This report does not claim optimality or a 20-move guarantee.\n\n\
| fixture | group | input | scramble | selection | strategy | max_depth | max_nodes | table_status | status | solution_len | explored_nodes | elapsed_us | replay_verified | solution |\n\
| --- | --- | --- | --- | --- | --- | ---: | ---: | --- | --- | ---: | ---: | ---: | --- | --- |\n",
        );

        for row in &self.rows {
            output.push_str(&format!(
                "| {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} |\n",
                row.fixture_id,
                row.fixture_category.label(),
                row.input_kind.label(),
                scramble_label(row.scramble),
                row.solver_selection.label(),
                strategy_label(row.strategy),
                row.max_depth,
                max_nodes_label(row.max_nodes),
                row.table_status.label(),
                row.status.label(),
                optional_usize_label(row.solution_length),
                row.explored_nodes,
                row.elapsed.as_micros(),
                replay_verified_label(row.replay_verified),
                moves_label(&row.moves),
            ));
        }

        output
    }
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
            "",
            0,
            Some(1_000),
        ),
        QualityFixtureSpec::new(
            "solved-cubie",
            QualityFixtureCategory::Solved,
            QualityInputKind::Cubie,
            "",
            0,
            Some(1_000),
        ),
        QualityFixtureSpec::new(
            "shallow-facelets-f",
            QualityFixtureCategory::Shallow,
            QualityInputKind::Facelet,
            "F",
            1,
            Some(10_000),
        ),
        QualityFixtureSpec::new(
            "shallow-cubie-r-u",
            QualityFixtureCategory::Shallow,
            QualityInputKind::Cubie,
            "R U",
            2,
            Some(10_000),
        ),
        QualityFixtureSpec::new(
            "harder-facelets-six-move",
            QualityFixtureCategory::Harder,
            QualityInputKind::Facelet,
            "F R U R' U' F'",
            2,
            Some(50_000),
        ),
        QualityFixtureSpec::new(
            "harder-cubie-nine-move",
            QualityFixtureCategory::Harder,
            QualityInputKind::Cubie,
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

pub fn run_quality_report_for_fixtures(
    fixtures: &[QualityFixture],
) -> Result<QualityReport, QualityReportError> {
    let mut rows = Vec::with_capacity(fixtures.len() * QualitySolverSelection::ALL.len());

    for fixture in fixtures {
        for solver_selection in QualitySolverSelection::ALL {
            rows.push(run_quality_row(fixture, solver_selection)?);
        }
    }

    Ok(QualityReport::new(rows))
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
struct QualityFixtureSpec {
    id: &'static str,
    category: QualityFixtureCategory,
    input_kind: QualityInputKind,
    scramble: &'static str,
    max_depth: usize,
    max_nodes: Option<usize>,
}

impl QualityFixtureSpec {
    const fn new(
        id: &'static str,
        category: QualityFixtureCategory,
        input_kind: QualityInputKind,
        scramble: &'static str,
        max_depth: usize,
        max_nodes: Option<usize>,
    ) -> Self {
        Self {
            id,
            category,
            input_kind,
            scramble,
            max_depth,
            max_nodes,
        }
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

        let facelets = match self.input_kind {
            QualityInputKind::Facelet => Some(validated_facelets(self.id, &cube, &state)?),
            QualityInputKind::Cubie => None,
        };

        Ok(QualityFixture {
            id: self.id,
            category: self.category,
            input_kind: self.input_kind,
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

fn run_quality_row(
    fixture: &QualityFixture,
    solver_selection: QualitySolverSelection,
) -> Result<QualityReportRow, QualityReportError> {
    let config = solver_selection.config(fixture.max_depth, fixture.max_nodes);
    let started = Instant::now();
    let result = match fixture.input_kind {
        QualityInputKind::Facelet => solve_facelet_string(
            fixture
                .facelets
                .as_deref()
                .expect("facelet fixtures must store rendered facelets"),
            config.clone(),
        ),
        QualityInputKind::Cubie => solve_cubie_state(fixture.state.clone(), config.clone()),
    };
    let elapsed = started.elapsed();

    match result {
        Ok(result) => {
            let replay_verified = replay_verifies(fixture, solver_selection, result.moves())?;
            if !replay_verified {
                return Err(QualityReportError::UnverifiedSuccess {
                    fixture_id: fixture.id,
                    solver_selection,
                });
            }

            Ok(QualityReportRow {
                fixture_id: fixture.id,
                fixture_category: fixture.category,
                input_kind: fixture.input_kind,
                scramble: fixture.scramble,
                solver_selection,
                strategy: config.strategy,
                max_depth: config.max_depth,
                max_nodes: config.max_nodes,
                table_status: table_status_for_success(config.strategy),
                status: QualityReportStatus::Success,
                solution_length: Some(result.length()),
                explored_nodes: result.explored_nodes(),
                elapsed,
                replay_verified: Some(true),
                moves: result.moves,
            })
        }
        Err(SolveError::NotFoundWithinLimits { explored_nodes, .. }) => Ok(QualityReportRow {
            fixture_id: fixture.id,
            fixture_category: fixture.category,
            input_kind: fixture.input_kind,
            scramble: fixture.scramble,
            solver_selection,
            strategy: config.strategy,
            max_depth: config.max_depth,
            max_nodes: config.max_nodes,
            table_status: table_status_for_success(config.strategy),
            status: QualityReportStatus::NotFoundWithinLimits,
            solution_length: None,
            explored_nodes,
            elapsed,
            replay_verified: None,
            moves: Vec::new(),
        }),
        Err(SolveError::GeneratedTablesUnavailable { .. }) => Ok(QualityReportRow {
            fixture_id: fixture.id,
            fixture_category: fixture.category,
            input_kind: fixture.input_kind,
            scramble: fixture.scramble,
            solver_selection,
            strategy: config.strategy,
            max_depth: config.max_depth,
            max_nodes: config.max_nodes,
            table_status: QualityTableStatus::Unavailable,
            status: QualityReportStatus::GeneratedTablesUnavailable,
            solution_length: None,
            explored_nodes: 0,
            elapsed,
            replay_verified: None,
            moves: Vec::new(),
        }),
        Err(SolveError::InvalidInput { error }) => {
            Err(QualityReportError::UnexpectedInvalidInput {
                fixture_id: fixture.id,
                solver_selection,
                error: Box::new(error),
            })
        }
    }
}

fn replay_verifies(
    fixture: &QualityFixture,
    solver_selection: QualitySolverSelection,
    moves: &[Move],
) -> Result<bool, QualityReportError> {
    match fixture.input_kind {
        QualityInputKind::Facelet => Ok(playback_facelet_solution(
            fixture
                .facelets
                .as_deref()
                .expect("facelet fixtures must store rendered facelets"),
            &Algorithm::new(moves.to_vec()).to_string(),
        )
        .map_err(|error| QualityReportError::ReplayFailure {
            fixture_id: fixture.id,
            solver_selection,
            error: Box::new(error),
        })?
        .final_is_solved()),
        QualityInputKind::Cubie => {
            let mut cube = Cube::try_from_state(fixture.state.clone()).map_err(|error| {
                QualityReportError::FixtureCubieValidation {
                    fixture_id: fixture.id,
                    error,
                }
            })?;
            cube.apply_moves(moves);

            Ok(cube.is_solved())
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

fn optional_usize_label(value: Option<usize>) -> String {
    value.map_or_else(|| "-".to_owned(), |value| value.to_string())
}

fn replay_verified_label(value: Option<bool>) -> &'static str {
    match value {
        Some(true) => "yes",
        Some(false) => "no",
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
