use cube_engine::{
    playback_facelet_solution as playback_engine_facelet_solution,
    solve_facelet_string as solve_engine_facelet_string,
    validate_facelet_string as validate_engine_facelet_string, Cube, CubeValidationError,
    FaceletConversionError, FaceletParseError, FaceletPlaybackError,
    FaceletPlaybackResult as EngineFaceletPlaybackResult, FaceletString, SolveError,
    SolveInputError, SolveResult, SolverConfig, SolverStrategy,
};
use wasm_bindgen::prelude::*;

const UNAVAILABLE_GENERATED_TWO_PHASE_STRATEGY_ID: &str = "generated-two-phase";
const UNAVAILABLE_GENERATED_TWO_PHASE_LABEL: &str = "Generated two-phase solver";
const UNAVAILABLE_GENERATED_TWO_PHASE_MODE: &str = "unavailable_generated_two_phase";
const AVAILABLE_STRATEGY_IDS: &str = "bounded-ida-star, two-phase-baseline";

#[wasm_bindgen]
pub fn solved_facelet_string() -> String {
    FaceletString::from_cube(&Cube::solved()).to_string()
}

#[wasm_bindgen]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FaceletValidationResult {
    ok: bool,
    kind: Option<String>,
    message: Option<String>,
}

#[wasm_bindgen]
impl FaceletValidationResult {
    #[wasm_bindgen(getter)]
    pub fn ok(&self) -> bool {
        self.ok
    }

    #[wasm_bindgen(getter)]
    pub fn kind(&self) -> Option<String> {
        self.kind.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn message(&self) -> Option<String> {
        self.message.clone()
    }
}

impl FaceletValidationResult {
    fn success() -> Self {
        Self {
            ok: true,
            kind: None,
            message: None,
        }
    }

    fn failure(kind: &'static str, message: String) -> Self {
        Self {
            ok: false,
            kind: Some(kind.to_owned()),
            message: Some(message),
        }
    }
}

#[wasm_bindgen]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FaceletSolveResult {
    status: String,
    ok: bool,
    moves: Vec<String>,
    length: usize,
    max_depth: usize,
    max_nodes: Option<usize>,
    strategy_id: String,
    strategy_label: String,
    solver_mode: String,
    explored_nodes: Option<usize>,
    error_kind: Option<String>,
    message: Option<String>,
}

