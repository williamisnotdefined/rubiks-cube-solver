use axum::{
    body::{to_bytes, Body},
    http::{HeaderMap, Method, Request, StatusCode},
};
use cube_engine::puzzles::cube2::{cube2_visual_state, Cube2, Cube2Algorithm};
use cube_engine::{infer_scan, Facelet, PuzzleId, Scramble, SolverStrategy};
use tower::ServiceExt;

use crate::response::{unverified_solution_response_from_parts, ScanSessionManualTargetResponse};
use crate::routes::allowed_web_origins;
use crate::{
    api_router, api_router_with_web_dist, solve_notation_request, solve_puzzle_request,
    solve_scan_request, solve_scan_session_request, solve_scan_session_request_for_puzzle,
    AnalyzeScanFaceRequest, ApiState, PuzzleApiErrorResponse, PuzzleResponse,
    PuzzleSolveInputRequest, PuzzleSolveLimitsRequest, PuzzleSolveRequest, PuzzleSolveResponse,
    PuzzleStrategyResponse, ScanFacesRequest, ScanSessionFaceRequest, ScanSessionRequest,
    ScanSessionResponse, ScanSessionReviewedStickerRequest, SolveNotationRequest, SolveResponse,
    SolveScanRequest, CUBE2_MAX_API_DEPTH, CUBE3_MAX_API_DEPTH, DEFAULT_API_NODES, MAX_API_NODES,
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
    let visual_state = response
        .visual_state
        .as_ref()
        .expect("visual state should be returned");
    assert_eq!(visual_state.kind, "cube3-facelets-v1");
    assert_eq!(
        visual_state.value.as_str(),
        "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB"
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
    let request = solved_scan_request("generated-two-phase", CUBE3_MAX_API_DEPTH);

    let (status, response) = solve_scan_request(&ApiState::without_generated_solver(), request);

    assert_eq!(status, StatusCode::SERVICE_UNAVAILABLE);
    assert!(!response.ok);
    assert_eq!(response.status, "generated_tables_unavailable");
}

#[test]
fn generated_strategy_reports_unavailable_when_solver_not_loaded() {
    let request = SolveNotationRequest {
        moves: String::new(),
        max_depth: CUBE3_MAX_API_DEPTH,
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
        max_depth: CUBE3_MAX_API_DEPTH,
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

    assert!(puzzles.iter().all(|puzzle| puzzle.slug != "cube-nxn"));
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
    assert_eq!(cube2.supported_inputs, vec!["notation", "scan2x2"]);
    assert_eq!(cube2.supported_visualizations, vec!["cube2-facelets-v1"]);
    assert!(cube2.scanner_supported);
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
    let visual_state = response
        .visual_state
        .expect("2x2 notation solve should return visual state");
    assert_eq!(visual_state.kind, "cube2-facelets-v1");
    assert_ne!(visual_state.value, "UUUURRRRFFFFDDDDLLLLBBBB");
    assert_eq!(visual_state.value.len(), 24);
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
    let visual_state = response
        .visual_state
        .expect("2x2 notation solve should return visual state");
    assert_eq!(visual_state.kind, "cube2-facelets-v1");
    assert_ne!(visual_state.value, "UUUURRRRFFFFDDDDLLLLBBBB");
    assert_eq!(visual_state.value.len(), 24);
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
fn puzzle_aware_solve_request_rejects_2x2_depth_above_puzzle_cap() {
    let request = puzzle_notation_request(
        "",
        "cube2-pdb-ida-star",
        CUBE2_MAX_API_DEPTH + 1,
        Some(1_000),
    );

    let (status, response) =
        solve_puzzle_request(&ApiState::without_generated_solver(), "cube-2x2x2", request);

    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert!(!response.ok);
    assert_eq!(response.status, "invalid_limits");
    assert_eq!(
        response.error_kind.as_deref(),
        Some("max_depth_exceeds_limit")
    );
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
    let request =
        puzzle_notation_request("", "bounded-ida-star", CUBE3_MAX_API_DEPTH + 1, Some(1_000));

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
        max_depth: CUBE3_MAX_API_DEPTH,
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
fn notation_request_defaults_missing_max_depth_to_twenty() {
    let request: SolveNotationRequest = serde_json::from_value(serde_json::json!({
        "moves": "",
        "maxNodes": 1_000,
        "strategyId": "bounded-ida-star"
    }))
    .expect("request should deserialize with default max depth");

    let (status, response) = solve_notation_request(&ApiState::without_generated_solver(), request);

    assert_eq!(status, StatusCode::OK);
    assert!(response.ok);
    assert_eq!(response.max_depth, 20);
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
        max_depth: CUBE3_MAX_API_DEPTH + 1,
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
fn scan_request_rejects_3x3_depth_above_puzzle_cap() {
    let request = solved_scan_request("bounded-ida-star", CUBE3_MAX_API_DEPTH + 1);

    let (status, response) = solve_scan_request(&ApiState::without_generated_solver(), request);

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
async fn solve_notation_route_returns_503_when_solver_concurrency_is_saturated() {
    let state = ApiState::without_generated_solver().with_solver_max_concurrency(1);
    let _permit = state
        .try_acquire_solver_permit()
        .expect("test should acquire the only solver permit");
    let app = api_router(state);

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/solve-notation")
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::json!({
                        "moves": "F",
                        "maxDepth": 1,
                        "maxNodes": 1000,
                        "strategyId": "bounded-ida-star"
                    })
                    .to_string(),
                ))
                .expect("request should build"),
        )
        .await
        .expect("request should complete");

    assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE);
    let response: SolveResponse = response_json(response).await;
    assert!(!response.ok);
    assert_eq!(response.status, "api_error");
    assert_eq!(response.error_kind.as_deref(), Some("solver_overloaded"));
    assert_eq!(response.strategy_id, "bounded-ida-star");
}

#[tokio::test]
async fn solve_notation_route_validates_limits_before_solver_concurrency_gate() {
    let state = ApiState::without_generated_solver().with_solver_max_concurrency(1);
    let _permit = state
        .try_acquire_solver_permit()
        .expect("test should acquire the only solver permit");
    let app = api_router(state);

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/solve-notation")
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::json!({
                        "moves": "",
                        "maxDepth": CUBE3_MAX_API_DEPTH + 1,
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
    let response: SolveResponse = response_json(response).await;
    assert!(!response.ok);
    assert_eq!(response.status, "invalid_limits");
    assert_eq!(
        response.error_kind.as_deref(),
        Some("max_depth_exceeds_limit")
    );
}

#[tokio::test]
async fn puzzle_solve_route_returns_503_when_solver_concurrency_is_saturated() {
    let state = ApiState::without_generated_solver().with_solver_max_concurrency(1);
    let _permit = state
        .try_acquire_solver_permit()
        .expect("test should acquire the only solver permit");
    let app = api_router(state);

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/puzzles/cube-2x2x2/solve")
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::json!({
                        "input": { "kind": "notation", "value": "F" },
                        "strategyId": "cube2-pdb-ida-star",
                        "limits": { "maxDepth": 1, "maxNodes": 1000 },
                        "metric": "htm"
                    })
                    .to_string(),
                ))
                .expect("request should build"),
        )
        .await
        .expect("request should complete");

    assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE);
    let response: PuzzleSolveResponse = response_json(response).await;
    assert!(!response.ok);
    assert_eq!(response.status, "api_error");
    assert_eq!(response.error_kind.as_deref(), Some("solver_overloaded"));
    assert_eq!(response.puzzle_slug, "cube-2x2x2");
}

