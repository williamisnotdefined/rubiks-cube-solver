use cube_engine::SolverStrategy;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
pub struct HealthResponse {
    pub ok: bool,
    #[serde(rename = "generatedTwoPhaseReady")]
    pub generated_two_phase_ready: bool,
    #[serde(rename = "visionOk")]
    pub vision_ok: bool,
    #[serde(rename = "visionTileDetectorAvailable")]
    pub vision_tile_detector_available: bool,
    #[serde(
        rename = "visionTileDetectorReason",
        skip_serializing_if = "Option::is_none"
    )]
    pub vision_tile_detector_reason: Option<String>,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
pub struct LivezResponse {
    pub ok: bool,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
pub struct ReadyzResponse {
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

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct PuzzleResponse {
    pub id: String,
    pub slug: String,
    pub label: String,
    pub family: String,
    pub status: String,
    #[serde(rename = "defaultMetric")]
    pub default_metric: String,
    #[serde(rename = "supportedInputs")]
    pub supported_inputs: Vec<String>,
    #[serde(rename = "supportedVisualizations")]
    pub supported_visualizations: Vec<String>,
    #[serde(rename = "defaultStrategyId")]
    pub default_strategy_id: Option<String>,
    #[serde(rename = "strategyIds")]
    pub strategy_ids: Vec<String>,
    #[serde(rename = "scannerSupported")]
    pub scanner_supported: bool,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct PuzzleStrategyResponse {
    pub id: String,
    #[serde(rename = "puzzleId")]
    pub puzzle_id: String,
    pub label: String,
    #[serde(rename = "solverMode")]
    pub solver_mode: String,
    #[serde(rename = "statusText")]
    pub status_text: String,
    #[serde(rename = "defaultMetric")]
    pub default_metric: String,
    #[serde(rename = "supportedMetrics")]
    pub supported_metrics: Vec<String>,
    #[serde(rename = "supportedInputs")]
    pub supported_inputs: Vec<String>,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct PuzzleApiErrorResponse {
    pub ok: bool,
    pub status: String,
    #[serde(rename = "errorKind")]
    pub error_kind: String,
    pub message: String,
}

#[derive(Clone, Debug, Eq, PartialEq, Deserialize)]
pub struct PuzzleSolveRequest {
    pub input: PuzzleSolveInputRequest,
    #[serde(rename = "strategyId", default)]
    pub strategy_id: Option<String>,
    #[serde(default)]
    pub limits: PuzzleSolveLimitsRequest,
    #[serde(default = "default_metric")]
    pub metric: String,
}

#[derive(Clone, Debug, Eq, PartialEq, Deserialize)]
pub struct PuzzleSolveInputRequest {
    pub kind: String,
    pub value: String,
}

#[derive(Clone, Debug, Eq, PartialEq, Deserialize)]
pub struct PuzzleSolveLimitsRequest {
    #[serde(rename = "maxDepth", default = "default_max_depth")]
    pub max_depth: usize,
    #[serde(rename = "maxNodes")]
    pub max_nodes: Option<usize>,
}

impl Default for PuzzleSolveLimitsRequest {
    fn default() -> Self {
        Self {
            max_depth: default_max_depth(),
            max_nodes: None,
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct VisualStateResponse {
    pub kind: String,
    pub value: String,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct PuzzleSolveResponse {
    pub ok: bool,
    pub status: String,
    #[serde(rename = "puzzleId", skip_serializing_if = "Option::is_none")]
    pub puzzle_id: Option<String>,
    #[serde(rename = "puzzleSlug")]
    pub puzzle_slug: String,
    #[serde(rename = "strategyId")]
    pub strategy_id: String,
    #[serde(rename = "strategyLabel")]
    pub strategy_label: String,
    #[serde(rename = "solverMode")]
    pub solver_mode: String,
    #[serde(rename = "generatedTableStatus")]
    pub generated_table_status: String,
    pub metric: String,
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
    pub visual_state: Option<VisualStateResponse>,
    #[serde(rename = "errorKind")]
    pub error_kind: Option<String>,
    pub message: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
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
    pub visual_state: Option<VisualStateResponse>,
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

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct ScanSessionRequest {
    pub faces: Vec<ScanSessionFaceRequest>,
    #[serde(rename = "gridSize", default = "default_grid_size")]
    pub grid_size: usize,
    #[serde(rename = "maxDepth", default = "default_max_depth")]
    pub max_depth: usize,
    #[serde(rename = "maxNodes")]
    pub max_nodes: Option<usize>,
    #[serde(rename = "strategyId", default = "default_strategy_id")]
    pub strategy_id: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct ScanSessionFaceRequest {
    pub symbol: String,
    #[serde(
        rename = "expectedTop",
        default,
        skip_serializing_if = "Option::is_none"
    )]
    pub expected_top: Option<String>,
    #[serde(rename = "manualOverrides", default)]
    pub manual_overrides: HashMap<usize, String>,
    #[serde(rename = "reviewedStickers", default)]
    pub reviewed_stickers: Vec<ScanSessionReviewedStickerRequest>,
    #[serde(
        rename = "clientRotation",
        default,
        skip_serializing_if = "Option::is_none"
    )]
    pub client_rotation: Option<u16>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct ScanSessionReviewedStickerRequest {
    pub index: usize,
    pub symbol: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub confidence: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub source: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct ScanSessionResponse {
    pub ok: bool,
    pub status: String,
    pub message: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub timings: Option<ScanSessionTimingsResponse>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub scan: Option<AnalyzeScanSessionResponse>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub solve: Option<SolveResponse>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub inference: Option<ScanSessionInferenceResponse>,
    #[serde(rename = "rescanFaces", default)]
    pub rescan_faces: Vec<String>,
    #[serde(rename = "manualTargets", default)]
    pub manual_targets: Vec<ScanSessionManualTargetResponse>,
    #[serde(
        rename = "invalidCorners",
        default,
        skip_serializing_if = "Vec::is_empty"
    )]
    pub invalid_corners: Vec<ScanSessionInvalidCornerResponse>,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct ScanSessionTimingsResponse {
    #[serde(rename = "totalElapsedMs")]
    pub total_elapsed_ms: u128,
    #[serde(
        rename = "visionElapsedMs",
        default,
        skip_serializing_if = "Option::is_none"
    )]
    pub vision_elapsed_ms: Option<u128>,
    #[serde(
        rename = "earlyQualityGateElapsedMs",
        default,
        skip_serializing_if = "Option::is_none"
    )]
    pub early_quality_gate_elapsed_ms: Option<u128>,
    #[serde(
        rename = "inferenceElapsedMs",
        default,
        skip_serializing_if = "Option::is_none"
    )]
    pub inference_elapsed_ms: Option<u128>,
    #[serde(
        rename = "qualityGateElapsedMs",
        default,
        skip_serializing_if = "Option::is_none"
    )]
    pub quality_gate_elapsed_ms: Option<u128>,
    #[serde(
        rename = "solveElapsedMs",
        default,
        skip_serializing_if = "Option::is_none"
    )]
    pub solve_elapsed_ms: Option<u128>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct ScanSessionInferenceResponse {
    pub status: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub margin: Option<f64>,
    #[serde(rename = "stateConfidence")]
    pub state_confidence: f64,
    #[serde(
        rename = "candidateFacelets",
        default,
        skip_serializing_if = "Option::is_none"
    )]
    pub candidate_facelets: Option<String>,
    #[serde(rename = "rescanFaces", default)]
    pub rescan_faces: Vec<String>,
    #[serde(rename = "manualTargets", default)]
    pub manual_targets: Vec<ScanSessionManualTargetResponse>,
    #[serde(rename = "qualityReasons", default)]
    pub quality_reasons: Vec<String>,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct ScanSessionManualTargetResponse {
    pub face: String,
    pub stickers: Vec<usize>,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct ScanSessionInvalidCornerResponse {
    pub position: String,
    pub faces: Vec<String>,
    pub stickers: Vec<String>,
    pub targets: Vec<ScanSessionInvalidCornerTargetResponse>,
    pub reason: String,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct ScanSessionInvalidCornerTargetResponse {
    pub face: String,
    pub index: usize,
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

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct AnalyzeScanSessionResponse {
    pub ok: bool,
    pub status: String,
    pub message: Option<String>,
    #[serde(default)]
    pub faces: Vec<AnalyzedSessionFaceResponse>,
    #[serde(default)]
    pub warnings: Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct AnalyzedSessionFaceResponse {
    pub symbol: String,
    #[serde(rename = "expectedTop", default)]
    pub expected_top: Option<String>,
    pub analysis: AnalyzeScanFaceResponse,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct RgbColorRequest {
    pub r: u8,
    pub g: u8,
    pub b: u8,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct AnalyzeScanFaceRequest {
    #[serde(rename = "expectedCenter")]
    pub expected_center: String,
    pub image: String,
    #[serde(rename = "gridSize", default = "default_grid_size")]
    pub grid_size: usize,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct PointResponse {
    pub x: f64,
    pub y: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct DetectionBoxResponse {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct ScanTileDetectionResponse {
    pub symbol: String,
    pub confidence: f64,
    pub bbox: DetectionBoxResponse,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct ImageSizeResponse {
    pub width: usize,
    pub height: usize,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct ScanColorAlternativeResponse {
    pub symbol: String,
    pub confidence: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct ColorProbabilitiesResponse {
    #[serde(rename = "U")]
    pub u: f64,
    #[serde(rename = "R")]
    pub r: f64,
    #[serde(rename = "F")]
    pub f: f64,
    #[serde(rename = "D")]
    pub d: f64,
    #[serde(rename = "L")]
    pub l: f64,
    #[serde(rename = "B")]
    pub b: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct StickerQualityResponse {
    #[serde(rename = "colorVariance")]
    pub color_variance: f64,
    #[serde(rename = "glareRatio")]
    pub glare_ratio: f64,
    #[serde(rename = "shadowRatio")]
    pub shadow_ratio: f64,
    pub margin: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct ImageQualityResponse {
    #[serde(rename = "blurScore")]
    pub blur_score: f64,
    #[serde(rename = "meanLuminance")]
    pub mean_luminance: f64,
    #[serde(rename = "glareRatio")]
    pub glare_ratio: f64,
    #[serde(rename = "shadowRatio")]
    pub shadow_ratio: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct AnalyzedStickerResponse {
    pub index: usize,
    pub symbol: String,
    pub confidence: f64,
    pub rgb: RgbColorRequest,
    pub polygon: Vec<PointResponse>,
    pub alternatives: Vec<ScanColorAlternativeResponse>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub probabilities: Option<ColorProbabilitiesResponse>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub quality: Option<StickerQualityResponse>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct AnalyzeScanFaceResponse {
    pub ok: bool,
    pub status: String,
    pub message: Option<String>,
    #[serde(rename = "centerMismatch")]
    pub center_mismatch: bool,
    #[serde(rename = "detectedCenter")]
    pub detected_center: Option<String>,
    #[serde(rename = "expectedCenter")]
    pub expected_center: Option<String>,
    pub confidence: f64,
    #[serde(rename = "detectedCenterConfidence", default)]
    pub detected_center_confidence: f64,
    #[serde(rename = "faceConfidence", default)]
    pub face_confidence: f64,
    #[serde(rename = "detectionMode", default)]
    pub detection_mode: Option<String>,
    #[serde(rename = "imageSize")]
    pub image_size: Option<ImageSizeResponse>,
    #[serde(
        rename = "imageQuality",
        default,
        skip_serializing_if = "Option::is_none"
    )]
    pub image_quality: Option<ImageQualityResponse>,
    pub stickers: Vec<AnalyzedStickerResponse>,
    #[serde(rename = "tileDetections", default)]
    pub tile_detections: Vec<ScanTileDetectionResponse>,
    #[serde(rename = "qualityWarnings", default)]
    pub quality_warnings: Vec<String>,
    pub warnings: Vec<String>,
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
        visual_state: visual_state_response(strategy, visual_state),
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
        visual_state: visual_state_response(strategy, visual_state),
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

pub(crate) fn solver_overloaded_response_from_parts(
    strategy_id: &str,
    max_depth: usize,
    max_nodes: Option<usize>,
) -> SolveResponse {
    error_response_from_parts(
        strategy_id,
        max_depth,
        max_nodes,
        SolverStrategy::from_id(strategy_id),
        "api_error",
        "solver_overloaded",
        "solver concurrency limit reached; retry the request later".to_owned(),
        None,
    )
}

pub(crate) fn solver_worker_failed_response_from_parts(
    strategy_id: &str,
    max_depth: usize,
    max_nodes: Option<usize>,
) -> SolveResponse {
    error_response_from_parts(
        strategy_id,
        max_depth,
        max_nodes,
        SolverStrategy::from_id(strategy_id),
        "api_error",
        "solver_worker_failed",
        "solver worker failed before returning a response".to_owned(),
        None,
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
        visual_state: visual_state_response(strategy, visual_state),
        error_kind: Some(error_kind.into()),
        message: Some(message),
    }
}

pub(crate) fn generated_table_status(strategy: SolverStrategy) -> &'static str {
    match strategy {
        SolverStrategy::GeneratedTwoPhase
        | SolverStrategy::GeneratedTwoPhaseQuality
        | SolverStrategy::GeneratedTwoPhaseMultiprobe
        | SolverStrategy::OptimalBoundedCornerPdb
        | SolverStrategy::OptimalBoundedPdb16
        | SolverStrategy::ShortSolutionPortfolio => "available",
        SolverStrategy::BoundedIdaStar => "not_required",
    }
}

fn visual_state_response(
    _strategy: SolverStrategy,
    visual_state: Option<String>,
) -> Option<VisualStateResponse> {
    visual_state.map(|value| VisualStateResponse {
        kind: "cube3-facelets-v1".to_owned(),
        value,
    })
}

fn max_nodes_label(max_nodes: Option<usize>) -> String {
    max_nodes.map_or_else(|| "unlimited".to_owned(), |value| value.to_string())
}

fn default_max_depth() -> usize {
    20
}

fn default_grid_size() -> usize {
    3
}

fn default_strategy_id() -> String {
    SolverStrategy::GeneratedTwoPhase.id().to_owned()
}

fn default_metric() -> String {
    "htm".to_owned()
}
