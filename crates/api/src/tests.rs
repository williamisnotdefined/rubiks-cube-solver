use axum::{
    body::{to_bytes, Body},
    http::{Method, Request, StatusCode},
};
use cube_engine::{Scramble, SolverStrategy};
use tower::ServiceExt;

use crate::response::unverified_solution_response_from_parts;
use crate::{
    api_router, api_router_with_web_dist, solve_notation_request, ApiState, SolveNotationRequest,
    DEFAULT_API_NODES, MAX_API_DEPTH, MAX_API_NODES, MAX_NOTATION_BYTES,
};

#[test]
fn notation_strategy_solves_shallow_state_without_generated_tables() {
    let request = SolveNotationRequest {
        moves: "F".to_owned(),
        max_depth: 1,
        max_nodes: Some(1_000),
        strategy_id: "bounded-ida-star".to_owned(),
    };

    let (status, response) = solve_notation_request(&ApiState::without_generated_solver(), request);

    assert_eq!(status, StatusCode::OK);
    assert!(response.ok);
    assert_eq!(response.status, "success");
    assert_eq!(response.moves, vec!["F'"]);
    assert!(response.elapsed_ms.is_some());
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

    let (status, response) = solve_notation_request(&ApiState::without_generated_solver(), request);

    assert_eq!(status, StatusCode::SERVICE_UNAVAILABLE);
    assert!(!response.ok);
    assert_eq!(response.status, "generated_tables_unavailable");
}

#[test]
fn generated_quality_strategy_without_tables_does_not_return_reverse_scramble_shortcut() {
    let moves = "R U";
    let inverse_moves: Vec<String> = Scramble::parse(moves)
        .expect("test scramble should parse")
        .inverse()
        .into_iter()
        .map(|move_| move_.notation().to_owned())
        .collect();
    let request = SolveNotationRequest {
        moves: moves.to_owned(),
        max_depth: 30,
        max_nodes: Some(1_000),
        strategy_id: "generated-two-phase-quality".to_owned(),
    };

    let (status, response) = solve_notation_request(&ApiState::without_generated_solver(), request);

    assert_eq!(status, StatusCode::SERVICE_UNAVAILABLE);
    assert!(!response.ok);
    assert_eq!(response.status, "generated_tables_unavailable");
    assert_eq!(response.strategy_id, "generated-two-phase-quality");
    assert_eq!(response.solver_mode, "generated_two_phase_quality");
    assert!(response.moves.is_empty());
    assert_ne!(response.moves, inverse_moves);
}

#[test]
fn solve_notation_runtime_source_does_not_use_inverse_notation_shortcut() {
    const SOLVE_SOURCE: &str = include_str!("solve.rs");

    assert!(
        !SOLVE_SOURCE.contains("Scramble::"),
        "/solve-notation must build a cube state from notation, not keep scramble semantics in the runtime solver path"
    );
    assert!(
        !SOLVE_SOURCE.contains(".inverse("),
        "/solve-notation must not derive a solution by inverting the submitted notation"
    );
    assert!(
        !SOLVE_SOURCE.contains(".inverse_algorithm("),
        "/solve-notation must not derive a solution by inverting the submitted notation"
    );
}

