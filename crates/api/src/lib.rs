mod config;
mod error_kind;
mod puzzle;
mod response;
mod routes;
mod scan_analysis;
mod scan_quality_gate;
mod solve;
mod state;

pub use config::{
    ApiConfig, CUBE2_MAX_API_DEPTH, CUBE3_MAX_API_DEPTH, DEFAULT_API_ADDR, DEFAULT_API_NODES,
    DEFAULT_PRUNING_TABLE_DIR, DEFAULT_VISION_URL, DEFAULT_WEB_DIST_DIR, MAX_API_DEPTH,
    MAX_API_NODES, MAX_JSON_BODY_BYTES, MAX_NOTATION_BYTES, MAX_SCAN_IMAGE_BYTES,
    MAX_SCAN_SESSION_BODY_BYTES,
};
pub use puzzle::{
    list_puzzles_response, puzzle_response_by_slug, puzzle_strategy_responses_by_slug,
    solve_puzzle_request,
};
pub use response::{
    AnalyzeScanFaceRequest, AnalyzeScanFaceResponse, AnalyzeScanSessionResponse, HealthResponse,
    PuzzleApiErrorResponse, PuzzleResponse, PuzzleSolveInputRequest, PuzzleSolveLimitsRequest,
    PuzzleSolveRequest, PuzzleSolveResponse, PuzzleStrategyResponse, ScanFacesRequest,
    ScanSessionFaceRequest, ScanSessionInferenceResponse, ScanSessionRequest, ScanSessionResponse,
    ScanSessionReviewedStickerRequest, SolveNotationRequest, SolveResponse, SolveScanRequest,
    StrategyResponse, VisualStateResponse,
};
pub use routes::{api_router, api_router_with_web_dist};
pub use scan_analysis::{
    analyze_scan_face_request, solve_scan_session_request, solve_scan_session_request_for_puzzle,
};
pub use solve::{solve_notation_request, solve_scan_request};
pub use state::ApiState;

#[cfg(test)]
mod tests;
