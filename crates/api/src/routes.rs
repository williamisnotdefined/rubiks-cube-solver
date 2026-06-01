use std::path::PathBuf;
use std::time::Duration;

use axum::extract::{DefaultBodyLimit, State};
use axum::http::{header::CONTENT_TYPE, HeaderValue, Method, StatusCode};
use axum::routing::{get, post};
use axum::{Json, Router};
use cube_engine::SolverStrategy;
use tower_http::cors::{AllowOrigin, CorsLayer};
use tower_http::services::{ServeDir, ServeFile};

use crate::config::{MAX_JSON_BODY_BYTES, MAX_SCAN_SESSION_BODY_BYTES};
use crate::response::{
    AnalyzeScanFaceRequest, AnalyzeScanFaceResponse, HealthResponse, ScanSessionRequest,
    ScanSessionResponse, SolveNotationRequest, SolveResponse, SolveScanRequest, StrategyResponse,
};
use crate::scan_analysis::{analyze_scan_face_request, solve_scan_session_request};
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
    #[serde(rename = "faceDetectorAvailable", default)]
    face_detector_available: bool,
    #[serde(rename = "faceDetectorReason", default)]
    face_detector_reason: Option<String>,
}

pub fn api_router(state: ApiState) -> Router {
    Router::new()
        .route("/health", get(health))
        .route("/strategies", get(strategies))
        .route("/scan/analyze-face", post(analyze_scan_face))
        .route(
            "/scan/solve-session",
            post(solve_scan_session).layer(DefaultBodyLimit::max(MAX_SCAN_SESSION_BODY_BYTES)),
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
    let vision_face_detector_available = vision_health
        .as_ref()
        .is_some_and(|health| health.face_detector_available);

    Json(HealthResponse {
        ok: true,
        generated_two_phase_ready: state.generated_solver_ready(),
        vision_ok,
        vision_cnn_available,
        vision_cnn_reason: vision_health
            .as_ref()
            .and_then(|health| health.cnn_reason.clone()),
        vision_face_detector_available,
        vision_face_detector_reason: vision_health.and_then(|health| health.face_detector_reason),
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
