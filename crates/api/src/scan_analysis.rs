use std::collections::BTreeMap;
use std::time::{Duration, Instant};

use axum::http::StatusCode;
use axum::Json;
use cube_engine::cube::cubies::Corner;
use cube_engine::puzzles::cube2::{
    cube2_from_scan_faces, cube2_visual_state, solve_cube2_bounded_ida_star,
    solve_cube2_pdb_ida_star, Cube2Face, Cube2ScanError, Cube2SearchBudget, Cube2SearchOutcome,
    CUBE2_BOUNDED_IDA_STAR_STRATEGY_ID, CUBE2_PDB_IDA_STAR_STRATEGY_ID,
};
use cube_engine::{
    all_strategy_definitions, infer_scan, Facelet, FaceletConversionError, PuzzleId,
    ScanInferenceInput, ScanInferenceResult, ScanInferenceStatus, ScanManualOverride,
    SCAN_FACELET_COUNT, SCAN_FACELET_SYMBOL_COUNT, SCAN_STICKERS_PER_FACE,
};

use crate::config::{DEFAULT_API_NODES, MAX_API_DEPTH, MAX_API_NODES, MAX_SCAN_IMAGE_BYTES};
use crate::response::{
    AnalyzeScanFaceRequest, AnalyzeScanFaceResponse, AnalyzeScanSessionResponse,
    AnalyzedSessionFaceResponse, AnalyzedStickerResponse, ColorProbabilitiesResponse,
    ImageQualityResponse, RgbColorRequest, ScanFacesRequest, ScanSessionFaceRequest,
    ScanSessionInferenceResponse, ScanSessionInvalidCornerResponse,
    ScanSessionInvalidCornerTargetResponse, ScanSessionManualTargetResponse, ScanSessionRequest,
    ScanSessionResponse, ScanSessionTimingsResponse, SolveScanRequest, VisualStateResponse,
};
use crate::scan_quality_gate::{
    evaluate_obvious_scan_quality_with_overrides, evaluate_scan_quality_with_overrides,
    ScanQualityGateDecision, ScanQualityOverrides,
};
use crate::solve::solve_scan_request;
use crate::state::ApiState;

const VISION_TIMEOUT: Duration = Duration::from_secs(5);
const REQUIRED_SCAN_SESSION_FACE_COUNT: usize = 6;
const CUBE2_SCAN_STICKERS_PER_FACE: usize = 4;
const VALID_ROTATIONS: [u16; 4] = [0, 90, 180, 270];

struct ScanSessionTimingRecorder {
    started_at: Instant,
    vision_elapsed_ms: Option<u128>,
    early_quality_gate_elapsed_ms: Option<u128>,
    inference_elapsed_ms: Option<u128>,
    quality_gate_elapsed_ms: Option<u128>,
    solve_elapsed_ms: Option<u128>,
}

impl ScanSessionTimingRecorder {
    fn start() -> Self {
        Self {
            started_at: Instant::now(),
            vision_elapsed_ms: None,
            early_quality_gate_elapsed_ms: None,
            inference_elapsed_ms: None,
            quality_gate_elapsed_ms: None,
            solve_elapsed_ms: None,
        }
    }

    fn finish(&self) -> ScanSessionTimingsResponse {
        ScanSessionTimingsResponse {
            total_elapsed_ms: self.started_at.elapsed().as_millis(),
            vision_elapsed_ms: self.vision_elapsed_ms,
            early_quality_gate_elapsed_ms: self.early_quality_gate_elapsed_ms,
            inference_elapsed_ms: self.inference_elapsed_ms,
            quality_gate_elapsed_ms: self.quality_gate_elapsed_ms,
            solve_elapsed_ms: self.solve_elapsed_ms,
        }
    }
}

#[derive(serde::Serialize)]
struct VisionScanSessionRequest<'a> {
    faces: &'a [ScanSessionFaceRequest],
    #[serde(rename = "gridSize")]
    grid_size: usize,
}

pub async fn analyze_scan_face_request(
    state: &ApiState,
    request: AnalyzeScanFaceRequest,
) -> (StatusCode, Json<AnalyzeScanFaceResponse>) {
    if !is_scan_symbol(&request.expected_center) {
        return (
            StatusCode::BAD_REQUEST,
            Json(error_response(
                "invalid_image",
                "expectedCenter must be one of U, R, F, D, L, B".to_owned(),
            )),
        );
    }

    if !matches!(request.grid_size, 2 | 3) {
        return (
            StatusCode::BAD_REQUEST,
            Json(error_response(
                "invalid_image",
                "gridSize must be 2 or 3".to_owned(),
            )),
        );
    }

    if request.image.len() > MAX_SCAN_IMAGE_BYTES * 2 {
        return (
            StatusCode::BAD_REQUEST,
            Json(error_response(
                "request_too_large",
                format!(
                    "scan image payload is {} bytes; API limit is {} bytes",
                    request.image.len(),
                    MAX_SCAN_IMAGE_BYTES * 2
                ),
            )),
        );
    }

    let url = format!("{}/analyze-face", state.vision_url.trim_end_matches('/'));
    let response = reqwest::Client::new()
        .post(url)
        .timeout(VISION_TIMEOUT)
        .json(&request)
        .send()
        .await;

    let response = match response {
        Ok(response) => response,
        Err(error) => {
            return (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(error_response(
                    "vision_unavailable",
                    format!("vision service is unavailable: {error}"),
                )),
            );
        }
    };
    let status = response.status();
    let body = response.json::<AnalyzeScanFaceResponse>().await;

    match body {
        Ok(body) => (status, Json(body)),
        Err(error) => (
            StatusCode::BAD_GATEWAY,
            Json(error_response(
                "vision_error",
                format!("vision service returned an invalid response: {error}"),
            )),
        ),
    }
}

