use axum::{
    body::{to_bytes, Body},
    http::{Method, Request, StatusCode},
};
use cube_engine::{infer_scan, Facelet, Scramble, SolverStrategy};
use tower::ServiceExt;

use crate::response::unverified_solution_response_from_parts;
use crate::{
    api_router, api_router_with_web_dist, solve_notation_request, solve_puzzle_request,
    solve_scan_request, solve_scan_session_request, AnalyzeScanFaceRequest, ApiState,
    PuzzleApiErrorResponse, PuzzleResponse, PuzzleSolveInputRequest, PuzzleSolveLimitsRequest,
    PuzzleSolveRequest, PuzzleSolveResponse, PuzzleStrategyResponse, ScanFacesRequest,
    ScanSessionFaceRequest, ScanSessionRequest, ScanSessionReviewedStickerRequest,
    SolveNotationRequest, SolveScanRequest, DEFAULT_API_NODES, MAX_API_DEPTH, MAX_API_NODES,
    MAX_NOTATION_BYTES,
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
fn scan_strategy_solves_solved_state_without_generated_tables() {
    let request = solved_scan_request("bounded-ida-star", 0);

    let (status, response) = solve_scan_request(&ApiState::without_generated_solver(), request);

    assert_eq!(status, StatusCode::OK);
    assert!(response.ok);
    assert_eq!(response.status, "success");
    assert!(response.moves.is_empty());
    assert_eq!(response.replay_verified, Some(true));
    assert_eq!(
        response.visual_state.as_deref(),
        Some("UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB")
    );
}

#[test]
fn scan_request_reports_invalid_symbol() {
    let request = scan_request_from_facelets(
        "QUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB",
        "bounded-ida-star",
        0,
    );

    let (status, response) = solve_scan_request(&ApiState::without_generated_solver(), request);

    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert!(!response.ok);
    assert_eq!(response.status, "invalid_input");
    assert_eq!(response.error_kind.as_deref(), Some("invalid_symbol"));
}

#[test]
fn scan_request_reports_invalid_center_sticker() {
    let request = scan_request_from_facelets(
        "UUUURUUUURRRRURRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB",
        "bounded-ida-star",
        0,
    );

    let (status, response) = solve_scan_request(&ApiState::without_generated_solver(), request);

    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert!(!response.ok);
    assert_eq!(response.status, "invalid_input");
    assert_eq!(
        response.error_kind.as_deref(),
        Some("invalid_center_sticker")
    );
}

#[test]
fn generated_scan_strategy_reports_unavailable_when_solver_not_loaded() {
    let request = solved_scan_request("generated-two-phase", 30);

    let (status, response) = solve_scan_request(&ApiState::without_generated_solver(), request);

    assert_eq!(status, StatusCode::SERVICE_UNAVAILABLE);
    assert!(!response.ok);
    assert_eq!(response.status, "generated_tables_unavailable");
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

#[tokio::test]
async fn puzzles_route_lists_current_and_experimental_puzzles() {
    let app = api_router(ApiState::without_generated_solver());
    let response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/puzzles")
                .body(Body::empty())
                .expect("request should build"),
        )
        .await
        .expect("request should complete");

    assert_eq!(response.status(), StatusCode::OK);
    let puzzles: Vec<PuzzleResponse> = response_json(response).await;
    let cube3 = puzzles
        .iter()
        .find(|puzzle| puzzle.slug == "cube-3x3x3")
        .expect("3x3 puzzle should be listed");
    let cube2 = puzzles
        .iter()
        .find(|puzzle| puzzle.slug == "cube-2x2x2")
        .expect("2x2 puzzle should be listed");

    assert_eq!(cube3.id, "cube/3x3x3");
    assert_eq!(cube3.status, "stable");
    assert_eq!(
        cube3.default_strategy_id.as_deref(),
        Some("generated-two-phase")
    );
    assert!(cube3.strategy_ids.contains(&"bounded-ida-star".to_owned()));
    assert_eq!(cube2.id, "cube/2x2x2");
    assert_eq!(cube2.status, "experimental");
    assert_eq!(
        cube2.default_strategy_id.as_deref(),
        Some("cube2-pdb-ida-star")
    );
    assert_eq!(
        cube2.strategy_ids,
        vec!["cube2-bounded-ida-star", "cube2-pdb-ida-star"]
    );
    assert_eq!(cube2.supported_visualizations, vec!["cube2-facelets-v1"]);
}

#[tokio::test]
async fn puzzle_detail_route_returns_3x3_metadata() {
    let app = api_router(ApiState::without_generated_solver());
    let response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/puzzles/cube-3x3x3")
                .body(Body::empty())
                .expect("request should build"),
        )
        .await
        .expect("request should complete");

    assert_eq!(response.status(), StatusCode::OK);
    let puzzle: PuzzleResponse = response_json(response).await;

    assert_eq!(puzzle.id, "cube/3x3x3");
    assert_eq!(puzzle.slug, "cube-3x3x3");
    assert_eq!(puzzle.family, "cube");
    assert_eq!(puzzle.default_metric, "htm");
    assert_eq!(
        puzzle.supported_inputs,
        vec!["notation", "facelets3x3", "scan3x3"]
    );
    assert_eq!(puzzle.supported_visualizations, vec!["cube3-facelets-v1"]);
    assert!(puzzle.scanner_supported);
}

