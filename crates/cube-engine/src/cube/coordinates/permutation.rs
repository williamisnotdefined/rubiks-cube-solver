use crate::cube::cubies::{Edge, EDGE_COUNT};

use super::combinatorics::factorial;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(super) struct EdgePermutationSubsetValidationError {
    pub(super) duplicate: Option<Edge>,
    pub(super) missing: Option<Edge>,
    pub(super) wrong_set: Option<(usize, Edge)>,
    pub(super) wrong_position: Option<(usize, Edge)>,
}

pub(super) fn validate_edge_permutation_subset<const N: usize>(
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

pub(super) fn edge_permutation_rank<const N: usize>(
    permutation: &[Edge; N],
    ordered_edges: &[Edge; N],
) -> usize {
    let mut available = [true; N];
    let mut index = 0;

    for (position, edge) in permutation.iter().copied().enumerate() {
        let Some(edge_order) = edge_order_in_set(edge, ordered_edges) else {
            return 0;
        };
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

pub(super) fn edge_permutation_unrank<const N: usize>(
    index: usize,
    ordered_edges: &[Edge; N],
) -> Option<[Edge; N]> {
    let mut remaining = index;
    let mut available = [true; N];
    let mut permutation = *ordered_edges;

    for (position, slot) in permutation.iter_mut().enumerate() {
        let factor = factorial(N - 1 - position);
        let selected_index = remaining / factor;
        remaining %= factor;

        let (edge_order, edge) = nth_available_edge(ordered_edges, &available, selected_index)?;
        available[edge_order] = false;
        *slot = edge;
    }

    Some(permutation)
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