#[tokio::test]
async fn puzzle_solve_route_validates_unknown_puzzle_before_solver_concurrency_gate() {
    let state = ApiState::without_generated_solver().with_solver_max_concurrency(1);
    let _permit = state
        .try_acquire_solver_permit()
        .expect("test should acquire the only solver permit");
    let app = api_router(state);

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/puzzles/not-a-puzzle/solve")
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::json!({
                        "input": { "kind": "notation", "value": "F" },
                        "strategyId": "cube2-pdb-ida-star",
                        "limits": { "maxDepth": 1, "maxNodes": 1000 },
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
}

#[tokio::test]
async fn puzzle_solve_route_validates_metric_before_solver_concurrency_gate() {
    let state = ApiState::without_generated_solver().with_solver_max_concurrency(1);
    let _permit = state
        .try_acquire_solver_permit()
        .expect("test should acquire the only solver permit");
    let app = api_router(state);

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/puzzles/cube-2x2x2/solve")
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::json!({
                        "input": { "kind": "notation", "value": "F" },
                        "strategyId": "cube2-pdb-ida-star",
                        "limits": { "maxDepth": 1, "maxNodes": 1000 },
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
async fn puzzle_solve_route_validates_strategy_before_solver_concurrency_gate() {
    let state = ApiState::without_generated_solver().with_solver_max_concurrency(1);
    let _permit = state
        .try_acquire_solver_permit()
        .expect("test should acquire the only solver permit");
    let app = api_router(state);

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/puzzles/cube-2x2x2/solve")
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::json!({
                        "input": { "kind": "notation", "value": "F" },
                        "strategyId": "not-real",
                        "limits": { "maxDepth": 1, "maxNodes": 1000 },
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

#[tokio::test]
async fn puzzle_solve_route_validates_limits_before_solver_concurrency_gate() {
    let state = ApiState::without_generated_solver().with_solver_max_concurrency(1);
    let _permit = state
        .try_acquire_solver_permit()
        .expect("test should acquire the only solver permit");
    let app = api_router(state);

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/puzzles/cube-2x2x2/solve")
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::json!({
                        "input": { "kind": "notation", "value": "F" },
                        "strategyId": "cube2-pdb-ida-star",
                        "limits": { "maxDepth": CUBE2_MAX_API_DEPTH + 1, "maxNodes": 1000 },
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
    assert_eq!(response.status, "invalid_limits");
    assert_eq!(
        response.error_kind.as_deref(),
        Some("max_depth_exceeds_limit")
    );
}

#[tokio::test]
async fn puzzle_solve_route_validates_notation_before_solver_concurrency_gate() {
    let state = ApiState::without_generated_solver().with_solver_max_concurrency(1);
    let _permit = state
        .try_acquire_solver_permit()
        .expect("test should acquire the only solver permit");
    let app = api_router(state);

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/puzzles/cube-2x2x2/solve")
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::json!({
                        "input": { "kind": "notation", "value": "Q" },
                        "strategyId": "cube2-pdb-ida-star",
                        "limits": { "maxDepth": 1, "maxNodes": 1000 },
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
    assert_eq!(response.status, "invalid_notation");
    assert_eq!(
        response.error_kind.as_deref(),
        Some("invalid_move_notation")
    );
}

#[tokio::test]
async fn solve_scan_session_route_returns_503_when_solver_concurrency_is_saturated() {
    let state = ApiState::without_generated_solver().with_solver_max_concurrency(1);
    let _permit = state
        .try_acquire_solver_permit()
        .expect("test should acquire the only solver permit");
    let app = api_router(state);

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/scan/solve-session")
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::to_string(&solved_scan_session_request())
                        .expect("request should serialize"),
                ))
                .expect("request should build"),
        )
        .await
        .expect("request should complete");

    assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE);
    let response: ScanSessionResponse = response_json(response).await;
    assert!(!response.ok);
    assert_eq!(response.status, "api_error");
    assert_eq!(
        response.message.as_deref(),
        Some("solver concurrency limit reached; retry the request later")
    );
}

#[tokio::test]
async fn solve_scan_session_route_validates_session_before_solver_concurrency_gate() {
    let state = ApiState::without_generated_solver().with_solver_max_concurrency(1);
    let _permit = state
        .try_acquire_solver_permit()
        .expect("test should acquire the only solver permit");
    let app = api_router(state);

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/scan/solve-session")
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::to_string(&solved_scan_session_request_without_reviewed_stickers())
                        .expect("request should serialize"),
                ))
                .expect("request should build"),
        )
        .await
        .expect("request should complete");

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    let response: ScanSessionResponse = response_json(response).await;
    assert!(!response.ok);
    assert_eq!(response.status, "invalid_session");
    assert_eq!(
        response.message.as_deref(),
        Some("face U must include 9 reviewedStickers")
    );
}

#[tokio::test]
async fn livez_and_readyz_split_liveness_from_readiness() {
    let app = api_router(ApiState::without_generated_solver());
    let livez = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/livez")
                .body(Body::empty())
                .expect("request should build"),
        )
        .await
        .expect("request should complete");

    assert_eq!(livez.status(), StatusCode::OK);
    let body = to_bytes(livez.into_body(), usize::MAX)
        .await
        .expect("body should be readable");
    let response: serde_json::Value =
        serde_json::from_slice(&body).expect("response should be JSON");
    assert_eq!(response["ok"], true);

    let readyz = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/readyz")
                .body(Body::empty())
                .expect("request should build"),
        )
        .await
        .expect("request should complete");

    assert_eq!(readyz.status(), StatusCode::SERVICE_UNAVAILABLE);
    let body = to_bytes(readyz.into_body(), usize::MAX)
        .await
        .expect("body should be readable");
    let response: serde_json::Value =
        serde_json::from_slice(&body).expect("response should be JSON");
    assert_eq!(response["ok"], false);
    assert_eq!(response["generatedTwoPhaseReady"], false);
}

#[tokio::test]
async fn health_route_reports_vision_tile_detector_status() {
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
    assert_eq!(response["visionTileDetectorAvailable"], false);
    assert_eq!(
        response["visionTileDetectorReason"],
        "tile_detector_model_not_configured"
    );
}

#[tokio::test]
async fn responses_include_browser_security_headers() {
    let app = api_router(ApiState::without_generated_solver());
    let response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/livez")
                .body(Body::empty())
                .expect("request should build"),
        )
        .await
        .expect("request should complete");

    assert_security_headers(response.headers());
}

#[tokio::test]
async fn router_with_web_dist_applies_security_headers_to_static_and_spa_fallback() {
    let web_dist_dir = std::env::temp_dir().join(format!(
        "rubiks-api-web-dist-security-test-{}",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .expect("system time should be after unix epoch")
            .as_nanos()
    ));
    let assets_dir = web_dist_dir.join("assets");
    std::fs::create_dir_all(&assets_dir).expect("web assets dir should be created");
    std::fs::write(
        web_dist_dir.join("index.html"),
        "<!doctype html><div id=\"root\"></div>",
    )
    .expect("index should be written");
    std::fs::write(
        web_dist_dir.join("404.html"),
        "<!doctype html><div id=\"root\">not found</div>",
    )
    .expect("404 page should be written");
    std::fs::write(assets_dir.join("app.js"), "console.log('asset');")
        .expect("asset should be written");

    let app = api_router_with_web_dist(ApiState::without_generated_solver(), web_dist_dir.clone());

    for (path, expected_status) in [
        ("/", StatusCode::PERMANENT_REDIRECT),
        ("/index.html", StatusCode::OK),
        ("/solve/real-scramble", StatusCode::NOT_FOUND),
    ] {
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(Method::GET)
                    .uri(path)
                    .body(Body::empty())
                    .expect("request should build"),
            )
            .await
            .expect("request should complete");

        assert_eq!(response.status(), expected_status);
        assert_security_headers(response.headers());
        assert_eq!(response.headers().get("cache-control"), None);
        let body = to_bytes(response.into_body(), usize::MAX)
            .await
            .expect("body should be readable");
        if expected_status != StatusCode::PERMANENT_REDIRECT {
            assert!(String::from_utf8_lossy(&body).contains("id=\"root\""));
        }
    }

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/assets/app.js")
                .body(Body::empty())
                .expect("request should build"),
        )
        .await
        .expect("request should complete");

    assert_eq!(response.status(), StatusCode::OK);
    assert_security_headers(response.headers());
    assert_eq!(
        response.headers().get("cache-control"),
        Some(
            &"public, max-age=31536000, immutable"
                .parse()
                .expect("cache header")
        )
    );
    let body = to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("body should be readable");
    assert!(String::from_utf8_lossy(&body).contains("console.log"));

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/assets/missing-worker.js")
                .body(Body::empty())
                .expect("request should build"),
        )
        .await
        .expect("request should complete");

    assert_eq!(response.status(), StatusCode::NOT_FOUND);
    assert_security_headers(response.headers());
    assert_eq!(response.headers().get("cache-control"), None);

    std::fs::remove_dir_all(web_dist_dir).expect("web dist should be removed");
}

