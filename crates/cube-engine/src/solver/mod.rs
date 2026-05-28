use std::fmt;
use std::path::{Path, PathBuf};

use crate::cube::{
    Algorithm, Cube, CubeValidationError, CubieState, FaceletConversionError, FaceletParseError,
    FaceletString, Move, NotationError,
};
use crate::search::pruning::DEFAULT_PRUNING_TABLE_DIR;
use crate::search::{
    solve_generated_two_phase, solve_generated_two_phase_quality,
    solve_generated_two_phase_with_artifacts, solve_ida_star_bounded,
    solve_ida_star_bounded_with_heuristic, solve_optimal_bounded_corner_pdb_quality,
    solve_two_phase_baseline, GeneratedPruningTableArtifact, GeneratedTwoPhaseError,
    OrientationPatternDatabaseHeuristic, SearchBudget, SearchOutcome,
};

pub mod benchmark;
pub mod quality;

/// Stable metadata for solver strategies exposed across the Rust/WASM boundary.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct SolverStrategyMetadata {
    pub id: &'static str,
    pub label: &'static str,
    pub solver_mode: &'static str,
    pub status_text: &'static str,
}

/// Explicit solver selection for public solver entry points.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum SolverStrategy {
    /// Existing bounded deterministic IDA* path used by product defaults.
    BoundedIdaStar,
    /// Limited two-phase baseline backed only by tiny committed fixtures.
    ///
    /// This is not a full generated-table solver and does not claim optimality or a 20-move bound.
    TwoPhaseBaseline,
    /// Generated classical two-phase path backed by local pruning-table artifacts.
    ///
    /// This path is selectable but still reports honest failures when tables or configured limits
    /// are unavailable. It does not claim optimality or a 20-move guarantee.
    GeneratedTwoPhase,
    /// Generated two-phase path that searches shorter total solution depths first.
    ///
    /// This is quality-oriented and can be slower than the standard generated strategy. It still
    /// reports honest failures when tables or configured limits are unavailable.
    GeneratedTwoPhaseQuality,
    /// Optimal IDA* path using an admissible orientation pattern database heuristic.
    ///
    /// This is a correctness-oriented baseline. It can prove optimality within a configured search
    /// budget, but it is not expected to solve arbitrary hard states quickly yet.
    OptimalIdaStarOrientationPdb,
    /// IDA* bounded by an admissible corner pattern database before falling back to quality two-phase.
    ///
    /// The PDB artifact is server-side and optional. When it is missing, this strategy preserves the
    /// generated two-phase quality fallback instead of reporting false short-solution guarantees.
    OptimalBoundedCornerPdb,
}

impl SolverStrategy {
    pub const ALL: [Self; 6] = [
        Self::BoundedIdaStar,
        Self::TwoPhaseBaseline,
        Self::GeneratedTwoPhase,
        Self::GeneratedTwoPhaseQuality,
        Self::OptimalIdaStarOrientationPdb,
        Self::OptimalBoundedCornerPdb,
    ];

    pub const fn metadata(self) -> SolverStrategyMetadata {
        SolverStrategyMetadata {
            id: self.id(),
            label: self.label(),
            solver_mode: self.solver_mode(),
            status_text: self.status_text(),
        }
    }

    pub const fn id(self) -> &'static str {
        match self {
            Self::BoundedIdaStar => "bounded-ida-star",
            Self::TwoPhaseBaseline => "two-phase-baseline",
            Self::GeneratedTwoPhase => "generated-two-phase",
            Self::GeneratedTwoPhaseQuality => "generated-two-phase-quality",
            Self::OptimalIdaStarOrientationPdb => "optimal-ida-star-orientation-pdb",
            Self::OptimalBoundedCornerPdb => "optimal-bounded-corner-pdb",
        }
    }

    pub const fn label(self) -> &'static str {
        match self {
            Self::BoundedIdaStar => "Bounded IDA*",
            Self::TwoPhaseBaseline => "Limited two-phase baseline",
            Self::GeneratedTwoPhase => "Generated two-phase solver",
            Self::GeneratedTwoPhaseQuality => "Generated two-phase quality solver",
            Self::OptimalIdaStarOrientationPdb => "Optimal IDA* orientation PDB",
            Self::OptimalBoundedCornerPdb => "Optimal bounded corner PDB",
        }
    }

    pub const fn solver_mode(self) -> &'static str {
        match self {
            Self::BoundedIdaStar => "bounded_ida_star",
            Self::TwoPhaseBaseline => "limited_two_phase_baseline",
            Self::GeneratedTwoPhase => "generated_two_phase",
            Self::GeneratedTwoPhaseQuality => "generated_two_phase_quality",
            Self::OptimalIdaStarOrientationPdb => "optimal_ida_star_orientation_pdb",
            Self::OptimalBoundedCornerPdb => "optimal_bounded_corner_pdb",
        }
    }

    pub const fn status_text(self) -> &'static str {
        match self {
            Self::BoundedIdaStar => {
                "Default product fallback. Searches within the visible limits and verifies any returned solution in Rust."
            }
            Self::TwoPhaseBaseline => {
                "Fixture-backed baseline. It covers tiny committed fixtures, so unsupported states report honest limit failures."
            }
            Self::GeneratedTwoPhase => {
                "Generated-table solver. Selectable when local pruning tables exist; otherwise reports generated tables unavailable or corrupt."
            }
            Self::GeneratedTwoPhaseQuality => {
                "Quality generated-table solver. Searches shorter total depths first before falling back to the configured max depth; requires local pruning tables."
            }
            Self::OptimalIdaStarOrientationPdb => {
                "Optimal IDA* baseline with admissible orientation pattern databases. Useful for proof-oriented shallow searches; hard states still need larger PDBs."
            }
            Self::OptimalBoundedCornerPdb => {
                "Quality path that tries admissible corner-PDB IDA* at short limits, then falls back to generated two-phase quality when the PDB is missing or the short proof budget is exhausted."
            }
        }
    }

    pub fn from_id(id: &str) -> Option<Self> {
        match id {
            "bounded-ida-star" => Some(Self::BoundedIdaStar),
            "two-phase-baseline" => Some(Self::TwoPhaseBaseline),
            "generated-two-phase" => Some(Self::GeneratedTwoPhase),
            "generated-two-phase-quality" => Some(Self::GeneratedTwoPhaseQuality),
            "optimal-ida-star-orientation-pdb" => Some(Self::OptimalIdaStarOrientationPdb),
            "optimal-bounded-corner-pdb" => Some(Self::OptimalBoundedCornerPdb),
            _ => None,
        }
    }

    pub fn supported_strategy_ids() -> String {
        Self::ALL
            .iter()
            .map(|strategy| strategy.id())
            .collect::<Vec<_>>()
            .join(", ")
    }

    pub fn unsupported_strategy_message(requested_strategy: &str) -> String {
        let displayed_strategy = if requested_strategy.is_empty() {
            "<empty>"
        } else {
            requested_strategy
        };

        format!(
            "Unsupported solver strategy \"{displayed_strategy}\". Supported strategies: {}.",
            Self::supported_strategy_ids()
        )
    }
}