#[wasm_bindgen]
impl FaceletSolveResult {
    #[wasm_bindgen(getter)]
    pub fn status(&self) -> String {
        self.status.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn ok(&self) -> bool {
        self.ok
    }

    #[wasm_bindgen(getter)]
    pub fn moves(&self) -> Vec<String> {
        self.moves.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn length(&self) -> usize {
        self.length
    }

    #[wasm_bindgen(getter)]
    pub fn max_depth(&self) -> usize {
        self.max_depth
    }

    #[wasm_bindgen(getter)]
    pub fn max_nodes(&self) -> Option<usize> {
        self.max_nodes
    }

    #[wasm_bindgen(getter)]
    pub fn strategy_id(&self) -> String {
        self.strategy_id.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn strategy_label(&self) -> String {
        self.strategy_label.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn solver_mode(&self) -> String {
        self.solver_mode.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn explored_nodes(&self) -> Option<usize> {
        self.explored_nodes
    }

    #[wasm_bindgen(getter)]
    pub fn error_kind(&self) -> Option<String> {
        self.error_kind.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn message(&self) -> Option<String> {
        self.message.clone()
    }
}

#[wasm_bindgen]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FaceletPlaybackResult {
    status: String,
    ok: bool,
    states: Vec<String>,
    final_is_solved: bool,
    error_kind: Option<String>,
    message: Option<String>,
}

#[wasm_bindgen]
impl FaceletPlaybackResult {
    #[wasm_bindgen(getter)]
    pub fn status(&self) -> String {
        self.status.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn ok(&self) -> bool {
        self.ok
    }

    #[wasm_bindgen(getter)]
    pub fn states(&self) -> Vec<String> {
        self.states.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn final_is_solved(&self) -> bool {
        self.final_is_solved
    }

    #[wasm_bindgen(getter)]
    pub fn error_kind(&self) -> Option<String> {
        self.error_kind.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn message(&self) -> Option<String> {
        self.message.clone()
    }
}

impl FaceletPlaybackResult {
    fn success(result: EngineFaceletPlaybackResult) -> Self {
        Self {
            status: "success".to_owned(),
            ok: true,
            states: result.states().to_vec(),
            final_is_solved: result.final_is_solved(),
            error_kind: None,
            message: None,
        }
    }

    fn failure(error: FaceletPlaybackError) -> Self {
        Self {
            status: playback_error_status(&error).to_owned(),
            ok: false,
            states: Vec::new(),
            final_is_solved: false,
            error_kind: Some(playback_error_kind(&error).to_owned()),
            message: Some(error.to_string()),
        }
    }
}

impl FaceletSolveResult {
    fn success(result: SolveResult, config: SolverConfig) -> Self {
        let moves = result
            .moves()
            .iter()
            .map(|move_| move_.notation().to_owned())
            .collect::<Vec<_>>();

        Self {
            status: "success".to_owned(),
            ok: true,
            length: result.length(),
            moves,
            max_depth: config.max_depth,
            max_nodes: config.max_nodes,
            strategy_id: config.strategy.id().to_owned(),
            strategy_label: config.strategy.label().to_owned(),
            solver_mode: config.strategy.solver_mode().to_owned(),
            explored_nodes: Some(result.explored_nodes()),
            error_kind: None,
            message: None,
        }
    }

    fn invalid_input(error: SolveInputError, config: SolverConfig) -> Self {
        Self {
            status: "invalid_input".to_owned(),
            ok: false,
            moves: Vec::new(),
            length: 0,
            max_depth: config.max_depth,
            max_nodes: config.max_nodes,
            strategy_id: config.strategy.id().to_owned(),
            strategy_label: config.strategy.label().to_owned(),
            solver_mode: config.strategy.solver_mode().to_owned(),
            explored_nodes: None,
            error_kind: Some(validation_error_kind(&error).to_owned()),
            message: Some(error.to_string()),
        }
    }

    fn not_found_within_limits(config: SolverConfig, explored_nodes: usize) -> Self {
        let message = SolveError::NotFoundWithinLimits {
            config: config.clone(),
            explored_nodes,
        }
        .to_string();

        Self {
            status: "not_found_within_limits".to_owned(),
            ok: false,
            moves: Vec::new(),
            length: 0,
            max_depth: config.max_depth,
            max_nodes: config.max_nodes,
            strategy_id: config.strategy.id().to_owned(),
            strategy_label: config.strategy.label().to_owned(),
            solver_mode: config.strategy.solver_mode().to_owned(),
            explored_nodes: Some(explored_nodes),
            error_kind: None,
            message: Some(message),
        }
    }

    fn unsupported_strategy(
        requested_strategy: &str,
        max_depth: usize,
        max_nodes: Option<usize>,
    ) -> Self {
        let displayed_strategy = if requested_strategy.is_empty() {
            "<empty>"
        } else {
            requested_strategy
        };

        Self {
            status: "unsupported_strategy".to_owned(),
            ok: false,
            moves: Vec::new(),
            length: 0,
            max_depth,
            max_nodes,
            strategy_id: requested_strategy.to_owned(),
            strategy_label: "Unsupported strategy".to_owned(),
            solver_mode: "unsupported_strategy".to_owned(),
            explored_nodes: None,
            error_kind: Some("unsupported_strategy".to_owned()),
            message: Some(format!(
                "Unsupported solver strategy \"{displayed_strategy}\". Supported strategies: {AVAILABLE_STRATEGY_IDS}."
            )),
        }
    }

    fn unavailable_strategy(
        requested_strategy: &str,
        strategy_label: &str,
        solver_mode: &str,
        max_depth: usize,
        max_nodes: Option<usize>,
    ) -> Self {
        Self {
            status: "unavailable_strategy".to_owned(),
            ok: false,
            moves: Vec::new(),
            length: 0,
            max_depth,
            max_nodes,
            strategy_id: requested_strategy.to_owned(),
            strategy_label: strategy_label.to_owned(),
            solver_mode: solver_mode.to_owned(),
            explored_nodes: None,
            error_kind: Some("unavailable_strategy".to_owned()),
            message: Some(
                "The generated two-phase solver is unavailable because full generated pruning tables are absent. Use bounded-ida-star by default or the limited two-phase baseline for fixture-covered states."
                    .to_owned(),
            ),
        }
    }

    fn failure(error: SolveError, request_config: SolverConfig) -> Self {
        match error {
            SolveError::InvalidInput { error } => Self::invalid_input(error, request_config),
            SolveError::GeneratedTablesUnavailable { config, error } => Self {
                status: "unavailable_strategy".to_owned(),
                ok: false,
                moves: Vec::new(),
                length: 0,
                max_depth: config.max_depth,
                max_nodes: config.max_nodes,
                strategy_id: config.strategy.id().to_owned(),
                strategy_label: config.strategy.label().to_owned(),
                solver_mode: config.strategy.solver_mode().to_owned(),
                explored_nodes: Some(0),
                error_kind: Some("generated_tables_unavailable".to_owned()),
                message: Some(error.to_string()),
            },
            SolveError::NotFoundWithinLimits {
                config,
                explored_nodes,
            } => Self::not_found_within_limits(config, explored_nodes),
        }
    }
}

#[wasm_bindgen]
pub fn validate_facelet_string(input: &str) -> FaceletValidationResult {
    match validate_engine_facelet_string(input) {
        Ok(()) => FaceletValidationResult::success(),
        Err(error) => {
            FaceletValidationResult::failure(validation_error_kind(&error), error.to_string())
        }
    }
}

#[wasm_bindgen]
pub fn solve_facelet_string(
    input: &str,
    max_depth: usize,
    max_nodes: Option<usize>,
) -> FaceletSolveResult {
    let config = SolverConfig::with_limits(max_depth, max_nodes);

    match solve_engine_facelet_string(input, config.clone()) {
        Ok(result) => FaceletSolveResult::success(result, config),
        Err(error) => FaceletSolveResult::failure(error, config),
    }
}

#[wasm_bindgen]
pub fn solve_facelet_string_with_strategy(
    input: &str,
    max_depth: usize,
    max_nodes: Option<usize>,
    strategy_id: &str,
) -> FaceletSolveResult {
    let requested_strategy = strategy_id.trim();

    if requested_strategy == UNAVAILABLE_GENERATED_TWO_PHASE_STRATEGY_ID {
        return FaceletSolveResult::unavailable_strategy(
            requested_strategy,
            UNAVAILABLE_GENERATED_TWO_PHASE_LABEL,
            UNAVAILABLE_GENERATED_TWO_PHASE_MODE,
            max_depth,
            max_nodes,
        );
    }

    let Some(strategy) = SolverStrategy::from_id(requested_strategy) else {
        return FaceletSolveResult::unsupported_strategy(requested_strategy, max_depth, max_nodes);
    };

    let config = SolverConfig::with_strategy(max_depth, max_nodes, strategy);

    match solve_engine_facelet_string(input, config.clone()) {
        Ok(result) => FaceletSolveResult::success(result, config),
        Err(error) => FaceletSolveResult::failure(error, config),
    }
}

#[wasm_bindgen]
pub fn playback_facelet_solution(start_facelets: &str, moves: &str) -> FaceletPlaybackResult {
    match playback_engine_facelet_solution(start_facelets, moves) {
        Ok(result) => FaceletPlaybackResult::success(result),
        Err(error) => FaceletPlaybackResult::failure(error),
    }
}

fn validation_error_kind(error: &SolveInputError) -> &'static str {
    match error {
        SolveInputError::CubieValidation { error } => cubie_validation_error_kind(error),
        SolveInputError::FaceletParse { error } => facelet_parse_error_kind(error),
        SolveInputError::FaceletConversion { error } => facelet_conversion_error_kind(error),
    }
}

fn playback_error_status(error: &FaceletPlaybackError) -> &'static str {
    match error {
        FaceletPlaybackError::Notation { .. } => "invalid_move_notation",
        FaceletPlaybackError::CubieValidation { .. }
        | FaceletPlaybackError::FaceletParse { .. }
        | FaceletPlaybackError::FaceletConversion { .. } => "invalid_input",
    }
}

fn playback_error_kind(error: &FaceletPlaybackError) -> &'static str {
    match error {
        FaceletPlaybackError::CubieValidation { error } => cubie_validation_error_kind(error),
        FaceletPlaybackError::FaceletParse { error } => facelet_parse_error_kind(error),
        FaceletPlaybackError::FaceletConversion { error } => facelet_conversion_error_kind(error),
        FaceletPlaybackError::Notation { .. } => "invalid_move_notation",
    }
}

fn facelet_parse_error_kind(error: &FaceletParseError) -> &'static str {
    match error {
        FaceletParseError::InvalidLength { .. } => "invalid_length",
        FaceletParseError::InvalidSymbol { .. } => "invalid_symbol",
        FaceletParseError::InvalidFaceCount { .. } => "invalid_face_count",
    }
}

fn facelet_conversion_error_kind(error: &FaceletConversionError) -> &'static str {
    match error {
        FaceletConversionError::InvalidCenterSticker { .. } => "invalid_center_sticker",
        FaceletConversionError::UnknownCornerStickers { .. } => "unknown_corner_stickers",
        FaceletConversionError::DuplicateCornerStickers { .. } => "duplicate_corner_stickers",
        FaceletConversionError::UnknownEdgeStickers { .. } => "unknown_edge_stickers",
        FaceletConversionError::DuplicateEdgeStickers { .. } => "duplicate_edge_stickers",
        FaceletConversionError::InvalidCornerOrientation { .. } => "invalid_corner_sticker_order",
        FaceletConversionError::CubieValidation { error } => cubie_validation_error_kind(error),
    }
}

fn cubie_validation_error_kind(error: &CubeValidationError) -> &'static str {
    match error {
        CubeValidationError::DuplicateCorner { .. } => "duplicate_corner",
        CubeValidationError::MissingCorner { .. } => "missing_corner",
        CubeValidationError::DuplicateEdge { .. } => "duplicate_edge",
        CubeValidationError::MissingEdge { .. } => "missing_edge",
        CubeValidationError::InvalidCornerOrientation { .. } => "invalid_corner_orientation",
        CubeValidationError::InvalidEdgeOrientation { .. } => "invalid_edge_orientation",
        CubeValidationError::InvalidCornerOrientationSum { .. } => "invalid_corner_orientation_sum",
        CubeValidationError::InvalidEdgeOrientationSum { .. } => "invalid_edge_orientation_sum",
        CubeValidationError::InvalidPermutationParity { .. } => "invalid_permutation_parity",
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use cube_engine::{Algorithm, Move};

    const SOLVED_FACELETS: &str = "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB";

    #[test]
    fn solved_facelet_string_returns_canonical_solved_facelets() {
        assert_eq!(solved_facelet_string(), SOLVED_FACELETS);
    }

    #[test]
    fn solved_facelet_string_round_trips_to_solved_cubie_state() {
        let facelets = FaceletString::parse(&solved_facelet_string())
            .expect("wrapper output should parse as facelets");
        let state = facelets
            .to_cubie_state()
            .expect("wrapper output should convert to cubies");
        let cube = Cube::try_from_state(state).expect("wrapper output should be a valid cube");

        assert!(cube.is_solved());
    }

    #[test]
    fn validation_accepts_solved_facelets() {
        let result = validate_facelet_string(SOLVED_FACELETS);

        assert!(result.ok());
        assert_eq!(result.kind(), None);
        assert_eq!(result.message(), None);
    }

    #[test]
    fn validation_accepts_shallow_moved_facelets() {
        let result = validate_facelet_string(&facelet_string_for(&[Move::R, Move::U]));

        assert!(result.ok());
        assert_eq!(result.kind(), None);
        assert_eq!(result.message(), None);
    }

    #[test]
    fn solve_returns_empty_success_for_solved_facelets() {
        let result = solve_facelet_string(SOLVED_FACELETS, 0, None);

        assert!(result.ok());
        assert_eq!(result.status(), "success");
        assert!(result.moves().is_empty());
        assert_eq!(result.length(), 0);
        assert_eq!(result.max_depth(), 0);
        assert_eq!(result.max_nodes(), None);
        assert_bounded_strategy_metadata(&result);
        assert_eq!(result.explored_nodes(), Some(1));
        assert_eq!(result.error_kind(), None);
        assert_eq!(result.message(), None);
    }

    #[test]
    fn solve_returns_notation_success_for_shallow_facelets() {
        let input = facelet_string_for(&[Move::R, Move::U]);
        let result = solve_facelet_string(&input, 2, Some(10_000));

        assert!(result.ok());
        assert_eq!(result.status(), "success");
        assert_eq!(result.max_depth(), 2);
        assert_eq!(result.max_nodes(), Some(10_000));
        assert_bounded_strategy_metadata(&result);
        assert!(result.explored_nodes().is_some_and(|nodes| nodes > 0));

        let moves = result.moves();
        assert_eq!(result.length(), moves.len());
        assert!(!moves.is_empty());
        assert_notation_solves_facelets(&input, &moves);
    }

    #[test]
    fn strategy_aware_solve_accepts_explicit_bounded_strategy() {
        let result =
            solve_facelet_string_with_strategy(SOLVED_FACELETS, 0, None, "bounded-ida-star");

        assert!(result.ok());
        assert_eq!(result.status(), "success");
        assert!(result.moves().is_empty());
        assert_eq!(result.length(), 0);
        assert_eq!(result.max_depth(), 0);
        assert_eq!(result.max_nodes(), None);
        assert_bounded_strategy_metadata(&result);
        assert_eq!(result.explored_nodes(), Some(1));
    }

    #[test]
    fn strategy_aware_solve_accepts_limited_two_phase_baseline() {
        let input = facelet_string_for(&[Move::F]);
        let result =
            solve_facelet_string_with_strategy(&input, 1, Some(10_000), "two-phase-baseline");

        assert!(result.ok());
        assert_eq!(result.status(), "success");
        assert_eq!(result.max_depth(), 1);
        assert_eq!(result.max_nodes(), Some(10_000));
        assert_eq!(result.strategy_id(), "two-phase-baseline");
        assert_eq!(result.strategy_label(), "Limited two-phase baseline");
        assert_eq!(result.solver_mode(), "limited_two_phase_baseline");
        assert!(result.explored_nodes().is_some_and(|nodes| nodes > 0));

        let moves = result.moves();
        assert_eq!(result.length(), moves.len());
        assert_notation_solves_facelets(&input, &moves);

        let playback = playback_facelet_solution(&input, &moves.join(" "));
        assert!(playback.ok());
        assert!(playback.final_is_solved());
        assert_eq!(playback.states().len(), moves.len() + 1);
    }

    #[test]
    fn strategy_aware_solve_reports_limited_two_phase_not_found() {
        let input = facelet_string_for(&[Move::R]);
        let result = solve_facelet_string_with_strategy(&input, 1, None, "two-phase-baseline");

        assert!(!result.ok());
        assert_eq!(result.status(), "not_found_within_limits");
        assert!(result.moves().is_empty());
        assert_eq!(result.length(), 0);
        assert_eq!(result.max_depth(), 1);
        assert_eq!(result.max_nodes(), None);
        assert_eq!(result.strategy_id(), "two-phase-baseline");
        assert_eq!(result.strategy_label(), "Limited two-phase baseline");
        assert_eq!(result.solver_mode(), "limited_two_phase_baseline");
        assert!(result.explored_nodes().is_some_and(|nodes| nodes > 0));
        assert_eq!(result.error_kind(), None);
        assert!(result
            .message()
            .is_some_and(|message| message.contains("max_depth=1")));
    }

    #[test]
    fn strategy_aware_solve_reports_unsupported_strategy() {
        let result = solve_facelet_string_with_strategy(SOLVED_FACELETS, 0, None, "made-up");

        assert!(!result.ok());
        assert_eq!(result.status(), "unsupported_strategy");
        assert!(result.moves().is_empty());
        assert_eq!(result.length(), 0);
        assert_eq!(result.max_depth(), 0);
        assert_eq!(result.max_nodes(), None);
        assert_eq!(result.strategy_id(), "made-up");
        assert_eq!(result.strategy_label(), "Unsupported strategy");
        assert_eq!(result.solver_mode(), "unsupported_strategy");
        assert_eq!(result.explored_nodes(), None);
        assert_eq!(result.error_kind().as_deref(), Some("unsupported_strategy"));
        assert!(result
            .message()
            .is_some_and(|message| message.contains("bounded-ida-star")));
    }

    #[test]
    fn strategy_aware_solve_reports_unavailable_generated_two_phase() {
        let result = solve_facelet_string_with_strategy(
            SOLVED_FACELETS,
            0,
            None,
            UNAVAILABLE_GENERATED_TWO_PHASE_STRATEGY_ID,
        );

        assert!(!result.ok());
        assert_eq!(result.status(), "unavailable_strategy");
        assert!(result.moves().is_empty());
        assert_eq!(result.length(), 0);
        assert_eq!(result.max_depth(), 0);
        assert_eq!(result.max_nodes(), None);
        assert_eq!(
            result.strategy_id(),
            UNAVAILABLE_GENERATED_TWO_PHASE_STRATEGY_ID
        );
        assert_eq!(
            result.strategy_label(),
            UNAVAILABLE_GENERATED_TWO_PHASE_LABEL
        );
        assert_eq!(result.solver_mode(), UNAVAILABLE_GENERATED_TWO_PHASE_MODE);
        assert_eq!(result.explored_nodes(), None);
        assert_eq!(result.error_kind().as_deref(), Some("unavailable_strategy"));
        assert!(result
            .message()
            .is_some_and(|message| message.contains("full generated pruning tables are absent")));
    }

    #[test]
    fn solve_returns_invalid_input_result_for_bad_facelets() {
        let result = solve_facelet_string("U", 4, Some(99));

        assert!(!result.ok());
        assert_eq!(result.status(), "invalid_input");
        assert!(result.moves().is_empty());
        assert_eq!(result.length(), 0);
        assert_eq!(result.max_depth(), 4);
        assert_eq!(result.max_nodes(), Some(99));
        assert_bounded_strategy_metadata(&result);
        assert_eq!(result.explored_nodes(), None);
        assert_eq!(result.error_kind().as_deref(), Some("invalid_length"));
        assert!(result.message().is_some_and(|message| !message.is_empty()));
    }

    #[test]
    fn solve_returns_distinct_limit_failure_result() {
        let input = facelet_string_for(&[Move::R]);
        let result = solve_facelet_string(&input, 1, Some(0));

        assert!(!result.ok());
        assert_eq!(result.status(), "not_found_within_limits");
        assert!(result.moves().is_empty());
        assert_eq!(result.length(), 0);
        assert_eq!(result.max_depth(), 1);
        assert_eq!(result.max_nodes(), Some(0));
        assert_bounded_strategy_metadata(&result);
        assert_eq!(result.explored_nodes(), Some(0));
        assert_eq!(result.error_kind(), None);

        let message = result
            .message()
            .expect("limit failure should include an explanatory message");
        assert!(message.contains("max_depth=1"));
        assert!(message.contains("max_nodes=0"));
        assert!(message.contains("explored_nodes=0"));
    }

    #[test]
    fn playback_replays_solution_states_and_reports_solved_final_state() {
        let start = facelet_string_for(&[Move::R, Move::U]);
        let expected_middle = facelet_string_for(&[Move::R, Move::U, Move::UPrime]);
        let result = playback_facelet_solution(&start, "U' R'");

        assert!(result.ok());
        assert_eq!(result.status(), "success");
        assert_eq!(result.error_kind(), None);
        assert_eq!(result.message(), None);
        assert!(result.final_is_solved());

        let states = result.states();
        assert_eq!(states.len(), 3);
        assert_eq!(states[0], start);
        assert_eq!(states[1], expected_middle);
        assert_eq!(states[2], SOLVED_FACELETS);
    }

    #[test]
    fn playback_returns_distinct_invalid_facelet_result() {
        let result = playback_facelet_solution("U", "");

        assert!(!result.ok());
        assert_eq!(result.status(), "invalid_input");
        assert!(result.states().is_empty());
        assert!(!result.final_is_solved());
        assert_eq!(result.error_kind().as_deref(), Some("invalid_length"));
        assert!(result.message().is_some_and(|message| !message.is_empty()));
    }

    #[test]
    fn playback_returns_distinct_invalid_notation_result() {
        let result = playback_facelet_solution(SOLVED_FACELETS, "R Q");

        assert!(!result.ok());
        assert_eq!(result.status(), "invalid_move_notation");
        assert!(result.states().is_empty());
        assert!(!result.final_is_solved());
        assert_eq!(
            result.error_kind().as_deref(),
            Some("invalid_move_notation")
        );
        assert!(result.message().is_some_and(|message| !message.is_empty()));
    }

    #[test]
    fn playback_reports_unsolved_final_state_for_valid_non_solution() {
        let result = playback_facelet_solution(SOLVED_FACELETS, "R");

        assert!(result.ok());
        assert_eq!(result.status(), "success");
        assert!(!result.final_is_solved());
        assert_eq!(result.error_kind(), None);
        assert_eq!(result.message(), None);

        let states = result.states();
        assert_eq!(states.len(), 2);
        assert_eq!(states[0], SOLVED_FACELETS);
        assert_ne!(states[1], SOLVED_FACELETS);
    }

    #[test]
    fn validation_reports_parse_error_kinds_and_messages() {
        assert_validation_error("U", "invalid_length");
        assert_validation_error(
            "UUUUUUUUURXRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB",
            "invalid_symbol",
        );
        assert_validation_error(
            "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBU",
            "invalid_face_count",
        );
    }

    #[test]
    fn validation_reports_conversion_error_kinds_and_messages() {
        let cases = [
            (
                facelets_with_swapped_positions(4, 13),
                "invalid_center_sticker",
            ),
            (
                facelets_with_swapped_positions(8, 46),
                "unknown_corner_stickers",
            ),
            (
                facelets_with_sticker_changes(&[(18, 'R'), (38, 'F'), (10, 'L')]),
                "duplicate_corner_stickers",
            ),
            (
                facelets_with_sticker_changes(&[(10, 'D'), (32, 'R')]),
                "unknown_edge_stickers",
            ),
            (
                facelets_with_sticker_changes(&[(19, 'R'), (12, 'F')]),
                "duplicate_edge_stickers",
            ),
            (
                facelets_with_swapped_positions(9, 20),
                "invalid_corner_sticker_order",
            ),
        ];

        for (input, expected_kind) in cases {
            assert_validation_error(&input, expected_kind);
        }
    }

    #[test]
    fn validation_reports_impossible_state_error_kind_and_message() {
        let cases = [
            (
                facelets_with_swapped_positions(5, 10),
                "invalid_edge_orientation_sum",
            ),
            (
                facelets_with_rotated_corner(),
                "invalid_corner_orientation_sum",
            ),
            (
                facelets_with_swapped_corner_pieces(),
                "invalid_permutation_parity",
            ),
        ];

        for (input, expected_kind) in cases {
            assert_validation_error(&input, expected_kind);
        }
    }

    fn assert_validation_error(input: &str, expected_kind: &str) {
        let result = validate_facelet_string(input);

        assert!(!result.ok());
        assert_eq!(result.kind().as_deref(), Some(expected_kind));
        assert!(result.message().is_some_and(|message| !message.is_empty()));
    }

    fn facelet_string_for(moves: &[Move]) -> String {
        let mut cube = Cube::solved();
        cube.apply_moves(moves);

        FaceletString::from_cube(&cube).to_string()
    }

    fn assert_notation_solves_facelets(input: &str, moves: &[String]) {
        let algorithm = Algorithm::parse(&moves.join(" "))
            .expect("WASM solve output should use engine move notation");
        let facelets = FaceletString::parse(input).expect("test facelets should parse");
        let state = facelets
            .to_cubie_state()
            .expect("test facelets should convert to cubies");
        let mut cube = Cube::try_from_state(state).expect("test facelets should be valid");

        algorithm.apply_to(&mut cube);

        assert!(cube.is_solved());
    }

    fn assert_bounded_strategy_metadata(result: &FaceletSolveResult) {
        assert_eq!(result.strategy_id(), "bounded-ida-star");
        assert_eq!(result.strategy_label(), "Bounded IDA*");
        assert_eq!(result.solver_mode(), "bounded_ida_star");
    }

    fn facelets_with_swapped_positions(left: usize, right: usize) -> String {
        let mut facelets = solved_facelet_symbols();
        facelets.swap(left, right);

        collect_facelets(facelets)
    }

    fn facelets_with_sticker_changes(changes: &[(usize, char)]) -> String {
        let mut facelets = solved_facelet_symbols();

        for (position, symbol) in changes {
            facelets[*position] = *symbol;
        }

        collect_facelets(facelets)
    }

    fn facelets_with_rotated_corner() -> String {
        let mut facelets = solved_facelet_symbols();

        facelets[8] = 'F';
        facelets[9] = 'U';
        facelets[20] = 'R';

        collect_facelets(facelets)
    }

    fn facelets_with_swapped_corner_pieces() -> String {
        let mut facelets = solved_facelet_symbols();

        for (left, right) in [(8, 6), (9, 18), (20, 38)] {
            facelets.swap(left, right);
        }

        collect_facelets(facelets)
    }

    fn solved_facelet_symbols() -> Vec<char> {
        SOLVED_FACELETS.chars().collect()
    }

    fn collect_facelets(facelets: Vec<char>) -> String {
        facelets.into_iter().collect()
    }
}
