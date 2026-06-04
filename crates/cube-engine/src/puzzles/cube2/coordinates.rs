use std::fmt;

use super::cubies::{Cube2Corner, Cube2State, CUBE2_CORNER_COUNT};

pub const CUBE2_CORNER_ORIENTATION_COORDINATE_COUNT: usize = 2187;
pub const CUBE2_CORNER_PERMUTATION_COORDINATE_COUNT: usize = 40320;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Cube2CornerOrientationCoordinateError {
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

impl fmt::Display for Cube2CornerOrientationCoordinateError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::IndexOutOfRange {
                index,
                coordinate_count,
            } => write!(
                formatter,
                "2x2 corner-orientation coordinate {index} is outside 0..{coordinate_count}"
            ),
            Self::InvalidCornerOrientation {
                position,
                orientation,
            } => write!(
                formatter,
                "invalid 2x2 corner orientation at position {position}: {orientation}"
            ),
            Self::InvalidCornerOrientationSum { sum } => {
                write!(formatter, "invalid 2x2 corner orientation sum: {sum}")
            }
        }
    }
}

impl std::error::Error for Cube2CornerOrientationCoordinateError {}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Cube2CornerPermutationCoordinateError {
    IndexOutOfRange {
        index: usize,
        coordinate_count: usize,
    },
    InvalidCornerPermutation {
        duplicate: Option<Cube2Corner>,
        missing: Option<Cube2Corner>,
    },
}

impl fmt::Display for Cube2CornerPermutationCoordinateError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::IndexOutOfRange {
                index,
                coordinate_count,
            } => write!(
                formatter,
                "2x2 corner-permutation coordinate {index} is outside 0..{coordinate_count}"
            ),
            Self::InvalidCornerPermutation { duplicate, missing } => write!(
                formatter,
                "invalid 2x2 corner permutation: duplicate {duplicate:?}, missing {missing:?}"
            ),
        }
    }
}

impl std::error::Error for Cube2CornerPermutationCoordinateError {}

pub fn cube2_corner_orientation_coordinate(
    state: &Cube2State,
) -> Result<usize, Cube2CornerOrientationCoordinateError> {
    validate_corner_orientation(&state.corner_orientation)?;

    let mut index = 0;
    for orientation in state
        .corner_orientation
        .iter()
        .copied()
        .take(CUBE2_CORNER_COUNT - 1)
    {
        index = index * 3 + usize::from(orientation);
    }

    Ok(index)
}

pub fn cube2_state_from_corner_orientation_coordinate(
    index: usize,
) -> Result<Cube2State, Cube2CornerOrientationCoordinateError> {
    if index >= CUBE2_CORNER_ORIENTATION_COORDINATE_COUNT {
        return Err(Cube2CornerOrientationCoordinateError::IndexOutOfRange {
            index,
            coordinate_count: CUBE2_CORNER_ORIENTATION_COORDINATE_COUNT,
        });
    }

    let mut remaining = index;
    let mut corner_orientation = [0_u8; CUBE2_CORNER_COUNT];
    let mut sum = 0_u16;

    for position in (0..CUBE2_CORNER_COUNT - 1).rev() {
        let orientation = (remaining % 3) as u8;
        corner_orientation[position] = orientation;
        sum += u16::from(orientation);
        remaining /= 3;
    }

    corner_orientation[CUBE2_CORNER_COUNT - 1] = ((3 - (sum % 3)) % 3) as u8;

    let mut state = Cube2State::solved();
    state.corner_orientation = corner_orientation;

    Ok(state)
}

pub fn cube2_corner_permutation_coordinate(
    state: &Cube2State,
) -> Result<usize, Cube2CornerPermutationCoordinateError> {
    validate_corner_permutation(&state.corner_permutation)?;

    let mut available = [true; CUBE2_CORNER_COUNT];
    let mut index = 0;

    for (position, corner) in state.corner_permutation.iter().copied().enumerate() {
        let corner_order = corner.index();
        let smaller_available_count = available
            .iter()
            .take(corner_order)
            .filter(|available| **available)
            .count();

        index += smaller_available_count * factorial(CUBE2_CORNER_COUNT - 1 - position);
        available[corner_order] = false;
    }

    Ok(index)
}

