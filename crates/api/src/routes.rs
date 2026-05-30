use std::path::PathBuf;

use axum::extract::{DefaultBodyLimit, State};
use axum::http::{header::CONTENT_TYPE, HeaderValue, Method, StatusCode};
use axum::routing::{get, post};
use axum::{Json, Router};
use cube_engine::SolverStrategy;
use tower_http::cors::{AllowOrigin, CorsLayer};
use tower_http::services::{ServeDir, ServeFile};

use crate::config::MAX_JSON_BODY_BYTES;
use crate::response::{
    HealthResponse, SolveNotationRequest, SolveResponse, SolveScanRequest, StrategyResponse,
};
use crate::solve::{solve_notation_request, solve_scan_request};
use crate::state::ApiState;

pub fn api_router(state: ApiState) -> Router {
    Router::new()
        .route("/health", get(health))
        .route("/strategies", get(strategies))
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
    Json(HealthResponse {
        ok: true,
        generated_two_phase_ready: state.generated_solver_ready(),
    })
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
