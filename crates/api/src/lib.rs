use std::path::{Path, PathBuf};
use std::sync::Arc;

use axum::extract::State;
use axum::http::StatusCode;
use axum::routing::{get, post};
use axum::{Json, Router};
use cube_engine::{
    playback_facelet_solution, validate_facelet_string, Cube, CubeValidationError,
    FaceletConversionError, FaceletParseError, FaceletPlaybackError, FaceletString,
    GeneratedTwoPhaseSolver, Scramble, SearchBudget, SearchOutcome, SolveError, SolveInputError,
    SolverConfig, SolverStrategy,
};
use serde::{Deserialize, Serialize};
use tower_http::cors::CorsLayer;

pub const DEFAULT_API_ADDR: &str = "127.0.0.1:8787";
pub const DEFAULT_PRUNING_TABLE_DIR: &str = "crates/cube-engine/pruning-tables";

#[derive(Clone)]
pub struct ApiState {
    generated_solver: Option<Arc<GeneratedTwoPhaseSolver>>,
}

impl ApiState {
    pub fn without_generated_solver() -> Self {
        Self {
            generated_solver: None,
        }
    }

    pub fn load_generated_solver(directory: impl AsRef<Path>) -> Result<Self, String> {
        let solver = GeneratedTwoPhaseSolver::load_from_dir(directory.as_ref())
            .map_err(|error| error.to_string())?;

        Ok(Self {
            generated_solver: Some(Arc::new(solver)),
        })
    }