pub fn cube2_state_from_corner_permutation_coordinate(
    index: usize,
) -> Result<Cube2State, Cube2CornerPermutationCoordinateError> {
    if index >= CUBE2_CORNER_PERMUTATION_COORDINATE_COUNT {
        return Err(Cube2CornerPermutationCoordinateError::IndexOutOfRange {
            index,
            coordinate_count: CUBE2_CORNER_PERMUTATION_COORDINATE_COUNT,
        });
    }

    let mut remaining = index;
    let mut available = [true; CUBE2_CORNER_COUNT];
    let mut corner_permutation = Cube2Corner::ALL;

    for (position, slot) in corner_permutation.iter_mut().enumerate() {
        let factor = factorial(CUBE2_CORNER_COUNT - 1 - position);
        let selected_index = remaining / factor;
        remaining %= factor;

        let (corner_order, corner) = nth_available_corner(&available, selected_index)
            .expect("2x2 corner-permutation coordinate below 8! must select an available corner");
        available[corner_order] = false;
        *slot = corner;
    }

    let mut state = Cube2State::solved();
    state.corner_permutation = corner_permutation;

    Ok(state)
}

fn validate_corner_orientation(
    orientations: &[u8; CUBE2_CORNER_COUNT],
) -> Result<(), Cube2CornerOrientationCoordinateError> {
    let mut sum = 0_u16;

    for (position, orientation) in orientations.iter().copied().enumerate() {
        if orientation > 2 {
            return Err(
                Cube2CornerOrientationCoordinateError::InvalidCornerOrientation {
                    position,
                    orientation,
                },
            );
        }

        sum += u16::from(orientation);
    }

    if !sum.is_multiple_of(3) {
        return Err(Cube2CornerOrientationCoordinateError::InvalidCornerOrientationSum { sum });
    }

    Ok(())
}

fn validate_corner_permutation(
    permutation: &[Cube2Corner; CUBE2_CORNER_COUNT],
) -> Result<(), Cube2CornerPermutationCoordinateError> {
    let mut counts = [0_u8; CUBE2_CORNER_COUNT];

    for corner in permutation {
        counts[corner.index()] += 1;
    }

    let duplicate = Cube2Corner::ALL
        .iter()
        .copied()
        .find(|corner| counts[corner.index()] > 1);
    let missing = Cube2Corner::ALL
        .iter()
        .copied()
        .find(|corner| counts[corner.index()] == 0);

    if duplicate.is_some() || missing.is_some() {
        return Err(
            Cube2CornerPermutationCoordinateError::InvalidCornerPermutation { duplicate, missing },
        );
    }

    Ok(())
}

const fn factorial(value: usize) -> usize {
    let mut result = 1;
    let mut factor = 2;

    while factor <= value {
        result *= factor;
        factor += 1;
    }

    result
}

fn nth_available_corner(
    available: &[bool; CUBE2_CORNER_COUNT],
    selected_index: usize,
) -> Option<(usize, Cube2Corner)> {
    let mut seen = 0;

    for (corner_order, corner) in Cube2Corner::ALL.iter().copied().enumerate() {
        if !available[corner_order] {
            continue;
        }

        if seen == selected_index {
            return Some((corner_order, corner));
        }

        seen += 1;
    }

    None
}

#[cfg(test)]
mod tests {
    use super::{
        cube2_corner_orientation_coordinate, cube2_corner_permutation_coordinate,
        cube2_state_from_corner_orientation_coordinate,
        cube2_state_from_corner_permutation_coordinate, Cube2CornerOrientationCoordinateError,
        Cube2CornerPermutationCoordinateError, CUBE2_CORNER_ORIENTATION_COORDINATE_COUNT,
        CUBE2_CORNER_PERMUTATION_COORDINATE_COUNT,
    };
    use crate::puzzles::cube2::{Cube2, Cube2Algorithm, Cube2Corner, Cube2State};

