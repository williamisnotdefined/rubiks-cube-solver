use std::time::Instant;

use axum::http::StatusCode;
use axum::Json;
use cube_engine::{
    Algorithm, Cube, FaceletString, SearchBudget, SearchOutcome, SolveError, SolveInputError,
    SolverConfig, SolverStrategy,
};

use crate::config::{DEFAULT_API_NODES, MAX_API_DEPTH, MAX_API_NODES, MAX_NOTATION_BYTES};
use crate::error_kind::solve_input_error_kind;
use crate::response::{
    error_response_from_parts, not_found_response_from_parts, success_response_from_parts,
    unverified_solution_response_from_parts, ScanFacesRequest, SolveNotationRequest, SolveResponse,
    SolveScanRequest,
};
use crate::state::ApiState;

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

    solve_prepared_cube(
        state,
        request.max_depth,
        request.max_nodes,
        strategy,
        cube,
        visual_state,
    )
}

pub fn solve_scan_request(
    state: &ApiState,
    request: SolveScanRequest,
) -> (StatusCode, Json<SolveResponse>) {
    let request = match validate_solve_scan_request_limits(request) {
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
    let facelet_input = scan_faces_to_facelet_string(&request.faces);
    let parsed_visual_state = FaceletString::parse(&facelet_input)
        .map(|facelets| facelets.to_string())
        .ok();
    let cube = match cube_from_facelet_string(&facelet_input) {
        Ok(cube) => cube,
        Err(error) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(error_response_from_parts(
                    &request.strategy_id,
                    request.max_depth,
                    request.max_nodes,
                    Some(strategy),
                    "invalid_input",
                    solve_input_error_kind(&error),
                    error.to_string(),
                    parsed_visual_state,
                )),
            );
        }
    };
    let visual_state = FaceletString::from_cube(&cube).to_string();

    solve_prepared_cube(
        state,
        request.max_depth,
        request.max_nodes,
        strategy,
        cube,
        visual_state,
    )
}

fn solve_prepared_cube(
    state: &ApiState,
    max_depth: usize,
    max_nodes: Option<usize>,
    strategy: SolverStrategy,
    cube: Cube,
    visual_state: String,
) -> (StatusCode, Json<SolveResponse>) {
    match strategy {
        SolverStrategy::GeneratedTwoPhase
        | SolverStrategy::GeneratedTwoPhaseQuality
        | SolverStrategy::GeneratedTwoPhaseMultiprobe => {
            solve_generated_cube(state, max_depth, max_nodes, strategy, cube, visual_state)
        }
        SolverStrategy::BoundedIdaStar
        | SolverStrategy::OptimalBoundedCornerPdb
        | SolverStrategy::OptimalBoundedPdb16
        | SolverStrategy::ShortSolutionPortfolio => {
            solve_configured_cube(state, max_depth, max_nodes, strategy, &cube, visual_state)
        }
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

fn validate_solve_scan_request_limits(
    mut request: SolveScanRequest,
) -> Result<SolveScanRequest, Box<SolveResponse>> {
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
    let max_nodes = max_nodes.unwrap_or(DEFAULT_API_NODES);

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

    let started = Instant::now();
    let result = match strategy {
        SolverStrategy::GeneratedTwoPhase => solver.solve(&cube, budget),
        SolverStrategy::GeneratedTwoPhaseQuality => solver.solve_quality(&cube, budget),
        SolverStrategy::GeneratedTwoPhaseMultiprobe => solver.solve_multiprobe(&cube, budget),
        SolverStrategy::BoundedIdaStar
        | SolverStrategy::OptimalBoundedCornerPdb
        | SolverStrategy::OptimalBoundedPdb16
        | SolverStrategy::ShortSolutionPortfolio => {
            unreachable!("non-generated strategies should use the configured API solver path")
        }
    };

    let elapsed_ms = started.elapsed().as_millis();

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
                        elapsed_ms,
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
                    elapsed_ms,
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
    state: &ApiState,
    max_depth: usize,
    max_nodes: Option<usize>,
    strategy: SolverStrategy,
    cube: &Cube,
    visual_state: String,
) -> (StatusCode, Json<SolveResponse>) {
    let config = SolverConfig::with_strategy(max_depth, max_nodes, strategy)
        .with_pruning_table_dir(state.pruning_table_dir.clone());

    let started = Instant::now();
    let result = cube_engine::solve_cube(cube, config);
    let elapsed_ms = started.elapsed().as_millis();

    match result {
        Ok(solution) => (
            StatusCode::OK,
            Json(success_response_from_parts(
                max_depth,
                max_nodes,
                strategy,
                solution.moves(),
                solution.length(),
                solution.explored_nodes(),
                elapsed_ms,
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
                elapsed_ms,
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

fn cube_from_notation(input: &str) -> Result<Cube, String> {
    let algorithm = Algorithm::parse(input).map_err(|error| error.to_string())?;
    let mut cube = Cube::solved();
    algorithm.apply_to(&mut cube);

    Ok(cube)
}

fn cube_from_facelet_string(input: &str) -> Result<Cube, SolveInputError> {
    let facelets = FaceletString::parse(input).map_err(SolveInputError::from)?;
    let state = facelets.to_cubie_state().map_err(SolveInputError::from)?;

    Cube::try_from_state(state).map_err(SolveInputError::from)
}

fn scan_faces_to_facelet_string(faces: &ScanFacesRequest) -> String {
    [
        faces.u.as_str(),
        faces.r.as_str(),
        faces.f.as_str(),
        faces.d.as_str(),
        faces.l.as_str(),
        faces.b.as_str(),
    ]
    .concat()
}

fn solution_solves(start: &Cube, moves: &[cube_engine::Move]) -> bool {
    let mut cube = start.clone();
    cube.apply_moves(moves);

    cube.is_solved()
}