    pub fn generated_solver_ready(&self) -> bool {
        self.generated_solver.is_some()
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ApiConfig {
    pub addr: String,
    pub pruning_table_dir: PathBuf,
}

impl ApiConfig {
    pub fn from_env() -> Self {
        let addr = std::env::var("RUBIKS_API_ADDR").unwrap_or_else(|_| DEFAULT_API_ADDR.to_owned());
        let pruning_table_dir = std::env::var("RUBIKS_PRUNING_TABLE_DIR")
            .map(PathBuf::from)
            .unwrap_or_else(|_| PathBuf::from(DEFAULT_PRUNING_TABLE_DIR));

        Self {
            addr,
            pruning_table_dir,
        }
    }
}

pub fn api_router(state: ApiState) -> Router {
    Router::new()
        .route("/health", get(health))
        .route("/strategies", get(strategies))
        .route("/validate", post(validate))
        .route("/solve", post(solve))
        .route("/solve-notation", post(solve_notation))
        .route("/playback", post(playback))
        .layer(CorsLayer::permissive())
        .with_state(state)
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
pub struct HealthResponse {
    pub ok: bool,
    #[serde(rename = "generatedTwoPhaseReady")]
    pub generated_two_phase_ready: bool,
}

async fn health(State(state): State<ApiState>) -> Json<HealthResponse> {
    Json(HealthResponse {
        ok: true,
        generated_two_phase_ready: state.generated_solver_ready(),
    })
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
pub struct StrategyResponse {
    pub id: &'static str,
    pub label: &'static str,
    #[serde(rename = "solverMode")]
    pub solver_mode: &'static str,
    #[serde(rename = "statusText")]
    pub status_text: &'static str,
}

async fn strategies() -> Json<Vec<StrategyResponse>> {
    Json(
        SolverStrategy::ALL
            .into_iter()
            .map(|strategy| {
                let metadata = strategy.metadata();
                StrategyResponse {
                    id: metadata.id,
                    label: metadata.label,
                    solver_mode: metadata.solver_mode,
                    status_text: metadata.status_text,
                }
            })
            .collect(),
    )
}

#[derive(Clone, Debug, Eq, PartialEq, Deserialize)]
pub struct ValidateRequest {
    pub facelets: String,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
pub struct ValidateResponse {
    pub ok: bool,
    pub kind: Option<String>,
    pub message: Option<String>,
}

async fn validate(Json(request): Json<ValidateRequest>) -> (StatusCode, Json<ValidateResponse>) {
    match validate_facelet_string(&request.facelets) {
        Ok(()) => (
            StatusCode::OK,
            Json(ValidateResponse {
                ok: true,
                kind: None,
                message: None,
            }),
        ),
        Err(error) => (
            StatusCode::BAD_REQUEST,
            Json(ValidateResponse {
                ok: false,
                kind: Some(solve_input_error_kind(&error).to_owned()),
                message: Some(error.to_string()),
            }),
        ),
    }
}

#[derive(Clone, Debug, Eq, PartialEq, Deserialize)]
pub struct SolveRequest {
    pub facelets: String,
    #[serde(rename = "maxDepth", default = "default_max_depth")]
    pub max_depth: usize,
    #[serde(rename = "maxNodes")]
    pub max_nodes: Option<usize>,
    #[serde(rename = "strategyId", default = "default_strategy_id")]
    pub strategy_id: String,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
pub struct SolveResponse {
    pub ok: bool,
    pub status: String,
    #[serde(rename = "strategyId")]
    pub strategy_id: String,
    #[serde(rename = "strategyLabel")]
    pub strategy_label: String,
    #[serde(rename = "solverMode")]
    pub solver_mode: String,
    #[serde(rename = "generatedTableStatus")]
    pub generated_table_status: String,
    #[serde(rename = "maxDepth")]
    pub max_depth: usize,
    #[serde(rename = "maxNodes")]
    pub max_nodes: Option<usize>,
    pub moves: Vec<String>,
    pub length: Option<usize>,
    #[serde(rename = "exploredNodes")]
    pub explored_nodes: Option<usize>,
    #[serde(rename = "replayVerified")]
    pub replay_verified: Option<bool>,
    #[serde(rename = "inputFacelets")]
    pub input_facelets: Option<String>,
    #[serde(rename = "errorKind")]
    pub error_kind: Option<String>,
    pub message: Option<String>,
}

#[derive(Clone, Debug, Eq, PartialEq, Deserialize)]
pub struct SolveNotationRequest {
    pub moves: String,
    #[serde(rename = "maxDepth", default = "default_max_depth")]
    pub max_depth: usize,
    #[serde(rename = "maxNodes")]
    pub max_nodes: Option<usize>,
    #[serde(rename = "strategyId", default = "default_strategy_id")]
    pub strategy_id: String,
}

async fn solve(
    State(state): State<ApiState>,
    Json(request): Json<SolveRequest>,
) -> (StatusCode, Json<SolveResponse>) {
    solve_request(&state, request)
}

async fn solve_notation(
    State(state): State<ApiState>,
    Json(request): Json<SolveNotationRequest>,
) -> (StatusCode, Json<SolveResponse>) {
    solve_notation_request(&state, request)
}

pub fn solve_request(state: &ApiState, request: SolveRequest) -> (StatusCode, Json<SolveResponse>) {
    let Some(strategy) = SolverStrategy::from_id(&request.strategy_id) else {
        return (
            StatusCode::BAD_REQUEST,
            Json(error_response(
                &request,
                None,
                "unsupported_strategy",
                "unsupported_strategy",
                SolverStrategy::unsupported_strategy_message(&request.strategy_id),
            )),
        );
    };

    match strategy {
        SolverStrategy::GeneratedTwoPhase => solve_generated_request(state, request, strategy),
        SolverStrategy::BoundedIdaStar
        | SolverStrategy::TwoPhaseBaseline
        | SolverStrategy::OptimalIdaStarOrientationPdb => {
            solve_configured_request(request, strategy)
        }
    }
}

pub fn solve_notation_request(
    state: &ApiState,
    request: SolveNotationRequest,
) -> (StatusCode, Json<SolveResponse>) {
    let Some(strategy) = SolverStrategy::from_id(&request.strategy_id) else {
        return (
            StatusCode::BAD_REQUEST,
            Json(error_response_from_parts(
                &request.strategy_id,
                request.max_depth,
                request.max_nodes,
                None,
                "unsupported_strategy",
                "unsupported_strategy",
                SolverStrategy::unsupported_strategy_message(&request.strategy_id),
                None,
            )),
        );
    };
    let cube = match cube_from_notation(&request.moves) {
        Ok(cube) => cube,
        Err(message) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(error_response_from_parts(
                    &request.strategy_id,
                    request.max_depth,
                    request.max_nodes,
                    Some(strategy),
                    "invalid_notation",
                    "invalid_move_notation",
                    message,
                    None,
                )),
            );
        }
    };
    let input_facelets = FaceletString::from_cube(&cube).to_string();

    match strategy {
        SolverStrategy::GeneratedTwoPhase => solve_generated_cube(
            state,
            request.max_depth,
            request.max_nodes,
            strategy,
            cube,
            input_facelets,
        ),
        SolverStrategy::BoundedIdaStar
        | SolverStrategy::TwoPhaseBaseline
        | SolverStrategy::OptimalIdaStarOrientationPdb => solve_configured_cube(
            request.max_depth,
            request.max_nodes,
            strategy,
            &cube,
            input_facelets,
        ),
    }
}

fn solve_generated_request(
    state: &ApiState,
    request: SolveRequest,
    strategy: SolverStrategy,
) -> (StatusCode, Json<SolveResponse>) {
    let Some(solver) = &state.generated_solver else {
        return (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(error_response(
                &request,
                Some(strategy),
                "generated_tables_unavailable",
                "generated_tables_unavailable",
                "generated two-phase pruning tables are not loaded".to_owned(),
            )),
        );
    };
    let cube = match cube_from_facelets(&request.facelets) {
        Ok(cube) => cube,
        Err(message) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(error_response(
                    &request,
                    Some(strategy),
                    "invalid_input",
                    "invalid_input",
                    message,
                )),
            );
        }
    };
    let budget = SearchBudget::with_limits(request.max_depth, request.max_nodes);

    match solver.solve(&cube, budget) {
        Ok(result) => match result.outcome {
            SearchOutcome::Found(solution) => {
                let replay_verified = solution_solves(&cube, solution.moves());
                (
                    StatusCode::OK,
                    Json(success_response(
                        &request,
                        strategy,
                        solution.moves(),
                        solution.len(),
                        solution.explored_nodes(),
                        replay_verified,
                        Some(FaceletString::from_cube(&cube).to_string()),
                    )),
                )
            }
            SearchOutcome::NotFoundWithinLimits { explored_nodes } => (
                StatusCode::OK,
                Json(not_found_response(&request, strategy, explored_nodes)),
            ),
        },
        Err(error) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(error_response(
                &request,
                Some(strategy),
                "generated_tables_corrupt",
                "generated_tables_corrupt",
                error.to_string(),
            )),
        ),
    }
}

fn solve_configured_request(
    request: SolveRequest,
    strategy: SolverStrategy,
) -> (StatusCode, Json<SolveResponse>) {
    let config = SolverConfig::with_strategy(request.max_depth, request.max_nodes, strategy);

    match cube_engine::solve_facelet_string(&request.facelets, config) {
        Ok(solution) => (
            StatusCode::OK,
            Json(success_response(
                &request,
                strategy,
                solution.moves(),
                solution.length(),
                solution.explored_nodes(),
                true,
                Some(request.facelets.clone()),
            )),
        ),
        Err(SolveError::InvalidInput { error }) => (
            StatusCode::BAD_REQUEST,
            Json(error_response(
                &request,
                Some(strategy),
                "invalid_input",
                solve_input_error_kind(&error),
                error.to_string(),
            )),
        ),
        Err(SolveError::NotFoundWithinLimits { explored_nodes, .. }) => (
            StatusCode::OK,
            Json(not_found_response(&request, strategy, explored_nodes)),
        ),
        Err(SolveError::GeneratedTablesUnavailable { error, .. }) => (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(error_response(
                &request,
                Some(strategy),
                "generated_tables_unavailable",
                "generated_tables_unavailable",
                error.to_string(),
            )),
        ),
        Err(SolveError::GeneratedTablesCorrupt { error, .. }) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(error_response(
                &request,
                Some(strategy),
                "generated_tables_corrupt",
                "generated_tables_corrupt",
                error.to_string(),
            )),
        ),
    }
}

