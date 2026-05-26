use std::fmt;

use crate::cube::{
    Algorithm, Cube, CubeValidationError, CubieState, FaceletConversionError, FaceletParseError,
    FaceletString, Move, NotationError,
};
use crate::search::{
    solve_ida_star_bounded, solve_two_phase_baseline, SearchBudget, SearchOutcome,
};

pub mod quality;

/// Explicit solver selection for public solver entry points.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum SolverStrategy {
    /// Existing bounded deterministic IDA* path used by product defaults.
    BoundedIdaStar,
    /// Limited two-phase baseline backed only by tiny committed fixtures.
    ///
    /// This is not a full generated-table solver and does not claim optimality or a 20-move bound.
    TwoPhaseBaseline,
}

/// Configuration shared by public solver entry points.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct SolverConfig {
    /// Maximum solution depth a solver may explore before reporting a limit failure.
    pub max_depth: usize,
    /// Optional maximum node budget.
    ///
    /// Public solver entry points pass this through to the bounded search budget.
    pub max_nodes: Option<usize>,
    /// Explicit solver path. Constructors default to the bounded product solver.
    pub strategy: SolverStrategy,
}

impl SolverConfig {
    pub const fn new(max_depth: usize) -> Self {
        Self {
            max_depth,
            max_nodes: None,
            strategy: SolverStrategy::BoundedIdaStar,
        }
    }

    pub const fn with_limits(max_depth: usize, max_nodes: Option<usize>) -> Self {
        Self {
            max_depth,
            max_nodes,
            strategy: SolverStrategy::BoundedIdaStar,
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
        }
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
    NotFoundWithinLimits {
        config: SolverConfig,
        explored_nodes: usize,
    },
}

impl fmt::Display for SolveError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidInput { error } => write!(formatter, "invalid solver input: {error}"),
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
        SolverStrategy::TwoPhaseBaseline => solve_two_phase_baseline(cube, budget),
    };

    solve_search_outcome(cube, config, outcome)
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

        let error = solve_cubie_state(state.clone(), config)
            .expect_err("zero-node budget should stop selected two-phase baseline");

        assert_eq!(
            error,
            SolveError::NotFoundWithinLimits {
                config,
                explored_nodes: 0,
            }
        );

        let config = two_phase_config(0, None);
        let error = solve_cubie_state(state, config)
            .expect_err("depth-zero limit should not solve fixture-covered one-move state");

        match error {
            SolveError::NotFoundWithinLimits {
                config: actual_config,
                explored_nodes,
            } => {
                assert_eq!(actual_config, config);
                assert!(explored_nodes > 0);
            }
            SolveError::InvalidInput { .. } => panic!("limit failure should not be invalid input"),
        }
    }

    #[test]
    fn two_phase_baseline_reports_not_found_for_shallow_state_outside_tiny_fixture() {
        let state = scrambled_state(&[Move::R]);
        let config = two_phase_config(1, None);

        let error = solve_cubie_state(state.clone(), config)
            .expect_err("selected two-phase baseline should stay limited to committed fixture");

        match error {
            SolveError::NotFoundWithinLimits {
                config: actual_config,
                explored_nodes,
            } => {
                assert_eq!(actual_config, config);
                assert!(explored_nodes > 0);
            }
            SolveError::InvalidInput { .. } => {
                panic!("unsupported fixture state is not invalid input")
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

        let error = solve_facelet_string(&input, config)
            .expect_err("depth-one search should not solve a two-move facelet scramble");

        match error {
            SolveError::NotFoundWithinLimits {
                config: actual_config,
                explored_nodes,
            } => {
                assert_eq!(actual_config, config);
                assert!(explored_nodes > 0);
            }
            SolveError::InvalidInput { .. } => panic!("depth limit should not be invalid input"),
        }
    }

    #[test]
    fn facelet_solver_reports_node_budget_as_search_failure() {
        let input = facelet_string_for(&[Move::R]);
        let config = SolverConfig::with_limits(1, Some(0));

        let error = solve_facelet_string(&input, config)
            .expect_err("zero-node budget should stop bounded facelet search");

        assert_eq!(
            error,
            SolveError::NotFoundWithinLimits {
                config,
                explored_nodes: 0,
            }
        );

        let config = SolverConfig::with_limits(1, Some(1));
        let error = solve_facelet_string(&input, config)
            .expect_err("one-node budget should stop bounded facelet search after root");

        assert_eq!(
            error,
            SolveError::NotFoundWithinLimits {
                config,
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

        let error = solve_cubie_state(state, config)
            .expect_err("depth-one search should not solve a two-move scramble");

        match error {
            SolveError::NotFoundWithinLimits {
                config: actual_config,
                explored_nodes,
            } => {
                assert_eq!(actual_config, config);
                assert!(explored_nodes > 0);
            }
            SolveError::InvalidInput { .. } => panic!("depth limit should not be invalid input"),
        }
    }

    #[test]
    fn max_nodes_limit_is_reported_as_limit_failure() {
        let state = scrambled_state(&[Move::R]);
        let config = SolverConfig::with_limits(1, Some(0));

        let error = solve_cubie_state(state.clone(), config)
            .expect_err("zero-node budget should stop bounded search");

        assert_eq!(
            error,
            SolveError::NotFoundWithinLimits {
                config,
                explored_nodes: 0,
            }
        );

        let config = SolverConfig::with_limits(1, Some(1));
        let error = solve_cubie_state(state, config)
            .expect_err("one-node budget should stop bounded search after root");

        assert_eq!(
            error,
            SolveError::NotFoundWithinLimits {
                config,
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

        let error = solve_search_outcome(&Cube::solved(), config, bad_outcome)
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
