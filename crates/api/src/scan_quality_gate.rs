use cube_engine::{Facelet, ScanInferenceResult, ScanInferenceStatus};

use crate::response::{
    AnalyzeScanSessionResponse, AnalyzedStickerResponse, ScanSessionManualTargetResponse,
    ScanSessionRequest,
};

const MIN_BLUR_SCORE: f64 = 18.0;
const MAX_IMAGE_GLARE_RATIO: f64 = 0.18;
const MAX_IMAGE_SHADOW_RATIO: f64 = 0.45;
const MIN_FACE_CONFIDENCE: f64 = 0.55;
const MIN_STICKER_CONFIDENCE: f64 = 0.45;
const MIN_STICKER_TOP_PROBABILITY: f64 = 0.45;
const MIN_STICKER_MARGIN: f64 = 0.12;
const MAX_STICKER_GLARE_RATIO: f64 = 0.24;
const MAX_STICKER_SHADOW_RATIO: f64 = 0.55;
const MAX_MANUAL_TARGET_STICKERS: usize = 3;
const FACE_RESCAN_AMBIGUOUS_STICKERS: usize = 3;
const MIN_CANDIDATE_MARGIN: f64 = 1.2;

#[derive(Clone, Debug, PartialEq)]
pub(crate) struct ScanQualityGateDecision {
    pub(crate) status: ScanInferenceStatus,
    pub(crate) quality_reasons: Vec<String>,
    pub(crate) rescan_faces: Vec<Facelet>,
    pub(crate) manual_targets: Vec<ScanSessionManualTargetResponse>,
}

#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub(crate) struct ScanQualityOverrides {
    center_mismatch_faces: Vec<String>,
}

impl ScanQualityOverrides {
    pub(crate) fn from_request(request: &ScanSessionRequest) -> Self {
        let center_mismatch_faces = request
            .faces
            .iter()
            .filter(|face| face.manual_overrides.get(&4) == Some(&face.symbol))
            .map(|face| face.symbol.clone())
            .collect();

        Self {
            center_mismatch_faces,
        }
    }

    pub(crate) fn center_mismatch_overridden(&self, symbol: &str) -> bool {
        self.center_mismatch_faces.iter().any(|face| face == symbol)
    }
}

#[cfg(test)]
pub(crate) fn evaluate_scan_quality(
    scan: &AnalyzeScanSessionResponse,
    inference: &ScanInferenceResult,
) -> ScanQualityGateDecision {
    evaluate_scan_quality_with_overrides(scan, inference, &ScanQualityOverrides::default())
}

