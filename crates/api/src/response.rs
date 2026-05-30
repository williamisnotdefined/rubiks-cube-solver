use cube_engine::SolverStrategy;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
pub struct HealthResponse {
    pub ok: bool,
    #[serde(rename = "generatedTwoPhaseReady")]
    pub generated_two_phase_ready: bool,
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
    #[serde(rename = "elapsedMs")]
    pub elapsed_ms: Option<u128>,
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

#[derive(Clone, Debug, Eq, PartialEq, Deserialize)]
pub struct SolveScanRequest {
    pub faces: ScanFacesRequest,
    #[serde(rename = "maxDepth", default = "default_max_depth")]
    pub max_depth: usize,
    #[serde(rename = "maxNodes")]
    pub max_nodes: Option<usize>,
    #[serde(rename = "strategyId", default = "default_strategy_id")]
    pub strategy_id: String,
}

#[derive(Clone, Debug, Eq, PartialEq, Deserialize)]
pub struct ScanFacesRequest {
    #[serde(rename = "U")]
    pub u: String,
    #[serde(rename = "R")]
    pub r: String,
    #[serde(rename = "F")]
    pub f: String,
    #[serde(rename = "D")]
    pub d: String,
    #[serde(rename = "L")]
    pub l: String,
    #[serde(rename = "B")]
    pub b: String,
}

#[allow(clippy::too_many_arguments)]
pub(crate) fn success_response_from_parts(
    max_depth: usize,
    max_nodes: Option<usize>,
    strategy: SolverStrategy,
    moves: &[cube_engine::Move],
    length: usize,
    explored_nodes: usize,
    elapsed_ms: u128,
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
        elapsed_ms: Some(elapsed_ms),
        replay_verified: Some(replay_verified),
        visual_state,
        error_kind: None,
        message: None,
    }
}

pub(crate) fn not_found_response_from_parts(
    max_depth: usize,
    max_nodes: Option<usize>,
    strategy: SolverStrategy,
    explored_nodes: usize,
    elapsed_ms: u128,
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
        elapsed_ms: Some(elapsed_ms),
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

pub(crate) fn unverified_solution_response_from_parts(
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
pub(crate) fn error_response_from_parts(
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
        elapsed_ms: None,
        replay_verified: None,
        visual_state,
        error_kind: Some(error_kind.into()),
        message: Some(message),
    }
}

fn generated_table_status(strategy: SolverStrategy) -> &'static str {
    match strategy {
        SolverStrategy::GeneratedTwoPhase
        | SolverStrategy::GeneratedTwoPhaseQuality
        | SolverStrategy::GeneratedTwoPhaseMultiprobe
        | SolverStrategy::OptimalBoundedCornerPdb
        | SolverStrategy::OptimalBoundedPdb16
        | SolverStrategy::ShortSolutionPortfolio => "available",
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
