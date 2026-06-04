use std::path::PathBuf;
use std::time::Duration;

use axum::extract::{DefaultBodyLimit, Path, State};
use axum::http::{header::CONTENT_TYPE, HeaderValue, Method, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use axum::{Json, Router};
use cube_engine::{PuzzleId, SolverStrategy};
use tower_http::cors::{AllowOrigin, CorsLayer};
use tower_http::services::{ServeDir, ServeFile};

use crate::config::{MAX_JSON_BODY_BYTES, MAX_SCAN_SESSION_BODY_BYTES};
use crate::puzzle::{
    list_puzzles_response, puzzle_response_by_slug, puzzle_strategy_responses_by_slug,
    solve_puzzle_request,
};
use crate::response::{
    AnalyzeScanFaceRequest, AnalyzeScanFaceResponse, HealthResponse, PuzzleSolveRequest,
    PuzzleSolveResponse, ScanSessionRequest, ScanSessionResponse, SolveNotationRequest,
    SolveResponse, SolveScanRequest, StrategyResponse,
};
use crate::scan_analysis::{
    analyze_scan_face_request, solve_scan_session_request, solve_scan_session_request_for_puzzle,
};
use crate::solve::{solve_notation_request, solve_scan_request};
use crate::state::ApiState;

const HEALTH_VISION_TIMEOUT: Duration = Duration::from_millis(250);

#[derive(serde::Deserialize)]
struct VisionHealthResponse {
    ok: bool,
    #[serde(rename = "cnnAvailable", default)]
    cnn_available: bool,
    #[serde(rename = "cnnReason", default)]
    cnn_reason: Option<String>,
    #[serde(rename = "tileDetectorAvailable", default)]
    tile_detector_available: bool,
    #[serde(rename = "tileDetectorReason", default)]
    tile_detector_reason: Option<String>,
}

pub fn api_router(state: ApiState) -> Router {
    Router::new()
        .route("/health", get(health))
        .route("/puzzles", get(puzzles))
        .route("/puzzles/:puzzle_slug", get(puzzle_detail))
        .route("/puzzles/:puzzle_slug/strategies", get(puzzle_strategies))
        .route("/puzzles/:puzzle_slug/solve", post(solve_puzzle))
        .route("/strategies", get(strategies))
        .route("/scan/analyze-face", post(analyze_scan_face))
        .route(
            "/scan/solve-session",
            post(solve_scan_session).layer(DefaultBodyLimit::max(MAX_SCAN_SESSION_BODY_BYTES)),
        )
        .route(
            "/puzzles/:puzzle_slug/scan/solve-session",
            post(solve_puzzle_scan_session)
                .layer(DefaultBodyLimit::max(MAX_SCAN_SESSION_BODY_BYTES)),
        )
        .route("/solve-notation", post(solve_notation))
        .route("/solve-scan", post(solve_scan))
        .layer(DefaultBodyLimit::max(MAX_JSON_BODY_BYTES))
        .layer(cors_layer())
        .with_state(state)
}

pub fn api_router_with_web_dist(state: ApiState, web_dist_dir: PathBuf) -> Router {
    let index_file = web_dist_dir.join("index.html");

    api_router(state)
        .fallback_service(ServeDir::new(web_dist_dir).fallback(ServeFile::new(index_file)))
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

async fn health(State(state): State<ApiState>) -> Json<HealthResponse> {
    let vision_health = request_vision_health(&state).await;
    let vision_ok = vision_health.as_ref().is_some_and(|health| health.ok);
    let vision_cnn_available = vision_health
        .as_ref()
        .is_some_and(|health| health.cnn_available);
    let vision_tile_detector_available = vision_health
        .as_ref()
        .is_some_and(|health| health.tile_detector_available);

    Json(HealthResponse {
        ok: true,
        generated_two_phase_ready: state.generated_solver_ready(),
        vision_ok,
        vision_cnn_available,
        vision_cnn_reason: vision_health
            .as_ref()
            .and_then(|health| health.cnn_reason.clone()),
        vision_tile_detector_available,
        vision_tile_detector_reason: vision_health.and_then(|health| health.tile_detector_reason),
    })
}

async fn request_vision_health(state: &ApiState) -> Option<VisionHealthResponse> {
    let url = format!("{}/health", state.vision_url.trim_end_matches('/'));
    reqwest::Client::new()
        .get(url)
        .timeout(HEALTH_VISION_TIMEOUT)
        .send()
        .await
        .ok()?
        .json::<VisionHealthResponse>()
        .await
        .ok()
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

async fn puzzles() -> Json<Vec<crate::PuzzleResponse>> {
    Json(list_puzzles_response())
}

async fn puzzle_detail(Path(puzzle_slug): Path<String>) -> Response {
    match puzzle_response_by_slug(&puzzle_slug) {
        Ok(response) => Json(response).into_response(),
        Err(response) => (StatusCode::NOT_FOUND, Json(response)).into_response(),
    }
}

async fn puzzle_strategies(Path(puzzle_slug): Path<String>) -> Response {
    match puzzle_strategy_responses_by_slug(&puzzle_slug) {
        Ok(response) => Json(response).into_response(),
        Err(response) => (StatusCode::NOT_FOUND, Json(response)).into_response(),
    }
}

async fn solve_puzzle(
    State(state): State<ApiState>,
    Path(puzzle_slug): Path<String>,
    Json(request): Json<PuzzleSolveRequest>,
) -> (StatusCode, Json<PuzzleSolveResponse>) {
    let (status, response) = solve_puzzle_request(&state, &puzzle_slug, request);

    (status, Json(response))
}

async fn solve_notation(
    State(state): State<ApiState>,
    Json(request): Json<SolveNotationRequest>,
) -> (StatusCode, Json<SolveResponse>) {
    solve_notation_request(&state, request)
}

async fn solve_scan(
    State(state): State<ApiState>,
    Json(request): Json<SolveScanRequest>,
) -> (StatusCode, Json<SolveResponse>) {
    solve_scan_request(&state, request)
}

async fn analyze_scan_face(
    State(state): State<ApiState>,
    Json(request): Json<AnalyzeScanFaceRequest>,
) -> (StatusCode, Json<AnalyzeScanFaceResponse>) {
    analyze_scan_face_request(&state, request).await
}

async fn solve_scan_session(
    State(state): State<ApiState>,
    Json(request): Json<ScanSessionRequest>,
) -> (StatusCode, Json<ScanSessionResponse>) {
    solve_scan_session_request(&state, request).await
}

async fn solve_puzzle_scan_session(
    State(state): State<ApiState>,
    Path(puzzle_slug): Path<String>,
    Json(request): Json<ScanSessionRequest>,
) -> (StatusCode, Json<ScanSessionResponse>) {
    let Some(puzzle_id) = PuzzleId::from_slug(&puzzle_slug) else {
        return (
            StatusCode::NOT_FOUND,
            Json(ScanSessionResponse {
                ok: false,
                status: "unknown_puzzle".to_owned(),
                message: Some(format!("unknown puzzle slug: {puzzle_slug}")),
                timings: None,
                scan: None,
                solve: None,
                inference: None,
                rescan_faces: Vec::new(),
                manual_targets: Vec::new(),
                invalid_corners: Vec::new(),
            }),
        );
    };

    solve_scan_session_request_for_puzzle(&state, puzzle_id, request).await
}
