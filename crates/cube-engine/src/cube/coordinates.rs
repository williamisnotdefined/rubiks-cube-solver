use std::fmt;

use super::cubies::{Corner, CubieState, Edge, CORNER_COUNT, EDGE_COUNT};

pub const CORNER_ORIENTATION_COORDINATE_COUNT: usize = 2187;
pub const EDGE_ORIENTATION_COORDINATE_COUNT: usize = 2048;
pub const UD_SLICE_EDGE_COMBINATION_COORDINATE_COUNT: usize = 495;
pub const CORNER_PERMUTATION_COORDINATE_COUNT: usize = 40320;
pub const SLICE_EDGE_PERMUTATION_COORDINATE_COUNT: usize = 24;
pub const UD_EDGE_PERMUTATION_COORDINATE_COUNT: usize = 40320;

const UD_SLICE_EDGE_COUNT: usize = 4;
const SLICE_EDGE_PERMUTATION_EDGE_COUNT: usize = 4;
const UD_EDGE_PERMUTATION_EDGE_COUNT: usize = 8;

/// The engine UD-slice edge set is FR, FL, BL, and BR.
///
/// The UD-slice edge-combination coordinate tracks only which edge positions
/// contain one of these four pieces. It does not encode edge permutation or
/// represent a standalone valid `CubieState`.
const UD_SLICE_EDGES: [Edge; UD_SLICE_EDGE_COUNT] = [Edge::Fr, Edge::Fl, Edge::Bl, Edge::Br];
const SLICE_EDGE_PERMUTATION_EDGES: [Edge; SLICE_EDGE_PERMUTATION_EDGE_COUNT] =
    [Edge::Fr, Edge::Fl, Edge::Bl, Edge::Br];
const SLICE_EDGE_PERMUTATION_POSITIONS: [usize; SLICE_EDGE_PERMUTATION_EDGE_COUNT] = [8, 9, 10, 11];
const UD_EDGE_PERMUTATION_EDGES: [Edge; UD_EDGE_PERMUTATION_EDGE_COUNT] = [
    Edge::Ur,
    Edge::Uf,
    Edge::Ul,
    Edge::Ub,
    Edge::Dr,
    Edge::Df,
    Edge::Dl,
    Edge::Db,
];
const UD_EDGE_PERMUTATION_POSITIONS: [usize; UD_EDGE_PERMUTATION_EDGE_COUNT] =
    [0, 1, 2, 3, 4, 5, 6, 7];

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

pub fn corner_orientation_coordinate(
    state: &CubieState,
) -> Result<usize, CornerOrientationCoordinateError> {
    validate_corner_orientation(&state.corner_orientation)?;

    let mut index = 0;
    for orientation in state
        .corner_orientation
        .iter()
        .copied()
        .take(CORNER_COUNT - 1)
    {
        index = index * 3 + usize::from(orientation);
    }

    Ok(index)
}

pub fn cubie_state_from_corner_orientation_coordinate(
    index: usize,
) -> Result<CubieState, CornerOrientationCoordinateError> {
    if index >= CORNER_ORIENTATION_COORDINATE_COUNT {
        return Err(CornerOrientationCoordinateError::IndexOutOfRange {
            index,
            coordinate_count: CORNER_ORIENTATION_COORDINATE_COUNT,
        });
    }

    let mut remaining = index;
    let mut corner_orientation = [0_u8; CORNER_COUNT];
    let mut sum = 0_u16;

    for position in (0..CORNER_COUNT - 1).rev() {
        let orientation = (remaining % 3) as u8;
        corner_orientation[position] = orientation;
        sum += u16::from(orientation);
        remaining /= 3;
    }

    corner_orientation[CORNER_COUNT - 1] = ((3 - (sum % 3)) % 3) as u8;

    let mut state = CubieState::solved();
    state.corner_orientation = corner_orientation;

    Ok(state)
}

pub fn edge_orientation_coordinate(
    state: &CubieState,
) -> Result<usize, EdgeOrientationCoordinateError> {
    validate_edge_orientation(&state.edge_orientation)?;

    let mut index = 0;
    for orientation in state.edge_orientation.iter().copied().take(EDGE_COUNT - 1) {
        index = index * 2 + usize::from(orientation);
    }

    Ok(index)
}

pub fn cubie_state_from_edge_orientation_coordinate(
    index: usize,
) -> Result<CubieState, EdgeOrientationCoordinateError> {
    if index >= EDGE_ORIENTATION_COORDINATE_COUNT {
        return Err(EdgeOrientationCoordinateError::IndexOutOfRange {
            index,
            coordinate_count: EDGE_ORIENTATION_COORDINATE_COUNT,
        });
    }

    let mut remaining = index;
    let mut edge_orientation = [0_u8; EDGE_COUNT];
    let mut sum = 0_u16;

    for position in (0..EDGE_COUNT - 1).rev() {
        let orientation = (remaining % 2) as u8;
        edge_orientation[position] = orientation;
        sum += u16::from(orientation);
        remaining /= 2;
    }

    edge_orientation[EDGE_COUNT - 1] = ((2 - (sum % 2)) % 2) as u8;

    let mut state = CubieState::solved();
    state.edge_orientation = edge_orientation;

    Ok(state)
}

