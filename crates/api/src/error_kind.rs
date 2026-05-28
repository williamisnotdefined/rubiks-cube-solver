use cube_engine::{
    CubeValidationError, FaceletConversionError, FaceletParseError, SolveInputError,
};

pub(crate) fn solve_input_error_kind(error: &SolveInputError) -> &'static str {
    match error {
        SolveInputError::CubieValidation { error } => cubie_validation_error_kind(error),
        SolveInputError::FaceletParse { error } => facelet_parse_error_kind(error),
        SolveInputError::FaceletConversion { error } => facelet_conversion_error_kind(error),
    }
}

fn facelet_parse_error_kind(error: &FaceletParseError) -> &'static str {
    match error {
        FaceletParseError::InvalidLength { .. } => "invalid_length",
        FaceletParseError::InvalidSymbol { .. } => "invalid_symbol",
        FaceletParseError::InvalidFaceCount { .. } => "invalid_face_count",
    }
}

fn facelet_conversion_error_kind(error: &FaceletConversionError) -> &'static str {
    match error {
        FaceletConversionError::InvalidCenterSticker { .. } => "invalid_center_sticker",
        FaceletConversionError::UnknownCornerStickers { .. } => "unknown_corner_stickers",
        FaceletConversionError::DuplicateCornerStickers { .. } => "duplicate_corner_stickers",
        FaceletConversionError::UnknownEdgeStickers { .. } => "unknown_edge_stickers",
        FaceletConversionError::DuplicateEdgeStickers { .. } => "duplicate_edge_stickers",
        FaceletConversionError::InvalidCornerOrientation { .. } => "invalid_corner_sticker_order",
        FaceletConversionError::CubieValidation { error } => cubie_validation_error_kind(error),
    }
}

fn cubie_validation_error_kind(error: &CubeValidationError) -> &'static str {
    match error {
        CubeValidationError::DuplicateCorner { .. } => "duplicate_corner",
        CubeValidationError::MissingCorner { .. } => "missing_corner",
        CubeValidationError::DuplicateEdge { .. } => "duplicate_edge",
        CubeValidationError::MissingEdge { .. } => "missing_edge",
        CubeValidationError::InvalidCornerOrientation { .. } => "invalid_corner_orientation",
        CubeValidationError::InvalidEdgeOrientation { .. } => "invalid_edge_orientation",
        CubeValidationError::InvalidCornerOrientationSum { .. } => "invalid_corner_orientation_sum",
        CubeValidationError::InvalidEdgeOrientationSum { .. } => "invalid_edge_orientation_sum",
        CubeValidationError::InvalidPermutationParity { .. } => "invalid_permutation_parity",
    }
}