#[tokio::test]
async fn puzzle_strategies_route_scopes_3x3_strategies() {
    let app = api_router(ApiState::without_generated_solver());
    let response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/puzzles/cube-3x3x3/strategies")
                .body(Body::empty())
                .expect("request should build"),
        )
        .await
        .expect("request should complete");

    assert_eq!(response.status(), StatusCode::OK);
    let strategies: Vec<PuzzleStrategyResponse> = response_json(response).await;

    assert_eq!(strategies.len(), SolverStrategy::ALL.len());
    assert!(strategies
        .iter()
        .all(|strategy| strategy.puzzle_id == "cube/3x3x3"));
    assert!(strategies
        .iter()
        .any(|strategy| strategy.id == "bounded-ida-star"));
    assert!(strategies
        .iter()
        .all(|strategy| strategy.default_metric == "htm"));
}

#[tokio::test]
async fn experimental_2x2_strategy_route_returns_2x2_strategies() {
    let app = api_router(ApiState::without_generated_solver());
    let response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/puzzles/cube-2x2x2/strategies")
                .body(Body::empty())
                .expect("request should build"),
        )
        .await
        .expect("request should complete");

    assert_eq!(response.status(), StatusCode::OK);
    let strategies: Vec<PuzzleStrategyResponse> = response_json(response).await;

    assert_eq!(strategies.len(), 2);
    assert!(strategies
        .iter()
        .all(|strategy| strategy.puzzle_id == "cube/2x2x2"));
    assert!(strategies
        .iter()
        .any(|strategy| strategy.id == "cube2-bounded-ida-star"));
    assert!(strategies
        .iter()
        .any(|strategy| strategy.id == "cube2-pdb-ida-star"));
}

#[tokio::test]
async fn legacy_strategies_route_preserves_3x3_contract() {
    let app = api_router(ApiState::without_generated_solver());
    let response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/strategies")
                .body(Body::empty())
                .expect("request should build"),
        )
        .await
        .expect("request should complete");

    assert_eq!(response.status(), StatusCode::OK);
    let strategies: Vec<serde_json::Value> = response_json(response).await;

    assert_eq!(strategies.len(), SolverStrategy::ALL.len());
    assert!(strategies
        .iter()
        .any(|strategy| strategy["id"] == "bounded-ida-star"));
    assert!(strategies
        .iter()
        .all(|strategy| strategy["puzzleId"].is_null()));
}

#[tokio::test]
async fn puzzle_detail_route_reports_unknown_puzzle() {
    let app = api_router(ApiState::without_generated_solver());
    let response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/puzzles/cube-4x4x4")
                .body(Body::empty())
                .expect("request should build"),
        )
        .await
        .expect("request should complete");

    assert_eq!(response.status(), StatusCode::NOT_FOUND);
    let error: PuzzleApiErrorResponse = response_json(response).await;

    assert!(!error.ok);
    assert_eq!(error.status, "unknown_puzzle");
    assert_eq!(error.error_kind, "unknown_puzzle");
}

#[tokio::test]
async fn puzzle_aware_solve_route_solves_3x3_notation() {
    let app = api_router(ApiState::without_generated_solver());
    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/puzzles/cube-3x3x3/solve")
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::json!({
                        "input": { "kind": "notation", "value": "F" },
                        "strategyId": "bounded-ida-star",
                        "limits": { "maxDepth": 1, "maxNodes": 1000 },
                        "metric": "htm"
                    })
                    .to_string(),
                ))
                .expect("request should build"),
        )
        .await
        .expect("request should complete");

    assert_eq!(response.status(), StatusCode::OK);
    let response: PuzzleSolveResponse = response_json(response).await;

    assert!(response.ok);
    assert_eq!(response.status, "success");
    assert_eq!(response.puzzle_id.as_deref(), Some("cube/3x3x3"));
    assert_eq!(response.puzzle_slug, "cube-3x3x3");
    assert_eq!(response.strategy_id, "bounded-ida-star");
    assert_eq!(response.metric, "htm");
    assert_eq!(response.moves, vec!["F'"]);
    assert_eq!(response.replay_verified, Some(true));
    assert_eq!(
        response
            .visual_state
            .as_ref()
            .map(|state| state.kind.as_str()),
        Some("cube3-facelets-v1")
    );
}

#[test]
fn puzzle_aware_solve_request_solves_2x2_with_default_strategy() {
    let mut request = puzzle_notation_request("F", "cube2-pdb-ida-star", 1, Some(1_000));
    request.strategy_id = None;

    let (status, response) =
        solve_puzzle_request(&ApiState::without_generated_solver(), "cube-2x2x2", request);

    assert_eq!(status, StatusCode::OK);
    assert!(response.ok);
    assert_eq!(response.status, "success");
    assert_eq!(response.puzzle_id.as_deref(), Some("cube/2x2x2"));
    assert_eq!(response.strategy_id, "cube2-pdb-ida-star");
    assert_eq!(response.solver_mode, "cube2_pdb_ida_star");
    assert_eq!(response.generated_table_status, "not_applicable");
    assert_eq!(response.moves, vec!["F'"]);
    assert_eq!(response.replay_verified, Some(true));
    assert!(response.visual_state.is_none());
}