pub fn ud_slice_edge_combination_coordinate(
    state: &CubieState,
) -> Result<usize, UdSliceEdgeCombinationCoordinateError> {
    let mut membership = [false; EDGE_COUNT];

    for (position, edge) in state.edge_permutation.iter().copied().enumerate() {
        membership[position] = is_ud_slice_edge(edge);
    }

    ud_slice_edge_combination_coordinate_from_membership(&membership)
}

pub fn ud_slice_edge_combination_coordinate_from_membership(
    membership: &[bool; EDGE_COUNT],
) -> Result<usize, UdSliceEdgeCombinationCoordinateError> {
    validate_ud_slice_edge_membership(membership)?;

    let mut index = 0;
    let mut selected_count = 0;

    for position in (0..EDGE_COUNT).rev() {
        if membership[position] {
            selected_count += 1;
            index += binomial(EDGE_COUNT - 1 - position, selected_count);
        }
    }

    Ok(index)
}

pub fn ud_slice_edge_combination_membership_from_coordinate(
    index: usize,
) -> Result<[bool; EDGE_COUNT], UdSliceEdgeCombinationCoordinateError> {
    if index >= UD_SLICE_EDGE_COMBINATION_COORDINATE_COUNT {
        return Err(UdSliceEdgeCombinationCoordinateError::IndexOutOfRange {
            index,
            coordinate_count: UD_SLICE_EDGE_COMBINATION_COORDINATE_COUNT,
        });
    }

    let mut membership = [false; EDGE_COUNT];
    let mut remaining = index;
    let mut ceiling = EDGE_COUNT;

    for selected_count in (1..=UD_SLICE_EDGE_COUNT).rev() {
        let mut reflected_position = ceiling - 1;
        while binomial(reflected_position, selected_count) > remaining {
            reflected_position -= 1;
        }

        membership[EDGE_COUNT - 1 - reflected_position] = true;
        remaining -= binomial(reflected_position, selected_count);
        ceiling = reflected_position;
    }

    Ok(membership)
}

pub fn corner_permutation_coordinate_from_permutation(
    permutation: &[Corner; CORNER_COUNT],
) -> Result<usize, CornerPermutationCoordinateError> {
    validate_corner_permutation(permutation)?;

    let mut available = [true; CORNER_COUNT];
    let mut index = 0;

    for (position, corner) in permutation.iter().copied().enumerate() {
        let corner_index = corner.index();
        let smaller_available_count = available
            .iter()
            .take(corner_index)
            .filter(|available| **available)
            .count();

        index += smaller_available_count * factorial(CORNER_COUNT - 1 - position);
        available[corner_index] = false;
    }

    Ok(index)
}

pub fn corner_permutation_from_coordinate(
    index: usize,
) -> Result<[Corner; CORNER_COUNT], CornerPermutationCoordinateError> {
    if index >= CORNER_PERMUTATION_COORDINATE_COUNT {
        return Err(CornerPermutationCoordinateError::IndexOutOfRange {
            index,
            coordinate_count: CORNER_PERMUTATION_COORDINATE_COUNT,
        });
    }

    let mut remaining = index;
    let mut available = [true; CORNER_COUNT];
    let mut permutation = Corner::ALL;

    for (position, slot) in permutation.iter_mut().enumerate() {
        let factor = factorial(CORNER_COUNT - 1 - position);
        let selected_index = remaining / factor;
        remaining %= factor;

        let corner = nth_available_corner(&available, selected_index)
            .expect("in-range corner-permutation coordinate must unrank");
        available[corner.index()] = false;
        *slot = corner;
    }

    Ok(permutation)
}

pub fn slice_edge_permutation_coordinate_from_permutation(
    permutation: &[Edge; EDGE_COUNT],
) -> Result<usize, SliceEdgePermutationCoordinateError> {
    let slice_edges = validate_edge_permutation_subset(
        permutation,
        &SLICE_EDGE_PERMUTATION_EDGES,
        &SLICE_EDGE_PERMUTATION_POSITIONS,
    )
    .map_err(
        |error| SliceEdgePermutationCoordinateError::InvalidSliceEdgePermutation {
            duplicate: error.duplicate,
            missing: error.missing,
            wrong_set: error.wrong_set,
            wrong_position: error.wrong_position,
        },
    )?;

    Ok(edge_permutation_rank(
        &slice_edges,
        &SLICE_EDGE_PERMUTATION_EDGES,
    ))
}

pub fn slice_edge_permutation_from_coordinate(
    index: usize,
) -> Result<[Edge; SLICE_EDGE_PERMUTATION_EDGE_COUNT], SliceEdgePermutationCoordinateError> {
    if index >= SLICE_EDGE_PERMUTATION_COORDINATE_COUNT {
        return Err(SliceEdgePermutationCoordinateError::IndexOutOfRange {
            index,
            coordinate_count: SLICE_EDGE_PERMUTATION_COORDINATE_COUNT,
        });
    }

    Ok(edge_permutation_unrank(
        index,
        &SLICE_EDGE_PERMUTATION_EDGES,
    ))
}