pub async fn solve_scan_session_request(
    state: &ApiState,
    request: ScanSessionRequest,
) -> (StatusCode, Json<ScanSessionResponse>) {
    solve_scan_session_request_for_puzzle(state, PuzzleId::Cube3x3x3, request).await
}

pub async fn solve_scan_session_request_for_puzzle(
    state: &ApiState,
    puzzle_id: PuzzleId,
    request: ScanSessionRequest,
) -> (StatusCode, Json<ScanSessionResponse>) {
    match puzzle_id {
        PuzzleId::Cube3x3x3 => solve_cube3_scan_session_request(state, request).await,
        PuzzleId::Cube2x2x2 => solve_cube2_scan_session_request(request),
        PuzzleId::Pyraminx
        | PuzzleId::Clock
        | PuzzleId::Skewb
        | PuzzleId::CubeNxN
        | PuzzleId::Square1
        | PuzzleId::Megaminx => (
            StatusCode::BAD_REQUEST,
            Json(scan_session_error(
                "unsupported_puzzle",
                format!(
                    "scan solving is not implemented for puzzle {}",
                    puzzle_id.as_str()
                ),
            )),
        ),
    }
}

async fn solve_cube3_scan_session_request(
    state: &ApiState,
    mut request: ScanSessionRequest,
) -> (StatusCode, Json<ScanSessionResponse>) {
    let mut timings = ScanSessionTimingRecorder::start();
    request.grid_size = 3;

    if let Some(message) = validate_scan_session_request(&request, SCAN_STICKERS_PER_FACE) {
        let mut response = scan_session_error("invalid_session", message);
        response.timings = Some(timings.finish());
        return (StatusCode::BAD_REQUEST, Json(response));
    }

    let vision_started = Instant::now();
    let scan = match request_scan_session_analysis(state, &request).await {
        Ok(scan) => scan,
        Err((status, mut response)) => {
            timings.vision_elapsed_ms = Some(vision_started.elapsed().as_millis());
            response.timings = Some(timings.finish());
            return (status, Json(response));
        }
    };
    timings.vision_elapsed_ms = Some(vision_started.elapsed().as_millis());

    let quality_overrides = ScanQualityOverrides::from_request(&request);
    let rescan_faces = rescan_faces_from_session(&scan, &quality_overrides);
    if !rescan_faces.is_empty()
        || (!scan.ok && scan.faces.len() != REQUIRED_SCAN_SESSION_FACE_COUNT)
    {
        return (
            StatusCode::OK,
            Json(ScanSessionResponse {
                ok: false,
                status: "needs_rescan_face".to_owned(),
                message: Some(
                    scan.message
                        .clone()
                        .unwrap_or_else(|| "One or more faces need to be rescanned.".to_owned()),
                ),
                timings: Some(timings.finish()),
                scan: Some(scan),
                solve: None,
                inference: None,
                rescan_faces,
                manual_targets: Vec::new(),
                invalid_corners: Vec::new(),
            }),
        );
    }

    let early_quality_gate_started = Instant::now();
    let early_quality_gate =
        evaluate_obvious_scan_quality_with_overrides(&scan, &quality_overrides);
    timings.early_quality_gate_elapsed_ms = Some(early_quality_gate_started.elapsed().as_millis());
    if let Some(quality_gate) = early_quality_gate {
        return (
            StatusCode::OK,
            Json(ScanSessionResponse {
                ok: false,
                status: quality_gate.status.as_str().to_owned(),
                message: Some(scan_quality_gate_message(quality_gate.status).to_owned()),
                timings: Some(timings.finish()),
                scan: Some(scan),
                solve: None,
                inference: Some(scan_session_early_quality_response(&quality_gate)),
                rescan_faces: quality_gate
                    .rescan_faces
                    .iter()
                    .map(|facelet| facelet.symbol().to_string())
                    .collect(),
                manual_targets: Vec::new(),
                invalid_corners: Vec::new(),
            }),
        );
    }

    let Some(inference_input) = scan_inference_input_from_session(&scan, &request) else {
        return (
            StatusCode::OK,
            Json(ScanSessionResponse {
                ok: false,
                status: "invalid_session".to_owned(),
                message: Some("vision session did not return all 6 complete faces".to_owned()),
                timings: Some(timings.finish()),
                scan: Some(scan),
                solve: None,
                inference: None,
                rescan_faces: Vec::new(),
                manual_targets: Vec::new(),
                invalid_corners: Vec::new(),
            }),
        );
    };

    let inference_started = Instant::now();
    let inference = infer_scan(&inference_input);
    timings.inference_elapsed_ms = Some(inference_started.elapsed().as_millis());
    let quality_gate_started = Instant::now();
    let quality_gate = evaluate_scan_quality_with_overrides(&scan, &inference, &quality_overrides);
    timings.quality_gate_elapsed_ms = Some(quality_gate_started.elapsed().as_millis());
    let inference_response = scan_session_inference_response(&inference, &quality_gate);

    if quality_gate.status != ScanInferenceStatus::Accepted {
        return (
            StatusCode::OK,
            Json(ScanSessionResponse {
                ok: false,
                status: quality_gate.status.as_str().to_owned(),
                message: Some(scan_quality_gate_message(quality_gate.status).to_owned()),
                timings: Some(timings.finish()),
                scan: Some(scan),
                solve: None,
                inference: Some(inference_response),
                rescan_faces: quality_gate
                    .rescan_faces
                    .iter()
                    .map(|facelet| facelet.symbol().to_string())
                    .collect(),
                manual_targets: quality_gate.manual_targets,
                invalid_corners: Vec::new(),
            }),
        );
    }

    let Some(candidate) = inference.best_candidate.as_ref() else {
        return (
            StatusCode::OK,
            Json(ScanSessionResponse {
                ok: false,
                status: "invalid_cube_state".to_owned(),
                message: Some("scan inference did not return an accepted candidate".to_owned()),
                timings: Some(timings.finish()),
                scan: Some(scan),
                solve: None,
                inference: Some(inference_response),
                rescan_faces: Vec::new(),
                manual_targets: Vec::new(),
                invalid_corners: Vec::new(),
            }),
        );
    };

    let Some(faces) = scan_faces_from_facelets(&candidate.facelets) else {
        return (
            StatusCode::OK,
            Json(ScanSessionResponse {
                ok: false,
                status: "invalid_cube_state".to_owned(),
                message: Some("scan inference returned an invalid facelet candidate".to_owned()),
                timings: Some(timings.finish()),
                scan: Some(scan),
                solve: None,
                inference: Some(inference_response),
                rescan_faces: Vec::new(),
                manual_targets: Vec::new(),
                invalid_corners: Vec::new(),
            }),
        );
    };

    let solve_started = Instant::now();
    let (_solve_status, solve) = solve_scan_request(
        state,
        SolveScanRequest {
            faces,
            max_depth: request.max_depth,
            max_nodes: request.max_nodes,
            strategy_id: request.strategy_id,
        },
    );
    timings.solve_elapsed_ms = Some(solve_started.elapsed().as_millis());
    let solve = solve.0;

    if solve.ok {
        return (
            StatusCode::OK,
            Json(ScanSessionResponse {
                ok: true,
                status: "accepted".to_owned(),
                message: None,
                timings: Some(timings.finish()),
                scan: Some(scan),
                solve: Some(solve),
                inference: Some(inference_response),
                rescan_faces: Vec::new(),
                manual_targets: Vec::new(),
                invalid_corners: Vec::new(),
            }),
        );
    }

    let status = if solve.status == "invalid_input" {
        "invalid_cube_state"
    } else {
        "api_error"
    };

    (
        StatusCode::OK,
        Json(ScanSessionResponse {
            ok: false,
            status: status.to_owned(),
            message: solve.message.clone(),
            timings: Some(timings.finish()),
            scan: Some(scan),
            solve: Some(solve),
            inference: Some(inference_response),
            rescan_faces: Vec::new(),
            manual_targets: Vec::new(),
            invalid_corners: Vec::new(),
        }),
    )
}