#[test]
fn cors_allowed_origins_can_be_configured() {
    assert!(allowed_web_origins(None).contains(&"http://127.0.0.1:5173".to_owned()));
    assert_eq!(
        allowed_web_origins(Some("https://rubiks.example, https://preview.example ")),
        vec![
            "https://rubiks.example".to_owned(),
            "https://preview.example".to_owned(),
        ]
    );
    assert!(allowed_web_origins(Some("  ,  ")).is_empty());
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
                        "image": "data:image/jpeg;base64,AAAA"
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
        grid_size: 3,
        image: "data:image/jpeg;base64,AAAA".to_owned(),
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
async fn solve_scan_session_rejects_missing_reviewed_stickers() {
    let (status, response) = solve_scan_session_request(
        &ApiState::without_generated_solver(),
        solved_scan_session_request_without_reviewed_stickers(),
    );

    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert!(!response.ok);
    assert_eq!(response.status, "invalid_session");
}

#[tokio::test]
async fn solve_scan_session_rejects_3x3_depth_above_puzzle_cap() {
    let mut request = solved_scan_session_request();
    request.max_depth = CUBE3_MAX_API_DEPTH + 1;

    let (status, response) =
        solve_scan_session_request(&ApiState::without_generated_solver(), request);

    assert_eq!(status, StatusCode::OK);
    let response = response.0;
    assert!(!response.ok);
    assert_eq!(response.status, "api_error");
    let solve = response.solve.expect("3x3 scan should include solve error");
    assert!(!solve.ok);
    assert_eq!(solve.status, "invalid_limits");
    assert_eq!(solve.error_kind.as_deref(), Some("max_depth_exceeds_limit"));
}

#[tokio::test]
async fn solve_scan_session_skips_scan_analysis_for_reviewed_stickers() {
    let mut request = solved_scan_session_request();
    for face in &mut request.faces {
        face.client_rotation = None;
    }

    let (status, response) =
        solve_scan_session_request(&ApiState::without_generated_solver(), request);

    assert_eq!(status, StatusCode::OK);
    let response = response.0;
    assert!(response.ok);
    assert_eq!(response.status, "accepted");
    assert!(response.scan.is_none());
    assert!(response.inference.is_none());
    let timings = response.timings.expect("timings should be reported");
    assert!(timings.vision_elapsed_ms.is_none());
    assert!(timings.early_quality_gate_elapsed_ms.is_none());
    assert!(timings.inference_elapsed_ms.is_none());
    assert!(timings.quality_gate_elapsed_ms.is_none());
    assert!(timings.solve_elapsed_ms.is_some());
    let solve = response.solve.expect("reviewed scan should solve");
    assert!(solve.ok);
    assert_eq!(
        solve
            .visual_state
            .as_ref()
            .map(|state| state.value.as_str()),
        Some("UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB")
    );
}

#[tokio::test]
async fn solve_cube2_scan_session_accepts_reviewed_stickers() {
    let request = solved_cube2_scan_session_request();

    let (status, response) = solve_scan_session_request_for_puzzle(
        &ApiState::without_generated_solver(),
        PuzzleId::Cube2x2x2,
        request,
    );

    assert_eq!(status, StatusCode::OK);
    let response = response.0;
    assert_eq!(response.status, "accepted");
    assert!(response.scan.is_none());
    assert!(response.inference.is_none());
    let solve = response.solve.expect("2x2 scan should solve");
    assert!(solve.ok);
    assert_eq!(solve.strategy_id, "cube2-pdb-ida-star");
    let visual_state = solve
        .visual_state
        .expect("2x2 scan should return visual state");
    assert_eq!(visual_state.kind, "cube2-facelets-v1");
    assert_eq!(visual_state.value, "UUUURRRRFFFFDDDDLLLLBBBB");
    assert_eq!(visual_state.value.len(), 24);
}

#[tokio::test]
async fn solve_cube2_scan_session_returns_initial_scrambled_visual_state() {
    let algorithm: Cube2Algorithm = "R U F".parse().expect("algorithm should parse");
    let mut cube = Cube2::solved();
    algorithm.apply_to(&mut cube);
    let initial_visual_state = cube2_visual_state(&cube);
    assert_ne!(initial_visual_state, "UUUURRRRFFFFDDDDLLLLBBBB");
    let mut request = cube2_scan_session_request_from_visual_state(&initial_visual_state);
    request.max_depth = CUBE2_MAX_API_DEPTH;
    request.max_nodes = Some(100_000);

    let (status, response) = solve_scan_session_request_for_puzzle(
        &ApiState::without_generated_solver(),
        PuzzleId::Cube2x2x2,
        request,
    );

    assert_eq!(status, StatusCode::OK);
    let response = response.0;
    assert_eq!(response.status, "accepted");
    assert!(response.scan.is_none());
    assert!(response.inference.is_none());
    let solve = response.solve.expect("2x2 scan should solve");
    assert!(solve.ok);
    assert_eq!(solve.replay_verified, Some(true));
    let visual_state = solve
        .visual_state
        .expect("2x2 scan should return visual state");
    assert_eq!(visual_state.kind, "cube2-facelets-v1");
    assert_eq!(visual_state.value, initial_visual_state);
}

#[tokio::test]
async fn solve_cube2_scan_session_rejects_depth_above_puzzle_cap() {
    let mut request = solved_cube2_scan_session_request();
    request.max_depth = CUBE2_MAX_API_DEPTH + 1;

    let (status, response) = solve_scan_session_request_for_puzzle(
        &ApiState::without_generated_solver(),
        PuzzleId::Cube2x2x2,
        request,
    );

    assert_eq!(status, StatusCode::OK);
    let response = response.0;
    assert!(!response.ok);
    assert_eq!(response.status, "api_error");
    assert!(response.scan.is_none());
    assert!(response.inference.is_none());
    let solve = response.solve.expect("2x2 scan should include solve error");
    assert!(!solve.ok);
    assert_eq!(solve.status, "invalid_limits");
    assert_eq!(solve.error_kind.as_deref(), Some("max_depth_exceeds_limit"));
}

#[tokio::test]
async fn solve_cube2_scan_session_highlights_invalid_corner_stickers() {
    let mut request = solved_cube2_scan_session_request();
    replace_reviewed_cube2_sticker(&mut request, "U", 3, "B");
    replace_reviewed_cube2_sticker(&mut request, "F", 1, "L");
    replace_reviewed_cube2_sticker(&mut request, "B", 0, "U");
    replace_reviewed_cube2_sticker(&mut request, "L", 0, "F");

    let (status, response) = solve_scan_session_request_for_puzzle(
        &ApiState::without_generated_solver(),
        PuzzleId::Cube2x2x2,
        request,
    );

    assert_eq!(status, StatusCode::OK);
    let response = response.0;
    assert!(!response.ok);
    assert_eq!(response.status, "invalid_cube_state");
    assert!(response.scan.is_none());
    assert!(response.inference.is_none());
    assert_eq!(
        response.message.as_deref(),
        Some("invalid 2x2 scan cube state: unknown corner stickers at position Urf: BRL")
    );
    assert_manual_target_contains(&response.manual_targets, "U", 3);
    assert_manual_target_contains(&response.manual_targets, "R", 0);
    assert_manual_target_contains(&response.manual_targets, "F", 1);
    let invalid_corner = response
        .invalid_corners
        .iter()
        .find(|corner| corner.position == "Urf")
        .expect("invalid corner should be reported");
    assert_eq!(invalid_corner.faces, ["U", "R", "F"]);
    assert_eq!(invalid_corner.stickers, ["B", "R", "L"]);
    assert_eq!(invalid_corner.reason, "opposite_faces");
    assert_eq!(invalid_corner.targets[0].face, "U");
    assert_eq!(invalid_corner.targets[0].index, 3);
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
    std::fs::write(
        web_dist_dir.join("404.html"),
        "<!doctype html><div id=\"root\">not found</div>",
    )
    .expect("404 page should be written");
    let sites_dir = web_dist_dir.join("sites");
    let localized_sites_dir = web_dist_dir.join("es/sites");
    std::fs::create_dir_all(&sites_dir).expect("sites directory should be created");
    std::fs::create_dir_all(&localized_sites_dir)
        .expect("localized sites directory should be created");
    std::fs::write(sites_dir.join("index.html"), "sites").expect("sites page should be written");
    std::fs::write(localized_sites_dir.join("index.html"), "sitios")
        .expect("localized sites page should be written");

    let app = api_router_with_web_dist(ApiState::without_generated_solver(), web_dist_dir.clone());
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/solve/real-scramble")
                .body(Body::empty())
                .expect("request should build"),
        )
        .await
        .expect("request should complete");

    assert_eq!(response.status(), StatusCode::NOT_FOUND);
    let body = to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("body should be readable");
    assert!(String::from_utf8_lossy(&body).contains("not found"));

    for (path, location) in [
        ("/", "/solve/"),
        ("/api/wca-data", "/api/wca-data/v1/docs"),
        ("/api/wca-data/", "/api/wca-data/v1/docs"),
        ("/notations", "/notations/3x3/"),
        ("/notations/", "/notations/3x3/"),
        ("/algoritmos", "/algorithms/"),
        ("/algoritmos/", "/algorithms/"),
        ("/algoritmos/3x3/oll", "/algorithms/3x3/oll"),
        ("/en/algoritmos/3x3/oll", "/algorithms/3x3/oll"),
        ("/pt-BR/algoritmos/3x3/oll", "/pt-BR/algorithms/3x3/oll"),
        ("/en/sites", "/sites/"),
        ("/en/sites/", "/sites/"),
        ("/pt-BR", "/pt-BR/solve/"),
        ("/pt-BR/", "/pt-BR/solve/"),
    ] {
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(Method::GET)
                    .uri(path)
                    .body(Body::empty())
                    .expect("request should build"),
            )
            .await
            .expect("request should complete");

        assert_eq!(response.status(), StatusCode::PERMANENT_REDIRECT);
        assert_eq!(response.headers().get("location").unwrap(), location);
    }

    for locale in ["en", "de", "es", "fr", "it", "ja", "pt-BR", "ru", "zh"] {
        for suffix in ["", "/"] {
            let path = format!("/{locale}{suffix}");
            let response = app
                .clone()
                .oneshot(
                    Request::builder()
                        .method(Method::GET)
                        .uri(path)
                        .body(Body::empty())
                        .expect("request should build"),
                )
                .await
                .expect("locale root redirect should complete");

            assert_eq!(response.status(), StatusCode::PERMANENT_REDIRECT);
            assert_eq!(
                response.headers().get("location").unwrap(),
                &format!("/{locale}/solve/")
            );
        }

        for suffix in ["", "/"] {
            let path = format!("/{locale}/notations{suffix}");
            let location = if locale == "en" {
                "/notations/3x3/".to_owned()
            } else {
                format!("/{locale}/notations/3x3/")
            };
            let response = app
                .clone()
                .oneshot(
                    Request::builder()
                        .method(Method::GET)
                        .uri(path)
                        .body(Body::empty())
                        .expect("request should build"),
                )
                .await
                .expect("localized notations redirect should complete");

            assert_eq!(response.status(), StatusCode::PERMANENT_REDIRECT);
            assert_eq!(response.headers().get("location").unwrap(), &location);
        }
    }

    for (path, location) in [
        ("/?source=home", "/solve/?source=home"),
        ("/en/sites/?from=legacy", "/sites/?from=legacy"),
        (
            "/pt-BR/notations?tab=moves",
            "/pt-BR/notations/3x3/?tab=moves",
        ),
        (
            "/api/wca-data?version=current",
            "/api/wca-data/v1/docs?version=current",
        ),
        (
            "/pt-BR/algoritmos/3x3/oll?case=21",
            "/pt-BR/algorithms/3x3/oll?case=21",
        ),
    ] {
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(Method::GET)
                    .uri(path)
                    .body(Body::empty())
                    .expect("request should build"),
            )
            .await
            .expect("redirect with query should complete");

        assert_eq!(response.status(), StatusCode::PERMANENT_REDIRECT);
        assert_eq!(response.headers().get("location").unwrap(), location);
    }

    for path in [
        "/en/not-a-known-route",
        "/en/%2F%2Fevil.example",
        "/en/%5C%5Cevil.example",
        "/en/sites%2F",
        "/en/sites%5C",
    ] {
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(Method::GET)
                    .uri(path)
                    .body(Body::empty())
                    .expect("request should build"),
            )
            .await
            .expect("unsafe legacy path request should complete");

        assert_eq!(response.status(), StatusCode::NOT_FOUND, "{path}");
        assert_eq!(response.headers().get("location"), None, "{path}");
    }

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/api/unknown")
                .body(Body::empty())
                .expect("request should build"),
        )
        .await
        .expect("request should complete");
    assert_eq!(response.status(), StatusCode::NOT_FOUND);

    std::fs::remove_dir_all(web_dist_dir).expect("web dist should be removed");
}