fn solve_generated_cube(
    state: &ApiState,
    max_depth: usize,
    max_nodes: Option<usize>,
    strategy: SolverStrategy,
    cube: Cube,
    input_facelets: String,
) -> (StatusCode, Json<SolveResponse>) {
    let Some(solver) = &state.generated_solver else {
        return (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(error_response_from_parts(
                strategy.id(),
                max_depth,
                max_nodes,
                Some(strategy),
                "generated_tables_unavailable",
                "generated_tables_unavailable",
                "generated two-phase pruning tables are not loaded".to_owned(),
                Some(input_facelets),
            )),
        );
    };
    let budget = SearchBudget::with_limits(max_depth, max_nodes);

    match solver.solve(&cube, budget) {
        Ok(result) => match result.outcome {
            SearchOutcome::Found(solution) => {
                let replay_verified = solution_solves(&cube, solution.moves());
                (
                    StatusCode::OK,
                    Json(success_response_from_parts(
                        max_depth,
                        max_nodes,
                        strategy,
                        solution.moves(),
                        solution.len(),
                        solution.explored_nodes(),
                        replay_verified,
                        Some(input_facelets),
                    )),
                )
            }
            SearchOutcome::NotFoundWithinLimits { explored_nodes } => (
                StatusCode::OK,
                Json(not_found_response_from_parts(
                    max_depth,
                    max_nodes,
                    strategy,
                    explored_nodes,
                    Some(input_facelets),
                )),
            ),
        },
        Err(error) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(error_response_from_parts(
                strategy.id(),
                max_depth,
                max_nodes,
                Some(strategy),
                "generated_tables_corrupt",
                "generated_tables_corrupt",
                error.to_string(),
                Some(input_facelets),
            )),
        ),
    }
}