#[test]
fn strategy_metadata_includes_quality_solver() {
    let metadata = SolverStrategy::GeneratedTwoPhaseQuality.metadata();
    let multiprobe_metadata = SolverStrategy::GeneratedTwoPhaseMultiprobe.metadata();
    let corner_metadata = SolverStrategy::OptimalBoundedCornerPdb.metadata();
    let portfolio_metadata = SolverStrategy::ShortSolutionPortfolio.metadata();

    assert!(SolverStrategy::ALL
        .into_iter()
        .any(|strategy| strategy == SolverStrategy::GeneratedTwoPhaseQuality));
    assert!(SolverStrategy::ALL
        .into_iter()
        .any(|strategy| strategy == SolverStrategy::OptimalBoundedCornerPdb));
    assert!(SolverStrategy::ALL
        .into_iter()
        .any(|strategy| strategy == SolverStrategy::GeneratedTwoPhaseMultiprobe));
    assert!(SolverStrategy::ALL
        .into_iter()
        .any(|strategy| strategy == SolverStrategy::ShortSolutionPortfolio));
    assert_eq!(metadata.id, "generated-two-phase-quality");
    assert_eq!(metadata.solver_mode, "generated_two_phase_quality");
    assert_eq!(multiprobe_metadata.id, "generated-two-phase-multiprobe");
    assert_eq!(
        multiprobe_metadata.solver_mode,
        "generated_two_phase_multiprobe"
    );
    assert_eq!(corner_metadata.id, "optimal-bounded-corner-pdb");
    assert_eq!(corner_metadata.solver_mode, "optimal_bounded_corner_pdb");
    assert_eq!(portfolio_metadata.id, "short-solution-portfolio");
    assert_eq!(portfolio_metadata.solver_mode, "short_solution_portfolio");
}

#[test]
fn notation_request_reports_invalid_notation() {
    let request = SolveNotationRequest {
        moves: "R Q".to_owned(),
        max_depth: 30,
        max_nodes: Some(1_000),
        strategy_id: "generated-two-phase".to_owned(),
    };

    let (status, response) = solve_notation_request(&ApiState::without_generated_solver(), request);

    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert!(!response.ok);
    assert_eq!(response.status, "invalid_notation");
    assert_eq!(
        response.error_kind.as_deref(),
        Some("invalid_move_notation")
    );
}

#[test]
fn notation_request_defaults_missing_max_nodes_to_default_budget() {
    let request = SolveNotationRequest {
        moves: String::new(),
        max_depth: 0,
        max_nodes: None,
        strategy_id: "bounded-ida-star".to_owned(),
    };

    let (status, response) = solve_notation_request(&ApiState::without_generated_solver(), request);

    assert_eq!(status, StatusCode::OK);
    assert!(response.ok);
    assert_eq!(response.max_nodes, Some(DEFAULT_API_NODES));
}

#[test]
fn notation_request_accepts_explicit_max_nodes_up_to_api_cap() {
    let request = SolveNotationRequest {
        moves: String::new(),
        max_depth: 0,
        max_nodes: Some(MAX_API_NODES),
        strategy_id: "bounded-ida-star".to_owned(),
    };

    let (status, response) = solve_notation_request(&ApiState::without_generated_solver(), request);

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

    let (status, response) = solve_notation_request(&ApiState::without_generated_solver(), request);

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

    let (status, response) = solve_notation_request(&ApiState::without_generated_solver(), request);

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

    let (status, response) = solve_notation_request(&ApiState::without_generated_solver(), request);

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
async fn router_with_web_dist_serves_spa_fallback() {
    let web_dist_dir = std::env::temp_dir().join(format!(
        "rubiks-api-web-dist-test-{}",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .expect("system time should be after unix epoch")
            .as_nanos()
    ));
    std::fs::create_dir_all(&web_dist_dir).expect("web dist should be created");
    std::fs::write(
        web_dist_dir.join("index.html"),
        "<!doctype html><div id=\"root\"></div>",
    )
    .expect("index should be written");

    let app = api_router_with_web_dist(ApiState::without_generated_solver(), web_dist_dir.clone());
    let response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/solve/real-scramble")
                .body(Body::empty())
                .expect("request should build"),
        )
        .await
        .expect("request should complete");

    assert_eq!(response.status(), StatusCode::OK);
    let body = to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("body should be readable");
    assert!(String::from_utf8_lossy(&body).contains("id=\"root\""));

    std::fs::remove_dir_all(web_dist_dir).expect("web dist should be removed");
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

    let (status, response) = solve_notation_request(&ApiState::without_generated_solver(), request);

    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert_eq!(response.status, "unsupported_strategy");
    assert_eq!(response.error_kind.as_deref(), Some("unsupported_strategy"));
}