fn solve_cube2_scan_session_request(
    mut request: ScanSessionRequest,
) -> (StatusCode, Json<ScanSessionResponse>) {
    let mut timings = ScanSessionTimingRecorder::start();
    request.grid_size = 2;

    if let Some(message) = validate_scan_session_request(&request, CUBE2_SCAN_STICKERS_PER_FACE) {
        let mut response = scan_session_error("invalid_session", message);
        response.timings = Some(timings.finish());
        return (StatusCode::BAD_REQUEST, Json(response));
    }

    let Some(scan) =
        scan_session_analysis_from_reviewed_stickers(&request, CUBE2_SCAN_STICKERS_PER_FACE)
    else {
        let mut response = scan_session_error(
            "invalid_session",
            "2x2 scan sessions must include 4 reviewedStickers per face".to_owned(),
        );
        response.timings = Some(timings.finish());
        return (StatusCode::BAD_REQUEST, Json(response));
    };

    let Some(faces) = cube2_scan_faces_from_session(&request) else {
        return (
            StatusCode::BAD_REQUEST,
            Json(ScanSessionResponse {
                ok: false,
                status: "invalid_session".to_owned(),
                message: Some("2x2 scan session reviewed stickers are incomplete".to_owned()),
                timings: Some(timings.finish()),
                scan: Some(scan),
                solve: None,
                inference: None,
                rescan_faces: Vec::new(),
                manual_targets: Vec::new(),
                invalid_corners: Vec::new(),
            }),
        );
    };

    let cube = match cube2_from_scan_faces(&faces) {
        Ok(cube) => cube,
        Err(error) => {
            let manual_targets = cube2_invalid_corner_manual_targets(&faces, &error);
            let invalid_corners = cube2_invalid_corner_responses(&faces, &error);
            return (
                StatusCode::OK,
                Json(ScanSessionResponse {
                    ok: false,
                    status: "invalid_cube_state".to_owned(),
                    message: Some(error.to_string()),
                    timings: Some(timings.finish()),
                    scan: Some(scan),
                    solve: None,
                    inference: None,
                    rescan_faces: Vec::new(),
                    manual_targets,
                    invalid_corners,
                }),
            );
        }
    };

    let solve_started = Instant::now();
    let solve = solve_cube2_scan_cube(&cube, &request);
    timings.solve_elapsed_ms = Some(solve_started.elapsed().as_millis());
    let ok = solve.ok;
    let status = if ok {
        "accepted"
    } else if solve.status == "invalid_limits" || solve.status == "unsupported_strategy" {
        "api_error"
    } else {
        solve.status.as_str()
    };

    (
        StatusCode::OK,
        Json(ScanSessionResponse {
            ok,
            status: status.to_owned(),
            message: solve.message.clone(),
            timings: Some(timings.finish()),
            scan: Some(scan),
            solve: Some(solve),
            inference: None,
            rescan_faces: Vec::new(),
            manual_targets: Vec::new(),
            invalid_corners: Vec::new(),
        }),
    )
}