fn solve_configured_cube(
    max_depth: usize,
    max_nodes: Option<usize>,
    strategy: SolverStrategy,
    cube: &Cube,
    input_facelets: String,
) -> (StatusCode, Json<SolveResponse>) {
    let config = SolverConfig::with_strategy(max_depth, max_nodes, strategy);

    match cube_engine::solve_cube(cube, config) {
        Ok(solution) => (
            StatusCode::OK,
            Json(success_response_from_parts(
                max_depth,
                max_nodes,
                strategy,
                solution.moves(),
                solution.length(),
                solution.explored_nodes(),
                true,
                Some(input_facelets),
            )),
        ),
        Err(SolveError::InvalidInput { error }) => (
            StatusCode::BAD_REQUEST,
            Json(error_response_from_parts(
                strategy.id(),
                max_depth,
                max_nodes,
                Some(strategy),
                "invalid_input",
                solve_input_error_kind(&error),
                error.to_string(),
                Some(input_facelets),
            )),
        ),
        Err(SolveError::NotFoundWithinLimits { explored_nodes, .. }) => (
            StatusCode::OK,
            Json(not_found_response_from_parts(
                max_depth,
                max_nodes,
                strategy,
                explored_nodes,
                Some(input_facelets),
            )),
        ),
        Err(SolveError::GeneratedTablesUnavailable { error, .. }) => (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(error_response_from_parts(
                strategy.id(),
                max_depth,
                max_nodes,
                Some(strategy),
                "generated_tables_unavailable",
                "generated_tables_unavailable",
                error.to_string(),
                Some(input_facelets),
            )),
        ),
        Err(SolveError::GeneratedTablesCorrupt { error, .. }) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(error_response_from_parts(
                strategy.id(),
                max_depth,
                max_nodes,
                Some(strategy),
                "generated_tables_corrupt",
                "generated_tables_corrupt",
                error.to_string(),
                Some(input_facelets),
            )),
        ),
    }
}

