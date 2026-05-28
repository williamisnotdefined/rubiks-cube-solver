use std::fmt;

use super::{Corner, Edge};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum CornerOrientationCoordinateError {
    IndexOutOfRange {
        index: usize,
        coordinate_count: usize,
    },
    InvalidCornerOrientation {
        position: usize,
        orientation: u8,
    },
    InvalidCornerOrientationSum {
        sum: u16,
    },
}

impl fmt::Display for CornerOrientationCoordinateError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::IndexOutOfRange {
                index,
                coordinate_count,
            } => write!(
                formatter,
                "corner-orientation coordinate {index} is outside 0..{coordinate_count}"
            ),
            Self::InvalidCornerOrientation {
                position,
                orientation,
            } => write!(
                formatter,
                "invalid corner orientation at position {position}: {orientation}"
            ),
            Self::InvalidCornerOrientationSum { sum } => {
                write!(formatter, "invalid corner orientation sum: {sum}")
            }
        }
    }
}

impl std::error::Error for CornerOrientationCoordinateError {}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum EdgeOrientationCoordinateError {
    IndexOutOfRange {
        index: usize,
        coordinate_count: usize,
    },
    InvalidEdgeOrientation {
        position: usize,
        orientation: u8,
    },
    InvalidEdgeOrientationSum {
        sum: u16,
    },
}

impl fmt::Display for EdgeOrientationCoordinateError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::IndexOutOfRange {
                index,
                coordinate_count,
            } => write!(
                formatter,
                "edge-orientation coordinate {index} is outside 0..{coordinate_count}"
            ),
            Self::InvalidEdgeOrientation {
                position,
                orientation,
            } => write!(
                formatter,
                "invalid edge orientation at position {position}: {orientation}"
            ),
            Self::InvalidEdgeOrientationSum { sum } => {
                write!(formatter, "invalid edge orientation sum: {sum}")
            }
        }
    }
}

impl std::error::Error for EdgeOrientationCoordinateError {}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum UdSliceEdgeCombinationCoordinateError {
    IndexOutOfRange {
        index: usize,
        coordinate_count: usize,
    },
    InvalidSliceEdgeCount {
        count: usize,
        expected: usize,
    },
}

impl fmt::Display for UdSliceEdgeCombinationCoordinateError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::IndexOutOfRange {
                index,
                coordinate_count,
            } => write!(
                formatter,
                "UD-slice edge-combination coordinate {index} is outside 0..{coordinate_count}"
            ),
            Self::InvalidSliceEdgeCount { count, expected } => write!(
                formatter,
                "invalid UD-slice edge membership count: {count}, expected {expected}"
            ),
        }
    }
}

impl std::error::Error for UdSliceEdgeCombinationCoordinateError {}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum CornerPermutationCoordinateError {
    IndexOutOfRange {
        index: usize,
        coordinate_count: usize,
    },
    InvalidCornerPermutation {
        duplicate: Option<Corner>,
        missing: Option<Corner>,
    },
}

impl fmt::Display for CornerPermutationCoordinateError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::IndexOutOfRange {
                index,
                coordinate_count,
            } => write!(
                formatter,
                "corner-permutation coordinate {index} is outside 0..{coordinate_count}"
            ),
            Self::InvalidCornerPermutation { duplicate, missing } => write!(
                formatter,
                "invalid corner permutation: duplicate {duplicate:?}, missing {missing:?}"
            ),
        }
    }
}

impl std::error::Error for CornerPermutationCoordinateError {}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum SliceEdgePermutationCoordinateError {
    IndexOutOfRange {
        index: usize,
        coordinate_count: usize,
    },
    InvalidSliceEdgePermutation {
        duplicate: Option<Edge>,
        missing: Option<Edge>,
        wrong_set: Option<(usize, Edge)>,
        wrong_position: Option<(usize, Edge)>,
    },
}

impl fmt::Display for SliceEdgePermutationCoordinateError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::IndexOutOfRange {
                index,
                coordinate_count,
            } => write!(
                formatter,
                "slice-edge permutation coordinate {index} is outside 0..{coordinate_count}"
            ),
            Self::InvalidSliceEdgePermutation {
                duplicate,
                missing,
                wrong_set,
                wrong_position,
            } => write!(
                formatter,
                "invalid slice-edge permutation: duplicate {duplicate:?}, missing {missing:?}, wrong-set {wrong_set:?}, wrong-position {wrong_position:?}"
            ),
        }
    }
}

impl std::error::Error for SliceEdgePermutationCoordinateError {}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum UdEdgePermutationCoordinateError {
    IndexOutOfRange {
        index: usize,
        coordinate_count: usize,
    },
    InvalidUdEdgePermutation {
        duplicate: Option<Edge>,
        missing: Option<Edge>,
        wrong_set: Option<(usize, Edge)>,
        wrong_position: Option<(usize, Edge)>,
    },
}

impl fmt::Display for UdEdgePermutationCoordinateError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::IndexOutOfRange {
                index,
                coordinate_count,
            } => write!(
                formatter,
                "U/D-edge permutation coordinate {index} is outside 0..{coordinate_count}"
            ),
            Self::InvalidUdEdgePermutation {
                duplicate,
                missing,
                wrong_set,
                wrong_position,
            } => write!(
                formatter,
                "invalid U/D-edge permutation: duplicate {duplicate:?}, missing {missing:?}, wrong-set {wrong_set:?}, wrong-position {wrong_position:?}"
            ),
        }
    }
}

impl std::error::Error for UdEdgePermutationCoordinateError {}
