use std::time::Instant;

use axum::http::StatusCode;
use axum::Json;
use cube_engine::puzzles::cube2::{
    solve_cube2_bounded_ida_star, solve_cube2_pdb_ida_star, Cube2, Cube2Algorithm,
    Cube2SearchBudget, Cube2SearchOutcome, CUBE2_BOUNDED_IDA_STAR_STRATEGY_ID,
    CUBE2_PDB_IDA_STAR_STRATEGY_ID,
};
use cube_engine::{
    all_puzzle_definitions, all_strategy_definitions, puzzle_definition_by_slug,
    strategies_for_puzzle, InputKind, MoveMetric, PuzzleDefinition, PuzzleId, SolverStrategy,
    SolverStrategyDefinition, VisualizationKind,
};

use crate::config::{DEFAULT_API_NODES, MAX_API_DEPTH, MAX_API_NODES, MAX_NOTATION_BYTES};
use crate::response::{
    generated_table_status, PuzzleApiErrorResponse, PuzzleResponse, PuzzleSolveLimitsRequest,
    PuzzleSolveRequest, PuzzleSolveResponse, PuzzleStrategyResponse, SolveNotationRequest,
    SolveResponse,
};
use crate::solve::solve_notation_request;
use crate::state::ApiState;

pub fn list_puzzles_response() -> Vec<PuzzleResponse> {
    all_puzzle_definitions()
        .iter()
        .map(puzzle_response)
        .collect()
}

pub fn puzzle_response_by_slug(slug: &str) -> Result<PuzzleResponse, PuzzleApiErrorResponse> {
    puzzle_definition_by_slug(slug)
        .map(puzzle_response)
        .ok_or_else(|| unknown_puzzle_error(slug))
}

pub fn puzzle_strategy_responses_by_slug(
    slug: &str,
) -> Result<Vec<PuzzleStrategyResponse>, PuzzleApiErrorResponse> {
    let puzzle = puzzle_definition_by_slug(slug).ok_or_else(|| unknown_puzzle_error(slug))?;

    Ok(strategies_for_puzzle(puzzle.id)
        .iter()
        .map(strategy_response)
        .collect())
}