#[tokio::test]
async fn puzzle_aware_solve_route_solves_2x2_notation_with_pdb_strategy() {
    let app = api_router(ApiState::without_generated_solver());
    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/puzzles/cube-2x2x2/solve")
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::json!({
                        "input": { "kind": "notation", "value": "R U F" },
                        "strategyId": "cube2-pdb-ida-star",
                        "limits": { "maxDepth": 3, "maxNodes": 1000 },
                        "metric": "htm"
                    })
                    .to_string(),
                ))
                .expect("request should build"),
        )
        .await
        .expect("request should complete");

    assert_eq!(response.status(), StatusCode::OK);
    let response: PuzzleSolveResponse = response_json(response).await;

    assert!(response.ok);
    assert_eq!(response.status, "success");
    assert_eq!(response.puzzle_id.as_deref(), Some("cube/2x2x2"));
    assert_eq!(response.puzzle_slug, "cube-2x2x2");
    assert_eq!(response.strategy_id, "cube2-pdb-ida-star");
    assert_eq!(response.metric, "htm");
    assert_eq!(response.length, Some(3));
    assert_eq!(response.replay_verified, Some(true));
    assert!(response.visual_state.is_none());
}

#[test]
fn puzzle_aware_solve_request_solves_2x2_with_baseline_strategy() {
    let request = puzzle_notation_request("F", "cube2-bounded-ida-star", 1, Some(1_000));

    let (status, response) =
        solve_puzzle_request(&ApiState::without_generated_solver(), "cube-2x2x2", request);

    assert_eq!(status, StatusCode::OK);
    assert!(response.ok);
    assert_eq!(response.strategy_id, "cube2-bounded-ida-star");
    assert_eq!(response.solver_mode, "cube2_bounded_ida_star");
    assert_eq!(response.moves, vec!["F'"]);
    assert_eq!(response.replay_verified, Some(true));
}

#[test]
fn puzzle_aware_solve_request_reports_2x2_depth_limit() {
    let request = puzzle_notation_request("R U F", "cube2-pdb-ida-star", 2, Some(1_000));

    let (status, response) =
        solve_puzzle_request(&ApiState::without_generated_solver(), "cube-2x2x2", request);

    assert_eq!(status, StatusCode::OK);
    assert!(!response.ok);
    assert_eq!(response.status, "not_found_within_limits");
    assert_eq!(response.error_kind, None);
    assert!(response.explored_nodes.is_some());
}

#[test]
fn puzzle_aware_solve_request_reports_2x2_node_limit() {
    let request = puzzle_notation_request("R U F", "cube2-pdb-ida-star", 3, Some(1));

    let (status, response) =
        solve_puzzle_request(&ApiState::without_generated_solver(), "cube-2x2x2", request);

    assert_eq!(status, StatusCode::OK);
    assert!(!response.ok);
    assert_eq!(response.status, "node_limit_exceeded");
    assert_eq!(response.error_kind.as_deref(), Some("node_limit_exceeded"));
    assert_eq!(response.explored_nodes, Some(1));
}

#[test]
fn puzzle_aware_solve_request_reports_2x2_invalid_notation() {
    let request = puzzle_notation_request("R Q", "cube2-pdb-ida-star", 3, Some(1_000));

    let (status, response) =
        solve_puzzle_request(&ApiState::without_generated_solver(), "cube-2x2x2", request);

    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert!(!response.ok);
    assert_eq!(response.status, "invalid_notation");
    assert_eq!(
        response.error_kind.as_deref(),
        Some("invalid_move_notation")
    );
}

#[test]
fn puzzle_aware_solve_request_rejects_3x3_strategy_for_2x2() {
    let request = puzzle_notation_request("", "bounded-ida-star", 0, Some(1_000));

    let (status, response) =
        solve_puzzle_request(&ApiState::without_generated_solver(), "cube-2x2x2", request);

    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert!(!response.ok);
    assert_eq!(response.status, "strategy_puzzle_mismatch");
    assert_eq!(
        response.error_kind.as_deref(),
        Some("strategy_puzzle_mismatch")
    );
}

#[tokio::test]
async fn puzzle_aware_solve_route_reports_unknown_puzzle() {
    let app = api_router(ApiState::without_generated_solver());
    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/puzzles/cube-4x4x4/solve")
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::json!({
                        "input": { "kind": "notation", "value": "" },
                        "strategyId": "bounded-ida-star",
                        "limits": { "maxDepth": 0, "maxNodes": 1000 },
                        "metric": "htm"
                    })
                    .to_string(),
                ))
                .expect("request should build"),
        )
        .await
        .expect("request should complete");

    assert_eq!(response.status(), StatusCode::NOT_FOUND);
    let response: PuzzleSolveResponse = response_json(response).await;

    assert!(!response.ok);
    assert_eq!(response.status, "unknown_puzzle");
    assert_eq!(response.error_kind.as_deref(), Some("unknown_puzzle"));
    assert!(response.puzzle_id.is_none());
}