/// Configuration shared by public solver entry points.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SolverConfig {
    /// Maximum solution depth a solver may explore before reporting a limit failure.
    pub max_depth: usize,
    /// Optional maximum node budget.
    ///
    /// Public solver entry points pass this through to the bounded search budget.
    pub max_nodes: Option<usize>,
    /// Explicit solver path. Constructors default to the bounded product solver.
    pub strategy: SolverStrategy,
    /// Optional directory containing generated pruning-table artifacts.
    ///
    /// When this is `None`, the generated two-phase strategy uses the local ignored default path.
    pub pruning_table_dir: Option<PathBuf>,
}

impl SolverConfig {
    pub const fn new(max_depth: usize) -> Self {
        Self {
            max_depth,
            max_nodes: None,
            strategy: SolverStrategy::BoundedIdaStar,
            pruning_table_dir: None,
        }
    }

    pub const fn with_limits(max_depth: usize, max_nodes: Option<usize>) -> Self {
        Self {
            max_depth,
            max_nodes,
            strategy: SolverStrategy::BoundedIdaStar,
            pruning_table_dir: None,
        }
    }

    pub const fn with_strategy(
        max_depth: usize,
        max_nodes: Option<usize>,
        strategy: SolverStrategy,
    ) -> Self {
        Self {
            max_depth,
            max_nodes,
            strategy,
            pruning_table_dir: None,
        }
    }

    pub fn with_pruning_table_dir(mut self, directory: impl Into<PathBuf>) -> Self {
        self.pruning_table_dir = Some(directory.into());

        self
    }

    pub fn pruning_table_dir(&self) -> &Path {
        self.pruning_table_dir
            .as_deref()
            .unwrap_or_else(|| Path::new(DEFAULT_PRUNING_TABLE_DIR))
    }
}

/// Search metrics reported with public solver results and failures.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct SolveMetrics {
    pub explored_nodes: usize,
}

impl SolveMetrics {
    pub const fn new(explored_nodes: usize) -> Self {
        Self { explored_nodes }
    }
}

/// Successful solver output independent of the search algorithm that produced it.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SolveResult {
    pub moves: Vec<Move>,
    pub metrics: SolveMetrics,
}

impl SolveResult {
    pub fn new(moves: Vec<Move>) -> Self {
        Self::with_metrics(moves, SolveMetrics::new(0))
    }

    pub fn with_metrics(moves: Vec<Move>, metrics: SolveMetrics) -> Self {
        Self { moves, metrics }
    }

    pub fn moves(&self) -> &[Move] {
        &self.moves
    }

    pub fn length(&self) -> usize {
        self.moves.len()
    }

    pub fn len(&self) -> usize {
        self.length()
    }

    pub fn is_empty(&self) -> bool {
        self.moves.is_empty()
    }

    pub fn metrics(&self) -> &SolveMetrics {
        &self.metrics
    }

    pub fn explored_nodes(&self) -> usize {
        self.metrics.explored_nodes
    }
}

/// Rendered cube states produced by replaying notation from a starting facelet state.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FaceletPlaybackResult {
    pub states: Vec<String>,
    pub final_is_solved: bool,
}

impl FaceletPlaybackResult {
    pub fn new(states: Vec<String>, final_is_solved: bool) -> Self {
        Self {
            states,
            final_is_solved,
        }
    }

    pub fn states(&self) -> &[String] {
        &self.states
    }

    pub fn final_is_solved(&self) -> bool {
        self.final_is_solved
    }
}

/// Playback failures preserve the structured parser and validation errors underneath.
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum FaceletPlaybackError {
    CubieValidation { error: CubeValidationError },
    FaceletParse { error: FaceletParseError },
    FaceletConversion { error: FaceletConversionError },
    Notation { error: NotationError },
}

impl fmt::Display for FaceletPlaybackError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::CubieValidation { error } => write!(formatter, "invalid cubie state: {error}"),
            Self::FaceletParse { error } => write!(formatter, "invalid facelet input: {error}"),
            Self::FaceletConversion { error } => {
                write!(formatter, "facelet conversion failed: {error}")
            }
            Self::Notation { error } => write!(formatter, "invalid move notation: {error}"),
        }
    }
}

impl std::error::Error for FaceletPlaybackError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::CubieValidation { error } => Some(error),
            Self::FaceletParse { error } => Some(error),
            Self::FaceletConversion { error } => Some(error),
            Self::Notation { error } => Some(error),
        }
    }
}

impl From<CubeValidationError> for FaceletPlaybackError {
    fn from(error: CubeValidationError) -> Self {
        Self::CubieValidation { error }
    }
}

impl From<FaceletParseError> for FaceletPlaybackError {
    fn from(error: FaceletParseError) -> Self {
        Self::FaceletParse { error }
    }
}

impl From<FaceletConversionError> for FaceletPlaybackError {
    fn from(error: FaceletConversionError) -> Self {
        Self::FaceletConversion { error }
    }
}

impl From<NotationError> for FaceletPlaybackError {
    fn from(error: NotationError) -> Self {
        Self::Notation { error }
    }
}

/// Input failures that must remain distinct from search-limit failures.
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum SolveInputError {
    CubieValidation { error: CubeValidationError },
    FaceletParse { error: FaceletParseError },
    FaceletConversion { error: FaceletConversionError },
}

impl fmt::Display for SolveInputError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::CubieValidation { error } => write!(formatter, "invalid cubie state: {error}"),
            Self::FaceletParse { error } => write!(formatter, "invalid facelet input: {error}"),
            Self::FaceletConversion { error } => {
                write!(formatter, "facelet conversion failed: {error}")
            }
        }
    }
}

impl std::error::Error for SolveInputError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::CubieValidation { error } => Some(error),
            Self::FaceletParse { error } => Some(error),
            Self::FaceletConversion { error } => Some(error),
        }
    }
}

impl From<CubeValidationError> for SolveInputError {
    fn from(error: CubeValidationError) -> Self {
        Self::CubieValidation { error }
    }
}

impl From<FaceletParseError> for SolveInputError {
    fn from(error: FaceletParseError) -> Self {
        Self::FaceletParse { error }
    }
}