    #[test]
    fn solved_coordinates_are_zero() {
        let state = Cube2State::solved();

        assert_eq!(cube2_corner_orientation_coordinate(&state), Ok(0));
        assert_eq!(cube2_corner_permutation_coordinate(&state), Ok(0));
    }

    #[test]
    fn corner_orientation_coordinate_round_trips_scrambled_state() {
        let state = scrambled_state("R U F");
        let coordinate =
            cube2_corner_orientation_coordinate(&state).expect("orientation should index");
        let reconstructed = cube2_state_from_corner_orientation_coordinate(coordinate)
            .expect("orientation coordinate should reconstruct");

        assert_eq!(reconstructed.corner_orientation, state.corner_orientation);
        assert_eq!(
            cube2_corner_orientation_coordinate(&reconstructed),
            Ok(coordinate)
        );
    }

    #[test]
    fn corner_permutation_coordinate_round_trips_scrambled_state() {
        let state = scrambled_state("R U F");
        let coordinate =
            cube2_corner_permutation_coordinate(&state).expect("permutation should index");
        let reconstructed = cube2_state_from_corner_permutation_coordinate(coordinate)
            .expect("permutation coordinate should reconstruct");

        assert_eq!(reconstructed.corner_permutation, state.corner_permutation);
        assert_eq!(
            cube2_corner_permutation_coordinate(&reconstructed),
            Ok(coordinate)
        );
    }

    #[test]
    fn rejects_out_of_range_orientation_coordinate() {
        assert_eq!(
            cube2_state_from_corner_orientation_coordinate(
                CUBE2_CORNER_ORIENTATION_COORDINATE_COUNT
            ),
            Err(Cube2CornerOrientationCoordinateError::IndexOutOfRange {
                index: CUBE2_CORNER_ORIENTATION_COORDINATE_COUNT,
                coordinate_count: CUBE2_CORNER_ORIENTATION_COORDINATE_COUNT,
            })
        );
    }

    #[test]
    fn rejects_out_of_range_permutation_coordinate() {
        assert_eq!(
            cube2_state_from_corner_permutation_coordinate(
                CUBE2_CORNER_PERMUTATION_COORDINATE_COUNT
            ),
            Err(Cube2CornerPermutationCoordinateError::IndexOutOfRange {
                index: CUBE2_CORNER_PERMUTATION_COORDINATE_COUNT,
                coordinate_count: CUBE2_CORNER_PERMUTATION_COORDINATE_COUNT,
            })
        );
    }

    #[test]
    fn rejects_invalid_orientation_before_indexing() {
        let mut state = Cube2State::solved();
        state.corner_orientation[0] = 3;

        assert_eq!(
            cube2_corner_orientation_coordinate(&state),
            Err(
                Cube2CornerOrientationCoordinateError::InvalidCornerOrientation {
                    position: 0,
                    orientation: 3,
                }
            )
        );
    }

    #[test]
    fn rejects_invalid_orientation_sum_before_indexing() {
        let mut state = Cube2State::solved();
        state.corner_orientation[0] = 1;

        assert_eq!(
            cube2_corner_orientation_coordinate(&state),
            Err(Cube2CornerOrientationCoordinateError::InvalidCornerOrientationSum { sum: 1 })
        );
    }

    #[test]
    fn rejects_duplicate_permutation_before_indexing() {
        let mut state = Cube2State::solved();
        state.corner_permutation[1] = Cube2Corner::Urf;

        assert_eq!(
            cube2_corner_permutation_coordinate(&state),
            Err(
                Cube2CornerPermutationCoordinateError::InvalidCornerPermutation {
                    duplicate: Some(Cube2Corner::Urf),
                    missing: Some(Cube2Corner::Ufl),
                }
            )
        );
    }

    fn scrambled_state(algorithm: &str) -> Cube2State {
        let algorithm = Cube2Algorithm::parse(algorithm).expect("2x2 algorithm should parse");
        let mut cube = Cube2::solved();
        algorithm.apply_to(&mut cube);

        cube.state().clone()
    }
}