pub fn solve_puzzle_request(
    state: &ApiState,
    puzzle_slug: &str,
    mut request: PuzzleSolveRequest,
) -> (StatusCode, PuzzleSolveResponse) {
    let Some(puzzle) = puzzle_definition_by_slug(puzzle_slug) else {
        let strategy_id = requested_strategy_id(&request);
        return (
            StatusCode::NOT_FOUND,
            puzzle_solve_error_response(
                None,
                puzzle_slug,
                &strategy_id,
                &request.limits,
                &request.metric,
                "unknown_puzzle",
                "unknown_puzzle",
                format!("unknown puzzle slug: {puzzle_slug}"),
            ),
        );
    };

    let strategy_id = effective_strategy_id(puzzle, &request).to_owned();

    if request.input.kind != InputKind::Notation.as_str() {
        return (
            StatusCode::BAD_REQUEST,
            puzzle_solve_error_response(
                Some(puzzle.id),
                puzzle.slug,
                &strategy_id,
                &request.limits,
                &request.metric,
                "unsupported_input_kind",
                "unsupported_input_kind",
                format!(
                    "input kind {:?} is not supported by this solve endpoint",
                    request.input.kind
                ),
            ),
        );
    }

    if request.metric != MoveMetric::Htm.as_str() {
        return (
            StatusCode::BAD_REQUEST,
            puzzle_solve_error_response(
                Some(puzzle.id),
                puzzle.slug,
                &strategy_id,
                &request.limits,
                &request.metric,
                "unsupported_metric",
                "unsupported_metric",
                format!("move metric {:?} is not supported", request.metric),
            ),
        );
    }

    let Some(strategy_definition) = strategy_definition_by_id(&strategy_id) else {
        return (
            StatusCode::BAD_REQUEST,
            puzzle_solve_error_response(
                Some(puzzle.id),
                puzzle.slug,
                &strategy_id,
                &request.limits,
                &request.metric,
                "unsupported_strategy",
                "unsupported_strategy",
                format!("unsupported solver strategy id: {strategy_id}"),
            ),
        );
    };

    if strategy_definition.puzzle_id != puzzle.id {
        return (
            StatusCode::BAD_REQUEST,
            puzzle_solve_error_response(
                Some(puzzle.id),
                puzzle.slug,
                &strategy_id,
                &request.limits,
                &request.metric,
                "strategy_puzzle_mismatch",
                "strategy_puzzle_mismatch",
                format!(
                    "strategy {:?} is not registered for puzzle {}",
                    strategy_id, puzzle.id
                ),
            ),
        );
    }

    request.strategy_id = Some(strategy_id.clone());

    match puzzle.id {
        PuzzleId::Cube3x3x3 => solve_cube3_puzzle_request(state, puzzle, &strategy_id, request),
        PuzzleId::Cube2x2x2 => solve_cube2_puzzle_request(puzzle, strategy_definition, request),
        PuzzleId::Pyraminx
        | PuzzleId::Clock
        | PuzzleId::Skewb
        | PuzzleId::CubeNxN
        | PuzzleId::Square1
        | PuzzleId::Megaminx => (
            StatusCode::BAD_REQUEST,
            puzzle_solve_error_response(
                Some(puzzle.id),
                puzzle.slug,
                &strategy_id,
                &request.limits,
                &request.metric,
                "unsupported_puzzle",
                "unsupported_puzzle",
                format!("solving is not implemented for puzzle {}", puzzle.id),
            ),
        ),
    }
}

fn solve_cube3_puzzle_request(
    state: &ApiState,
    puzzle: &PuzzleDefinition,
    strategy_id: &str,
    request: PuzzleSolveRequest,
) -> (StatusCode, PuzzleSolveResponse) {
    let strategy = SolverStrategy::from_id(strategy_id)
        .expect("3x3 puzzle strategy registry should only contain SolverStrategy ids");

    let legacy_request = SolveNotationRequest {
        moves: request.input.value,
        max_depth: request.limits.max_depth,
        max_nodes: request.limits.max_nodes,
        strategy_id: strategy.id().to_owned(),
    };
    let (status, Json(response)) = solve_notation_request(state, legacy_request);

    (
        status,
        puzzle_solve_response_from_legacy(puzzle, &request.metric, response),
    )
}