#[tokio::test]
async fn router_with_real_web_dist_serves_every_routable_static_path() {
    let web_dist_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../../apps/web/dist");
    let require_web_dist = std::env::var_os("RUBIKS_REQUIRE_WEB_DIST").is_some();
    if !web_dist_dir.is_dir() {
        assert!(
            !require_web_dist,
            "apps/web/dist is required when RUBIKS_REQUIRE_WEB_DIST is set"
        );
        eprintln!("skipping real web dist test: apps/web/dist is not present");
        return;
    }
    let web_dist_dir = web_dist_dir
        .canonicalize()
        .expect("real web dist should be canonicalizable");
    let manifest_path = web_dist_dir.join("routing-manifest.json");
    if !manifest_path.is_file() {
        assert!(
            !require_web_dist,
            "routing-manifest.json is required when RUBIKS_REQUIRE_WEB_DIST is set"
        );
        eprintln!("skipping real web dist test: routing-manifest.json is not present");
        return;
    }

    let manifest: serde_json::Value = serde_json::from_slice(
        &std::fs::read(manifest_path).expect("real routing manifest should be readable"),
    )
    .expect("real routing manifest should be valid JSON");
    let paths = manifest["routableStaticPaths"]
        .as_array()
        .expect("routing manifest should list routable static paths");
    let sitemap = std::fs::read_to_string(web_dist_dir.join("sitemap.xml"))
        .expect("real sitemap should be readable");
    assert!(sitemap.contains("https://speedcube.com.br/solve/"));
    assert!(!sitemap.contains("/records/world/"));
    assert!(!sitemap.contains("/notations/skewb/"));
    assert!(!sitemap.contains("/notations/clock/"));
    let app = api_router_with_web_dist(ApiState::without_generated_solver(), web_dist_dir);

    for path in paths {
        let path = path.as_str().expect("routable path should be a string");
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(Method::GET)
                    .uri(path)
                    .body(Body::empty())
                    .expect("request should build"),
            )
            .await
            .expect("real static route request should complete");

        assert_eq!(response.status(), StatusCode::OK, "expected 200 for {path}");
        let body = to_bytes(response.into_body(), usize::MAX)
            .await
            .expect("real static route body should be readable");
        let body = String::from_utf8_lossy(&body);
        if path.contains("/records/world/")
            || path.contains("/notations/skewb/")
            || path.contains("/notations/clock/")
        {
            assert!(
                body.contains("noindex,nofollow"),
                "expected noindex for {path}"
            );
            assert!(
                !body.contains("hreflang="),
                "unexpected hreflang for {path}"
            );
        }
    }

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/__definitely-unknown__/")
                .body(Body::empty())
                .expect("request should build"),
        )
        .await
        .expect("unknown real static route request should complete");
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
    let body = to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("real 404 body should be readable");
    let body = String::from_utf8_lossy(&body);
    assert!(body.contains("noindex,nofollow"));
    assert!(!body.contains("data-ssg=\"true\""));
    assert!(!body.contains("/__not-found__"));
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
        max_depth: CUBE3_MAX_API_DEPTH,
        max_nodes: Some(1_000),
        strategy_id: "unknown".to_owned(),
    };

    let (status, response) = solve_notation_request(&ApiState::without_generated_solver(), request);

    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert_eq!(response.status, "unsupported_strategy");
    assert_eq!(response.error_kind.as_deref(), Some("unsupported_strategy"));
}

