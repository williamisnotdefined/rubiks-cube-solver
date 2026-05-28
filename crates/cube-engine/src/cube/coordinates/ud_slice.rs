use crate::cube::cubies::{CubieState, Edge, EDGE_COUNT};

use super::combinatorics::binomial;
use super::errors::UdSliceEdgeCombinationCoordinateError;
use super::{UD_SLICE_EDGES, UD_SLICE_EDGE_COMBINATION_COORDINATE_COUNT, UD_SLICE_EDGE_COUNT};

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

fn is_ud_slice_edge(edge: Edge) -> bool {
    UD_SLICE_EDGES.contains(&edge)
}