fn solve_cube2_scan_cube(
    cube: &cube_engine::puzzles::cube2::Cube2,
    request: &ScanSessionRequest,
) -> crate::SolveResponse {
    if request.max_depth > MAX_API_DEPTH {
        return cube2_scan_error_response(
            &request.strategy_id,
            request.max_depth,
            request.max_nodes,
            "invalid_limits",
            Some("max_depth_exceeds_limit"),
            format!(
                "maxDepth {} exceeds API limit {}",
                request.max_depth, MAX_API_DEPTH
            ),
            cube2_visual_state_response(cube2_visual_state(cube)),
        );
    }

    let max_nodes = request.max_nodes.unwrap_or(DEFAULT_API_NODES);
    if max_nodes > MAX_API_NODES {
        return cube2_scan_error_response(
            &request.strategy_id,
            request.max_depth,
            request.max_nodes,
            "invalid_limits",
            Some("max_nodes_exceeds_limit"),
            format!("maxNodes {max_nodes} exceeds API limit {MAX_API_NODES}"),
            cube2_visual_state_response(cube2_visual_state(cube)),
        );
    }

    let budget = Cube2SearchBudget {
        max_depth: request.max_depth,
        max_nodes: Some(max_nodes),
    };
    let started = Instant::now();
    let outcome = match request.strategy_id.as_str() {
        CUBE2_BOUNDED_IDA_STAR_STRATEGY_ID => solve_cube2_bounded_ida_star(cube, budget),
        CUBE2_PDB_IDA_STAR_STRATEGY_ID => solve_cube2_pdb_ida_star(cube, budget),
        _ => {
            return cube2_scan_error_response(
                &request.strategy_id,
                request.max_depth,
                Some(max_nodes),
                "unsupported_strategy",
                Some("unsupported_strategy"),
                format!(
                    "unsupported 2x2 solver strategy id: {}",
                    request.strategy_id
                ),
                cube2_visual_state_response(cube2_visual_state(cube)),
            );
        }
    };
    let elapsed_ms = started.elapsed().as_millis();
    let visual_state = cube2_visual_state_response(cube2_visual_state(cube));

    match outcome {
        Cube2SearchOutcome::Found(solution) => crate::SolveResponse {
            ok: true,
            status: "success".to_owned(),
            strategy_id: request.strategy_id.clone(),
            strategy_label: cube2_strategy_label(&request.strategy_id),
            solver_mode: cube2_solver_mode(&request.strategy_id),
            generated_table_status: "not_applicable".to_owned(),
            max_depth: request.max_depth,
            max_nodes: Some(max_nodes),
            moves: solution.moves.iter().map(|move_| move_.notation().to_owned()).collect(),
            length: Some(solution.depth),
            explored_nodes: Some(solution.explored_nodes),
            elapsed_ms: Some(elapsed_ms),
            replay_verified: Some(solution.replay_verified),
            visual_state,
            error_kind: None,
            message: None,
        },
        Cube2SearchOutcome::NotFoundWithinLimits {
            explored_nodes,
            max_depth,
        } => cube2_scan_search_error_response(
            &request.strategy_id,
            request.max_depth,
            Some(max_nodes),
            elapsed_ms,
            explored_nodes,
            "not_found_within_limits",
            None,
            format!(
                "no solution found within limits: max_depth={max_depth}, max_nodes={max_nodes}, explored_nodes={explored_nodes}"
            ),
            visual_state,
        ),
        Cube2SearchOutcome::NodeLimitExceeded {
            explored_nodes,
            max_depth,
            max_nodes,
        } => cube2_scan_search_error_response(
            &request.strategy_id,
            request.max_depth,
            Some(max_nodes),
            elapsed_ms,
            explored_nodes,
            "node_limit_exceeded",
            Some("node_limit_exceeded"),
            format!(
                "node limit exceeded: max_depth={max_depth}, max_nodes={max_nodes}, explored_nodes={explored_nodes}"
            ),
            visual_state,
        ),
    }
}

fn cube2_scan_faces_from_session(request: &ScanSessionRequest) -> Option<Vec<(Cube2Face, String)>> {
    request
        .faces
        .iter()
        .map(|face| {
            let cube2_face = cube2_face_from_symbol(&face.symbol)?;
            let mut stickers = face.reviewed_stickers.clone();
            stickers.sort_by_key(|sticker| sticker.index);
            let mut symbols = String::new();
            for sticker in stickers {
                symbols.push_str(&sticker.symbol);
            }
            Some((cube2_face, symbols))
        })
        .collect()
}

fn cube2_invalid_corner_manual_targets(
    faces: &[(Cube2Face, String)],
    error: &Cube2ScanError,
) -> Vec<ScanSessionManualTargetResponse> {
    let Cube2ScanError::InvalidCubeState {
        error: FaceletConversionError::UnknownCornerStickers { position, .. },
    } = error
    else {
        return Vec::new();
    };

    let invalid_positions = cube2_invalid_corner_positions(faces);
    let positions = if invalid_positions.is_empty() {
        vec![*position]
    } else {
        invalid_positions
    };

    let mut targets_by_face: BTreeMap<&'static str, Vec<usize>> = BTreeMap::new();
    for position in positions {
        for (face, sticker) in cube2_corner_review_targets(position) {
            let targets = targets_by_face.entry(cube2_face_symbol(face)).or_default();
            if !targets.contains(&sticker) {
                targets.push(sticker);
            }
        }
    }

    targets_by_face
        .into_iter()
        .map(|(face, mut stickers)| {
            stickers.sort_unstable();
            ScanSessionManualTargetResponse {
                face: face.to_owned(),
                stickers,
            }
        })
        .collect()
}

fn cube2_invalid_corner_responses(
    faces: &[(Cube2Face, String)],
    error: &Cube2ScanError,
) -> Vec<ScanSessionInvalidCornerResponse> {
    let Cube2ScanError::InvalidCubeState {
        error: FaceletConversionError::UnknownCornerStickers { position, .. },
    } = error
    else {
        return Vec::new();
    };

    let invalid_positions = cube2_invalid_corner_positions(faces);
    let positions = if invalid_positions.is_empty() {
        vec![*position]
    } else {
        invalid_positions
    };

    positions
        .into_iter()
        .filter_map(|position| cube2_invalid_corner_response(faces, position))
        .collect()
}