#[tokio::test]
async fn puzzle_aware_solve_route_rejects_unsupported_input_kind() {
    let app = api_router(ApiState::without_generated_solver());
    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/puzzles/cube-3x3x3/solve")
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::json!({
                        "input": { "kind": "facelets3x3", "value": "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB" },
                        "strategyId": "bounded-ida-star",
                        "limits": { "maxDepth": 0, "maxNodes": 1000 },
                        "metric": "htm"
                    })
                    .to_string(),
                ))
                .expect("request should build"),
        )
        .await
        .expect("request should complete");

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    let response: PuzzleSolveResponse = response_json(response).await;

    assert!(!response.ok);
    assert_eq!(response.status, "unsupported_input_kind");
    assert_eq!(
        response.error_kind.as_deref(),
        Some("unsupported_input_kind")
    );
}

#[tokio::test]
async fn puzzle_aware_solve_route_rejects_unsupported_metric() {
    let app = api_router(ApiState::without_generated_solver());
    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/puzzles/cube-3x3x3/solve")
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::json!({
                        "input": { "kind": "notation", "value": "" },
                        "strategyId": "bounded-ida-star",
                        "limits": { "maxDepth": 0, "maxNodes": 1000 },
                        "metric": "qtm"
                    })
                    .to_string(),
                ))
                .expect("request should build"),
        )
        .await
        .expect("request should complete");

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    let response: PuzzleSolveResponse = response_json(response).await;

    assert!(!response.ok);
    assert_eq!(response.status, "unsupported_metric");
    assert_eq!(response.error_kind.as_deref(), Some("unsupported_metric"));
}

#[tokio::test]
async fn puzzle_aware_solve_route_rejects_unknown_strategy() {
    let app = api_router(ApiState::without_generated_solver());
    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/puzzles/cube-3x3x3/solve")
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::json!({
                        "input": { "kind": "notation", "value": "" },
                        "strategyId": "unknown",
                        "limits": { "maxDepth": 0, "maxNodes": 1000 },
                        "metric": "htm"
                    })
                    .to_string(),
                ))
                .expect("request should build"),
        )
        .await
        .expect("request should complete");

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    let response: PuzzleSolveResponse = response_json(response).await;

    assert!(!response.ok);
    assert_eq!(response.status, "unsupported_strategy");
    assert_eq!(response.error_kind.as_deref(), Some("unsupported_strategy"));
}

#[test]
fn puzzle_aware_solve_preserves_existing_limit_validation() {
    let request = puzzle_notation_request("", "bounded-ida-star", MAX_API_DEPTH + 1, Some(1_000));

    let (status, response) =
        solve_puzzle_request(&ApiState::without_generated_solver(), "cube-3x3x3", request);

    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert!(!response.ok);
    assert_eq!(response.status, "invalid_limits");
    assert_eq!(
        response.error_kind.as_deref(),
        Some("max_depth_exceeds_limit")
    );
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
async fn solve_scan_route_is_exposed() {
    let app = api_router(ApiState::without_generated_solver());
    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/solve-scan")
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::json!({
                        "faces": {
                            "U": "UUUUUUUUU",
                            "R": "RRRRRRRRR",
                            "F": "FFFFFFFFF",
                            "D": "DDDDDDDDD",
                            "L": "LLLLLLLLL",
                            "B": "BBBBBBBBB"
                        },
                        "maxDepth": 0,
                        "maxNodes": 1000,
                        "strategyId": "bounded-ida-star"
                    })
                    .to_string(),
                ))
                .expect("request should build"),
        )
        .await
        .expect("request should complete");

    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn health_route_reports_vision_cnn_status() {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .expect("vision listener should bind");
    let addr = listener
        .local_addr()
        .expect("vision addr should be available");
    let vision_app = axum::Router::new().route(
        "/health",
        axum::routing::get(|| async {
            axum::Json(serde_json::json!({
                "ok": true,
                "cnnAvailable": false,
                "cnnReason": "cnn_model_not_configured",
                "tileDetectorAvailable": false,
                "tileDetectorReason": "tile_detector_model_not_configured"
            }))
        }),
    );
    let vision_server = tokio::spawn(async move {
        axum::serve(listener, vision_app)
            .await
            .expect("vision server should run")
    });
    let app =
        api_router(ApiState::without_generated_solver().with_vision_url(format!("http://{addr}")));

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/health")
                .body(Body::empty())
                .expect("request should build"),
        )
        .await
        .expect("request should complete");

    vision_server.abort();
    assert_eq!(response.status(), StatusCode::OK);
    let body = to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("body should be readable");
    let response: serde_json::Value =
        serde_json::from_slice(&body).expect("response should be JSON");
    assert_eq!(response["ok"], true);
    assert_eq!(response["generatedTwoPhaseReady"], false);
    assert_eq!(response["visionOk"], true);
    assert_eq!(response["visionCnnAvailable"], false);
    assert_eq!(response["visionCnnReason"], "cnn_model_not_configured");
    assert_eq!(response["visionTileDetectorAvailable"], false);
    assert_eq!(
        response["visionTileDetectorReason"],
        "tile_detector_model_not_configured"
    );
}

