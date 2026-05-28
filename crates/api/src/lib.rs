mod config;
mod error_kind;
mod response;
mod routes;
mod solve;
mod state;

pub use config::{
    ApiConfig, DEFAULT_API_ADDR, DEFAULT_API_NODES, DEFAULT_PRUNING_TABLE_DIR, MAX_API_DEPTH,
    MAX_API_NODES, MAX_JSON_BODY_BYTES, MAX_NOTATION_BYTES,
};
pub use response::{HealthResponse, SolveNotationRequest, SolveResponse, StrategyResponse};
pub use routes::api_router;
pub use solve::solve_notation_request;
pub use state::ApiState;

#[cfg(test)]
mod tests;