fn assert_security_headers(headers: &HeaderMap) {
    assert_eq!(
        headers.get("x-content-type-options"),
        Some(&"nosniff".parse().expect("header value"))
    );
    assert_eq!(
        headers.get("referrer-policy"),
        Some(&"no-referrer".parse().expect("header value"))
    );
    let content_security_policy = headers
        .get("content-security-policy")
        .expect("content-security-policy should be set")
        .to_str()
        .expect("content-security-policy should be valid");
    assert!(content_security_policy.contains(
        "script-src 'self' 'nonce-speedcube-jsonld' 'wasm-unsafe-eval' https://static.cloudflareinsights.com https://www.googletagmanager.com"
    ));
    assert!(content_security_policy.contains(
        "img-src 'self' data: blob: https://yt3.googleusercontent.com https://avatars.worldcubeassociation.org https://www.googletagmanager.com https://www.google-analytics.com"
    ));
    assert!(content_security_policy.contains(
        "connect-src 'self' http://127.0.0.1:* http://localhost:* https://cloudflareinsights.com https://www.googletagmanager.com https://www.google-analytics.com https://region1.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com"
    ));
    assert!(headers.get("permissions-policy").is_some());
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
                manual_overrides: Default::default(),
                reviewed_stickers: reviewed_stickers(symbol),
                client_rotation: Some(0),
            })
            .collect(),
        grid_size: 3,
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

