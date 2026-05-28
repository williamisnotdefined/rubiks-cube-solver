use std::path::{Path, PathBuf};
use std::sync::Arc;

use axum::extract::{DefaultBodyLimit, State};
use axum::http::{header::CONTENT_TYPE, HeaderValue, Method, StatusCode};
use axum::routing::{get, post};
use axum::{Json, Router};
use cube_engine::{
    Cube, CubeValidationError, FaceletConversionError, FaceletParseError, FaceletString,
    GeneratedTwoPhaseSolver, Scramble, SearchBudget, SearchOutcome, SolveError, SolveInputError,
    SolverConfig, SolverStrategy,
};
use serde::{Deserialize, Serialize};
use tower_http::cors::{AllowOrigin, CorsLayer};

pub const DEFAULT_API_ADDR: &str = "127.0.0.1:8787";
pub const DEFAULT_PRUNING_TABLE_DIR: &str = "crates/cube-engine/pruning-tables";
pub const MAX_API_DEPTH: usize = 30;
pub const MAX_API_NODES: usize = 10_000_000;
pub const MAX_NOTATION_BYTES: usize = 4096;
pub const MAX_JSON_BODY_BYTES: usize = 8192;

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
        .route("/solve-notation", post(solve_notation))
        .layer(DefaultBodyLimit::max(MAX_JSON_BODY_BYTES))
        .layer(cors_layer())
        .with_state(state)
}

fn cors_layer() -> CorsLayer {
    CorsLayer::new()
        .allow_methods([Method::GET, Method::POST])
        .allow_headers([CONTENT_TYPE])
        .allow_origin(AllowOrigin::predicate(|origin, _request_head| {
            allowed_web_origin(origin)
        }))
}