fn cube2_invalid_corner_response(
    faces: &[(Cube2Face, String)],
    position: Corner,
) -> Option<ScanSessionInvalidCornerResponse> {
    let targets = cube2_corner_review_targets(position);
    let stickers: Option<Vec<String>> = targets
        .into_iter()
        .map(|(face, sticker)| {
            cube2_scan_face_sticker(faces, face, sticker).map(|symbol| symbol.to_string())
        })
        .collect();

    Some(ScanSessionInvalidCornerResponse {
        position: format!("{position:?}"),
        faces: cube2_corner_faces(position)
            .into_iter()
            .map(|face| cube2_face_symbol(face).to_owned())
            .collect(),
        stickers: stickers?,
        targets: targets
            .into_iter()
            .map(|(face, index)| ScanSessionInvalidCornerTargetResponse {
                face: cube2_face_symbol(face).to_owned(),
                index,
            })
            .collect(),
        reason: cube2_invalid_corner_reason(faces, position).to_owned(),
    })
}

fn cube2_invalid_corner_reason(faces: &[(Cube2Face, String)], position: Corner) -> &'static str {
    let Some(stickers) = cube2_corner_review_targets(position)
        .into_iter()
        .map(|(face, sticker)| cube2_scan_face_sticker(faces, face, sticker))
        .collect::<Option<Vec<char>>>()
    else {
        return "unknown_corner";
    };

    if cube2_corner_has_opposite_faces(&stickers) {
        "opposite_faces"
    } else {
        "unknown_corner"
    }
}

fn cube2_corner_has_opposite_faces(stickers: &[char]) -> bool {
    [('U', 'D'), ('R', 'L'), ('F', 'B')]
        .into_iter()
        .any(|(first, second)| stickers.contains(&first) && stickers.contains(&second))
}

fn cube2_corner_faces(position: Corner) -> [Cube2Face; 3] {
    match position {
        Corner::Urf => [Cube2Face::U, Cube2Face::R, Cube2Face::F],
        Corner::Ufl => [Cube2Face::U, Cube2Face::F, Cube2Face::L],
        Corner::Ulb => [Cube2Face::U, Cube2Face::L, Cube2Face::B],
        Corner::Ubr => [Cube2Face::U, Cube2Face::B, Cube2Face::R],
        Corner::Dfr => [Cube2Face::D, Cube2Face::F, Cube2Face::R],
        Corner::Dlf => [Cube2Face::D, Cube2Face::L, Cube2Face::F],
        Corner::Dbl => [Cube2Face::D, Cube2Face::B, Cube2Face::L],
        Corner::Drb => [Cube2Face::D, Cube2Face::R, Cube2Face::B],
    }
}

fn cube2_invalid_corner_positions(faces: &[(Cube2Face, String)]) -> Vec<Corner> {
    let mut invalid_positions = Vec::new();
    for position in [
        Corner::Urf,
        Corner::Ufl,
        Corner::Ulb,
        Corner::Ubr,
        Corner::Dfr,
        Corner::Dlf,
        Corner::Dbl,
        Corner::Drb,
    ] {
        let stickers: Option<Vec<char>> = cube2_corner_review_targets(position)
            .into_iter()
            .map(|(face, sticker)| cube2_scan_face_sticker(faces, face, sticker))
            .collect();
        let Some(stickers) = stickers else {
            continue;
        };

        if !cube2_valid_corner_stickers(&stickers) {
            invalid_positions.push(position);
        }
    }

    invalid_positions
}

fn cube2_scan_face_sticker(
    faces: &[(Cube2Face, String)],
    face: Cube2Face,
    index: usize,
) -> Option<char> {
    faces
        .iter()
        .find(|(candidate, _)| *candidate == face)
        .and_then(|(_, stickers)| stickers.chars().nth(index))
}

fn cube2_valid_corner_stickers(stickers: &[char]) -> bool {
    let mut sorted = stickers.to_vec();
    sorted.sort_unstable();
    matches!(
        sorted.as_slice(),
        ['F', 'R', 'U']
            | ['F', 'L', 'U']
            | ['B', 'L', 'U']
            | ['B', 'R', 'U']
            | ['D', 'F', 'R']
            | ['D', 'F', 'L']
            | ['B', 'D', 'L']
            | ['B', 'D', 'R']
    )
}

fn cube2_corner_review_targets(position: Corner) -> [(Cube2Face, usize); 3] {
    match position {
        Corner::Urf => [(Cube2Face::U, 3), (Cube2Face::R, 0), (Cube2Face::F, 1)],
        Corner::Ufl => [(Cube2Face::U, 2), (Cube2Face::F, 0), (Cube2Face::L, 1)],
        Corner::Ulb => [(Cube2Face::U, 0), (Cube2Face::L, 0), (Cube2Face::B, 1)],
        Corner::Ubr => [(Cube2Face::U, 1), (Cube2Face::B, 0), (Cube2Face::R, 1)],
        Corner::Dfr => [(Cube2Face::D, 1), (Cube2Face::F, 3), (Cube2Face::R, 2)],
        Corner::Dlf => [(Cube2Face::D, 0), (Cube2Face::L, 3), (Cube2Face::F, 2)],
        Corner::Dbl => [(Cube2Face::D, 2), (Cube2Face::B, 3), (Cube2Face::L, 2)],
        Corner::Drb => [(Cube2Face::D, 3), (Cube2Face::R, 3), (Cube2Face::B, 2)],
    }
}

fn cube2_face_symbol(face: Cube2Face) -> &'static str {
    match face {
        Cube2Face::U => "U",
        Cube2Face::R => "R",
        Cube2Face::F => "F",
        Cube2Face::D => "D",
        Cube2Face::L => "L",
        Cube2Face::B => "B",
    }
}

fn cube2_face_from_symbol(symbol: &str) -> Option<Cube2Face> {
    match symbol {
        "U" => Some(Cube2Face::U),
        "R" => Some(Cube2Face::R),
        "F" => Some(Cube2Face::F),
        "D" => Some(Cube2Face::D),
        "L" => Some(Cube2Face::L),
        "B" => Some(Cube2Face::B),
        _ => None,
    }
}