fn solve_cube2_puzzle_request(
    puzzle: &PuzzleDefinition,
    strategy: &SolverStrategyDefinition,
    mut request: PuzzleSolveRequest,
) -> (StatusCode, PuzzleSolveResponse) {
    let strategy_id = request
        .strategy_id
        .as_deref()
        .expect("effective 2x2 strategy id should be set")
        .to_owned();

    if let Err(response) = validate_puzzle_solve_notation_limits(
        puzzle,
        &strategy_id,
        &request.input.value,
        &mut request.limits,
        &request.metric,
    ) {
        return (StatusCode::BAD_REQUEST, *response);
    }

    let algorithm = match Cube2Algorithm::parse(&request.input.value) {
        Ok(algorithm) => algorithm,
        Err(error) => {
            return (
                StatusCode::BAD_REQUEST,
                puzzle_solve_error_response(
                    Some(puzzle.id),
                    puzzle.slug,
                    &strategy_id,
                    &request.limits,
                    &request.metric,
                    "invalid_notation",
                    "invalid_move_notation",
                    error.to_string(),
                ),
            );
        }
    };
    let mut cube = Cube2::solved();
    algorithm.apply_to(&mut cube);

    let budget = Cube2SearchBudget {
        max_depth: request.limits.max_depth,
        max_nodes: request.limits.max_nodes,
    };
    let started = Instant::now();
    let outcome = match strategy_id.as_str() {
        CUBE2_BOUNDED_IDA_STAR_STRATEGY_ID => solve_cube2_bounded_ida_star(&cube, budget),
        CUBE2_PDB_IDA_STAR_STRATEGY_ID => solve_cube2_pdb_ida_star(&cube, budget),
        _ => unreachable!("2x2 strategy registry should only contain implemented 2x2 ids"),
    };
    let elapsed_ms = started.elapsed().as_millis();

    match outcome {
        Cube2SearchOutcome::Found(solution) => (
            StatusCode::OK,
            PuzzleSolveResponse {
                ok: true,
                status: "success".to_owned(),
                puzzle_id: Some(puzzle.id.as_str().to_owned()),
                puzzle_slug: puzzle.slug.to_owned(),
                strategy_id,
                strategy_label: strategy.label.to_owned(),
                solver_mode: strategy.solver_mode.to_owned(),
                generated_table_status: "not_applicable".to_owned(),
                metric: request.metric,
                max_depth: request.limits.max_depth,
                max_nodes: request.limits.max_nodes,
                moves: solution
                    .moves
                    .iter()
                    .map(|move_| move_.notation().to_owned())
                    .collect(),
                length: Some(solution.depth),
                explored_nodes: Some(solution.explored_nodes),
                elapsed_ms: Some(elapsed_ms),
                replay_verified: Some(solution.replay_verified),
                visual_state: None,
                error_kind: None,
                message: None,
            },
        ),
        Cube2SearchOutcome::NotFoundWithinLimits {
            explored_nodes,
            max_depth,
        } => (
            StatusCode::OK,
            puzzle_solve_search_error_response(
                puzzle,
                strategy,
                &strategy_id,
                &request.limits,
                &request.metric,
                elapsed_ms,
                explored_nodes,
                "not_found_within_limits",
                None,
                format!(
                    "no solution found within limits: max_depth={}, max_nodes={}, explored_nodes={}",
                    max_depth,
                    max_nodes_label(request.limits.max_nodes),
                    explored_nodes
                ),
            ),
        ),
        Cube2SearchOutcome::NodeLimitExceeded {
            explored_nodes,
            max_depth,
            max_nodes,
        } => (
            StatusCode::OK,
            puzzle_solve_search_error_response(
                puzzle,
                strategy,
                &strategy_id,
                &request.limits,
                &request.metric,
                elapsed_ms,
                explored_nodes,
                "node_limit_exceeded",
                Some("node_limit_exceeded"),
                format!(
                    "node limit exceeded: max_depth={max_depth}, max_nodes={max_nodes}, explored_nodes={explored_nodes}"
                ),
            ),
        ),
    }
}

fn puzzle_response(definition: &PuzzleDefinition) -> PuzzleResponse {
    PuzzleResponse {
        id: definition.id.as_str().to_owned(),
        slug: definition.slug.to_owned(),
        label: definition.label.to_owned(),
        family: definition.family.as_str().to_owned(),
        status: definition.status.as_str().to_owned(),
        default_metric: definition.default_metric.as_str().to_owned(),
        supported_inputs: definition
            .supported_inputs
            .iter()
            .copied()
            .map(InputKind::as_str)
            .map(str::to_owned)
            .collect(),
        supported_visualizations: definition
            .supported_visualizations
            .iter()
            .copied()
            .map(VisualizationKind::as_str)
            .map(str::to_owned)
            .collect(),
        default_strategy_id: definition.default_strategy_id.map(str::to_owned),
        strategy_ids: definition
            .strategy_ids
            .iter()
            .map(|id| (*id).to_owned())
            .collect(),
        scanner_supported: definition.scanner_supported,
    }
}