#[derive(Clone, Debug, Eq, PartialEq, Deserialize)]
pub struct PlaybackRequest {
    pub facelets: String,
    pub moves: String,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
pub struct PlaybackResponse {
    pub ok: bool,
    pub status: String,
    pub states: Vec<String>,
    #[serde(rename = "finalIsSolved")]
    pub final_is_solved: bool,
    #[serde(rename = "errorKind")]
    pub error_kind: Option<String>,
    pub message: Option<String>,
}

async fn playback(Json(request): Json<PlaybackRequest>) -> (StatusCode, Json<PlaybackResponse>) {
    match playback_facelet_solution(&request.facelets, &request.moves) {
        Ok(result) => (
            StatusCode::OK,
            Json(PlaybackResponse {
                ok: true,
                status: "success".to_owned(),
                states: result.states,
                final_is_solved: result.final_is_solved,
                error_kind: None,
                message: None,
            }),
        ),
        Err(error) => (
            StatusCode::BAD_REQUEST,
            Json(PlaybackResponse {
                ok: false,
                status: playback_error_status(&error).to_owned(),
                states: Vec::new(),
                final_is_solved: false,
                error_kind: Some(playback_error_kind(&error).to_owned()),
                message: Some(error.to_string()),
            }),
        ),
    }
}

fn success_response(
    request: &SolveRequest,
    strategy: SolverStrategy,
    moves: &[cube_engine::Move],
    length: usize,
    explored_nodes: usize,
    replay_verified: bool,
    input_facelets: Option<String>,
) -> SolveResponse {
    success_response_from_parts(
        request.max_depth,
        request.max_nodes,
        strategy,
        moves,
        length,
        explored_nodes,
        replay_verified,
        input_facelets,
    )
}

#[allow(clippy::too_many_arguments)]
fn success_response_from_parts(
    max_depth: usize,
    max_nodes: Option<usize>,
    strategy: SolverStrategy,
    moves: &[cube_engine::Move],
    length: usize,
    explored_nodes: usize,
    replay_verified: bool,
    input_facelets: Option<String>,
) -> SolveResponse {
    let metadata = strategy.metadata();
    SolveResponse {
        ok: true,
        status: "success".to_owned(),
        strategy_id: metadata.id.to_owned(),
        strategy_label: metadata.label.to_owned(),
        solver_mode: metadata.solver_mode.to_owned(),
        generated_table_status: generated_table_status(strategy).to_owned(),
        max_depth,
        max_nodes,
        moves: moves
            .iter()
            .map(|move_| move_.notation().to_owned())
            .collect(),
        length: Some(length),
        explored_nodes: Some(explored_nodes),
        replay_verified: Some(replay_verified),
        input_facelets,
        error_kind: None,
        message: None,
    }
}

fn not_found_response(
    request: &SolveRequest,
    strategy: SolverStrategy,
    explored_nodes: usize,
) -> SolveResponse {
    not_found_response_from_parts(
        request.max_depth,
        request.max_nodes,
        strategy,
        explored_nodes,
        Some(request.facelets.clone()),
    )
}

fn not_found_response_from_parts(
    max_depth: usize,
    max_nodes: Option<usize>,
    strategy: SolverStrategy,
    explored_nodes: usize,
    input_facelets: Option<String>,
) -> SolveResponse {
    let metadata = strategy.metadata();
    SolveResponse {
        ok: false,
        status: "not_found_within_limits".to_owned(),
        strategy_id: metadata.id.to_owned(),
        strategy_label: metadata.label.to_owned(),
        solver_mode: metadata.solver_mode.to_owned(),
        generated_table_status: generated_table_status(strategy).to_owned(),
        max_depth,
        max_nodes,
        moves: Vec::new(),
        length: None,
        explored_nodes: Some(explored_nodes),
        replay_verified: None,
        input_facelets,
        error_kind: None,
        message: Some(format!(
            "no solution found within limits: max_depth={}, max_nodes={}, explored_nodes={}",
            max_depth,
            max_nodes_label(max_nodes),
            explored_nodes,
        )),
    }
}

fn error_response(
    request: &SolveRequest,
    strategy: Option<SolverStrategy>,
    status: impl Into<String>,
    error_kind: impl Into<String>,
    message: String,
) -> SolveResponse {
    error_response_from_parts(
        &request.strategy_id,
        request.max_depth,
        request.max_nodes,
        strategy,
        status,
        error_kind,
        message,
        Some(request.facelets.clone()),
    )
}

#[allow(clippy::too_many_arguments)]
fn error_response_from_parts(
    strategy_id: &str,
    max_depth: usize,
    max_nodes: Option<usize>,
    strategy: Option<SolverStrategy>,
    status: impl Into<String>,
    error_kind: impl Into<String>,
    message: String,
    input_facelets: Option<String>,
) -> SolveResponse {
    let strategy = strategy.unwrap_or(SolverStrategy::BoundedIdaStar);
    let metadata = strategy.metadata();
    SolveResponse {
        ok: false,
        status: status.into(),
        strategy_id: strategy_id.to_owned(),
        strategy_label: metadata.label.to_owned(),
        solver_mode: metadata.solver_mode.to_owned(),
        generated_table_status: generated_table_status(strategy).to_owned(),
        max_depth,
        max_nodes,
        moves: Vec::new(),
        length: None,
        explored_nodes: None,
        replay_verified: None,
        input_facelets,
        error_kind: Some(error_kind.into()),
        message: Some(message),
    }
}

fn cube_from_facelets(input: &str) -> Result<Cube, String> {
    let facelets = FaceletString::parse(input).map_err(|error| error.to_string())?;
    let state = facelets
        .to_cubie_state()
        .map_err(|error| error.to_string())?;

    Cube::try_from_state(state).map_err(|error| error.to_string())
}

fn cube_from_notation(input: &str) -> Result<Cube, String> {
    let scramble = Scramble::parse(input).map_err(|error| error.to_string())?;
    let mut cube = Cube::solved();
    scramble.apply_to(&mut cube);

    Ok(cube)
}

fn solution_solves(start: &Cube, moves: &[cube_engine::Move]) -> bool {
    let mut cube = start.clone();
    cube.apply_moves(moves);

    cube.is_solved()
}

fn generated_table_status(strategy: SolverStrategy) -> &'static str {
    match strategy {
        SolverStrategy::GeneratedTwoPhase => "available",
        SolverStrategy::BoundedIdaStar
        | SolverStrategy::TwoPhaseBaseline
        | SolverStrategy::OptimalIdaStarOrientationPdb => "not_required",
    }
}