#[tokio::test]
async fn analyze_scan_face_route_rejects_invalid_center_before_proxy() {
    let app = api_router(ApiState::without_generated_solver());
    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/scan/analyze-face")
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::json!({
                        "expectedCenter": "Q",
                        "image": "data:image/jpeg;base64,AAAA",
                        "knownCenters": {}
                    })
                    .to_string(),
                ))
                .expect("request should build"),
        )
        .await
        .expect("request should complete");

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    let body = to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("body should be readable");
    let response: crate::AnalyzeScanFaceResponse =
        serde_json::from_slice(&body).expect("response should be JSON");
    assert!(!response.ok);
    assert_eq!(response.status, "invalid_image");
    assert_eq!(response.face_confidence, 0.0);
    assert!(response.detection_mode.is_none());
    assert!(response.quality_warnings.is_empty());
}

#[tokio::test]
async fn analyze_scan_face_reports_unavailable_vision_service() {
    let state = ApiState::without_generated_solver().with_vision_url("http://127.0.0.1:9");
    let request = AnalyzeScanFaceRequest {
        expected_center: "U".to_owned(),
        image: "data:image/jpeg;base64,AAAA".to_owned(),
        known_centers: Default::default(),
    };

    let (status, response) = crate::analyze_scan_face_request(&state, request).await;

    assert_eq!(status, StatusCode::SERVICE_UNAVAILABLE);
    assert!(!response.ok);
    assert_eq!(response.status, "vision_unavailable");
}

#[tokio::test]
async fn solve_scan_session_route_rejects_incomplete_session() {
    let app = api_router(ApiState::without_generated_solver());
    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/scan/solve-session")
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::json!({
                        "faces": [],
                        "maxDepth": 0,
                        "maxNodes": 1000,
                        "strategyId": "bounded-ida-star"
                    })
                    .to_string(),
                ))
                .expect("request should build"),
        )
        .await
        .expect("request should complete");

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    let body = to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("body should be readable");
    let response: crate::ScanSessionResponse =
        serde_json::from_slice(&body).expect("response should be JSON");
    assert!(!response.ok);
    assert_eq!(response.status, "invalid_session");
}

#[tokio::test]
async fn solve_scan_session_reports_unavailable_vision_service() {
    let state = ApiState::without_generated_solver().with_vision_url("http://127.0.0.1:9");

    let (status, response) = solve_scan_session_request(
        &state,
        solved_scan_session_request_without_reviewed_stickers(),
    )
    .await;

    assert_eq!(status, StatusCode::SERVICE_UNAVAILABLE);
    assert!(!response.ok);
    assert_eq!(response.status, "vision_unavailable");
}

#[tokio::test]
async fn solve_scan_session_rescans_obvious_glare_before_inference() {
    let mut scan = solved_scan_session_analysis();
    scan.faces[0]
        .analysis
        .image_quality
        .as_mut()
        .expect("image quality should exist")
        .glare_ratio = 0.50;
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .expect("vision listener should bind");
    let addr = listener
        .local_addr()
        .expect("vision addr should be available");
    let vision_app = axum::Router::new().route(
        "/analyze-session",
        axum::routing::post(move || {
            let scan = scan.clone();
            async move { axum::Json(scan) }
        }),
    );
    let vision_server = tokio::spawn(async move {
        axum::serve(listener, vision_app)
            .await
            .expect("vision server should run")
    });
    let state = ApiState::without_generated_solver().with_vision_url(format!("http://{addr}"));

    let (status, response) = solve_scan_session_request(
        &state,
        solved_scan_session_request_without_reviewed_stickers(),
    )
    .await;

    vision_server.abort();
    assert_eq!(status, StatusCode::OK);
    assert!(!response.ok);
    assert_eq!(response.status, "needs_rescan_face");
    assert_eq!(response.rescan_faces, vec!["U"]);
    assert!(response.solve.is_none());
    let inference = response
        .inference
        .as_ref()
        .expect("early quality gate should return inference-shaped metadata");
    assert!(inference.candidate_facelets.is_none());
    assert_eq!(inference.quality_reasons, vec!["image_glare:U"]);
    let timings = response
        .timings
        .as_ref()
        .expect("timings should be reported");
    assert!(timings.vision_elapsed_ms.is_some());
    assert!(timings.early_quality_gate_elapsed_ms.is_some());
    assert!(timings.inference_elapsed_ms.is_none());
    assert!(timings.solve_elapsed_ms.is_none());
}

#[tokio::test]
async fn solve_scan_session_accepts_explicit_center_override() {
    let mut scan = solved_scan_session_analysis();
    scan.ok = false;
    scan.status = "partial_failure".to_owned();
    scan.message = Some("One or more faces need to be rescanned.".to_owned());
    scan.faces[0].analysis.ok = false;
    scan.faces[0].analysis.status = "center_mismatch".to_owned();
    scan.faces[0].analysis.center_mismatch = true;
    scan.faces[0].analysis.detected_center = Some("R".to_owned());
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .expect("vision listener should bind");
    let addr = listener
        .local_addr()
        .expect("vision addr should be available");
    let vision_app = axum::Router::new().route(
        "/analyze-session",
        axum::routing::post(move || {
            let scan = scan.clone();
            async move { axum::Json(scan) }
        }),
    );
    let vision_server = tokio::spawn(async move {
        axum::serve(listener, vision_app)
            .await
            .expect("vision server should run")
    });
    let state = ApiState::without_generated_solver().with_vision_url(format!("http://{addr}"));
    let mut request = solved_scan_session_request();
    request.faces[0].manual_overrides.insert(4, "U".to_owned());

    let (status, response) = solve_scan_session_request(&state, request).await;

    vision_server.abort();
    assert_eq!(status, StatusCode::OK);
    assert!(response.ok);
    assert_eq!(response.status, "accepted");
    assert!(response.solve.is_some());
    assert!(response.rescan_faces.is_empty());
}