#[allow(clippy::too_many_arguments)]
fn cube2_scan_search_error_response(
    strategy_id: &str,
    max_depth: usize,
    max_nodes: Option<usize>,
    elapsed_ms: u128,
    explored_nodes: usize,
    status: impl Into<String>,
    error_kind: Option<&str>,
    message: String,
    visual_state: Option<VisualStateResponse>,
) -> crate::SolveResponse {
    crate::SolveResponse {
        ok: false,
        status: status.into(),
        strategy_id: strategy_id.to_owned(),
        strategy_label: cube2_strategy_label(strategy_id),
        solver_mode: cube2_solver_mode(strategy_id),
        generated_table_status: "not_applicable".to_owned(),
        max_depth,
        max_nodes,
        moves: Vec::new(),
        length: None,
        explored_nodes: Some(explored_nodes),
        elapsed_ms: Some(elapsed_ms),
        replay_verified: None,
        visual_state,
        error_kind: error_kind.map(str::to_owned),
        message: Some(message),
    }
}

fn cube2_scan_error_response(
    strategy_id: &str,
    max_depth: usize,
    max_nodes: Option<usize>,
    status: impl Into<String>,
    error_kind: Option<&str>,
    message: String,
    visual_state: Option<VisualStateResponse>,
) -> crate::SolveResponse {
    crate::SolveResponse {
        ok: false,
        status: status.into(),
        strategy_id: strategy_id.to_owned(),
        strategy_label: cube2_strategy_label(strategy_id),
        solver_mode: cube2_solver_mode(strategy_id),
        generated_table_status: "not_applicable".to_owned(),
        max_depth,
        max_nodes,
        moves: Vec::new(),
        length: None,
        explored_nodes: None,
        elapsed_ms: None,
        replay_verified: None,
        visual_state,
        error_kind: error_kind.map(str::to_owned),
        message: Some(message),
    }
}

fn cube2_visual_state_response(value: String) -> Option<VisualStateResponse> {
    Some(VisualStateResponse {
        kind: "cube2-facelets-v1".to_owned(),
        value,
    })
}

fn cube2_strategy_label(strategy_id: &str) -> String {
    all_strategy_definitions()
        .iter()
        .find(|strategy| strategy.id == strategy_id)
        .map_or_else(
            || "Unknown strategy".to_owned(),
            |strategy| strategy.label.to_owned(),
        )
}

fn cube2_solver_mode(strategy_id: &str) -> String {
    all_strategy_definitions()
        .iter()
        .find(|strategy| strategy.id == strategy_id)
        .map_or_else(
            || "unknown".to_owned(),
            |strategy| strategy.solver_mode.to_owned(),
        )
}

async fn request_scan_session_analysis(
    state: &ApiState,
    request: &ScanSessionRequest,
) -> Result<AnalyzeScanSessionResponse, (StatusCode, ScanSessionResponse)> {
    if let Some(scan) =
        scan_session_analysis_from_reviewed_stickers(request, SCAN_STICKERS_PER_FACE)
    {
        return Ok(scan);
    }

    let url = format!("{}/analyze-session", state.vision_url.trim_end_matches('/'));
    let response = reqwest::Client::new()
        .post(url)
        .timeout(VISION_TIMEOUT)
        .json(&VisionScanSessionRequest {
            faces: &request.faces,
            grid_size: request.grid_size,
        })
        .send()
        .await;

    let response = response.map_err(|error| {
        (
            StatusCode::SERVICE_UNAVAILABLE,
            scan_session_error(
                "vision_unavailable",
                format!("vision service is unavailable: {error}"),
            ),
        )
    })?;
    let status = response.status();
    let body = response.json::<AnalyzeScanSessionResponse>().await;

    match body {
        Ok(body) => Ok(body),
        Err(error) => Err((
            if status.is_server_error() {
                StatusCode::BAD_GATEWAY
            } else {
                StatusCode::BAD_REQUEST
            },
            scan_session_error(
                "vision_error",
                format!("vision service returned an invalid response: {error}"),
            ),
        )),
    }
}

fn validate_scan_session_request(
    request: &ScanSessionRequest,
    stickers_per_face: usize,
) -> Option<String> {
    if request.faces.len() != REQUIRED_SCAN_SESSION_FACE_COUNT {
        return Some("scan session must contain exactly 6 faces".to_owned());
    }

    let mut symbols = Vec::new();
    for face in &request.faces {
        if !is_scan_symbol(&face.symbol) {
            return Some("face symbols must be one of U, R, F, D, L, B".to_owned());
        }
        if let Some(image) = &face.image {
            if image.len() > MAX_SCAN_IMAGE_BYTES * 2 {
                return Some(format!(
                    "scan image payload for face {} is {} bytes; API limit is {} bytes",
                    face.symbol,
                    image.len(),
                    MAX_SCAN_IMAGE_BYTES * 2
                ));
            }
        } else if face.reviewed_stickers.len() != stickers_per_face {
            return Some(format!(
                "face {} must include image or {stickers_per_face} reviewedStickers",
                face.symbol,
            ));
        }

        if let Some(message) = validate_reviewed_stickers(face, stickers_per_face) {
            return Some(format!(
                "reviewedStickers for face {} are invalid: {}",
                face.symbol, message
            ));
        }
        if let Some(expected_top) = &face.expected_top {
            if !is_scan_symbol(expected_top) {
                return Some("expectedTop must be one of U, R, F, D, L, B".to_owned());
            }
        }
        if let Some(rotation) = face.client_rotation {
            if !VALID_ROTATIONS.contains(&rotation) {
                return Some("clientRotation must be one of 0, 90, 180, 270".to_owned());
            }
        }
        if let Some(message) = validate_manual_overrides(face, stickers_per_face) {
            return Some(message);
        }
        symbols.push(face.symbol.as_str());
    }

    symbols.sort_unstable();
    symbols.dedup();
    if symbols.len() != REQUIRED_SCAN_SESSION_FACE_COUNT {
        return Some("scan session must contain each face symbol exactly once".to_owned());
    }

    None
}