fn max_nodes_label(max_nodes: Option<usize>) -> String {
    max_nodes.map_or_else(|| "unlimited".to_owned(), |value| value.to_string())
}

fn default_max_depth() -> usize {
    30
}

fn default_strategy_id() -> String {
    SolverStrategy::GeneratedTwoPhase.id().to_owned()
}

fn solve_input_error_kind(error: &SolveInputError) -> &'static str {
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
    use super::{
        solve_notation_request, solve_request, ApiState, SolveNotationRequest, SolveRequest,
    };
    use axum::http::StatusCode;
    use cube_engine::{Cube, FaceletString, Move};

    #[test]
    fn bounded_strategy_solves_shallow_facelets_without_generated_tables() {
        let mut cube = Cube::solved();
        cube.apply_move(Move::F);
        let facelets = FaceletString::from_cube(&cube).to_string();
        let request = SolveRequest {
            facelets,
            max_depth: 1,
            max_nodes: Some(1_000),
            strategy_id: "bounded-ida-star".to_owned(),
        };

        let (status, response) = solve_request(&ApiState::without_generated_solver(), request);

        assert_eq!(status, StatusCode::OK);
        assert!(response.ok);
        assert_eq!(response.status, "success");
        assert_eq!(response.moves, vec!["F'"]);
        assert_eq!(response.replay_verified, Some(true));
    }

    #[test]
    fn generated_strategy_reports_unavailable_when_solver_not_loaded() {
        let request = SolveRequest {
            facelets: FaceletString::from_cube(&Cube::solved()).to_string(),
            max_depth: 30,
            max_nodes: Some(1_000),
            strategy_id: "generated-two-phase".to_owned(),
        };

        let (status, response) = solve_request(&ApiState::without_generated_solver(), request);

        assert_eq!(status, StatusCode::SERVICE_UNAVAILABLE);
        assert!(!response.ok);
        assert_eq!(response.status, "generated_tables_unavailable");
    }

    #[test]
    fn notation_request_solves_shallow_state_without_exposing_facelet_input() {
        let request = SolveNotationRequest {
            moves: "F".to_owned(),
            max_depth: 1,
            max_nodes: Some(1_000),
            strategy_id: "bounded-ida-star".to_owned(),
        };

        let (status, response) =
            solve_notation_request(&ApiState::without_generated_solver(), request);

        assert_eq!(status, StatusCode::OK);
        assert!(response.ok);
        assert_eq!(response.status, "success");
        assert_eq!(response.moves, vec!["F'"]);
        assert_eq!(response.replay_verified, Some(true));
        assert!(response.input_facelets.is_some());
    }

    #[test]
    fn notation_request_reports_invalid_notation() {
        let request = SolveNotationRequest {
            moves: "R Q".to_owned(),
            max_depth: 30,
            max_nodes: Some(1_000),
            strategy_id: "generated-two-phase".to_owned(),
        };

        let (status, response) =
            solve_notation_request(&ApiState::without_generated_solver(), request);

        assert_eq!(status, StatusCode::BAD_REQUEST);
        assert!(!response.ok);
        assert_eq!(response.status, "invalid_notation");
        assert_eq!(
            response.error_kind.as_deref(),
            Some("invalid_move_notation")
        );
    }

    #[test]
    fn unknown_strategy_returns_bad_request() {
        let request = SolveRequest {
            facelets: FaceletString::from_cube(&Cube::solved()).to_string(),
            max_depth: 30,
            max_nodes: Some(1_000),
            strategy_id: "unknown".to_owned(),
        };

        let (status, response) = solve_request(&ApiState::without_generated_solver(), request);

        assert_eq!(status, StatusCode::BAD_REQUEST);
        assert_eq!(response.status, "unsupported_strategy");
        assert_eq!(response.error_kind.as_deref(), Some("unsupported_strategy"));
    }
}