#[test]
fn analyze_scan_face_response_preserves_vision_v2_fields() {
    let response: crate::AnalyzeScanFaceResponse = serde_json::from_value(serde_json::json!({
        "ok": true,
        "status": "detected",
        "message": null,
        "centerMismatch": false,
        "detectedCenter": "F",
        "expectedCenter": "F",
        "confidence": 0.9,
        "detectedCenterConfidence": 0.9,
        "faceConfidence": 0.8,
        "detectionMode": "tile_detector",
        "imageSize": { "width": 640, "height": 640 },
        "imageQuality": {
            "blurScore": 128.0,
            "meanLuminance": 120.0,
            "glareRatio": 0.02,
            "shadowRatio": 0.03
        },
        "stickers": [{
            "index": 0,
            "symbol": "F",
            "confidence": 0.7,
            "rgb": { "r": 34, "g": 197, "b": 94 },
            "polygon": [],
            "alternatives": [],
            "probabilities": {
                "U": 0.01,
                "R": 0.02,
                "F": 0.91,
                "D": 0.01,
                "L": 0.03,
                "B": 0.02
            },
            "quality": {
                "colorVariance": 0.12,
                "glareRatio": 0.01,
                "shadowRatio": 0.02,
                "margin": 0.88
            }
        }],
        "qualityWarnings": [],
        "warnings": []
    }))
    .expect("vision v2 response should deserialize");

    let sticker = response.stickers.first().expect("sticker should exist");
    assert_eq!(
        response
            .image_quality
            .as_ref()
            .map(|quality| quality.blur_score),
        Some(128.0)
    );
    assert_eq!(
        sticker
            .probabilities
            .as_ref()
            .map(|probabilities| probabilities.f),
        Some(0.91)
    );
    assert_eq!(
        sticker.quality.as_ref().map(|quality| quality.margin),
        Some(0.88)
    );

    let serialized = serde_json::to_value(response).expect("response should serialize");
    assert_eq!(serialized["stickers"][0]["probabilities"]["F"], 0.91);
    assert_eq!(serialized["imageQuality"]["glareRatio"], 0.02);
}

#[test]
fn scan_session_adapter_builds_inference_input_from_vision_probabilities() {
    let scan = solved_scan_session_analysis();
    let mut request = solved_scan_session_request();
    request.faces[0].client_rotation = Some(90);
    request.faces[0].manual_overrides.insert(0, "R".to_owned());

    let input = crate::scan_analysis::scan_inference_input_from_session(&scan, &request)
        .expect("complete vision session should adapt to inference input");

    assert_eq!(input.face_rotation_priors[Facelet::U.index()], Some(90));
    assert_eq!(input.facelet_probabilities[0][Facelet::U.index()], 0.98);
    assert_eq!(input.manual_overrides.len(), 1);
    assert_eq!(input.manual_overrides[0].position, 0);
    assert_eq!(input.manual_overrides[0].facelet, Facelet::R);
}

#[test]
fn scan_quality_gate_accepts_high_quality_solved_session() {
    let scan = solved_scan_session_analysis();
    let inference = inference_for_scan_session(&scan);

    let decision = crate::scan_quality_gate::evaluate_scan_quality(&scan, &inference);

    assert_eq!(decision.status, cube_engine::ScanInferenceStatus::Accepted);
    assert!(decision.quality_reasons.is_empty());
    assert!(decision.rescan_faces.is_empty());
    assert!(decision.manual_targets.is_empty());
}

#[test]
fn scan_quality_gate_rescans_blurry_face() {
    let mut scan = solved_scan_session_analysis();
    scan.faces[0]
        .analysis
        .image_quality
        .as_mut()
        .expect("image quality should exist")
        .blur_score = 1.0;
    let inference = inference_for_scan_session(&scan);

    let decision = crate::scan_quality_gate::evaluate_scan_quality(&scan, &inference);

    assert_eq!(
        decision.status,
        cube_engine::ScanInferenceStatus::NeedsRescanFace
    );
    assert_eq!(decision.rescan_faces, vec![Facelet::U]);
    assert!(decision
        .quality_reasons
        .contains(&"image_blurry:U".to_owned()));
}

#[test]
fn scan_obvious_quality_gate_rescans_glare_without_inference() {
    let mut scan = solved_scan_session_analysis();
    scan.faces[0]
        .analysis
        .image_quality
        .as_mut()
        .expect("image quality should exist")
        .glare_ratio = 0.50;

    let decision = crate::scan_quality_gate::evaluate_obvious_scan_quality(&scan)
        .expect("obvious glare should be rejected before inference");

    assert_eq!(
        decision.status,
        cube_engine::ScanInferenceStatus::NeedsRescanFace
    );
    assert_eq!(decision.rescan_faces, vec![Facelet::U]);
    assert_eq!(decision.quality_reasons, vec!["image_glare:U"]);
    assert!(decision.manual_targets.is_empty());
}