fn solved_cube2_scan_session_request() -> ScanSessionRequest {
    ScanSessionRequest {
        faces: ["U", "R", "F", "D", "L", "B"]
            .into_iter()
            .map(|symbol| ScanSessionFaceRequest {
                symbol: symbol.to_owned(),
                expected_top: None,
                manual_overrides: Default::default(),
                reviewed_stickers: reviewed_cube2_stickers(symbol),
                client_rotation: Some(0),
            })
            .collect(),
        grid_size: 2,
        max_depth: 0,
        max_nodes: Some(1_000),
        strategy_id: "cube2-pdb-ida-star".to_owned(),
    }
}

fn cube2_scan_session_request_from_visual_state(visual_state: &str) -> ScanSessionRequest {
    let chars: Vec<char> = visual_state.chars().collect();
    assert_eq!(chars.len(), 24);

    ScanSessionRequest {
        faces: ["U", "R", "F", "D", "L", "B"]
            .into_iter()
            .enumerate()
            .map(|(face_index, symbol)| ScanSessionFaceRequest {
                symbol: symbol.to_owned(),
                expected_top: None,
                manual_overrides: Default::default(),
                reviewed_stickers: chars[face_index * 4..face_index * 4 + 4]
                    .iter()
                    .enumerate()
                    .map(|(index, symbol)| ScanSessionReviewedStickerRequest {
                        index,
                        symbol: symbol.to_string(),
                        confidence: Some(1.0),
                        source: Some("manual".to_owned()),
                    })
                    .collect(),
                client_rotation: Some(0),
            })
            .collect(),
        grid_size: 2,
        max_depth: 0,
        max_nodes: Some(1_000),
        strategy_id: "cube2-pdb-ida-star".to_owned(),
    }
}

fn reviewed_cube2_stickers(symbol: &str) -> Vec<ScanSessionReviewedStickerRequest> {
    (0..4)
        .map(|index| ScanSessionReviewedStickerRequest {
            index,
            symbol: symbol.to_owned(),
            confidence: Some(1.0),
            source: Some("manual".to_owned()),
        })
        .collect()
}

fn replace_reviewed_cube2_sticker(
    request: &mut ScanSessionRequest,
    face_symbol: &str,
    sticker_index: usize,
    symbol: &str,
) {
    let face = request
        .faces
        .iter_mut()
        .find(|face| face.symbol == face_symbol)
        .expect("face should exist");
    let sticker = face
        .reviewed_stickers
        .iter_mut()
        .find(|sticker| sticker.index == sticker_index)
        .expect("sticker should exist");

    sticker.symbol = symbol.to_owned();
}

fn assert_manual_target_contains(
    targets: &[ScanSessionManualTargetResponse],
    face: &str,
    sticker: usize,
) {
    let target = targets
        .iter()
        .find(|target| target.face == face)
        .expect("manual target should exist");
    assert!(target.stickers.contains(&sticker));
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