pub fn ud_edge_permutation_coordinate_from_permutation(
    permutation: &[Edge; EDGE_COUNT],
) -> Result<usize, UdEdgePermutationCoordinateError> {
    let ud_edges = validate_edge_permutation_subset(
        permutation,
        &UD_EDGE_PERMUTATION_EDGES,
        &UD_EDGE_PERMUTATION_POSITIONS,
    )
    .map_err(
        |error| UdEdgePermutationCoordinateError::InvalidUdEdgePermutation {
            duplicate: error.duplicate,
            missing: error.missing,
            wrong_set: error.wrong_set,
            wrong_position: error.wrong_position,
        },
    )?;

    Ok(edge_permutation_rank(&ud_edges, &UD_EDGE_PERMUTATION_EDGES))
}

pub fn ud_edge_permutation_from_coordinate(
    index: usize,
) -> Result<[Edge; UD_EDGE_PERMUTATION_EDGE_COUNT], UdEdgePermutationCoordinateError> {
    if index >= UD_EDGE_PERMUTATION_COORDINATE_COUNT {
        return Err(UdEdgePermutationCoordinateError::IndexOutOfRange {
            index,
            coordinate_count: UD_EDGE_PERMUTATION_COORDINATE_COUNT,
        });
    }

    Ok(edge_permutation_unrank(index, &UD_EDGE_PERMUTATION_EDGES))
}

fn validate_corner_orientation(
    orientations: &[u8; CORNER_COUNT],
) -> Result<(), CornerOrientationCoordinateError> {
    let mut sum = 0_u16;

    for (position, orientation) in orientations.iter().copied().enumerate() {
        if orientation > 2 {
            return Err(CornerOrientationCoordinateError::InvalidCornerOrientation {
                position,
                orientation,
            });
        }

        sum += u16::from(orientation);
    }

    if !sum.is_multiple_of(3) {
        return Err(CornerOrientationCoordinateError::InvalidCornerOrientationSum { sum });
    }

    Ok(())
}

fn validate_edge_orientation(
    orientations: &[u8; EDGE_COUNT],
) -> Result<(), EdgeOrientationCoordinateError> {
    let mut sum = 0_u16;

    for (position, orientation) in orientations.iter().copied().enumerate() {
        if orientation > 1 {
            return Err(EdgeOrientationCoordinateError::InvalidEdgeOrientation {
                position,
                orientation,
            });
        }

        sum += u16::from(orientation);
    }

    if !sum.is_multiple_of(2) {
        return Err(EdgeOrientationCoordinateError::InvalidEdgeOrientationSum { sum });
    }

    Ok(())
}

fn validate_ud_slice_edge_membership(
    membership: &[bool; EDGE_COUNT],
) -> Result<(), UdSliceEdgeCombinationCoordinateError> {
    let count = membership.iter().filter(|selected| **selected).count();

    if count != UD_SLICE_EDGE_COUNT {
        return Err(
            UdSliceEdgeCombinationCoordinateError::InvalidSliceEdgeCount {
                count,
                expected: UD_SLICE_EDGE_COUNT,
            },
        );
    }

    Ok(())
}

