use crate::cube::cubies::{Corner, CORNER_COUNT};

use super::combinatorics::factorial;
use super::errors::CornerPermutationCoordinateError;
use super::CORNER_PERMUTATION_COORDINATE_COUNT;

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

        let Some(corner) = nth_available_corner(&available, selected_index) else {
            return Err(CornerPermutationCoordinateError::IndexOutOfRange {
                index,
                coordinate_count: CORNER_PERMUTATION_COORDINATE_COUNT,
            });
        };
        available[corner.index()] = false;
        *slot = corner;
    }

    Ok(permutation)
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
