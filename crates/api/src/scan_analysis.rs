use std::time::{Duration, Instant};

use axum::http::StatusCode;
use axum::Json;
use cube_engine::{
    infer_scan, Facelet, ScanInferenceInput, ScanInferenceResult, ScanInferenceStatus,
    ScanManualOverride, SCAN_FACELET_COUNT, SCAN_FACELET_SYMBOL_COUNT, SCAN_STICKERS_PER_FACE,
};

use crate::config::MAX_SCAN_IMAGE_BYTES;
use crate::response::{
    AnalyzeScanFaceRequest, AnalyzeScanFaceResponse, AnalyzeScanSessionResponse,
    AnalyzedStickerResponse, ColorProbabilitiesResponse, ScanFacesRequest, ScanSessionFaceRequest,
    ScanSessionInferenceResponse, ScanSessionRequest, ScanSessionResponse,
    ScanSessionTimingsResponse, SolveScanRequest,
};
use crate::scan_quality_gate::{
    evaluate_obvious_scan_quality_with_overrides, evaluate_scan_quality_with_overrides,
    ScanQualityGateDecision, ScanQualityOverrides,
};
use crate::solve::solve_scan_request;
use crate::state::ApiState;

const VISION_TIMEOUT: Duration = Duration::from_secs(5);
const REQUIRED_SCAN_SESSION_FACE_COUNT: usize = 6;
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
    let mut timings = ScanSessionTimingRecorder::start();

    if let Some(message) = validate_scan_session_request(&request) {
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
        }),
    )
}

async fn request_scan_session_analysis(
    state: &ApiState,
    request: &ScanSessionRequest,
) -> Result<AnalyzeScanSessionResponse, (StatusCode, ScanSessionResponse)> {
    let url = format!("{}/analyze-session", state.vision_url.trim_end_matches('/'));
    let response = reqwest::Client::new()
        .post(url)
        .timeout(VISION_TIMEOUT)
        .json(&VisionScanSessionRequest {
            faces: &request.faces,
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

fn validate_scan_session_request(request: &ScanSessionRequest) -> Option<String> {
    if request.faces.len() != REQUIRED_SCAN_SESSION_FACE_COUNT {
        return Some("scan session must contain exactly 6 faces".to_owned());
    }

    let mut symbols = Vec::new();
    for face in &request.faces {
        if !is_scan_symbol(&face.symbol) {
            return Some("face symbols must be one of U, R, F, D, L, B".to_owned());
        }
        if face.image.len() > MAX_SCAN_IMAGE_BYTES * 2 {
            return Some(format!(
                "scan image payload for face {} is {} bytes; API limit is {} bytes",
                face.symbol,
                face.image.len(),
                MAX_SCAN_IMAGE_BYTES * 2
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
        if let Some(message) = validate_manual_overrides(face) {
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

fn validate_manual_overrides(face: &ScanSessionFaceRequest) -> Option<String> {
    for (index, symbol) in &face.manual_overrides {
        if *index > 8 {
            return Some("manualOverrides indexes must be between 0 and 8".to_owned());
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
                || (!face.analysis.ok
                    && !(face.analysis.center_mismatch
                        && overrides.center_mismatch_overridden(&face.symbol)))
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
        face_quad: Vec::new(),
        stickers: Vec::new(),
        tile_detections: Vec::new(),
        grid_detections: Vec::new(),
        grid_confidence: 0.0,
        grid_status: String::new(),
        quality_warnings: Vec::new(),
        warnings: Vec::new(),
    }
}

fn is_scan_symbol(symbol: &str) -> bool {
    matches!(symbol, "U" | "R" | "F" | "D" | "L" | "B")
}
