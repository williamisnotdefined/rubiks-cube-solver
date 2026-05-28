use crate::cube::cubies::{CubieState, CORNER_COUNT, EDGE_COUNT};

use super::errors::{CornerOrientationCoordinateError, EdgeOrientationCoordinateError};
use super::{CORNER_ORIENTATION_COORDINATE_COUNT, EDGE_ORIENTATION_COORDINATE_COUNT};

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
