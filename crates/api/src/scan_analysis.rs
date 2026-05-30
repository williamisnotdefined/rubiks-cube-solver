use std::time::Duration;

use axum::http::StatusCode;
use axum::Json;

use crate::config::MAX_SCAN_IMAGE_BYTES;
use crate::response::{AnalyzeScanFaceRequest, AnalyzeScanFaceResponse};
use crate::state::ApiState;

const VISION_TIMEOUT: Duration = Duration::from_secs(5);

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
        face_quad: Vec::new(),
        stickers: Vec::new(),
        quality_warnings: Vec::new(),
        warnings: Vec::new(),
    }
}

fn is_scan_symbol(symbol: &str) -> bool {
    matches!(symbol, "U" | "R" | "F" | "D" | "L" | "B")
}