#[test]
fn scan_quality_gate_allows_explicit_center_override() {
    let mut scan = solved_scan_session_analysis();
    scan.faces[0].analysis.ok = false;
    scan.faces[0].analysis.status = "center_mismatch".to_owned();
    scan.faces[0].analysis.center_mismatch = true;
    scan.faces[0].analysis.detected_center = Some("R".to_owned());
    let inference = inference_for_scan_session(&scan);
    let mut request = solved_scan_session_request();
    request.faces[0].manual_overrides.insert(4, "U".to_owned());
    let overrides = crate::scan_quality_gate::ScanQualityOverrides::from_request(&request);

    let early_decision =
        crate::scan_quality_gate::evaluate_obvious_scan_quality_with_overrides(&scan, &overrides);
    let decision = crate::scan_quality_gate::evaluate_scan_quality_with_overrides(
        &scan, &inference, &overrides,
    );

    assert!(early_decision.is_none());
    assert_eq!(decision.status, cube_engine::ScanInferenceStatus::Accepted);
    assert!(decision.rescan_faces.is_empty());
    assert!(!decision
        .quality_reasons
        .contains(&"center_mismatch:U".to_owned()));
}

#[test]
fn scan_quality_gate_requests_manual_for_few_ambiguous_stickers() {
    let mut scan = solved_scan_session_analysis();
    make_sticker_ambiguous(&mut scan, 0, 0);
    let inference = inference_for_scan_session(&scan);

    let decision = crate::scan_quality_gate::evaluate_scan_quality(&scan, &inference);

    assert_eq!(
        decision.status,
        cube_engine::ScanInferenceStatus::NeedsManualConfirmation
    );
    assert_eq!(decision.manual_targets[0].face, "U");
    assert_eq!(decision.manual_targets[0].stickers, vec![0]);
}

#[test]
fn scan_quality_gate_rescans_many_ambiguous_stickers_on_same_face() {
    let mut scan = solved_scan_session_analysis();
    make_sticker_ambiguous(&mut scan, 0, 0);
    make_sticker_ambiguous(&mut scan, 0, 1);
    make_sticker_ambiguous(&mut scan, 0, 2);
    let inference = inference_for_scan_session(&scan);

    let decision = crate::scan_quality_gate::evaluate_scan_quality(&scan, &inference);

    assert_eq!(
        decision.status,
        cube_engine::ScanInferenceStatus::NeedsRescanFace
    );
    assert_eq!(decision.rescan_faces, vec![Facelet::U]);
    assert!(decision
        .quality_reasons
        .contains(&"several_ambiguous_stickers:U".to_owned()));
}