fn validate_reviewed_stickers(
    face: &ScanSessionFaceRequest,
    stickers_per_face: usize,
) -> Option<String> {
    if face.reviewed_stickers.is_empty() {
        return None;
    }
    if face.reviewed_stickers.len() != stickers_per_face {
        return Some(format!("must contain exactly {stickers_per_face} stickers"));
    }

    let mut seen = vec![false; stickers_per_face];
    for sticker in &face.reviewed_stickers {
        if sticker.index >= stickers_per_face {
            return Some(format!(
                "indexes must be between 0 and {}",
                stickers_per_face - 1
            ));
        }
        if seen[sticker.index] {
            return Some("indexes must be unique".to_owned());
        }
        if !is_scan_symbol(&sticker.symbol) {
            return Some("symbols must be one of U, R, F, D, L, B".to_owned());
        }
        seen[sticker.index] = true;
    }

    if stickers_per_face == SCAN_STICKERS_PER_FACE
        && face
            .reviewed_stickers
            .iter()
            .find(|sticker| sticker.index == 4)
            .is_none_or(|sticker| sticker.symbol != face.symbol)
    {
        return Some("center sticker must match face symbol".to_owned());
    }

    None
}

fn scan_session_analysis_from_reviewed_stickers(
    request: &ScanSessionRequest,
    stickers_per_face: usize,
) -> Option<AnalyzeScanSessionResponse> {
    if request
        .faces
        .iter()
        .any(|face| face.reviewed_stickers.len() != stickers_per_face)
    {
        return None;
    }

    Some(AnalyzeScanSessionResponse {
        ok: true,
        status: "reviewed".to_owned(),
        message: None,
        faces: request
            .faces
            .iter()
            .map(|face| AnalyzedSessionFaceResponse {
                symbol: face.symbol.clone(),
                expected_top: face.expected_top.clone(),
                analysis: reviewed_face_analysis(face, stickers_per_face),
            })
            .collect(),
        warnings: Vec::new(),
    })
}

fn reviewed_face_analysis(
    face: &ScanSessionFaceRequest,
    stickers_per_face: usize,
) -> AnalyzeScanFaceResponse {
    let confidence = face
        .reviewed_stickers
        .iter()
        .map(|sticker| sticker.confidence.unwrap_or(1.0))
        .sum::<f64>()
        / stickers_per_face as f64;

    AnalyzeScanFaceResponse {
        ok: true,
        status: "reviewed".to_owned(),
        message: None,
        center_mismatch: false,
        detected_center: Some(face.symbol.clone()),
        expected_center: Some(face.symbol.clone()),
        confidence,
        detected_center_confidence: 1.0,
        face_confidence: 1.0,
        detection_mode: Some("reviewed_stickers".to_owned()),
        image_size: None,
        image_quality: Some(ImageQualityResponse {
            blur_score: 100.0,
            mean_luminance: 128.0,
            glare_ratio: 0.0,
            shadow_ratio: 0.0,
        }),
        stickers: face
            .reviewed_stickers
            .iter()
            .map(|sticker| AnalyzedStickerResponse {
                index: sticker.index,
                symbol: sticker.symbol.clone(),
                confidence: sticker.confidence.unwrap_or(1.0),
                rgb: RgbColorRequest { r: 0, g: 0, b: 0 },
                polygon: Vec::new(),
                alternatives: Vec::new(),
                probabilities: reviewed_sticker_probabilities(&sticker.symbol),
                quality: None,
            })
            .collect(),
        tile_detections: Vec::new(),
        quality_warnings: Vec::new(),
        warnings: Vec::new(),
    }
}

fn reviewed_sticker_probabilities(symbol: &str) -> Option<ColorProbabilitiesResponse> {
    let facelet = facelet_from_str(symbol)?;

    Some(ColorProbabilitiesResponse {
        u: if facelet == Facelet::U { 1.0 } else { 0.0 },
        r: if facelet == Facelet::R { 1.0 } else { 0.0 },
        f: if facelet == Facelet::F { 1.0 } else { 0.0 },
        d: if facelet == Facelet::D { 1.0 } else { 0.0 },
        l: if facelet == Facelet::L { 1.0 } else { 0.0 },
        b: if facelet == Facelet::B { 1.0 } else { 0.0 },
    })
}

fn validate_manual_overrides(
    face: &ScanSessionFaceRequest,
    stickers_per_face: usize,
) -> Option<String> {
    for (index, symbol) in &face.manual_overrides {
        if *index >= stickers_per_face {
            return Some(format!(
                "manualOverrides indexes must be between 0 and {}",
                stickers_per_face - 1
            ));
        }
        if !is_scan_symbol(symbol) {
            return Some("manualOverrides symbols must be one of U, R, F, D, L, B".to_owned());
        }
    }

    None
}

fn rescan_faces_from_session(
    scan: &AnalyzeScanSessionResponse,
    overrides: &ScanQualityOverrides,
) -> Vec<String> {
    scan.faces
        .iter()
        .filter(|face| {
            face.analysis.stickers.len() != 9
                || !(face.analysis.ok
                    || face.analysis.center_mismatch
                        && overrides.center_mismatch_overridden(&face.symbol))
        })
        .map(|face| face.symbol.clone())
        .collect()
}

fn scan_faces_from_facelets(facelets: &str) -> Option<ScanFacesRequest> {
    if facelets.len() != SCAN_FACELET_COUNT {
        return None;
    }

    Some(ScanFacesRequest {
        u: facelets[0..9].to_owned(),
        r: facelets[9..18].to_owned(),
        f: facelets[18..27].to_owned(),
        d: facelets[27..36].to_owned(),
        l: facelets[36..45].to_owned(),
        b: facelets[45..54].to_owned(),
    })
}

