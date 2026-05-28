use crate::cube::cubies::{Edge, EDGE_COUNT};

use super::errors::{SliceEdgePermutationCoordinateError, UdEdgePermutationCoordinateError};
use super::permutation::{
    edge_permutation_rank, edge_permutation_unrank, validate_edge_permutation_subset,
};
use super::{
    SLICE_EDGE_PERMUTATION_COORDINATE_COUNT, SLICE_EDGE_PERMUTATION_EDGES,
    SLICE_EDGE_PERMUTATION_EDGE_COUNT, SLICE_EDGE_PERMUTATION_POSITIONS,
    UD_EDGE_PERMUTATION_COORDINATE_COUNT, UD_EDGE_PERMUTATION_EDGES,
    UD_EDGE_PERMUTATION_EDGE_COUNT, UD_EDGE_PERMUTATION_POSITIONS,
};

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

    edge_permutation_unrank(index, &SLICE_EDGE_PERMUTATION_EDGES).ok_or(
        SliceEdgePermutationCoordinateError::IndexOutOfRange {
            index,
            coordinate_count: SLICE_EDGE_PERMUTATION_COORDINATE_COUNT,
        },
    )
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

    edge_permutation_unrank(index, &UD_EDGE_PERMUTATION_EDGES).ok_or(
        UdEdgePermutationCoordinateError::IndexOutOfRange {
            index,
            coordinate_count: UD_EDGE_PERMUTATION_COORDINATE_COUNT,
        },
    )
}