fn allowed_web_origin(origin: &HeaderValue) -> bool {
    matches!(
        origin.to_str(),
        Ok("http://127.0.0.1:5173")
            | Ok("http://localhost:5173")
            | Ok("http://127.0.0.1:4173")
            | Ok("http://localhost:4173")
    )
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
    #[serde(rename = "visualState")]
    pub visual_state: Option<String>,
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

async fn solve_notation(
    State(state): State<ApiState>,
    Json(request): Json<SolveNotationRequest>,
) -> (StatusCode, Json<SolveResponse>) {
    solve_notation_request(&state, request)
}

pub fn solve_notation_request(
    state: &ApiState,
    request: SolveNotationRequest,
) -> (StatusCode, Json<SolveResponse>) {
    let request = match validate_solve_notation_request_limits(request) {
        Ok(request) => request,
        Err(response) => return (StatusCode::BAD_REQUEST, Json(*response)),
    };

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
    let visual_state = FaceletString::from_cube(&cube).to_string();

    match strategy {
        SolverStrategy::GeneratedTwoPhase | SolverStrategy::GeneratedTwoPhaseQuality => {
            solve_generated_cube(
                state,
                request.max_depth,
                request.max_nodes,
                strategy,
                cube,
                visual_state,
            )
        }
        SolverStrategy::BoundedIdaStar
        | SolverStrategy::TwoPhaseBaseline
        | SolverStrategy::OptimalIdaStarOrientationPdb
        | SolverStrategy::OptimalBoundedCornerPdb => solve_configured_cube(
            request.max_depth,
            request.max_nodes,
            strategy,
            &cube,
            visual_state,
        ),
    }
}

fn validate_solve_notation_request_limits(
    mut request: SolveNotationRequest,
) -> Result<SolveNotationRequest, Box<SolveResponse>> {
    if request.max_depth > MAX_API_DEPTH {
        return Err(Box::new(error_response_from_parts(
            &request.strategy_id,
            request.max_depth,
            request.max_nodes,
            None,
            "invalid_limits",
            "max_depth_exceeds_limit",
            format!(
                "maxDepth {} exceeds API limit {}",
                request.max_depth, MAX_API_DEPTH
            ),
            None,
        )));
    }

    if request.moves.len() > MAX_NOTATION_BYTES {
        return Err(Box::new(error_response_from_parts(
            &request.strategy_id,
            request.max_depth,
            request.max_nodes,
            None,
            "request_too_large",
            "notation_too_large",
            format!(
                "move notation payload is {} bytes; API limit is {} bytes",
                request.moves.len(),
                MAX_NOTATION_BYTES
            ),
            None,
        )));
    }

    match normalize_api_max_nodes(request.max_nodes) {
        Ok(max_nodes) => request.max_nodes = Some(max_nodes),
        Err((error_kind, message)) => {
            return Err(Box::new(error_response_from_parts(
                &request.strategy_id,
                request.max_depth,
                request.max_nodes,
                None,
                "invalid_limits",
                error_kind,
                message,
                None,
            )));
        }
    }

    Ok(request)
}

fn normalize_api_max_nodes(max_nodes: Option<usize>) -> Result<usize, (&'static str, String)> {
    let max_nodes = max_nodes.unwrap_or(MAX_API_NODES);

    if max_nodes > MAX_API_NODES {
        return Err((
            "max_nodes_exceeds_limit",
            format!("maxNodes {max_nodes} exceeds API limit {MAX_API_NODES}"),
        ));
    }

    Ok(max_nodes)
}

fn solve_generated_cube(
    state: &ApiState,
    max_depth: usize,
    max_nodes: Option<usize>,
    strategy: SolverStrategy,
    cube: Cube,
    visual_state: String,
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
                Some(visual_state),
            )),
        );
    };
    let budget = SearchBudget::with_limits(max_depth, max_nodes);

    let result = match strategy {
        SolverStrategy::GeneratedTwoPhase => solver.solve(&cube, budget),
        SolverStrategy::GeneratedTwoPhaseQuality => solver.solve_quality(&cube, budget),
        SolverStrategy::BoundedIdaStar
        | SolverStrategy::TwoPhaseBaseline
        | SolverStrategy::OptimalIdaStarOrientationPdb
        | SolverStrategy::OptimalBoundedCornerPdb => {
            unreachable!("non-generated strategies should use the configured API solver path")
        }
    };

    match result {
        Ok(result) => match result.outcome {
            SearchOutcome::Found(solution) => {
                let replay_verified = solution_solves(&cube, solution.moves());
                if !replay_verified {
                    return (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(unverified_solution_response_from_parts(
                            max_depth,
                            max_nodes,
                            strategy,
                            Some(visual_state),
                        )),
                    );
                }

                (
                    StatusCode::OK,
                    Json(success_response_from_parts(
                        max_depth,
                        max_nodes,
                        strategy,
                        solution.moves(),
                        solution.len(),
                        solution.explored_nodes(),
                        true,
                        Some(visual_state),
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
                    Some(visual_state),
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
                Some(visual_state),
            )),
        ),
    }
}

fn solve_configured_cube(
    max_depth: usize,
    max_nodes: Option<usize>,
    strategy: SolverStrategy,
    cube: &Cube,
    visual_state: String,
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
                Some(visual_state),
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
                Some(visual_state),
            )),
        ),
        Err(SolveError::NotFoundWithinLimits { explored_nodes, .. }) => (
            StatusCode::OK,
            Json(not_found_response_from_parts(
                max_depth,
                max_nodes,
                strategy,
                explored_nodes,
                Some(visual_state),
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
                Some(visual_state),
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
                Some(visual_state),
            )),
        ),
    }
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
    visual_state: Option<String>,
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
        visual_state,
        error_kind: None,
        message: None,
    }
}

fn not_found_response_from_parts(
    max_depth: usize,
    max_nodes: Option<usize>,
    strategy: SolverStrategy,
    explored_nodes: usize,
    visual_state: Option<String>,
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
        visual_state,
        error_kind: None,
        message: Some(format!(
            "no solution found within limits: max_depth={}, max_nodes={}, explored_nodes={}",
            max_depth,
            max_nodes_label(max_nodes),
            explored_nodes,
        )),
    }
}