#[test]
fn scan_session_response_preserves_inference_fields() {
    let response: crate::ScanSessionResponse = serde_json::from_value(serde_json::json!({
        "ok": false,
        "status": "needs_manual_confirmation",
        "message": "Confirm the highlighted stickers before solving.",
        "timings": {
            "totalElapsedMs": 12,
            "visionElapsedMs": 8,
            "earlyQualityGateElapsedMs": 1,
            "inferenceElapsedMs": 2,
            "qualityGateElapsedMs": 1
        },
        "inference": {
            "status": "needs_manual_confirmation",
            "margin": 0.4,
            "stateConfidence": 0.33,
            "candidateFacelets": "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB",
            "rescanFaces": [],
            "manualTargets": [{ "face": "U", "stickers": [0] }],
            "qualityReasons": ["sticker_ambiguous:U:0"]
        },
        "rescanFaces": [],
        "manualTargets": [{ "face": "U", "stickers": [0] }]
    }))
    .expect("scan session response should deserialize");

    let inference = response
        .inference
        .as_ref()
        .expect("inference should be present");
    assert_eq!(inference.status, "needs_manual_confirmation");
    assert_eq!(inference.margin, Some(0.4));
    assert_eq!(inference.manual_targets[0].face, "U");
    assert_eq!(inference.quality_reasons, vec!["sticker_ambiguous:U:0"]);
    let timings = response
        .timings
        .as_ref()
        .expect("timings should be present");
    assert_eq!(timings.total_elapsed_ms, 12);
    assert_eq!(timings.vision_elapsed_ms, Some(8));

    let serialized = serde_json::to_value(response).expect("response should serialize");
    assert_eq!(
        serialized["inference"]["candidateFacelets"],
        "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB"
    );
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

fn solved_scan_request(strategy_id: &str, max_depth: usize) -> SolveScanRequest {
    scan_request_from_facelets(
        "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB",
        strategy_id,
        max_depth,
    )
}

fn solved_scan_session_request() -> ScanSessionRequest {
    ScanSessionRequest {
        faces: ["U", "R", "F", "D", "L", "B"]
            .into_iter()
            .map(|symbol| ScanSessionFaceRequest {
                symbol: symbol.to_owned(),
                expected_top: None,
                image: Some("data:image/jpeg;base64,AAAA".to_owned()),
                manual_overrides: Default::default(),
                reviewed_stickers: reviewed_stickers(symbol),
                client_rotation: Some(0),
            })
            .collect(),
        max_depth: 0,
        max_nodes: Some(1_000),
        strategy_id: "bounded-ida-star".to_owned(),
    }
}

fn solved_scan_session_request_without_reviewed_stickers() -> ScanSessionRequest {
    let mut request = solved_scan_session_request();
    for face in &mut request.faces {
        face.reviewed_stickers.clear();
    }
    request
}

fn reviewed_stickers(symbol: &str) -> Vec<ScanSessionReviewedStickerRequest> {
    (0..9)
        .map(|index| ScanSessionReviewedStickerRequest {
            index,
            symbol: symbol.to_owned(),
            confidence: Some(1.0),
            source: Some(if index == 4 { "center" } else { "detected" }.to_owned()),
        })
        .collect()
}

fn solved_scan_session_analysis() -> crate::AnalyzeScanSessionResponse {
    let faces = ["U", "R", "F", "D", "L", "B"]
        .into_iter()
        .map(analyzed_session_face)
        .collect::<Vec<_>>();

    serde_json::from_value(serde_json::json!({
        "ok": true,
        "status": "analyzed",
        "message": null,
        "faces": faces,
        "warnings": []
    }))
    .expect("solved scan session analysis should deserialize")
}

fn analyzed_session_face(symbol: &str) -> serde_json::Value {
    let stickers = (0..9)
        .map(|index| analyzed_sticker(index, symbol))
        .collect::<Vec<_>>();

    serde_json::json!({
        "symbol": symbol,
        "expectedTop": null,
        "analysis": {
            "ok": true,
            "status": "detected",
            "message": null,
            "centerMismatch": false,
            "detectedCenter": symbol,
            "expectedCenter": symbol,
            "confidence": 0.98,
            "detectedCenterConfidence": 0.98,
            "faceConfidence": 0.98,
            "detectionMode": "tile_detector",
            "imageSize": { "width": 640, "height": 640 },
            "imageQuality": {
                "blurScore": 128.0,
                "meanLuminance": 120.0,
                "glareRatio": 0.02,
                "shadowRatio": 0.03
            },
            "stickers": stickers,
            "qualityWarnings": [],
            "warnings": []
        }
    })
}

fn analyzed_sticker(index: usize, symbol: &str) -> serde_json::Value {
    serde_json::json!({
        "index": index,
        "symbol": symbol,
        "confidence": 0.98,
        "rgb": { "r": 0, "g": 0, "b": 0 },
        "polygon": [],
        "alternatives": [],
        "probabilities": {
            "U": probability_for_symbol(symbol, "U"),
            "R": probability_for_symbol(symbol, "R"),
            "F": probability_for_symbol(symbol, "F"),
            "D": probability_for_symbol(symbol, "D"),
            "L": probability_for_symbol(symbol, "L"),
            "B": probability_for_symbol(symbol, "B")
        },
        "quality": {
            "colorVariance": 0.04,
            "glareRatio": 0.01,
            "shadowRatio": 0.02,
            "margin": 0.88
        }
    })
}

fn inference_for_scan_session(
    scan: &crate::AnalyzeScanSessionResponse,
) -> cube_engine::ScanInferenceResult {
    let input = crate::scan_analysis::scan_inference_input_from_session(
        scan,
        &solved_scan_session_request(),
    )
    .expect("scan session should adapt to inference input");

    infer_scan(&input)
}

fn make_sticker_ambiguous(
    scan: &mut crate::AnalyzeScanSessionResponse,
    face_index: usize,
    sticker_index: usize,
) {
    let sticker = &mut scan.faces[face_index].analysis.stickers[sticker_index];
    sticker.confidence = 0.50;
    let probabilities = sticker
        .probabilities
        .as_mut()
        .expect("probabilities should exist");
    probabilities.u = 0.50;
    probabilities.r = 0.46;
    probabilities.f = 0.01;
    probabilities.d = 0.01;
    probabilities.l = 0.01;
    probabilities.b = 0.01;
    sticker
        .quality
        .as_mut()
        .expect("quality should exist")
        .margin = 0.04;
}

fn probability_for_symbol(actual: &str, expected: &str) -> f64 {
    if actual == expected {
        0.98
    } else {
        0.004
    }
}

fn scan_request_from_facelets(
    facelets: &str,
    strategy_id: &str,
    max_depth: usize,
) -> SolveScanRequest {
    assert_eq!(facelets.len(), 54);

    SolveScanRequest {
        faces: ScanFacesRequest {
            u: facelets[0..9].to_owned(),
            r: facelets[9..18].to_owned(),
            f: facelets[18..27].to_owned(),
            d: facelets[27..36].to_owned(),
            l: facelets[36..45].to_owned(),
            b: facelets[45..54].to_owned(),
        },
        max_depth,
        max_nodes: Some(1_000),
        strategy_id: strategy_id.to_owned(),
    }
}

async fn response_json<T>(response: axum::response::Response) -> T
where
    T: serde::de::DeserializeOwned,
{
    let body = to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("body should be readable");

    serde_json::from_slice(&body).expect("response should be JSON")
}

fn puzzle_notation_request(
    moves: impl Into<String>,
    strategy_id: impl Into<String>,
    max_depth: usize,
    max_nodes: Option<usize>,
) -> PuzzleSolveRequest {
    PuzzleSolveRequest {
        input: PuzzleSolveInputRequest {
            kind: "notation".to_owned(),
            value: moves.into(),
        },
        strategy_id: Some(strategy_id.into()),
        limits: PuzzleSolveLimitsRequest {
            max_depth,
            max_nodes,
        },
        metric: "htm".to_owned(),
    }
}