fn validate_corner_permutation(
    permutation: &[Corner; CORNER_COUNT],
) -> Result<(), CornerPermutationCoordinateError> {
    let mut counts = [0_u8; CORNER_COUNT];

    for corner in permutation {
        counts[corner.index()] += 1;
    }

    let duplicate = Corner::ALL
        .iter()
        .copied()
        .find(|corner| counts[corner.index()] > 1);
    let missing = Corner::ALL
        .iter()
        .copied()
        .find(|corner| counts[corner.index()] == 0);

    if duplicate.is_some() || missing.is_some() {
        return Err(CornerPermutationCoordinateError::InvalidCornerPermutation {
            duplicate,
            missing,
        });
    }

    Ok(())
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
struct EdgePermutationSubsetValidationError {
    duplicate: Option<Edge>,
    missing: Option<Edge>,
    wrong_set: Option<(usize, Edge)>,
    wrong_position: Option<(usize, Edge)>,
}

fn validate_edge_permutation_subset<const N: usize>(
    permutation: &[Edge; EDGE_COUNT],
    target_edges: &[Edge; N],
    target_positions: &[usize; N],
) -> Result<[Edge; N], EdgePermutationSubsetValidationError> {
    let mut counts = [0_u8; EDGE_COUNT];
    let mut wrong_set = None;
    let mut wrong_position = None;

    for (position, edge) in permutation.iter().copied().enumerate() {
        if target_edges.contains(&edge) {
            counts[edge.index()] += 1;

            if !target_positions.contains(&position) && wrong_position.is_none() {
                wrong_position = Some((position, edge));
            }
        } else if target_positions.contains(&position) && wrong_set.is_none() {
            wrong_set = Some((position, edge));
        }
    }

    let duplicate = target_edges
        .iter()
        .copied()
        .find(|edge| counts[edge.index()] > 1);
    let missing = target_edges
        .iter()
        .copied()
        .find(|edge| counts[edge.index()] == 0);

    if duplicate.is_some() || missing.is_some() || wrong_set.is_some() || wrong_position.is_some() {
        return Err(EdgePermutationSubsetValidationError {
            duplicate,
            missing,
            wrong_set,
            wrong_position,
        });
    }

    let mut subset = *target_edges;
    for (slot, position) in target_positions.iter().copied().enumerate() {
        subset[slot] = permutation[position];
    }

    Ok(subset)
}

fn edge_permutation_rank<const N: usize>(
    permutation: &[Edge; N],
    ordered_edges: &[Edge; N],
) -> usize {
    let mut available = [true; N];
    let mut index = 0;

    for (position, edge) in permutation.iter().copied().enumerate() {
        let edge_order = edge_order_in_set(edge, ordered_edges)
            .expect("validated edge-permutation subset must contain only target edges");
        let smaller_available_count = available
            .iter()
            .take(edge_order)
            .filter(|available| **available)
            .count();

        index += smaller_available_count * factorial(N - 1 - position);
        available[edge_order] = false;
    }

    index
}

fn edge_permutation_unrank<const N: usize>(index: usize, ordered_edges: &[Edge; N]) -> [Edge; N] {
    let mut remaining = index;
    let mut available = [true; N];
    let mut permutation = *ordered_edges;

    for (position, slot) in permutation.iter_mut().enumerate() {
        let factor = factorial(N - 1 - position);
        let selected_index = remaining / factor;
        remaining %= factor;

        let (edge_order, edge) = nth_available_edge(ordered_edges, &available, selected_index)
            .expect("in-range edge-permutation coordinate must unrank");
        available[edge_order] = false;
        *slot = edge;
    }

    permutation
}

fn edge_order_in_set<const N: usize>(edge: Edge, ordered_edges: &[Edge; N]) -> Option<usize> {
    ordered_edges
        .iter()
        .copied()
        .position(|candidate| candidate == edge)
}

fn nth_available_edge<const N: usize>(
    ordered_edges: &[Edge; N],
    available: &[bool; N],
    selected_index: usize,
) -> Option<(usize, Edge)> {
    let mut seen = 0;

    for (edge_order, edge) in ordered_edges.iter().copied().enumerate() {
        if !available[edge_order] {
            continue;
        }

        if seen == selected_index {
            return Some((edge_order, edge));
        }

        seen += 1;
    }

    None
}

fn nth_available_corner(available: &[bool; CORNER_COUNT], selected_index: usize) -> Option<Corner> {
    let mut seen = 0;

    for corner in Corner::ALL {
        if !available[corner.index()] {
            continue;
        }

        if seen == selected_index {
            return Some(corner);
        }

        seen += 1;
    }

    None
}

fn is_ud_slice_edge(edge: Edge) -> bool {
    UD_SLICE_EDGES.contains(&edge)
}

fn binomial(n: usize, k: usize) -> usize {
    if k > n {
        return 0;
    }

    let k = k.min(n - k);
    let mut result = 1;

    for divisor in 1..=k {
        result = result * (n - k + divisor) / divisor;
    }

    result
}

fn factorial(n: usize) -> usize {
    let mut result = 1;

    for factor in 2..=n {
        result *= factor;
    }

    result
}

#[cfg(test)]
mod tests {
    use super::{
        corner_orientation_coordinate, corner_permutation_coordinate_from_permutation,
        corner_permutation_from_coordinate, cubie_state_from_corner_orientation_coordinate,
        cubie_state_from_edge_orientation_coordinate, edge_orientation_coordinate,
        slice_edge_permutation_coordinate_from_permutation, slice_edge_permutation_from_coordinate,
        ud_edge_permutation_coordinate_from_permutation, ud_edge_permutation_from_coordinate,
        ud_slice_edge_combination_coordinate, ud_slice_edge_combination_coordinate_from_membership,
        ud_slice_edge_combination_membership_from_coordinate, CornerOrientationCoordinateError,
        CornerPermutationCoordinateError, EdgeOrientationCoordinateError,
        SliceEdgePermutationCoordinateError, UdEdgePermutationCoordinateError,
        UdSliceEdgeCombinationCoordinateError, CORNER_ORIENTATION_COORDINATE_COUNT,
        CORNER_PERMUTATION_COORDINATE_COUNT, EDGE_ORIENTATION_COORDINATE_COUNT,
        SLICE_EDGE_PERMUTATION_COORDINATE_COUNT, SLICE_EDGE_PERMUTATION_EDGES,
        UD_EDGE_PERMUTATION_COORDINATE_COUNT, UD_EDGE_PERMUTATION_EDGES, UD_SLICE_EDGES,
        UD_SLICE_EDGE_COMBINATION_COORDINATE_COUNT,
    };
    use crate::cube::cubies::{Corner, Edge, CORNER_COUNT, EDGE_COUNT};
    use crate::cube::{Cube, CubieState, Move};

    #[test]
    fn corner_orientation_coordinate_has_explicit_range() {
        assert_eq!(CORNER_ORIENTATION_COORDINATE_COUNT, 2187);
    }

    #[test]
    fn corner_permutation_coordinate_has_explicit_range() {
        assert_eq!(CORNER_PERMUTATION_COORDINATE_COUNT, 40320);
    }

    #[test]
    fn edge_orientation_coordinate_has_explicit_range() {
        assert_eq!(EDGE_ORIENTATION_COORDINATE_COUNT, 2048);
    }

    #[test]
    fn ud_slice_edge_combination_coordinate_has_explicit_range() {
        assert_eq!(UD_SLICE_EDGE_COMBINATION_COORDINATE_COUNT, 495);
    }

    #[test]
    fn slice_edge_permutation_coordinate_has_explicit_range() {
        assert_eq!(SLICE_EDGE_PERMUTATION_COORDINATE_COUNT, 24);
    }

    #[test]
    fn ud_edge_permutation_coordinate_has_explicit_range() {
        assert_eq!(UD_EDGE_PERMUTATION_COORDINATE_COUNT, 40320);
    }

    #[test]
    fn ud_slice_edge_combination_documents_engine_slice_edges() {
        assert_eq!(UD_SLICE_EDGES, [Edge::Fr, Edge::Fl, Edge::Bl, Edge::Br]);
    }

    #[test]
    fn slice_edge_permutation_documents_engine_slice_edges() {
        assert_eq!(
            SLICE_EDGE_PERMUTATION_EDGES,
            [Edge::Fr, Edge::Fl, Edge::Bl, Edge::Br]
        );
    }

    #[test]
    fn ud_edge_permutation_documents_engine_ud_edges() {
        assert_eq!(
            UD_EDGE_PERMUTATION_EDGES,
            [
                Edge::Ur,
                Edge::Uf,
                Edge::Ul,
                Edge::Ub,
                Edge::Dr,
                Edge::Df,
                Edge::Dl,
                Edge::Db,
            ]
        );
    }

    #[test]
    fn solved_corner_orientation_coordinate_round_trips() {
        let state = CubieState::solved();

        assert_eq!(corner_orientation_coordinate(&state), Ok(0));
        assert_eq!(
            cubie_state_from_corner_orientation_coordinate(0),
            Ok(CubieState::solved())
        );
    }

    #[test]
    fn solved_corner_permutation_coordinate_round_trips() {
        assert_eq!(
            corner_permutation_coordinate_from_permutation(&Corner::ALL),
            Ok(0)
        );
        assert_eq!(corner_permutation_from_coordinate(0), Ok(Corner::ALL));
    }

    #[test]
    fn solved_edge_orientation_coordinate_round_trips() {
        let state = CubieState::solved();

        assert_eq!(edge_orientation_coordinate(&state), Ok(0));
        assert_eq!(
            cubie_state_from_edge_orientation_coordinate(0),
            Ok(CubieState::solved())
        );
    }

    #[test]
    fn solved_ud_slice_edge_combination_coordinate_round_trips_membership() {
        let state = CubieState::solved();
        let membership = ud_slice_edge_combination_membership_from_coordinate(0)
            .expect("solved UD-slice coordinate should unrank");
        let expected_membership = membership_from_positions(&[8, 9, 10, 11]);

        assert_eq!(ud_slice_edge_combination_coordinate(&state), Ok(0));
        assert_eq!(membership, expected_membership);
        assert_eq!(
            ud_slice_edge_combination_coordinate_from_membership(&membership),
            Ok(0)
        );
    }

    #[test]
    fn solved_slice_edge_permutation_coordinate_round_trips() {
        let state = CubieState::solved();

        assert_eq!(
            slice_edge_permutation_coordinate_from_permutation(&state.edge_permutation),
            Ok(0)
        );
        assert_eq!(
            slice_edge_permutation_from_coordinate(0),
            Ok([Edge::Fr, Edge::Fl, Edge::Bl, Edge::Br])
        );
    }

    #[test]
    fn solved_ud_edge_permutation_coordinate_round_trips() {
        let state = CubieState::solved();

        assert_eq!(
            ud_edge_permutation_coordinate_from_permutation(&state.edge_permutation),
            Ok(0)
        );
        assert_eq!(
            ud_edge_permutation_from_coordinate(0),
            Ok([
                Edge::Ur,
                Edge::Uf,
                Edge::Ul,
                Edge::Ub,
                Edge::Dr,
                Edge::Df,
                Edge::Dl,
                Edge::Db,
            ])
        );
    }

    #[test]
    fn front_turn_corner_orientation_coordinate_round_trips() {
        let mut cube = Cube::solved();
        cube.apply_move(Move::F);

        let coordinate = corner_orientation_coordinate(cube.state());

        assert_eq!(coordinate, Ok(1236));

        let reconstructed = cubie_state_from_corner_orientation_coordinate(
            coordinate.expect("front-turn coordinate should be valid"),
        )
        .expect("front-turn coordinate should reconstruct");

        assert_eq!(
            reconstructed.corner_orientation,
            cube.state().corner_orientation
        );
        assert!(reconstructed.is_valid());
    }

    #[test]
    fn front_turn_corner_permutation_coordinate_round_trips() {
        let mut cube = Cube::solved();
        cube.apply_move(Move::F);

        let expected_permutation = [
            Corner::Ufl,
            Corner::Dlf,
            Corner::Ulb,
            Corner::Ubr,
            Corner::Urf,
            Corner::Dfr,
            Corner::Dbl,
            Corner::Drb,
        ];
        let coordinate =
            corner_permutation_coordinate_from_permutation(&cube.state().corner_permutation);

        assert_eq!(cube.state().corner_permutation, expected_permutation);
        assert_eq!(coordinate, Ok(8064));

        let reconstructed: [Corner; CORNER_COUNT] = corner_permutation_from_coordinate(
            coordinate.expect("front-turn corner-permutation coordinate should be valid"),
        )
        .expect("front-turn corner-permutation coordinate should unrank");

        assert_eq!(reconstructed, expected_permutation);
        assert_eq!(
            corner_permutation_coordinate_from_permutation(&reconstructed),
            Ok(8064)
        );
    }

    #[test]
    fn front_turn_edge_orientation_coordinate_round_trips() {
        let mut cube = Cube::solved();
        cube.apply_move(Move::F);

        let coordinate = edge_orientation_coordinate(cube.state());

        assert_eq!(coordinate, Ok(550));

        let reconstructed = cubie_state_from_edge_orientation_coordinate(
            coordinate.expect("front-turn coordinate should be valid"),
        )
        .expect("front-turn coordinate should reconstruct");

        assert_eq!(
            reconstructed.edge_orientation,
            cube.state().edge_orientation
        );
        assert_eq!(edge_orientation_coordinate(&reconstructed), Ok(550));
        assert!(reconstructed.is_valid());
    }

    #[test]
    fn front_turn_ud_slice_edge_combination_coordinate_round_trips_membership() {
        let mut cube = Cube::solved();
        cube.apply_move(Move::F);

        let coordinate = ud_slice_edge_combination_coordinate(cube.state());
        let expected_membership = membership_from_positions(&[1, 5, 10, 11]);

        assert_eq!(coordinate, Ok(230));

        let membership = ud_slice_edge_combination_membership_from_coordinate(
            coordinate.expect("front-turn UD-slice coordinate should be valid"),
        )
        .expect("front-turn UD-slice coordinate should unrank");

        assert_eq!(membership, expected_membership);
        assert_eq!(
            ud_slice_edge_combination_coordinate_from_membership(&membership),
            Ok(230)
        );
    }

    #[test]
    fn front_half_turn_slice_edge_permutation_coordinate_round_trips() {
        let mut cube = Cube::solved();
        cube.apply_move(Move::F2);

        let coordinate =
            slice_edge_permutation_coordinate_from_permutation(&cube.state().edge_permutation)
                .expect("F2 slice-edge permutation coordinate should rank");

        assert_ne!(coordinate, 0);

        let reconstructed = slice_edge_permutation_from_coordinate(coordinate)
            .expect("F2 slice-edge permutation coordinate should unrank");

        assert_eq!(
            reconstructed,
            slice_edges_from_permutation(&cube.state().edge_permutation)
        );
        assert_eq!(
            slice_edge_permutation_coordinate_from_permutation(&permutation_with_slice_edges(
                reconstructed,
            )),
            Ok(coordinate)
        );
    }

    #[test]
    fn upper_turn_ud_edge_permutation_coordinate_round_trips() {
        let mut cube = Cube::solved();
        cube.apply_move(Move::U);

        let coordinate =
            ud_edge_permutation_coordinate_from_permutation(&cube.state().edge_permutation)
                .expect("U turn U/D-edge permutation coordinate should rank");

        assert_ne!(coordinate, 0);

        let reconstructed = ud_edge_permutation_from_coordinate(coordinate)
            .expect("U turn U/D-edge permutation coordinate should unrank");

        assert_eq!(
            reconstructed,
            ud_edges_from_permutation(&cube.state().edge_permutation)
        );
        assert_eq!(
            ud_edge_permutation_coordinate_from_permutation(&permutation_with_ud_edges(
                reconstructed,
            )),
            Ok(coordinate)
        );
    }

    #[test]
    fn rejects_out_of_range_corner_orientation_coordinate() {
        assert_eq!(
            cubie_state_from_corner_orientation_coordinate(CORNER_ORIENTATION_COORDINATE_COUNT),
            Err(CornerOrientationCoordinateError::IndexOutOfRange {
                index: CORNER_ORIENTATION_COORDINATE_COUNT,
                coordinate_count: CORNER_ORIENTATION_COORDINATE_COUNT,
            })
        );
    }

    #[test]
    fn rejects_out_of_range_corner_permutation_coordinate() {
        assert_eq!(
            corner_permutation_from_coordinate(CORNER_PERMUTATION_COORDINATE_COUNT),
            Err(CornerPermutationCoordinateError::IndexOutOfRange {
                index: CORNER_PERMUTATION_COORDINATE_COUNT,
                coordinate_count: CORNER_PERMUTATION_COORDINATE_COUNT,
            })
        );
    }

    #[test]
    fn rejects_out_of_range_edge_orientation_coordinate() {
        assert_eq!(
            cubie_state_from_edge_orientation_coordinate(EDGE_ORIENTATION_COORDINATE_COUNT),
            Err(EdgeOrientationCoordinateError::IndexOutOfRange {
                index: EDGE_ORIENTATION_COORDINATE_COUNT,
                coordinate_count: EDGE_ORIENTATION_COORDINATE_COUNT,
            })
        );
    }

    #[test]
    fn rejects_out_of_range_ud_slice_edge_combination_coordinate() {
        assert_eq!(
            ud_slice_edge_combination_membership_from_coordinate(
                UD_SLICE_EDGE_COMBINATION_COORDINATE_COUNT
            ),
            Err(UdSliceEdgeCombinationCoordinateError::IndexOutOfRange {
                index: UD_SLICE_EDGE_COMBINATION_COORDINATE_COUNT,
                coordinate_count: UD_SLICE_EDGE_COMBINATION_COORDINATE_COUNT,
            })
        );
    }

    #[test]
    fn rejects_out_of_range_slice_edge_permutation_coordinate() {
        assert_eq!(
            slice_edge_permutation_from_coordinate(SLICE_EDGE_PERMUTATION_COORDINATE_COUNT),
            Err(SliceEdgePermutationCoordinateError::IndexOutOfRange {
                index: SLICE_EDGE_PERMUTATION_COORDINATE_COUNT,
                coordinate_count: SLICE_EDGE_PERMUTATION_COORDINATE_COUNT,
            })
        );
    }

    #[test]
    fn rejects_out_of_range_ud_edge_permutation_coordinate() {
        assert_eq!(
            ud_edge_permutation_from_coordinate(UD_EDGE_PERMUTATION_COORDINATE_COUNT),
            Err(UdEdgePermutationCoordinateError::IndexOutOfRange {
                index: UD_EDGE_PERMUTATION_COORDINATE_COUNT,
                coordinate_count: UD_EDGE_PERMUTATION_COORDINATE_COUNT,
            })
        );
    }

    #[test]
    fn highest_corner_orientation_coordinate_reconstructs_valid_state() {
        let state =
            cubie_state_from_corner_orientation_coordinate(CORNER_ORIENTATION_COORDINATE_COUNT - 1)
                .expect("highest coordinate should reconstruct");

        assert_eq!(state.corner_orientation, [2, 2, 2, 2, 2, 2, 2, 1]);
        assert!(state.is_valid());
    }

    #[test]
    fn highest_edge_orientation_coordinate_reconstructs_valid_state() {
        let state =
            cubie_state_from_edge_orientation_coordinate(EDGE_ORIENTATION_COORDINATE_COUNT - 1)
                .expect("highest coordinate should reconstruct");

        assert_eq!(state.edge_orientation, [1; 12]);
        assert!(state.is_valid());
    }

    #[test]
    fn rejects_invalid_corner_orientation_before_indexing() {
        let mut state = CubieState::solved();
        state.corner_orientation[0] = 3;

        assert_eq!(
            corner_orientation_coordinate(&state),
            Err(CornerOrientationCoordinateError::InvalidCornerOrientation {
                position: 0,
                orientation: 3,
            })
        );
    }

    #[test]
    fn rejects_invalid_edge_orientation_before_indexing() {
        let mut state = CubieState::solved();
        state.edge_orientation[0] = 2;

        assert_eq!(
            edge_orientation_coordinate(&state),
            Err(EdgeOrientationCoordinateError::InvalidEdgeOrientation {
                position: 0,
                orientation: 2,
            })
        );
    }

    #[test]
    fn rejects_invalid_edge_orientation_sum_before_indexing() {
        let mut state = CubieState::solved();
        state.edge_orientation[0] = 1;

        assert_eq!(
            edge_orientation_coordinate(&state),
            Err(EdgeOrientationCoordinateError::InvalidEdgeOrientationSum { sum: 1 })
        );
    }

    #[test]
    fn rejects_invalid_corner_permutation_before_indexing() {
        let mut permutation = Corner::ALL;
        permutation[0] = Corner::Ufl;

        assert_eq!(
            corner_permutation_coordinate_from_permutation(&permutation),
            Err(CornerPermutationCoordinateError::InvalidCornerPermutation {
                duplicate: Some(Corner::Ufl),
                missing: Some(Corner::Urf),
            })
        );
    }

    #[test]
    fn rejects_duplicate_slice_edge_permutation_before_indexing() {
        let mut permutation = Edge::ALL;
        permutation[9] = Edge::Fr;

        assert_eq!(
            slice_edge_permutation_coordinate_from_permutation(&permutation),
            Err(
                SliceEdgePermutationCoordinateError::InvalidSliceEdgePermutation {
                    duplicate: Some(Edge::Fr),
                    missing: Some(Edge::Fl),
                    wrong_set: None,
                    wrong_position: None,
                }
            )
        );
    }

    #[test]
    fn rejects_missing_slice_edge_permutation_before_indexing() {
        let mut permutation = Edge::ALL;
        permutation[8] = Edge::Ur;

        assert_eq!(
            slice_edge_permutation_coordinate_from_permutation(&permutation),
            Err(
                SliceEdgePermutationCoordinateError::InvalidSliceEdgePermutation {
                    duplicate: None,
                    missing: Some(Edge::Fr),
                    wrong_set: Some((8, Edge::Ur)),
                    wrong_position: None,
                }
            )
        );
    }

    #[test]
    fn rejects_wrong_set_and_wrong_position_slice_edge_permutation_before_indexing() {
        let mut permutation = Edge::ALL;
        permutation[0] = Edge::Fr;
        permutation[8] = Edge::Ur;

        assert_eq!(
            slice_edge_permutation_coordinate_from_permutation(&permutation),
            Err(
                SliceEdgePermutationCoordinateError::InvalidSliceEdgePermutation {
                    duplicate: None,
                    missing: None,
                    wrong_set: Some((8, Edge::Ur)),
                    wrong_position: Some((0, Edge::Fr)),
                }
            )
        );
    }

    #[test]
    fn rejects_duplicate_ud_edge_permutation_before_indexing() {
        let mut permutation = Edge::ALL;
        permutation[1] = Edge::Ur;

        assert_eq!(
            ud_edge_permutation_coordinate_from_permutation(&permutation),
            Err(UdEdgePermutationCoordinateError::InvalidUdEdgePermutation {
                duplicate: Some(Edge::Ur),
                missing: Some(Edge::Uf),
                wrong_set: None,
                wrong_position: None,
            })
        );
    }

    #[test]
    fn rejects_missing_ud_edge_permutation_before_indexing() {
        let mut permutation = Edge::ALL;
        permutation[0] = Edge::Fr;

        assert_eq!(
            ud_edge_permutation_coordinate_from_permutation(&permutation),
            Err(UdEdgePermutationCoordinateError::InvalidUdEdgePermutation {
                duplicate: None,
                missing: Some(Edge::Ur),
                wrong_set: Some((0, Edge::Fr)),
                wrong_position: None,
            })
        );
    }

    #[test]
    fn rejects_wrong_set_and_wrong_position_ud_edge_permutation_before_indexing() {
        let mut permutation = Edge::ALL;
        permutation[0] = Edge::Fr;
        permutation[8] = Edge::Ur;

        assert_eq!(
            ud_edge_permutation_coordinate_from_permutation(&permutation),
            Err(UdEdgePermutationCoordinateError::InvalidUdEdgePermutation {
                duplicate: None,
                missing: None,
                wrong_set: Some((0, Edge::Fr)),
                wrong_position: Some((8, Edge::Ur)),
            })
        );
    }

    #[test]
    fn rejects_invalid_ud_slice_edge_count_before_indexing() {
        let mut state = CubieState::solved();
        state.edge_permutation[8] = Edge::Ur;

        assert_eq!(
            ud_slice_edge_combination_coordinate(&state),
            Err(
                UdSliceEdgeCombinationCoordinateError::InvalidSliceEdgeCount {
                    count: 3,
                    expected: 4,
                }
            )
        );
    }

    #[test]
    fn ud_slice_edge_combination_coordinate_tracks_membership_only() {
        let mut state = CubieState::solved();
        state.edge_permutation[1] = Edge::Ur;

        assert!(!state.is_valid());
        assert_eq!(ud_slice_edge_combination_coordinate(&state), Ok(0));
    }

    fn slice_edges_from_permutation(permutation: &[Edge; EDGE_COUNT]) -> [Edge; 4] {
        [
            permutation[8],
            permutation[9],
            permutation[10],
            permutation[11],
        ]
    }

    fn ud_edges_from_permutation(permutation: &[Edge; EDGE_COUNT]) -> [Edge; 8] {
        [
            permutation[0],
            permutation[1],
            permutation[2],
            permutation[3],
            permutation[4],
            permutation[5],
            permutation[6],
            permutation[7],
        ]
    }

    fn permutation_with_slice_edges(slice_edges: [Edge; 4]) -> [Edge; EDGE_COUNT] {
        let mut permutation = Edge::ALL;

        permutation[8] = slice_edges[0];
        permutation[9] = slice_edges[1];
        permutation[10] = slice_edges[2];
        permutation[11] = slice_edges[3];

        permutation
    }

    fn permutation_with_ud_edges(ud_edges: [Edge; 8]) -> [Edge; EDGE_COUNT] {
        let mut permutation = Edge::ALL;

        permutation[0] = ud_edges[0];
        permutation[1] = ud_edges[1];
        permutation[2] = ud_edges[2];
        permutation[3] = ud_edges[3];
        permutation[4] = ud_edges[4];
        permutation[5] = ud_edges[5];
        permutation[6] = ud_edges[6];
        permutation[7] = ud_edges[7];

        permutation
    }

    fn membership_from_positions(positions: &[usize]) -> [bool; EDGE_COUNT] {
        let mut membership = [false; EDGE_COUNT];

        for position in positions {
            membership[*position] = true;
        }

        membership
    }
}