fn unverified_solution_response_from_parts(
    max_depth: usize,
    max_nodes: Option<usize>,
    strategy: SolverStrategy,
    visual_state: Option<String>,
) -> SolveResponse {
    error_response_from_parts(
        strategy.id(),
        max_depth,
        max_nodes,
        Some(strategy),
        "unverified_solution",
        "unverified_solution",
        "solver returned a solution that failed replay verification".to_owned(),
        visual_state,
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
    visual_state: Option<String>,
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
        visual_state,
        error_kind: Some(error_kind.into()),
        message: Some(message),
    }
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
        SolverStrategy::GeneratedTwoPhase
        | SolverStrategy::GeneratedTwoPhaseQuality
        | SolverStrategy::OptimalBoundedCornerPdb => "available",
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
        api_router, solve_notation_request, unverified_solution_response_from_parts, ApiState,
        SolveNotationRequest, MAX_API_DEPTH, MAX_API_NODES, MAX_NOTATION_BYTES,
    };
    use axum::{
        body::Body,
        http::{Method, Request, StatusCode},
    };
    use cube_engine::SolverStrategy;
    use tower::ServiceExt;

    #[test]
    fn notation_strategy_solves_shallow_state_without_generated_tables() {
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
        assert!(response.visual_state.is_some());
    }

    #[test]
    fn generated_strategy_reports_unavailable_when_solver_not_loaded() {
        let request = SolveNotationRequest {
            moves: String::new(),
            max_depth: 30,
            max_nodes: Some(1_000),
            strategy_id: "generated-two-phase".to_owned(),
        };

        let (status, response) =
            solve_notation_request(&ApiState::without_generated_solver(), request);

        assert_eq!(status, StatusCode::SERVICE_UNAVAILABLE);
        assert!(!response.ok);
        assert_eq!(response.status, "generated_tables_unavailable");
    }

    #[test]
    fn generated_quality_strategy_reports_unavailable_when_solver_not_loaded() {
        let request = SolveNotationRequest {
            moves: String::new(),
            max_depth: 30,
            max_nodes: Some(1_000),
            strategy_id: "generated-two-phase-quality".to_owned(),
        };

        let (status, response) =
            solve_notation_request(&ApiState::without_generated_solver(), request);

        assert_eq!(status, StatusCode::SERVICE_UNAVAILABLE);
        assert!(!response.ok);
        assert_eq!(response.status, "generated_tables_unavailable");
        assert_eq!(response.strategy_id, "generated-two-phase-quality");
        assert_eq!(response.solver_mode, "generated_two_phase_quality");
    }

    #[test]
    fn strategy_metadata_includes_quality_solver() {
        let metadata = SolverStrategy::GeneratedTwoPhaseQuality.metadata();
        let corner_metadata = SolverStrategy::OptimalBoundedCornerPdb.metadata();

        assert!(SolverStrategy::ALL
            .into_iter()
            .any(|strategy| strategy == SolverStrategy::GeneratedTwoPhaseQuality));
        assert!(SolverStrategy::ALL
            .into_iter()
            .any(|strategy| strategy == SolverStrategy::OptimalBoundedCornerPdb));
        assert_eq!(metadata.id, "generated-two-phase-quality");
        assert_eq!(metadata.solver_mode, "generated_two_phase_quality");
        assert_eq!(corner_metadata.id, "optimal-bounded-corner-pdb");
        assert_eq!(corner_metadata.solver_mode, "optimal_bounded_corner_pdb");
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
    fn notation_request_defaults_missing_max_nodes_to_api_cap() {
        let request = SolveNotationRequest {
            moves: String::new(),
            max_depth: 0,
            max_nodes: None,
            strategy_id: "bounded-ida-star".to_owned(),
        };

        let (status, response) =
            solve_notation_request(&ApiState::without_generated_solver(), request);

        assert_eq!(status, StatusCode::OK);
        assert!(response.ok);
        assert_eq!(response.max_nodes, Some(MAX_API_NODES));
    }

    #[test]
    fn notation_request_rejects_excessive_depth() {
        let request = SolveNotationRequest {
            moves: String::new(),
            max_depth: MAX_API_DEPTH + 1,
            max_nodes: Some(1_000),
            strategy_id: "bounded-ida-star".to_owned(),
        };

        let (status, response) =
            solve_notation_request(&ApiState::without_generated_solver(), request);

        assert_eq!(status, StatusCode::BAD_REQUEST);
        assert!(!response.ok);
        assert_eq!(response.status, "invalid_limits");
        assert_eq!(
            response.error_kind.as_deref(),
            Some("max_depth_exceeds_limit")
        );
    }

    #[test]
    fn notation_request_rejects_excessive_nodes() {
        let request = SolveNotationRequest {
            moves: String::new(),
            max_depth: 0,
            max_nodes: Some(MAX_API_NODES + 1),
            strategy_id: "bounded-ida-star".to_owned(),
        };

        let (status, response) =
            solve_notation_request(&ApiState::without_generated_solver(), request);

        assert_eq!(status, StatusCode::BAD_REQUEST);
        assert!(!response.ok);
        assert_eq!(response.status, "invalid_limits");
        assert_eq!(
            response.error_kind.as_deref(),
            Some("max_nodes_exceeds_limit")
        );
    }

    #[test]
    fn notation_request_rejects_large_payload_before_parse() {
        let request = SolveNotationRequest {
            moves: "R".repeat(MAX_NOTATION_BYTES + 1),
            max_depth: 0,
            max_nodes: Some(1_000),
            strategy_id: "bounded-ida-star".to_owned(),
        };

        let (status, response) =
            solve_notation_request(&ApiState::without_generated_solver(), request);

        assert_eq!(status, StatusCode::BAD_REQUEST);
        assert!(!response.ok);
        assert_eq!(response.status, "request_too_large");
        assert_eq!(response.error_kind.as_deref(), Some("notation_too_large"));
    }

    #[test]
    fn unverified_solution_response_is_not_successful() {
        let response = unverified_solution_response_from_parts(
            30,
            Some(1_000),
            SolverStrategy::GeneratedTwoPhase,
            Some("visual-state".to_owned()),
        );

        assert!(!response.ok);
        assert_eq!(response.status, "unverified_solution");
        assert_eq!(response.replay_verified, None);
        assert!(response.moves.is_empty());
    }

    #[tokio::test]
    async fn legacy_solve_route_is_not_exposed() {
        let app = api_router(ApiState::without_generated_solver());
        let response = app
            .oneshot(
                Request::builder()
                    .method(Method::POST)
                    .uri("/solve")
                    .header("content-type", "application/json")
                    .body(Body::from("{}"))
                    .expect("request should build"),
            )
            .await
            .expect("request should complete");

        assert_eq!(response.status(), StatusCode::NOT_FOUND);
    }

    #[tokio::test]
    async fn cors_allows_local_web_origins_only() {
        let app = api_router(ApiState::without_generated_solver());
        let allowed = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(Method::OPTIONS)
                    .uri("/health")
                    .header("origin", "http://127.0.0.1:5173")
                    .header("access-control-request-method", "GET")
                    .body(Body::empty())
                    .expect("preflight request should build"),
            )
            .await
            .expect("preflight request should complete");

        assert_eq!(
            allowed.headers().get("access-control-allow-origin"),
            Some(&"http://127.0.0.1:5173".parse().expect("origin header"))
        );

        let blocked = app
            .oneshot(
                Request::builder()
                    .method(Method::OPTIONS)
                    .uri("/health")
                    .header("origin", "https://example.com")
                    .header("access-control-request-method", "GET")
                    .body(Body::empty())
                    .expect("preflight request should build"),
            )
            .await
            .expect("preflight request should complete");

        assert!(blocked
            .headers()
            .get("access-control-allow-origin")
            .is_none());
    }

    #[test]
    fn unknown_strategy_returns_bad_request() {
        let request = SolveNotationRequest {
            moves: String::new(),
            max_depth: 30,
            max_nodes: Some(1_000),
            strategy_id: "unknown".to_owned(),
        };

        let (status, response) =
            solve_notation_request(&ApiState::without_generated_solver(), request);

        assert_eq!(status, StatusCode::BAD_REQUEST);
        assert_eq!(response.status, "unsupported_strategy");
        assert_eq!(response.error_kind.as_deref(), Some("unsupported_strategy"));
    }
}