pub(crate) fn evaluate_scan_quality_with_overrides(
    scan: &AnalyzeScanSessionResponse,
    inference: &ScanInferenceResult,
    overrides: &ScanQualityOverrides,
) -> ScanQualityGateDecision {
    let mut quality_reasons = Vec::new();
    let mut rescan_faces = inference.rescan_faces.clone();
    let mut manual_targets = inference_manual_targets(inference);
    let mut ambiguous_targets: Vec<ScanSessionManualTargetResponse> = Vec::new();

    for face in &scan.faces {
        let Some(facelet) = facelet_from_str(&face.symbol) else {
            continue;
        };
        let mut face_requires_rescan = false;
        let mut ambiguous_stickers = Vec::new();

        if face.analysis.center_mismatch && !overrides.center_mismatch_overridden(&face.symbol) {
            quality_reasons.push(format!("center_mismatch:{}", face.symbol));
            face_requires_rescan = true;
        }

        if face.analysis.face_confidence < MIN_FACE_CONFIDENCE {
            quality_reasons.push(format!("low_face_confidence:{}", face.symbol));
            face_requires_rescan = true;
        }

        match &face.analysis.image_quality {
            Some(quality) => {
                if quality.blur_score < MIN_BLUR_SCORE {
                    quality_reasons.push(format!("image_blurry:{}", face.symbol));
                    face_requires_rescan = true;
                }
                if quality.glare_ratio > MAX_IMAGE_GLARE_RATIO {
                    quality_reasons.push(format!("image_glare:{}", face.symbol));
                    face_requires_rescan = true;
                }
                if quality.shadow_ratio > MAX_IMAGE_SHADOW_RATIO {
                    quality_reasons.push(format!("image_shadow:{}", face.symbol));
                    face_requires_rescan = true;
                }
            }
            None => {
                quality_reasons.push(format!("image_quality_missing:{}", face.symbol));
                face_requires_rescan = true;
            }
        }

        if face
            .analysis
            .warnings
            .iter()
            .any(|warning| warning == "cnn_disagreement" || warning == "opencv_cnn_disagreement")
        {
            quality_reasons.push(format!("opencv_cnn_disagreement:{}", face.symbol));
            face_requires_rescan = true;
        }

        for sticker in &face.analysis.stickers {
            if sticker.index == 4 {
                continue;
            }

            if sticker_requires_rescan(sticker) {
                quality_reasons.push(format!("sticker_quality:{}:{}", face.symbol, sticker.index));
                face_requires_rescan = true;
                continue;
            }

            if sticker_is_ambiguous(sticker) {
                quality_reasons.push(format!(
                    "sticker_ambiguous:{}:{}",
                    face.symbol, sticker.index
                ));
                ambiguous_stickers.push(sticker.index);
            }
        }

        if ambiguous_stickers.len() >= FACE_RESCAN_AMBIGUOUS_STICKERS {
            quality_reasons.push(format!("several_ambiguous_stickers:{}", face.symbol));
            face_requires_rescan = true;
        } else if !ambiguous_stickers.is_empty() {
            ambiguous_targets.push(ScanSessionManualTargetResponse {
                face: face.symbol.clone(),
                stickers: ambiguous_stickers,
            });
        }

        if face_requires_rescan && !rescan_faces.contains(&facelet) {
            rescan_faces.push(facelet);
        }
    }

    if inference
        .margin
        .is_some_and(|margin| margin < MIN_CANDIDATE_MARGIN)
    {
        quality_reasons.push("candidate_margin_low".to_owned());
    }

    if rescan_faces.is_empty() {
        merge_manual_targets(&mut manual_targets, ambiguous_targets);
    }

    let manual_target_count = manual_targets
        .iter()
        .map(|target| target.stickers.len())
        .sum::<usize>();

    let status = if !rescan_faces.is_empty() {
        ScanInferenceStatus::NeedsRescanFace
    } else if (1..=MAX_MANUAL_TARGET_STICKERS).contains(&manual_target_count) {
        ScanInferenceStatus::NeedsManualConfirmation
    } else if manual_target_count > MAX_MANUAL_TARGET_STICKERS {
        ScanInferenceStatus::NeedsRescanFace
    } else if inference.status != ScanInferenceStatus::Accepted {
        inference.status
    } else if inference
        .margin
        .is_some_and(|margin| margin < MIN_CANDIDATE_MARGIN)
    {
        ScanInferenceStatus::StateAmbiguous
    } else {
        ScanInferenceStatus::Accepted
    };

    if status == ScanInferenceStatus::NeedsRescanFace {
        if rescan_faces.is_empty() {
            for target in &manual_targets {
                if let Some(facelet) = facelet_from_str(&target.face) {
                    if !rescan_faces.contains(&facelet) {
                        rescan_faces.push(facelet);
                    }
                }
            }
        }
        manual_targets.clear();
    }

    ScanQualityGateDecision {
        status,
        quality_reasons,
        rescan_faces,
        manual_targets,
    }
}

#[cfg(test)]
pub(crate) fn evaluate_obvious_scan_quality(
    scan: &AnalyzeScanSessionResponse,
) -> Option<ScanQualityGateDecision> {
    evaluate_obvious_scan_quality_with_overrides(scan, &ScanQualityOverrides::default())
}