fn strategy_response(definition: &SolverStrategyDefinition) -> PuzzleStrategyResponse {
    PuzzleStrategyResponse {
        id: definition.id.to_owned(),
        puzzle_id: definition.puzzle_id.as_str().to_owned(),
        label: definition.label.to_owned(),
        solver_mode: definition.solver_mode.to_owned(),
        status_text: definition.status_text.to_owned(),
        default_metric: definition.default_metric.as_str().to_owned(),
        supported_metrics: definition
            .supported_metrics
            .iter()
            .copied()
            .map(MoveMetric::as_str)
            .map(str::to_owned)
            .collect(),
        supported_inputs: definition
            .supported_inputs
            .iter()
            .copied()
            .map(InputKind::as_str)
            .map(str::to_owned)
            .collect(),
    }
}

fn unknown_puzzle_error(slug: &str) -> PuzzleApiErrorResponse {
    PuzzleApiErrorResponse {
        ok: false,
        status: "unknown_puzzle".to_owned(),
        error_kind: "unknown_puzzle".to_owned(),
        message: format!("unknown puzzle slug: {slug}"),
    }
}

fn requested_strategy_id(request: &PuzzleSolveRequest) -> String {
    request
        .strategy_id
        .clone()
        .unwrap_or_else(|| SolverStrategy::GeneratedTwoPhase.id().to_owned())
}

fn effective_strategy_id<'a>(
    puzzle: &'a PuzzleDefinition,
    request: &'a PuzzleSolveRequest,
) -> &'a str {
    request
        .strategy_id
        .as_deref()
        .or(puzzle.default_strategy_id)
        .unwrap_or(SolverStrategy::GeneratedTwoPhase.id())
}

fn strategy_definition_by_id(strategy_id: &str) -> Option<&'static SolverStrategyDefinition> {
    all_strategy_definitions()
        .iter()
        .find(|strategy| strategy.id == strategy_id)
}

fn validate_puzzle_solve_notation_limits(
    puzzle: &PuzzleDefinition,
    strategy_id: &str,
    notation: &str,
    limits: &mut PuzzleSolveLimitsRequest,
    metric: &str,
) -> Result<(), Box<PuzzleSolveResponse>> {
    if limits.max_depth > MAX_API_DEPTH {
        return Err(Box::new(puzzle_solve_error_response(
            Some(puzzle.id),
            puzzle.slug,
            strategy_id,
            limits,
            metric,
            "invalid_limits",
            "max_depth_exceeds_limit",
            format!(
                "maxDepth {} exceeds API limit {}",
                limits.max_depth, MAX_API_DEPTH
            ),
        )));
    }

    if notation.len() > MAX_NOTATION_BYTES {
        return Err(Box::new(puzzle_solve_error_response(
            Some(puzzle.id),
            puzzle.slug,
            strategy_id,
            limits,
            metric,
            "request_too_large",
            "notation_too_large",
            format!(
                "move notation payload is {} bytes; API limit is {} bytes",
                notation.len(),
                MAX_NOTATION_BYTES
            ),
        )));
    }

    let max_nodes = limits.max_nodes.unwrap_or(DEFAULT_API_NODES);
    if max_nodes > MAX_API_NODES {
        return Err(Box::new(puzzle_solve_error_response(
            Some(puzzle.id),
            puzzle.slug,
            strategy_id,
            limits,
            metric,
            "invalid_limits",
            "max_nodes_exceeds_limit",
            format!("maxNodes {max_nodes} exceeds API limit {MAX_API_NODES}"),
        )));
    }

    limits.max_nodes = Some(max_nodes);

    Ok(())
}