pub(crate) fn scan_inference_input_from_session(
    scan: &AnalyzeScanSessionResponse,
    request: &ScanSessionRequest,
) -> Option<ScanInferenceInput> {
    let mut probabilities =
        [[1.0 / SCAN_FACELET_SYMBOL_COUNT as f64; SCAN_FACELET_SYMBOL_COUNT]; SCAN_FACELET_COUNT];
    let mut seen_faces = [false; 6];
    let mut face_rotation_priors = [None; 6];
    let mut manual_overrides = Vec::new();

    for face in &request.faces {
        let facelet = facelet_from_str(&face.symbol)?;
        let face_index = facelet.index();
        face_rotation_priors[face_index] = face.client_rotation;

        for (sticker_index, override_symbol) in &face.manual_overrides {
            let override_facelet = facelet_from_str(override_symbol)?;
            manual_overrides.push(ScanManualOverride {
                position: face_index * SCAN_STICKERS_PER_FACE + *sticker_index,
                facelet: override_facelet,
            });
        }
    }

    for face in &scan.faces {
        let facelet = facelet_from_str(&face.symbol)?;
        let face_index = facelet.index();
        if seen_faces[face_index] || face.analysis.stickers.len() != SCAN_STICKERS_PER_FACE {
            return None;
        }
        seen_faces[face_index] = true;

        let mut seen_stickers = [false; SCAN_STICKERS_PER_FACE];
        for sticker in &face.analysis.stickers {
            if sticker.index >= SCAN_STICKERS_PER_FACE || seen_stickers[sticker.index] {
                return None;
            }
            seen_stickers[sticker.index] = true;

            probabilities[face_index * SCAN_STICKERS_PER_FACE + sticker.index] =
                probabilities_from_sticker(sticker)?;
        }

        if seen_stickers.iter().any(|seen| !seen) {
            return None;
        }
    }

    if seen_faces.iter().any(|seen| !seen) {
        return None;
    }

    Some(ScanInferenceInput {
        facelet_probabilities: probabilities,
        manual_overrides,
        face_rotation_priors,
    })
}

fn probabilities_from_sticker(
    sticker: &AnalyzedStickerResponse,
) -> Option<[f64; SCAN_FACELET_SYMBOL_COUNT]> {
    sticker.probabilities.as_ref().map_or_else(
        || {
            let facelet = facelet_from_str(&sticker.symbol)?;
            let mut probabilities = [0.0; SCAN_FACELET_SYMBOL_COUNT];
            probabilities[facelet.index()] = 1.0;
            Some(probabilities)
        },
        probabilities_from_response,
    )
}

fn probabilities_from_response(
    probabilities: &ColorProbabilitiesResponse,
) -> Option<[f64; SCAN_FACELET_SYMBOL_COUNT]> {
    Some([
        probabilities.u,
        probabilities.r,
        probabilities.f,
        probabilities.d,
        probabilities.l,
        probabilities.b,
    ])
}

fn scan_session_inference_response(
    inference: &ScanInferenceResult,
    quality_gate: &ScanQualityGateDecision,
) -> ScanSessionInferenceResponse {
    ScanSessionInferenceResponse {
        status: quality_gate.status.as_str().to_owned(),
        margin: inference.margin,
        state_confidence: inference.state_confidence,
        candidate_facelets: inference
            .best_candidate
            .as_ref()
            .map(|candidate| candidate.facelets.clone()),
        rescan_faces: inference
            .rescan_faces
            .iter()
            .map(|facelet| facelet.symbol().to_string())
            .collect(),
        manual_targets: quality_gate.manual_targets.clone(),
        quality_reasons: quality_gate.quality_reasons.clone(),
    }
}

fn scan_session_early_quality_response(
    quality_gate: &ScanQualityGateDecision,
) -> ScanSessionInferenceResponse {
    ScanSessionInferenceResponse {
        status: quality_gate.status.as_str().to_owned(),
        margin: None,
        state_confidence: 0.0,
        candidate_facelets: None,
        rescan_faces: quality_gate
            .rescan_faces
            .iter()
            .map(|facelet| facelet.symbol().to_string())
            .collect(),
        manual_targets: Vec::new(),
        quality_reasons: quality_gate.quality_reasons.clone(),
    }
}

fn facelet_from_str(symbol: &str) -> Option<Facelet> {
    let mut chars = symbol.chars();
    let symbol = chars.next()?;
    if chars.next().is_some() {
        return None;
    }

    Facelet::from_symbol(symbol)
}

fn scan_quality_gate_message(status: ScanInferenceStatus) -> &'static str {
    match status {
        ScanInferenceStatus::NeedsRescanFace => "One or more faces need to be rescanned.",
        ScanInferenceStatus::NeedsManualConfirmation => {
            "Confirm the highlighted stickers before solving."
        }
        ScanInferenceStatus::StateAmbiguous => {
            "The scanned stickers match more than one valid cube state."
        }
        ScanInferenceStatus::InvalidCubeState => "The scan does not describe a valid cube state.",
        ScanInferenceStatus::Accepted => "",
    }
}

fn scan_session_error(status: &str, message: String) -> ScanSessionResponse {
    ScanSessionResponse {
        ok: false,
        status: status.to_owned(),
        message: Some(message),
        timings: None,
        scan: None,
        solve: None,
        inference: None,
        rescan_faces: Vec::new(),
        manual_targets: Vec::new(),
        invalid_corners: Vec::new(),
    }
}

fn error_response(status: &str, message: String) -> AnalyzeScanFaceResponse {
    AnalyzeScanFaceResponse {
        ok: false,
        status: status.to_owned(),
        message: Some(message),
        center_mismatch: false,
        detected_center: None,
        expected_center: None,
        confidence: 0.0,
        detected_center_confidence: 0.0,
        face_confidence: 0.0,
        detection_mode: None,
        image_size: None,
        image_quality: None,
        stickers: Vec::new(),
        tile_detections: Vec::new(),
        quality_warnings: Vec::new(),
        warnings: Vec::new(),
    }
}

fn is_scan_symbol(symbol: &str) -> bool {
    matches!(symbol, "U" | "R" | "F" | "D" | "L" | "B")
}
