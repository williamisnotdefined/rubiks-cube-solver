use cube_engine::search::pruning::GENERATED_PRUNING_TABLE_SPECS;
use cube_engine::solver::SolverStrategyMetadata as EngineSolverStrategyMetadata;
use cube_engine::{
    playback_facelet_solution as playback_engine_facelet_solution,
    solve_facelet_string as solve_engine_facelet_string,
    solve_facelet_string_with_generated_pruning_tables as solve_engine_facelet_string_with_generated_pruning_tables,
    validate_facelet_string as validate_engine_facelet_string, Cube, CubeValidationError,
    FaceletConversionError, FaceletParseError, FaceletPlaybackError,
    FaceletPlaybackResult as EngineFaceletPlaybackResult, FaceletString,
    GeneratedPruningTableArtifact, SolveError, SolveInputError, SolveResult, SolverConfig,
    SolverStrategy,
};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn solved_facelet_string() -> String {
    FaceletString::from_cube(&Cube::solved()).to_string()
}

#[wasm_bindgen]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SolverStrategyMetadata {
    id: String,
    label: String,
    solver_mode: String,
    status_text: String,
}

#[wasm_bindgen]
impl SolverStrategyMetadata {
    #[wasm_bindgen(getter)]
    pub fn id(&self) -> String {
        self.id.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn label(&self) -> String {
        self.label.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn solver_mode(&self) -> String {
        self.solver_mode.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn status_text(&self) -> String {
        self.status_text.clone()
    }
}

impl SolverStrategyMetadata {
    fn from_engine(metadata: EngineSolverStrategyMetadata) -> Self {
        Self {
            id: metadata.id.to_owned(),
            label: metadata.label.to_owned(),
            solver_mode: metadata.solver_mode.to_owned(),
            status_text: metadata.status_text.to_owned(),
        }
    }
}

#[wasm_bindgen]
pub fn solver_strategy_count() -> usize {
    SolverStrategy::ALL.len()
}

#[wasm_bindgen]
pub fn solver_strategy_metadata(index: usize) -> SolverStrategyMetadata {
    SolverStrategyMetadata::from_engine(SolverStrategy::ALL[index].metadata())
}

#[wasm_bindgen]
pub fn supported_solver_strategy_ids() -> String {
    SolverStrategy::supported_strategy_ids()
}

#[wasm_bindgen]
pub fn generated_pruning_table_artifact_count() -> usize {
    GENERATED_PRUNING_TABLE_SPECS.len()
}

#[wasm_bindgen]
pub fn generated_pruning_table_file_name(index: usize) -> String {
    GENERATED_PRUNING_TABLE_SPECS[index].file_name.to_owned()
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
            message: Some(SolverStrategy::unsupported_strategy_message(
                displayed_strategy,
            )),
        }
    }

    fn failure(error: SolveError, request_config: SolverConfig) -> Self {
        match error {
            SolveError::InvalidInput { error } => Self::invalid_input(error, request_config),
            SolveError::GeneratedTablesUnavailable { config, error } => {
                let message = SolveError::GeneratedTablesUnavailable {
                    config: config.clone(),
                    error,
                }
                .to_string();

                Self {
                    status: "generated_tables_unavailable".to_owned(),
                    ok: false,
                    moves: Vec::new(),
                    length: 0,
                    max_depth: config.max_depth,
                    max_nodes: config.max_nodes,
                    strategy_id: config.strategy.id().to_owned(),
                    strategy_label: config.strategy.label().to_owned(),
                    solver_mode: config.strategy.solver_mode().to_owned(),
                    explored_nodes: None,
                    error_kind: Some("generated_tables_unavailable".to_owned()),
                    message: Some(message),
                }
            }
            SolveError::GeneratedTablesCorrupt { config, error } => {
                let message = SolveError::GeneratedTablesCorrupt {
                    config: config.clone(),
                    error,
                }
                .to_string();

                Self {
                    status: "generated_tables_corrupt".to_owned(),
                    ok: false,
                    moves: Vec::new(),
                    length: 0,
                    max_depth: config.max_depth,
                    max_nodes: config.max_nodes,
                    strategy_id: config.strategy.id().to_owned(),
                    strategy_label: config.strategy.label().to_owned(),
                    solver_mode: config.strategy.solver_mode().to_owned(),
                    explored_nodes: None,
                    error_kind: Some("generated_tables_corrupt".to_owned()),
                    message: Some(message),
                }
            }
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

    solve_facelets_with_config(input, config)
}

#[wasm_bindgen]
pub fn solve_facelet_string_with_strategy(
    input: &str,
    max_depth: usize,
    max_nodes: Option<usize>,
    strategy_id: &str,
) -> FaceletSolveResult {
    let requested_strategy = strategy_id.trim();

    let Some(strategy) = SolverStrategy::from_id(requested_strategy) else {
        return FaceletSolveResult::unsupported_strategy(requested_strategy, max_depth, max_nodes);
    };

    let config = SolverConfig::with_strategy(max_depth, max_nodes, strategy);

    solve_facelets_with_config(input, config)
}

#[wasm_bindgen]
pub fn solve_facelet_string_with_generated_pruning_tables(
    input: &str,
    max_depth: usize,
    max_nodes: Option<usize>,
    table0_available: bool,
    table0_bytes: &[u8],
    table1_available: bool,
    table1_bytes: &[u8],
    table2_available: bool,
    table2_bytes: &[u8],
    table3_available: bool,
    table3_bytes: &[u8],
    table4_available: bool,
    table4_bytes: &[u8],
) -> FaceletSolveResult {
    let artifacts = [
        generated_artifact(table0_available, table0_bytes),
        generated_artifact(table1_available, table1_bytes),
        generated_artifact(table2_available, table2_bytes),
        generated_artifact(table3_available, table3_bytes),
        generated_artifact(table4_available, table4_bytes),
    ];
    let config =
        SolverConfig::with_strategy(max_depth, max_nodes, SolverStrategy::GeneratedTwoPhase);

    match solve_engine_facelet_string_with_generated_pruning_tables(
        input, max_depth, max_nodes, &artifacts,
    ) {
        Ok(result) => FaceletSolveResult::success(result, config),
        Err(error) => FaceletSolveResult::failure(error, config),
    }
}

fn solve_facelets_with_config(input: &str, config: SolverConfig) -> FaceletSolveResult {
    match solve_engine_facelet_string(input, config.clone()) {
        Ok(result) => FaceletSolveResult::success(result, config),
        Err(error) => FaceletSolveResult::failure(error, config),
    }
}

fn generated_artifact<'a>(available: bool, bytes: &'a [u8]) -> GeneratedPruningTableArtifact<'a> {
    if available {
        GeneratedPruningTableArtifact::available(bytes)
    } else {
        GeneratedPruningTableArtifact::unavailable()
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
    use cube_engine::search::pruning::{
        generate_all_pruning_tables, GENERATED_PRUNING_TABLE_SPECS,
    };
    use cube_engine::solver::quality::{
        quality_fixtures, QualityExpectation, QualitySolverSelection,
    };
    use cube_engine::{Algorithm, Move};
    use std::fs;
    use std::path::{Path, PathBuf};
    use std::sync::OnceLock;

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
    fn solver_strategy_metadata_exposes_engine_owned_options() {
        assert_eq!(solver_strategy_count(), 3);
        assert_eq!(
            supported_solver_strategy_ids(),
            "bounded-ida-star, two-phase-baseline, generated-two-phase"
        );

        let bounded = solver_strategy_metadata(0);
        assert_eq!(bounded.id(), "bounded-ida-star");
        assert_eq!(bounded.label(), "Bounded IDA*");
        assert_eq!(bounded.solver_mode(), "bounded_ida_star");
        assert!(bounded.status_text().contains("Default product fallback"));

        let generated = solver_strategy_metadata(2);
        assert_eq!(generated.id(), "generated-two-phase");
        assert_eq!(generated.label(), "Generated two-phase solver");
        assert_eq!(generated.solver_mode(), "generated_two_phase");
        assert!(generated.status_text().contains("Generated-table solver"));
    }

    #[test]
    fn generated_pruning_table_artifact_metadata_is_exported() {
        assert_eq!(
            generated_pruning_table_artifact_count(),
            GENERATED_PRUNING_TABLE_SPECS.len()
        );

        for (index, spec) in GENERATED_PRUNING_TABLE_SPECS.iter().enumerate() {
            assert_eq!(generated_pruning_table_file_name(index), spec.file_name);
        }
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
        assert!(result
            .message()
            .is_some_and(|message| message.contains("two-phase-baseline")));
        assert!(result
            .message()
            .is_some_and(|message| message.contains("generated-two-phase")));
    }

    #[test]
    fn strategy_aware_solve_delegates_generated_two_phase() {
        let result =
            solve_facelet_string_with_strategy(SOLVED_FACELETS, 0, None, "generated-two-phase");

        assert_eq!(result.strategy_id(), "generated-two-phase");
        assert_eq!(result.strategy_label(), "Generated two-phase solver");
        assert_eq!(result.solver_mode(), "generated_two_phase");
        assert!(matches!(
            result.status().as_str(),
            "success" | "generated_tables_unavailable" | "generated_tables_corrupt"
        ));
    }

    #[test]
    fn generated_two_phase_missing_tables_maps_to_stable_status() {
        let config = SolverConfig::with_strategy(0, None, SolverStrategy::GeneratedTwoPhase)
            .with_pruning_table_dir(missing_pruning_table_dir());
        let result = solve_facelets_with_config(SOLVED_FACELETS, config);

        assert!(!result.ok());
        assert_eq!(result.status(), "generated_tables_unavailable");
        assert!(result.moves().is_empty());
        assert_eq!(result.length(), 0);
        assert_eq!(result.max_depth(), 0);
        assert_eq!(result.max_nodes(), None);
        assert_eq!(result.strategy_id(), "generated-two-phase");
        assert_eq!(result.strategy_label(), "Generated two-phase solver");
        assert_eq!(result.solver_mode(), "generated_two_phase");
        assert_eq!(result.explored_nodes(), None);
        assert_eq!(
            result.error_kind().as_deref(),
            Some("generated_tables_unavailable")
        );
        assert!(result.message().is_some_and(
            |message| message.contains("generated two-phase pruning tables are unavailable")
        ));
    }

    #[test]
    fn generated_two_phase_missing_artifact_bytes_maps_to_stable_status() {
        let result = solve_facelet_string_with_generated_pruning_tables(
            SOLVED_FACELETS,
            0,
            None,
            false,
            &[],
            false,
            &[],
            false,
            &[],
            false,
            &[],
            false,
            &[],
        );

        assert_generated_table_error_shape(
            &result,
            "generated_tables_unavailable",
            "generated_tables_unavailable",
            0,
            None,
        );
        assert_default_bounded_solver_still_succeeds();
    }

    #[test]
    fn generated_two_phase_incomplete_artifact_bytes_maps_to_stable_status() {
        let bytes = depth_six_generated_artifact_bytes();
        let mut artifacts = available_artifacts_from_bytes(bytes);
        artifacts[2] = (false, Vec::new());
        let result = solve_with_generated_artifacts(SOLVED_FACELETS, 0, None, &artifacts);

        assert_generated_table_error_shape(
            &result,
            "generated_tables_unavailable",
            "generated_tables_unavailable",
            0,
            None,
        );
        assert_default_bounded_solver_still_succeeds();
    }

    #[test]
    fn generated_two_phase_corrupt_artifact_bytes_maps_to_stable_status() {
        let corrupt_bytes = b"not a pruning-table artifact";
        let result = solve_facelet_string_with_generated_pruning_tables(
            SOLVED_FACELETS,
            0,
            None,
            true,
            corrupt_bytes,
            false,
            &[],
            false,
            &[],
            false,
            &[],
            false,
            &[],
        );

        assert_generated_table_error_shape(
            &result,
            "generated_tables_corrupt",
            "generated_tables_corrupt",
            0,
            None,
        );
        assert_default_bounded_solver_still_succeeds();
    }

    #[test]
    fn generated_two_phase_incompatible_artifact_bytes_maps_to_stable_status() {
        let bytes = depth_six_generated_artifact_bytes();
        let mut incompatible = bytes.to_vec();
        incompatible.swap(0, 1);
        let result = solve_with_generated_artifact_bytes(SOLVED_FACELETS, 0, None, &incompatible);

        assert_generated_table_error_shape(
            &result,
            "generated_tables_corrupt",
            "generated_tables_corrupt",
            0,
            None,
        );
        assert_default_bounded_solver_still_succeeds();
    }

    #[test]
    fn generated_two_phase_artifact_bytes_solve_and_playback_verify() {
        let bytes = depth_six_generated_artifact_bytes();
        let required_fixtures = quality_fixtures()
            .expect("shared quality fixture catalog should build")
            .into_iter()
            .filter(|fixture| {
                fixture
                    .solver_expectations
                    .for_selection(QualitySolverSelection::GeneratedTwoPhase)
                    == QualityExpectation::RequiredSuccess
            })
            .collect::<Vec<_>>();
        let required_fixture_ids = required_fixtures
            .iter()
            .map(|fixture| fixture.id)
            .collect::<Vec<_>>();
        let expected_required_fixture_ids = [
            "solved-facelets",
            "solved-cubie",
            "shallow-facelets-f",
            "shallow-cubie-r-u",
            "nontrivial-facelets-r-u-rprime-uprime",
            "nontrivial-cubie-r-u-rprime-uprime",
            "generated-mid-depth-facelets-phase2-five-move",
            "generated-mid-depth-cubie-phase2-five-move",
        ];

        for expected_id in expected_required_fixture_ids {
            assert!(
                required_fixture_ids.contains(&expected_id),
                "shared generated two-phase required fixture set should include {expected_id}"
            );
        }

        for fixture in required_fixtures {
            let result = solve_with_generated_artifact_bytes(
                &fixture.facelets,
                fixture.max_depth,
                fixture.max_nodes,
                bytes,
            );

            assert_successful_generated_solve_shape(
                &fixture.facelets,
                &result,
                fixture.max_depth,
                fixture.max_nodes,
            );
        }
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

    fn assert_generated_strategy_metadata(result: &FaceletSolveResult) {
        assert_eq!(result.strategy_id(), "generated-two-phase");
        assert_eq!(result.strategy_label(), "Generated two-phase solver");
        assert_eq!(result.solver_mode(), "generated_two_phase");
    }

    fn assert_generated_table_error_shape(
        result: &FaceletSolveResult,
        expected_status: &str,
        expected_error_kind: &str,
        expected_max_depth: usize,
        expected_max_nodes: Option<usize>,
    ) {
        assert!(!result.ok());
        assert_eq!(result.status(), expected_status);
        assert!(result.moves().is_empty());
        assert_eq!(result.length(), 0);
        assert_eq!(result.max_depth(), expected_max_depth);
        assert_eq!(result.max_nodes(), expected_max_nodes);
        assert_generated_strategy_metadata(result);
        assert_eq!(result.explored_nodes(), None);
        assert_eq!(result.error_kind().as_deref(), Some(expected_error_kind));
        assert!(result.message().is_some_and(|message| !message.is_empty()));
    }

    fn assert_successful_generated_solve_shape(
        input: &str,
        result: &FaceletSolveResult,
        expected_max_depth: usize,
        expected_max_nodes: Option<usize>,
    ) {
        assert!(
            result.ok(),
            "generated solve failed: {:?}",
            result.message()
        );
        assert_eq!(result.status(), "success");
        assert_eq!(result.max_depth(), expected_max_depth);
        assert_eq!(result.max_nodes(), expected_max_nodes);
        assert_generated_strategy_metadata(result);
        assert!(result.explored_nodes().is_some_and(|nodes| nodes > 0));
        assert_eq!(result.error_kind(), None);
        assert_eq!(result.message(), None);

        let moves = result.moves();
        assert_eq!(result.length(), moves.len());
        assert_notation_solves_facelets(input, &moves);

        let playback = playback_facelet_solution(input, &moves.join(" "));
        assert!(playback.ok());
        assert!(playback.final_is_solved());
        assert_eq!(playback.states().len(), moves.len() + 1);
    }

    fn assert_default_bounded_solver_still_succeeds() {
        let input = facelet_string_for(&[Move::R, Move::U]);
        let result = solve_facelet_string(&input, 2, Some(10_000));

        assert!(result.ok());
        assert_eq!(result.status(), "success");
        assert_eq!(result.max_depth(), 2);
        assert_eq!(result.max_nodes(), Some(10_000));
        assert_bounded_strategy_metadata(&result);
        assert!(result.explored_nodes().is_some_and(|nodes| nodes > 0));
        assert_notation_solves_facelets(&input, &result.moves());
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

    fn solve_with_generated_artifact_bytes(
        input: &str,
        max_depth: usize,
        max_nodes: Option<usize>,
        bytes: &[Vec<u8>],
    ) -> FaceletSolveResult {
        solve_facelet_string_with_generated_pruning_tables(
            input, max_depth, max_nodes, true, &bytes[0], true, &bytes[1], true, &bytes[2], true,
            &bytes[3], true, &bytes[4],
        )
    }

    fn solve_with_generated_artifacts(
        input: &str,
        max_depth: usize,
        max_nodes: Option<usize>,
        artifacts: &[(bool, Vec<u8>)],
    ) -> FaceletSolveResult {
        assert_eq!(artifacts.len(), GENERATED_PRUNING_TABLE_SPECS.len());

        solve_facelet_string_with_generated_pruning_tables(
            input,
            max_depth,
            max_nodes,
            artifacts[0].0,
            &artifacts[0].1,
            artifacts[1].0,
            &artifacts[1].1,
            artifacts[2].0,
            &artifacts[2].1,
            artifacts[3].0,
            &artifacts[3].1,
            artifacts[4].0,
            &artifacts[4].1,
        )
    }

    fn available_artifacts_from_bytes(bytes: &[Vec<u8>]) -> Vec<(bool, Vec<u8>)> {
        bytes.iter().cloned().map(|bytes| (true, bytes)).collect()
    }

    fn depth_six_generated_artifact_bytes() -> &'static [Vec<u8>] {
        static GENERATED_ARTIFACT_BYTES: OnceLock<Vec<Vec<u8>>> = OnceLock::new();

        GENERATED_ARTIFACT_BYTES.get_or_init(|| {
            let directory = temp_pruning_table_dir("depth-six-generated-artifacts");
            generate_all_pruning_tables(&directory, 6, 6)
                .expect("depth-six generated pruning tables should build for WASM test");
            let bytes = generated_artifact_bytes(&directory);
            let _ = fs::remove_dir_all(directory);

            bytes
        })
    }

    fn generated_artifact_bytes(directory: &Path) -> Vec<Vec<u8>> {
        GENERATED_PRUNING_TABLE_SPECS
            .iter()
            .map(|spec| {
                fs::read(spec.file_path(directory)).unwrap_or_else(|error| {
                    panic!("{} should be readable: {error}", spec.file_name)
                })
            })
            .collect()
    }

    fn missing_pruning_table_dir() -> PathBuf {
        temp_pruning_table_dir("missing-pruning-tables")
    }

    fn temp_pruning_table_dir(name: &str) -> PathBuf {
        let nonce = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .expect("system time should be after UNIX epoch")
            .as_nanos();

        std::env::temp_dir().join(format!(
            "rubiks-cube-solver-wasm-{name}-{}-{nonce}",
            std::process::id()
        ))
    }
}