impl From<FaceletConversionError> for SolveInputError {
    fn from(error: FaceletConversionError) -> Self {
        Self::FaceletConversion { error }
    }
}

/// Public solver failure that separates invalid inputs from exhausted search limits.
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum SolveError {
    InvalidInput {
        error: SolveInputError,
    },
    GeneratedTablesUnavailable {
        config: SolverConfig,
        error: Box<GeneratedTwoPhaseError>,
    },
    GeneratedTablesCorrupt {
        config: SolverConfig,
        error: Box<GeneratedTwoPhaseError>,
    },
    NotFoundWithinLimits {
        config: SolverConfig,
        explored_nodes: usize,
    },
}

impl fmt::Display for SolveError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidInput { error } => write!(formatter, "invalid solver input: {error}"),
            Self::GeneratedTablesUnavailable { config, error } => write!(
                formatter,
                "generated two-phase pruning tables are unavailable for strategy {}: {error}",
                config.strategy.id()
            ),
            Self::GeneratedTablesCorrupt { config, error } => write!(
                formatter,
                "generated two-phase pruning tables are corrupt or incompatible for strategy {}: {error}",
                config.strategy.id()
            ),
            Self::NotFoundWithinLimits {
                config,
                explored_nodes,
            } => match config.max_nodes {
                Some(max_nodes) => write!(
                    formatter,
                    "no solution found within limits: max_depth={}, max_nodes={}, explored_nodes={}",
                    config.max_depth, max_nodes, explored_nodes
                ),
                None => write!(
                    formatter,
                    "no solution found within limits: max_depth={}, max_nodes=unlimited, explored_nodes={}",
                    config.max_depth, explored_nodes
                ),
            },
        }
    }
}

impl std::error::Error for SolveError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::InvalidInput { error } => Some(error),
            Self::GeneratedTablesUnavailable { error, .. }
            | Self::GeneratedTablesCorrupt { error, .. } => Some(error.as_ref()),
            Self::NotFoundWithinLimits { .. } => None,
        }
    }
}

impl From<SolveInputError> for SolveError {
    fn from(error: SolveInputError) -> Self {
        Self::InvalidInput { error }
    }
}

/// Solve a validated cubie state through the configured deterministic search path.
pub fn solve_cubie_state(
    state: CubieState,
    config: SolverConfig,
) -> Result<SolveResult, SolveError> {
    state.validate().map_err(SolveInputError::from)?;

    let cube = Cube::try_from_state(state).map_err(SolveInputError::from)?;
    solve_cube(&cube, config)
}

/// Validate a user-facing 54-character facelet string without running search.
pub fn validate_facelet_string(input: &str) -> Result<(), SolveInputError> {
    let state = validated_facelet_state(input)?;

    state.validate().map_err(SolveInputError::from)
}

/// Solve a user-facing 54-character facelet string through the cubie solver path.
pub fn solve_facelet_string(input: &str, config: SolverConfig) -> Result<SolveResult, SolveError> {
    let state = validated_facelet_state(input)?;

    solve_cubie_state(state, config)
}