#[allow(clippy::too_many_arguments)]
fn puzzle_solve_search_error_response(
    puzzle: &PuzzleDefinition,
    strategy: &SolverStrategyDefinition,
    strategy_id: &str,
    limits: &PuzzleSolveLimitsRequest,
    metric: &str,
    elapsed_ms: u128,
    explored_nodes: usize,
    status: impl Into<String>,
    error_kind: Option<&str>,
    message: String,
) -> PuzzleSolveResponse {
    PuzzleSolveResponse {
        ok: false,
        status: status.into(),
        puzzle_id: Some(puzzle.id.as_str().to_owned()),
        puzzle_slug: puzzle.slug.to_owned(),
        strategy_id: strategy_id.to_owned(),
        strategy_label: strategy.label.to_owned(),
        solver_mode: strategy.solver_mode.to_owned(),
        generated_table_status: "not_applicable".to_owned(),
        metric: metric.to_owned(),
        max_depth: limits.max_depth,
        max_nodes: limits.max_nodes,
        moves: Vec::new(),
        length: None,
        explored_nodes: Some(explored_nodes),
        elapsed_ms: Some(elapsed_ms),
        replay_verified: None,
        visual_state: None,
        error_kind: error_kind.map(str::to_owned),
        message: Some(message),
    }
}

fn puzzle_strategy_display(strategy_id: &str) -> (String, String, String) {
    if let Some(strategy) = SolverStrategy::from_id(strategy_id) {
        let metadata = strategy.metadata();
        return (
            metadata.label.to_owned(),
            metadata.solver_mode.to_owned(),
            generated_table_status(strategy).to_owned(),
        );
    }

    if let Some(strategy) = strategy_definition_by_id(strategy_id) {
        return (
            strategy.label.to_owned(),
            strategy.solver_mode.to_owned(),
            "not_applicable".to_owned(),
        );
    }

    (
        "Unknown strategy".to_owned(),
        "unknown".to_owned(),
        "not_applicable".to_owned(),
    )
}

fn max_nodes_label(max_nodes: Option<usize>) -> String {
    max_nodes.map_or_else(|| "unlimited".to_owned(), |value| value.to_string())
}

#[allow(clippy::too_many_arguments)]
fn puzzle_solve_error_response(
    puzzle_id: Option<PuzzleId>,
    puzzle_slug: &str,
    strategy_id: &str,
    limits: &PuzzleSolveLimitsRequest,
    metric: &str,
    status: impl Into<String>,
    error_kind: impl Into<String>,
    message: String,
) -> PuzzleSolveResponse {
    let (strategy_label, solver_mode, generated_table_status) =
        puzzle_strategy_display(strategy_id);

    PuzzleSolveResponse {
        ok: false,
        status: status.into(),
        puzzle_id: puzzle_id.map(|id| id.as_str().to_owned()),
        puzzle_slug: puzzle_slug.to_owned(),
        strategy_id: strategy_id.to_owned(),
        strategy_label,
        solver_mode,
        generated_table_status,
        metric: metric.to_owned(),
        max_depth: limits.max_depth,
        max_nodes: limits.max_nodes,
        moves: Vec::new(),
        length: None,
        explored_nodes: None,
        elapsed_ms: None,
        replay_verified: None,
        visual_state: None,
        error_kind: Some(error_kind.into()),
        message: Some(message),
    }
}

fn puzzle_solve_response_from_legacy(
    puzzle: &PuzzleDefinition,
    metric: &str,
    response: SolveResponse,
) -> PuzzleSolveResponse {
    PuzzleSolveResponse {
        ok: response.ok,
        status: response.status,
        puzzle_id: Some(puzzle.id.as_str().to_owned()),
        puzzle_slug: puzzle.slug.to_owned(),
        strategy_id: response.strategy_id,
        strategy_label: response.strategy_label,
        solver_mode: response.solver_mode,
        generated_table_status: response.generated_table_status,
        metric: metric.to_owned(),
        max_depth: response.max_depth,
        max_nodes: response.max_nodes,
        moves: response.moves,
        length: response.length,
        explored_nodes: response.explored_nodes,
        elapsed_ms: response.elapsed_ms,
        replay_verified: response.replay_verified,
        visual_state: response.visual_state,
        error_kind: response.error_kind,
        message: response.message,
    }
}
