use std::fmt;

use super::super::cubies::{Corner, CubeValidationError, Edge};
use super::Facelet;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum FaceletParseError {
    InvalidLength {
        expected: usize,
        actual: usize,
    },
    InvalidSymbol {
        position: usize,
        symbol: char,
    },
    InvalidFaceCount {
        facelet: Facelet,
        expected: usize,
        actual: usize,
    },
}

impl fmt::Display for FaceletParseError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidLength { expected, actual } => write!(
                formatter,
                "invalid facelet string length: expected {expected} characters, got {actual}"
            ),
            Self::InvalidSymbol { position, symbol } => write!(
                formatter,
                "invalid facelet symbol at position {position}: expected one of U, R, F, D, L, B, got {symbol:?}"
            ),
            Self::InvalidFaceCount {
                facelet,
                expected,
                actual,
            } => write!(
                formatter,
                "invalid {facelet} facelet count: expected {expected}, got {actual}"
            ),
        }
    }
}

impl std::error::Error for FaceletParseError {}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum FaceletConversionError {
    InvalidCenterSticker {
        position: usize,
        expected: Facelet,
        actual: Facelet,
    },
    UnknownCornerStickers {
        position: Corner,
        stickers: [Facelet; 3],
    },
    DuplicateCornerStickers {
        corner: Corner,
        first_position: Corner,
        duplicate_position: Corner,
    },
    UnknownEdgeStickers {
        position: Edge,
        stickers: [Facelet; 2],
    },
    DuplicateEdgeStickers {
        edge: Edge,
        first_position: Edge,
        duplicate_position: Edge,
    },
    InvalidCornerOrientation {
        position: Corner,
        corner: Corner,
        stickers: [Facelet; 3],
    },
    CubieValidation {
        error: CubeValidationError,
    },
}

impl fmt::Display for FaceletConversionError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidCenterSticker {
                position,
                expected,
                actual,
            } => write!(
                formatter,
                "invalid center sticker at position {position}: expected {expected}, got {actual}"
            ),
            Self::UnknownCornerStickers { position, stickers } => write!(
                formatter,
                "unknown corner stickers at position {position:?}: {}{}{}",
                stickers[0], stickers[1], stickers[2]
            ),
            Self::DuplicateCornerStickers {
                corner,
                first_position,
                duplicate_position,
            } => write!(
                formatter,
                "duplicate corner stickers for {corner:?}: first at {first_position:?}, duplicate at {duplicate_position:?}"
            ),
            Self::UnknownEdgeStickers { position, stickers } => write!(
                formatter,
                "unknown edge stickers at position {position:?}: {}{}",
                stickers[0], stickers[1]
            ),
            Self::DuplicateEdgeStickers {
                edge,
                first_position,
                duplicate_position,
            } => write!(
                formatter,
                "duplicate edge stickers for {edge:?}: first at {first_position:?}, duplicate at {duplicate_position:?}"
            ),
            Self::InvalidCornerOrientation {
                position,
                corner,
                stickers,
            } => write!(
                formatter,
                "invalid corner sticker order for {corner:?} at position {position:?}: {}{}{}",
                stickers[0], stickers[1], stickers[2]
            ),
            Self::CubieValidation { error } => write!(formatter, "cubie validation failed: {error}"),
        }
    }
}

impl std::error::Error for FaceletConversionError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::CubieValidation { error } => Some(error),
            _ => None,
        }
    }
}