/// Solve a user-facing facelet string with browser-provided generated pruning artifacts.
pub fn solve_facelet_string_with_generated_pruning_tables(
    input: &str,
    max_depth: usize,
    max_nodes: Option<usize>,
    artifacts: &[GeneratedPruningTableArtifact<'_>],
) -> Result<SolveResult, SolveError> {
    let state = validated_facelet_state(input)?;

    solve_cubie_state_with_generated_pruning_tables(state, max_depth, max_nodes, artifacts)
}

/// Solve a validated cubie state with browser-provided generated pruning artifacts.
pub fn solve_cubie_state_with_generated_pruning_tables(
    state: CubieState,
    max_depth: usize,
    max_nodes: Option<usize>,
    artifacts: &[GeneratedPruningTableArtifact<'_>],
) -> Result<SolveResult, SolveError> {
    state.validate().map_err(SolveInputError::from)?;

    let cube = Cube::try_from_state(state).map_err(SolveInputError::from)?;
    solve_cube_with_generated_pruning_tables(&cube, max_depth, max_nodes, artifacts)
}

fn validated_facelet_state(input: &str) -> Result<CubieState, SolveInputError> {
    let facelets = FaceletString::parse(input).map_err(SolveInputError::from)?;

    facelets.to_cubie_state().map_err(SolveInputError::from)
}

/// Replay notation from a user-facing facelet string and render every engine state.
pub fn playback_facelet_solution(
    start_facelets: &str,
    moves: &str,
) -> Result<FaceletPlaybackResult, FaceletPlaybackError> {
    let facelets = FaceletString::parse(start_facelets)?;
    let state = facelets.to_cubie_state()?;
    let mut cube = Cube::try_from_state(state)?;
    let algorithm = Algorithm::parse(moves)?;
    let mut states = Vec::with_capacity(algorithm.len() + 1);

    states.push(FaceletString::from_cube(&cube).to_string());

    for move_ in algorithm.moves() {
        cube.apply_move(*move_);
        states.push(FaceletString::from_cube(&cube).to_string());
    }

    Ok(FaceletPlaybackResult::new(states, cube.is_solved()))
}

/// Solve a cube through the configured deterministic search path.
pub fn solve_cube(cube: &Cube, config: SolverConfig) -> Result<SolveResult, SolveError> {
    cube.state().validate().map_err(SolveInputError::from)?;

    let budget = SearchBudget::with_limits(config.max_depth, config.max_nodes);
    let outcome = match config.strategy {
        SolverStrategy::BoundedIdaStar => solve_ida_star_bounded(cube, budget),
        SolverStrategy::OptimalIdaStarOrientationPdb => solve_ida_star_bounded_with_heuristic(
            cube,
            budget,
            &OrientationPatternDatabaseHeuristic,
        ),
        SolverStrategy::TwoPhaseBaseline => solve_two_phase_baseline(cube, budget),
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
        SolverStrategy::OptimalBoundedCornerPdb => {
            match solve_optimal_bounded_corner_pdb_quality(cube, budget, config.pruning_table_dir())
            {
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

fn solve_search_outcome(
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

#[cfg(test)]
mod tests {
    use super::{
        playback_facelet_solution, solve_cube, solve_cubie_state, solve_facelet_string,
        solve_search_outcome, validate_facelet_string, FaceletPlaybackError, SolveError,
        SolveInputError, SolveMetrics, SolveResult, SolverConfig, SolverStrategy,
    };
    use crate::cube::cubies::{Corner, Edge};
    use crate::cube::facelets::FACELET_COUNT;
    use crate::cube::{
        Cube, CubeValidationError, CubieState, Facelet, FaceletConversionError, FaceletParseError,
        FaceletString, Move, CENTER_FACELET_POSITIONS, EDGE_FACELET_MAPPINGS,
    };
    use crate::search::{SearchOutcome, SearchSolution};

    const SOLVED_FACELET_STRING: &str = "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB";

    #[test]
    fn solver_config_stores_depth_and_node_limit() {
        let config = SolverConfig::with_limits(20, Some(1_000));

        assert_eq!(config.max_depth, 20);
        assert_eq!(config.max_nodes, Some(1_000));
        assert_eq!(config.strategy, SolverStrategy::BoundedIdaStar);

        let unlimited_nodes = SolverConfig::new(20);
        assert_eq!(unlimited_nodes.max_depth, 20);
        assert_eq!(unlimited_nodes.max_nodes, None);
        assert_eq!(unlimited_nodes.strategy, SolverStrategy::BoundedIdaStar);

        let two_phase = SolverConfig::with_strategy(1, Some(2), SolverStrategy::TwoPhaseBaseline);
        assert_eq!(two_phase.max_depth, 1);
        assert_eq!(two_phase.max_nodes, Some(2));
        assert_eq!(two_phase.strategy, SolverStrategy::TwoPhaseBaseline);
        assert_eq!(two_phase.pruning_table_dir, None);

        let generated =
            SolverConfig::with_strategy(2, Some(100), SolverStrategy::GeneratedTwoPhase)
                .with_pruning_table_dir("tmp/generated-pruning-tables");
        assert_eq!(generated.strategy, SolverStrategy::GeneratedTwoPhase);
        assert_eq!(
            generated.pruning_table_dir().to_string_lossy(),
            "tmp/generated-pruning-tables"
        );

        let quality = SolverConfig::with_strategy(
            20,
            Some(1_000_000),
            SolverStrategy::GeneratedTwoPhaseQuality,
        )
        .with_pruning_table_dir("tmp/generated-pruning-tables");
        assert_eq!(quality.strategy, SolverStrategy::GeneratedTwoPhaseQuality);
        assert_eq!(
            quality.pruning_table_dir().to_string_lossy(),
            "tmp/generated-pruning-tables"
        );

        let corner_pdb = SolverConfig::with_strategy(
            20,
            Some(1_000_000),
            SolverStrategy::OptimalBoundedCornerPdb,
        )
        .with_pruning_table_dir("tmp/generated-pruning-tables");
        assert_eq!(corner_pdb.strategy, SolverStrategy::OptimalBoundedCornerPdb);
        assert_eq!(
            corner_pdb.pruning_table_dir().to_string_lossy(),
            "tmp/generated-pruning-tables"
        );
    }

    #[test]
    fn solver_strategy_exposes_stable_boundary_metadata() {
        assert_eq!(
            SolverStrategy::ALL,
            [
                SolverStrategy::BoundedIdaStar,
                SolverStrategy::TwoPhaseBaseline,
                SolverStrategy::GeneratedTwoPhase,
                SolverStrategy::GeneratedTwoPhaseQuality,
                SolverStrategy::OptimalIdaStarOrientationPdb,
                SolverStrategy::OptimalBoundedCornerPdb,
            ]
        );

        assert_eq!(SolverStrategy::BoundedIdaStar.id(), "bounded-ida-star");
        assert_eq!(SolverStrategy::BoundedIdaStar.label(), "Bounded IDA*");
        assert_eq!(
            SolverStrategy::BoundedIdaStar.solver_mode(),
            "bounded_ida_star"
        );
        assert!(SolverStrategy::BoundedIdaStar
            .status_text()
            .contains("Default product fallback"));
        assert_eq!(
            SolverStrategy::from_id("bounded-ida-star"),
            Some(SolverStrategy::BoundedIdaStar)
        );

        assert_eq!(SolverStrategy::TwoPhaseBaseline.id(), "two-phase-baseline");
        assert_eq!(
            SolverStrategy::TwoPhaseBaseline.label(),
            "Limited two-phase baseline"
        );
        assert_eq!(
            SolverStrategy::TwoPhaseBaseline.solver_mode(),
            "limited_two_phase_baseline"
        );
        assert!(SolverStrategy::TwoPhaseBaseline
            .status_text()
            .contains("Fixture-backed baseline"));
        assert_eq!(
            SolverStrategy::from_id("two-phase-baseline"),
            Some(SolverStrategy::TwoPhaseBaseline)
        );
        assert_eq!(
            SolverStrategy::GeneratedTwoPhase.id(),
            "generated-two-phase"
        );
        assert_eq!(
            SolverStrategy::GeneratedTwoPhase.label(),
            "Generated two-phase solver"
        );
        assert_eq!(
            SolverStrategy::GeneratedTwoPhase.solver_mode(),
            "generated_two_phase"
        );
        assert!(SolverStrategy::GeneratedTwoPhase
            .status_text()
            .contains("Generated-table solver"));
        assert_eq!(
            SolverStrategy::from_id("generated-two-phase"),
            Some(SolverStrategy::GeneratedTwoPhase)
        );
        assert_eq!(
            SolverStrategy::GeneratedTwoPhaseQuality.id(),
            "generated-two-phase-quality"
        );
        assert_eq!(
            SolverStrategy::GeneratedTwoPhaseQuality.label(),
            "Generated two-phase quality solver"
        );
        assert_eq!(
            SolverStrategy::GeneratedTwoPhaseQuality.solver_mode(),
            "generated_two_phase_quality"
        );
        assert!(SolverStrategy::GeneratedTwoPhaseQuality
            .status_text()
            .contains("shorter total depths"));
        assert_eq!(
            SolverStrategy::from_id("generated-two-phase-quality"),
            Some(SolverStrategy::GeneratedTwoPhaseQuality)
        );
        assert_eq!(
            SolverStrategy::OptimalIdaStarOrientationPdb.id(),
            "optimal-ida-star-orientation-pdb"
        );
        assert_eq!(
            SolverStrategy::OptimalIdaStarOrientationPdb.label(),
            "Optimal IDA* orientation PDB"
        );
        assert_eq!(
            SolverStrategy::OptimalIdaStarOrientationPdb.solver_mode(),
            "optimal_ida_star_orientation_pdb"
        );
        assert!(SolverStrategy::OptimalIdaStarOrientationPdb
            .status_text()
            .contains("admissible orientation pattern databases"));
        assert_eq!(
            SolverStrategy::from_id("optimal-ida-star-orientation-pdb"),
            Some(SolverStrategy::OptimalIdaStarOrientationPdb)
        );
        assert_eq!(
            SolverStrategy::OptimalBoundedCornerPdb.id(),
            "optimal-bounded-corner-pdb"
        );
        assert_eq!(
            SolverStrategy::OptimalBoundedCornerPdb.label(),
            "Optimal bounded corner PDB"
        );
        assert_eq!(
            SolverStrategy::OptimalBoundedCornerPdb.solver_mode(),
            "optimal_bounded_corner_pdb"
        );
        assert!(SolverStrategy::OptimalBoundedCornerPdb
            .status_text()
            .contains("corner-PDB IDA*"));
        assert_eq!(
            SolverStrategy::from_id("optimal-bounded-corner-pdb"),
            Some(SolverStrategy::OptimalBoundedCornerPdb)
        );
        assert_eq!(SolverStrategy::from_id("unknown"), None);

        let metadata = SolverStrategy::GeneratedTwoPhase.metadata();
        assert_eq!(metadata.id, "generated-two-phase");
        assert_eq!(metadata.label, "Generated two-phase solver");
        assert_eq!(metadata.solver_mode, "generated_two_phase");
        assert_eq!(
            metadata.status_text,
            SolverStrategy::GeneratedTwoPhase.status_text()
        );
    }

    #[test]
    fn solver_strategy_supported_message_lists_all_strategy_ids() {
        assert_eq!(
            SolverStrategy::supported_strategy_ids(),
            "bounded-ida-star, two-phase-baseline, generated-two-phase, generated-two-phase-quality, optimal-ida-star-orientation-pdb, optimal-bounded-corner-pdb"
        );

        let message = SolverStrategy::unsupported_strategy_message("made-up");
        assert!(message.contains("made-up"));
        assert!(message.contains("bounded-ida-star"));
        assert!(message.contains("two-phase-baseline"));
        assert!(message.contains("generated-two-phase"));
        assert!(message.contains("generated-two-phase-quality"));
        assert!(message.contains("optimal-ida-star-orientation-pdb"));
        assert!(message.contains("optimal-bounded-corner-pdb"));

        assert!(SolverStrategy::unsupported_strategy_message("").contains("<empty>"));
    }

    #[test]
    fn solve_result_reports_moves_length_and_explored_nodes() {
        let moves = vec![Move::R, Move::UPrime];
        let result = SolveResult::with_metrics(moves, SolveMetrics::new(42));

        assert_eq!(result.moves(), &[Move::R, Move::UPrime]);
        assert_eq!(result.length(), 2);
        assert_eq!(result.len(), 2);
        assert_eq!(result.explored_nodes(), 42);
        assert_eq!(result.metrics().explored_nodes, 42);
    }

    #[test]
    fn empty_solve_result_reports_zero_length() {
        let result = SolveResult::new(Vec::new());

        assert_eq!(result.length(), 0);
        assert_eq!(result.len(), 0);
        assert!(result.is_empty());
        assert_eq!(result.explored_nodes(), 0);
    }

    #[test]
    fn solve_error_distinguishes_invalid_input_from_not_found() {
        let invalid = SolveError::InvalidInput {
            error: SolveInputError::CubieValidation {
                error: CubeValidationError::InvalidCornerOrientationSum { sum: 1 },
            },
        };
        let not_found = SolveError::NotFoundWithinLimits {
            config: SolverConfig::with_limits(1, Some(10)),
            explored_nodes: 10,
        };

        assert_ne!(invalid, not_found);
        assert!(matches!(invalid, SolveError::InvalidInput { .. }));
        assert!(matches!(not_found, SolveError::NotFoundWithinLimits { .. }));
    }

    #[test]
    fn root_exports_construct_solver_types() {
        let config = crate::SolverConfig::with_limits(3, Some(100));
        let selected_config = crate::SolverConfig::with_strategy(
            3,
            Some(100),
            crate::SolverStrategy::TwoPhaseBaseline,
        );
        let metrics = crate::SolveMetrics::new(2);
        let result = crate::SolveResult::with_metrics(vec![crate::Move::R], metrics);
        let not_found = crate::SolveError::NotFoundWithinLimits {
            config,
            explored_nodes: result.explored_nodes(),
        };
        let invalid = crate::SolveError::InvalidInput {
            error: crate::SolveInputError::CubieValidation {
                error: crate::CubeValidationError::InvalidCornerOrientationSum { sum: 1 },
            },
        };
        let playback: crate::FaceletPlaybackResult =
            crate::playback_facelet_solution(SOLVED_FACELET_STRING, "")
                .expect("root playback export should replay solved facelets");
        crate::validate_facelet_string(SOLVED_FACELET_STRING)
            .expect("root validation export should validate solved facelets");
        let playback_error = crate::FaceletPlaybackError::Notation {
            error: crate::NotationError::new("Q"),
        };

        assert_eq!(result.moves(), &[crate::Move::R]);
        assert_eq!(result.length(), 1);
        assert_eq!(
            selected_config.strategy,
            crate::SolverStrategy::TwoPhaseBaseline
        );
        assert!(playback.final_is_solved());
        assert!(matches!(
            not_found,
            crate::SolveError::NotFoundWithinLimits { .. }
        ));
        assert!(matches!(invalid, crate::SolveError::InvalidInput { .. }));
        assert!(matches!(
            playback_error,
            crate::FaceletPlaybackError::Notation { .. }
        ));
    }

    #[test]
    fn solved_cubie_state_returns_empty_solution() {
        let result = solve_cubie_state(CubieState::solved(), SolverConfig::new(0))
            .expect("solved cubie state should solve");

        assert!(result.is_empty());
        assert_eq!(result.length(), 0);
        assert_eq!(result.explored_nodes(), 1);
    }

    #[test]
    fn shallow_cubie_scramble_returns_valid_solution() {
        let state = scrambled_state(&[Move::R, Move::U]);
        let result = solve_cubie_state(state.clone(), SolverConfig::new(2))
            .expect("shallow cubie state should solve");

        assert_solution_solves_state(state, result.moves());
        assert_eq!(result.length(), result.moves().len());
        assert!(result.explored_nodes() > 0);
    }

    #[test]
    fn solved_facelet_string_returns_empty_solution() {
        let result = solve_facelet_string(SOLVED_FACELET_STRING, SolverConfig::new(0))
            .expect("solved facelet state should solve");

        assert!(result.is_empty());
        assert_eq!(result.length(), 0);
        assert_eq!(result.explored_nodes(), 1);
    }

    #[test]
    fn shallow_facelet_string_returns_verified_solution() {
        let cube = scrambled(&[Move::R, Move::U]);
        let input = FaceletString::from_cube(&cube).to_string();
        let result = solve_facelet_string(&input, SolverConfig::new(2))
            .expect("shallow facelet state should solve");

        assert_solution_solves_cube(cube, result.moves());
        assert_eq!(result.length(), result.moves().len());
        assert!(result.explored_nodes() > 0);
    }

    #[test]
    fn two_phase_baseline_solved_cubie_state_returns_empty_solution() {
        let result = solve_cubie_state(CubieState::solved(), two_phase_config(0, None))
            .expect("selected two-phase baseline should solve solved cubie state");

        assert!(result.is_empty());
        assert_eq!(result.length(), 0);
        assert_eq!(result.explored_nodes(), 1);
    }

    #[test]
    fn two_phase_baseline_known_shallow_cubie_state_returns_verified_solution() {
        let state = scrambled_state(&[Move::F]);
        let result = solve_cubie_state(state.clone(), two_phase_config(1, None))
            .expect("selected two-phase baseline should solve fixture-covered cubie state");

        assert_solution_solves_state(state, result.moves());
        assert_eq!(result.length(), 1);
        assert!(result.explored_nodes() > 0);
    }

    #[test]
    fn two_phase_baseline_known_shallow_facelet_state_returns_verified_solution() {
        let cube = scrambled(&[Move::F]);
        let input = FaceletString::from_cube(&cube).to_string();
        let result = solve_facelet_string(&input, two_phase_config(1, None))
            .expect("selected two-phase baseline should solve fixture-covered facelet state");

        assert_solution_solves_cube(cube, result.moves());
        assert_eq!(result.length(), 1);
        assert!(result.explored_nodes() > 0);
    }

    #[test]
    fn two_phase_baseline_invalid_cubie_state_returns_invalid_input() {
        let mut state = CubieState::solved();
        state.edge_orientation[0] = 1;

        let error = solve_cubie_state(state, two_phase_config(1, None))
            .expect_err("invalid cubie state should not reach selected two-phase search");

        assert_eq!(
            error,
            SolveError::InvalidInput {
                error: SolveInputError::CubieValidation {
                    error: CubeValidationError::InvalidEdgeOrientationSum { sum: 1 },
                },
            }
        );
    }

    #[test]
    fn two_phase_baseline_invalid_facelets_return_invalid_input() {
        let error = solve_facelet_string("U", two_phase_config(0, None))
            .expect_err("invalid facelet syntax should not reach selected two-phase search");

        assert_eq!(
            error,
            SolveError::InvalidInput {
                error: SolveInputError::FaceletParse {
                    error: FaceletParseError::InvalidLength {
                        expected: FACELET_COUNT,
                        actual: 1,
                    },
                },
            }
        );
    }

    #[test]
    fn two_phase_baseline_reports_configured_limits_with_metrics() {
        let state = scrambled_state(&[Move::F]);
        let config = two_phase_config(1, Some(0));

        let error = solve_cubie_state(state.clone(), config.clone())
            .expect_err("zero-node budget should stop selected two-phase baseline");

        assert_eq!(
            error,
            SolveError::NotFoundWithinLimits {
                config: config.clone(),
                explored_nodes: 0,
            }
        );

        let config = two_phase_config(0, None);
        let error = solve_cubie_state(state, config.clone())
            .expect_err("depth-zero limit should not solve fixture-covered one-move state");

        match error {
            SolveError::NotFoundWithinLimits {
                config: actual_config,
                explored_nodes,
            } => {
                assert_eq!(actual_config, config);
                assert!(explored_nodes > 0);
            }
            SolveError::InvalidInput { .. }
            | SolveError::GeneratedTablesUnavailable { .. }
            | SolveError::GeneratedTablesCorrupt { .. } => {
                panic!("limit failure should not be invalid input or table unavailable")
            }
        }
    }

    #[test]
    fn two_phase_baseline_reports_not_found_for_shallow_state_outside_tiny_fixture() {
        let state = scrambled_state(&[Move::R]);
        let config = two_phase_config(1, None);

        let error = solve_cubie_state(state.clone(), config.clone())
            .expect_err("selected two-phase baseline should stay limited to committed fixture");

        match error {
            SolveError::NotFoundWithinLimits {
                config: actual_config,
                explored_nodes,
            } => {
                assert_eq!(actual_config, config);
                assert!(explored_nodes > 0);
            }
            SolveError::InvalidInput { .. }
            | SolveError::GeneratedTablesUnavailable { .. }
            | SolveError::GeneratedTablesCorrupt { .. } => {
                panic!("unsupported fixture state is not invalid input or table unavailable")
            }
        }

        let default_result = solve_cubie_state(state.clone(), SolverConfig::new(1))
            .expect("default bounded solver should remain unchanged");
        assert_solution_solves_state(state, default_result.moves());
    }

    #[test]
    fn solved_and_shallow_facelet_strings_validate_successfully() {
        validate_facelet_string(SOLVED_FACELET_STRING)
            .expect("solved facelet state should validate");

        let input = facelet_string_for(&[Move::R, Move::U]);
        validate_facelet_string(&input).expect("shallow moved facelet state should validate");
    }

    #[test]
    fn facelet_validation_returns_parse_conversion_and_cubie_errors() {
        assert_eq!(
            validate_facelet_string("U"),
            Err(SolveInputError::FaceletParse {
                error: FaceletParseError::InvalidLength {
                    expected: FACELET_COUNT,
                    actual: 1,
                },
            })
        );

        let center_input = facelet_input_with_swapped_stickers(
            CENTER_FACELET_POSITIONS[0].position,
            CENTER_FACELET_POSITIONS[1].position,
        );
        assert_eq!(
            validate_facelet_string(&center_input),
            Err(SolveInputError::FaceletConversion {
                error: FaceletConversionError::InvalidCenterSticker {
                    position: CENTER_FACELET_POSITIONS[0].position,
                    expected: Facelet::U,
                    actual: Facelet::R,
                },
            })
        );

        let impossible_input = facelet_input_with_flipped_edge(Edge::Ur);
        assert_eq!(
            validate_facelet_string(&impossible_input),
            Err(SolveInputError::FaceletConversion {
                error: FaceletConversionError::CubieValidation {
                    error: CubeValidationError::InvalidEdgeOrientationSum { sum: 1 },
                },
            })
        );
    }

    #[test]
    fn facelet_playback_returns_solved_for_solved_input_without_moves() {
        let result = playback_facelet_solution(SOLVED_FACELET_STRING, "")
            .expect("solved facelets with no moves should replay");

        assert_eq!(result.states().len(), 1);
        assert_eq!(result.states()[0], SOLVED_FACELET_STRING);
        assert!(result.final_is_solved());
    }

    #[test]
    fn facelet_playback_replays_solution_from_shallow_scramble() {
        let start = facelet_string_for(&[Move::R, Move::U]);
        let mut after_first_solution_move = scrambled(&[Move::R, Move::U]);
        after_first_solution_move.apply_move(Move::UPrime);
        let expected_middle = FaceletString::from_cube(&after_first_solution_move).to_string();

        let result = playback_facelet_solution(&start, "U' R'")
            .expect("valid solution should replay from facelets");

        assert_eq!(result.states().len(), 3);
        assert_eq!(result.states()[0], start);
        assert_eq!(result.states()[1], expected_middle);
        assert_eq!(result.states()[2], SOLVED_FACELET_STRING);
        assert!(result.final_is_solved());
    }

    #[test]
    fn facelet_playback_returns_structured_parse_errors() {
        let error = playback_facelet_solution("U", "")
            .expect_err("invalid starting facelet syntax should not replay");

        assert_eq!(
            error,
            FaceletPlaybackError::FaceletParse {
                error: FaceletParseError::InvalidLength {
                    expected: FACELET_COUNT,
                    actual: 1,
                },
            }
        );
    }

    #[test]
    fn facelet_playback_returns_structured_conversion_errors() {
        let input = facelet_input_with_flipped_edge(Edge::Ur);
        let error = playback_facelet_solution(&input, "")
            .expect_err("impossible starting facelets should not replay");

        assert_eq!(
            error,
            FaceletPlaybackError::FaceletConversion {
                error: FaceletConversionError::CubieValidation {
                    error: CubeValidationError::InvalidEdgeOrientationSum { sum: 1 },
                },
            }
        );
    }

    #[test]
    fn facelet_playback_returns_structured_notation_errors() {
        let error = playback_facelet_solution(SOLVED_FACELET_STRING, "R Q")
            .expect_err("invalid move notation should not replay");

        assert_eq!(
            error,
            FaceletPlaybackError::Notation {
                error: crate::NotationError::new("Q"),
            }
        );
    }

    #[test]
    fn facelet_playback_reports_non_solving_final_state() {
        let result = playback_facelet_solution(SOLVED_FACELET_STRING, "R")
            .expect("valid notation should replay even when it does not solve");

        assert_eq!(result.states().len(), 2);
        assert_eq!(result.states()[0], SOLVED_FACELET_STRING);
        assert_ne!(result.states()[1], SOLVED_FACELET_STRING);
        assert!(!result.final_is_solved());
    }

    #[test]
    fn facelet_parse_failures_return_structured_input_errors() {
        let cases = [
            (
                "U",
                FaceletParseError::InvalidLength {
                    expected: FACELET_COUNT,
                    actual: 1,
                },
            ),
            (
                "UUUUUUUUURXRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB",
                FaceletParseError::InvalidSymbol {
                    position: 10,
                    symbol: 'X',
                },
            ),
            (
                "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBU",
                FaceletParseError::InvalidFaceCount {
                    facelet: Facelet::U,
                    expected: 9,
                    actual: 10,
                },
            ),
        ];

        for (input, expected) in cases {
            let error = solve_facelet_string(input, SolverConfig::new(0))
                .expect_err("invalid facelet syntax should not solve");

            assert_eq!(
                error,
                SolveError::InvalidInput {
                    error: SolveInputError::FaceletParse { error: expected },
                }
            );
        }
    }

    #[test]
    fn facelet_conversion_failures_return_structured_input_errors() {
        let center_input = facelet_input_with_swapped_stickers(
            CENTER_FACELET_POSITIONS[0].position,
            CENTER_FACELET_POSITIONS[1].position,
        );
        let center_error = solve_facelet_string(&center_input, SolverConfig::new(0))
            .expect_err("invalid center stickers should not solve");
        assert_eq!(
            center_error,
            SolveError::InvalidInput {
                error: SolveInputError::FaceletConversion {
                    error: FaceletConversionError::InvalidCenterSticker {
                        position: CENTER_FACELET_POSITIONS[0].position,
                        expected: Facelet::U,
                        actual: Facelet::R,
                    },
                },
            }
        );

        let unknown_edge_input = facelet_input_with_sticker_changes(&[(10, 'D'), (32, 'R')]);
        let unknown_edge_error = solve_facelet_string(&unknown_edge_input, SolverConfig::new(0))
            .expect_err("unknown edge stickers should not solve");
        assert_eq!(
            unknown_edge_error,
            SolveError::InvalidInput {
                error: SolveInputError::FaceletConversion {
                    error: FaceletConversionError::UnknownEdgeStickers {
                        position: Edge::Ur,
                        stickers: [Facelet::U, Facelet::D],
                    },
                },
            }
        );

        let duplicate_corner_input =
            facelet_input_with_sticker_changes(&[(18, 'R'), (38, 'F'), (10, 'L')]);
        let duplicate_corner_error =
            solve_facelet_string(&duplicate_corner_input, SolverConfig::new(0))
                .expect_err("duplicate corner stickers should not solve");
        assert_eq!(
            duplicate_corner_error,
            SolveError::InvalidInput {
                error: SolveInputError::FaceletConversion {
                    error: FaceletConversionError::DuplicateCornerStickers {
                        corner: Corner::Urf,
                        first_position: Corner::Urf,
                        duplicate_position: Corner::Ufl,
                    },
                },
            }
        );
    }

    #[test]
    fn impossible_facelet_state_returns_cubie_validation_conversion_error() {
        let input = facelet_input_with_flipped_edge(Edge::Ur);
        let error = solve_facelet_string(&input, SolverConfig::new(1))
            .expect_err("single flipped edge should fail cubie validation");

        assert_eq!(
            error,
            SolveError::InvalidInput {
                error: SolveInputError::FaceletConversion {
                    error: FaceletConversionError::CubieValidation {
                        error: CubeValidationError::InvalidEdgeOrientationSum { sum: 1 },
                    },
                },
            }
        );
    }

    #[test]
    fn facelet_solver_reports_depth_limit_as_search_failure() {
        let input = facelet_string_for(&[Move::R, Move::U]);
        let config = SolverConfig::new(1);

        let error = solve_facelet_string(&input, config.clone())
            .expect_err("depth-one search should not solve a two-move facelet scramble");

        match error {
            SolveError::NotFoundWithinLimits {
                config: actual_config,
                explored_nodes,
            } => {
                assert_eq!(actual_config, config);
                assert!(explored_nodes > 0);
            }
            SolveError::InvalidInput { .. }
            | SolveError::GeneratedTablesUnavailable { .. }
            | SolveError::GeneratedTablesCorrupt { .. } => {
                panic!("depth limit should not be invalid input or table unavailable")
            }
        }
    }

    #[test]
    fn facelet_solver_reports_node_budget_as_search_failure() {
        let input = facelet_string_for(&[Move::R]);
        let config = SolverConfig::with_limits(1, Some(0));

        let error = solve_facelet_string(&input, config.clone())
            .expect_err("zero-node budget should stop bounded facelet search");

        assert_eq!(
            error,
            SolveError::NotFoundWithinLimits {
                config: config.clone(),
                explored_nodes: 0,
            }
        );

        let config = SolverConfig::with_limits(1, Some(1));
        let error = solve_facelet_string(&input, config.clone())
            .expect_err("one-node budget should stop bounded facelet search after root");

        assert_eq!(
            error,
            SolveError::NotFoundWithinLimits {
                config: config.clone(),
                explored_nodes: 1,
            }
        );
    }

    #[test]
    fn invalid_cubie_state_returns_validation_error() {
        let mut state = CubieState::solved();
        state.edge_orientation[0] = 1;

        let error = solve_cubie_state(state, SolverConfig::new(1))
            .expect_err("invalid cubie state should not solve");

        assert_eq!(
            error,
            SolveError::InvalidInput {
                error: SolveInputError::CubieValidation {
                    error: CubeValidationError::InvalidEdgeOrientationSum { sum: 1 },
                },
            }
        );
    }

    #[test]
    fn insufficient_max_depth_reports_limit_failure() {
        let state = scrambled_state(&[Move::R, Move::U]);
        let config = SolverConfig::new(1);

        let error = solve_cubie_state(state, config.clone())
            .expect_err("depth-one search should not solve a two-move scramble");

        match error {
            SolveError::NotFoundWithinLimits {
                config: actual_config,
                explored_nodes,
            } => {
                assert_eq!(actual_config, config);
                assert!(explored_nodes > 0);
            }
            SolveError::InvalidInput { .. }
            | SolveError::GeneratedTablesUnavailable { .. }
            | SolveError::GeneratedTablesCorrupt { .. } => {
                panic!("depth limit should not be invalid input or table unavailable")
            }
        }
    }

    #[test]
    fn max_nodes_limit_is_reported_as_limit_failure() {
        let state = scrambled_state(&[Move::R]);
        let config = SolverConfig::with_limits(1, Some(0));

        let error = solve_cubie_state(state.clone(), config.clone())
            .expect_err("zero-node budget should stop bounded search");

        assert_eq!(
            error,
            SolveError::NotFoundWithinLimits {
                config: config.clone(),
                explored_nodes: 0,
            }
        );

        let config = SolverConfig::with_limits(1, Some(1));
        let error = solve_cubie_state(state, config.clone())
            .expect_err("one-node budget should stop bounded search after root");

        assert_eq!(
            error,
            SolveError::NotFoundWithinLimits {
                config: config.clone(),
                explored_nodes: 1,
            }
        );
    }

    #[test]
    fn solve_cube_accepts_valid_cube_inputs() {
        let cube = scrambled(&[Move::R]);
        let result = solve_cube(&cube, SolverConfig::new(1)).expect("cube should solve");

        assert_solution_solves_cube(cube, result.moves());
    }

    #[test]
    fn replay_failure_is_not_returned_as_success() {
        let config = SolverConfig::new(1);
        let bad_outcome = SearchOutcome::Found(SearchSolution::with_metrics(vec![Move::R], 7));

        let error = solve_search_outcome(&Cube::solved(), config.clone(), bad_outcome)
            .expect_err("non-solving moves must not be returned");

        assert_eq!(
            error,
            SolveError::NotFoundWithinLimits {
                config,
                explored_nodes: 7,
            }
        );
    }

    #[test]
    fn root_exports_solve_cubie_state() {
        let state = scrambled_state(&[Move::R]);
        let result = crate::solve_cubie_state(state.clone(), crate::SolverConfig::new(1))
            .expect("root cubie solver export should solve");

        assert_solution_solves_state(state, result.moves());
        assert_eq!(result.length(), 1);
        assert_eq!(result.metrics().explored_nodes, result.explored_nodes());
    }

    #[test]
    fn root_exports_solve_facelet_string() {
        let input = facelet_string_for(&[Move::R]);
        let state = FaceletString::parse(&input)
            .expect("test facelets should parse")
            .to_cubie_state()
            .expect("test facelets should convert");
        let result = crate::solve_facelet_string(&input, crate::SolverConfig::new(1))
            .expect("root facelet solver export should solve");

        assert_solution_solves_state(state, result.moves());
        assert_eq!(result.length(), 1);
    }

    fn two_phase_config(max_depth: usize, max_nodes: Option<usize>) -> SolverConfig {
        SolverConfig::with_strategy(max_depth, max_nodes, SolverStrategy::TwoPhaseBaseline)
    }

    fn scrambled(moves: &[Move]) -> Cube {
        let mut cube = Cube::solved();
        cube.apply_moves(moves);
        cube
    }

    fn scrambled_state(moves: &[Move]) -> CubieState {
        scrambled(moves).state().clone()
    }

    fn facelet_string_for(moves: &[Move]) -> String {
        FaceletString::from_cube(&scrambled(moves)).to_string()
    }

    fn facelet_input_with_swapped_stickers(left: usize, right: usize) -> String {
        let mut facelets = solved_facelet_symbols();
        facelets.swap(left, right);

        collect_facelets(facelets)
    }

    fn facelet_input_with_sticker_changes(changes: &[(usize, char)]) -> String {
        let mut facelets = solved_facelet_symbols();

        for (position, symbol) in changes {
            facelets[*position] = *symbol;
        }

        collect_facelets(facelets)
    }

    fn facelet_input_with_flipped_edge(edge: Edge) -> String {
        let mut facelets = solved_facelet_symbols();
        let mapping = EDGE_FACELET_MAPPINGS[edge.index()];

        facelets.swap(mapping.stickers[0].position, mapping.stickers[1].position);

        collect_facelets(facelets)
    }

    fn solved_facelet_symbols() -> Vec<char> {
        SOLVED_FACELET_STRING.chars().collect()
    }

    fn collect_facelets(facelets: Vec<char>) -> String {
        facelets.into_iter().collect()
    }

    fn assert_solution_solves_state(state: CubieState, solution: &[Move]) {
        let cube = Cube::try_from_state(state).expect("test state should be valid");

        assert_solution_solves_cube(cube, solution);
    }

    fn assert_solution_solves_cube(mut cube: Cube, solution: &[Move]) {
        cube.apply_moves(solution);

        assert!(cube.is_solved());
    }
}