pub(crate) fn evaluate_obvious_scan_quality_with_overrides(
    scan: &AnalyzeScanSessionResponse,
    overrides: &ScanQualityOverrides,
) -> Option<ScanQualityGateDecision> {
    let mut quality_reasons = Vec::new();
    let mut rescan_faces = Vec::new();

    for face in &scan.faces {
        let Some(facelet) = facelet_from_str(&face.symbol) else {
            continue;
        };
        let mut face_requires_rescan = false;

        if face.analysis.center_mismatch && !overrides.center_mismatch_overridden(&face.symbol) {
            quality_reasons.push(format!("center_mismatch:{}", face.symbol));
            face_requires_rescan = true;
        }

        if face.analysis.face_confidence < MIN_FACE_CONFIDENCE {
            quality_reasons.push(format!("low_face_confidence:{}", face.symbol));
            face_requires_rescan = true;
        }

        match &face.analysis.image_quality {
            Some(quality) => {
                if quality.blur_score < MIN_BLUR_SCORE {
                    quality_reasons.push(format!("image_blurry:{}", face.symbol));
                    face_requires_rescan = true;
                }
                if quality.glare_ratio > MAX_IMAGE_GLARE_RATIO {
                    quality_reasons.push(format!("image_glare:{}", face.symbol));
                    face_requires_rescan = true;
                }
                if quality.shadow_ratio > MAX_IMAGE_SHADOW_RATIO {
                    quality_reasons.push(format!("image_shadow:{}", face.symbol));
                    face_requires_rescan = true;
                }
            }
            None => {
                quality_reasons.push(format!("image_quality_missing:{}", face.symbol));
                face_requires_rescan = true;
            }
        }

        if face
            .analysis
            .warnings
            .iter()
            .any(|warning| warning == "cnn_disagreement" || warning == "opencv_cnn_disagreement")
        {
            quality_reasons.push(format!("opencv_cnn_disagreement:{}", face.symbol));
            face_requires_rescan = true;
        }

        for sticker in &face.analysis.stickers {
            if sticker.index != 4 && sticker_requires_rescan(sticker) {
                quality_reasons.push(format!("sticker_quality:{}:{}", face.symbol, sticker.index));
                face_requires_rescan = true;
            }
        }

        if face_requires_rescan && !rescan_faces.contains(&facelet) {
            rescan_faces.push(facelet);
        }
    }

    if rescan_faces.is_empty() {
        return None;
    }

    Some(ScanQualityGateDecision {
        status: ScanInferenceStatus::NeedsRescanFace,
        quality_reasons,
        rescan_faces,
        manual_targets: Vec::new(),
    })
}

fn sticker_requires_rescan(sticker: &AnalyzedStickerResponse) -> bool {
    sticker.quality.as_ref().is_some_and(|quality| {
        quality.glare_ratio > MAX_STICKER_GLARE_RATIO
            || quality.shadow_ratio > MAX_STICKER_SHADOW_RATIO
    })
}

fn sticker_is_ambiguous(sticker: &AnalyzedStickerResponse) -> bool {
    if sticker.confidence < MIN_STICKER_CONFIDENCE {
        return true;
    }

    let Some(probabilities) = &sticker.probabilities else {
        return true;
    };
    let values = [
        probabilities.u,
        probabilities.r,
        probabilities.f,
        probabilities.d,
        probabilities.l,
        probabilities.b,
    ];
    let mut sorted = values;
    sorted.sort_by(|left, right| right.total_cmp(left));
    let top = sorted[0];
    let margin = top - sorted[1];

    top < MIN_STICKER_TOP_PROBABILITY
        || margin < MIN_STICKER_MARGIN
        || sticker
            .quality
            .as_ref()
            .is_some_and(|quality| quality.margin < MIN_STICKER_MARGIN)
}

fn inference_manual_targets(
    inference: &ScanInferenceResult,
) -> Vec<ScanSessionManualTargetResponse> {
    inference
        .manual_targets
        .iter()
        .map(|target| ScanSessionManualTargetResponse {
            face: target.face.symbol().to_string(),
            stickers: target.stickers.clone(),
        })
        .collect()
}

fn merge_manual_targets(
    manual_targets: &mut Vec<ScanSessionManualTargetResponse>,
    additional_targets: Vec<ScanSessionManualTargetResponse>,
) {
    for target in additional_targets {
        if let Some(existing) = manual_targets
            .iter_mut()
            .find(|existing| existing.face == target.face)
        {
            for sticker in target.stickers {
                if !existing.stickers.contains(&sticker) {
                    existing.stickers.push(sticker);
                }
            }
            existing.stickers.sort_unstable();
        } else {
            manual_targets.push(target);
        }
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
