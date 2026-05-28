use crate::cube::moves::{Axis, Face, Move, Turn, FACE_MOVES};

use super::constants::{PHASE1_MOVE_COUNT, PHASE2_MOVES, PHASE2_MOVE_COUNT};
use super::coordinates::{Phase1Coordinates, Phase2Coordinates};
use super::ordering::MoveOrderingProfile;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(super) struct Phase1Candidate {
    pub(super) move_index: usize,
    pub(super) move_: Move,
    pub(super) coordinates: Phase1Coordinates,
    pub(super) heuristic: usize,
    pub(super) estimated_total: usize,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(super) struct Phase2Candidate {
    pub(super) move_index: usize,
    pub(super) move_: Move,
    pub(super) coordinates: Phase2Coordinates,
    pub(super) heuristic: usize,
    pub(super) estimated_total: usize,
}

pub(super) fn phase1_candidate_moves(
    last_move: Option<Move>,
) -> impl Iterator<Item = (usize, Move)> {
    FACE_MOVES
        .into_iter()
        .enumerate()
        .filter(move |(_, move_)| !should_skip_move(last_move, *move_))
}

#[cfg(test)]
pub(super) fn sort_phase1_candidates(candidates: &mut [Phase1Candidate]) {
    sort_phase1_candidates_with_profile(candidates, MoveOrderingProfile::Default);
}

pub(super) fn sort_phase1_candidates_with_profile(
    candidates: &mut [Phase1Candidate],
    profile: MoveOrderingProfile,
) {
    candidates.sort_by_key(|candidate| phase1_sort_key(*candidate, profile));
}

fn phase1_sort_key(
    candidate: Phase1Candidate,
    profile: MoveOrderingProfile,
) -> (usize, usize, usize, usize) {
    candidate_sort_key(
        candidate.estimated_total,
        candidate.heuristic,
        candidate.move_index,
        candidate.move_,
        PHASE1_MOVE_COUNT,
        profile,
    )
}

pub(super) fn phase2_candidate_moves(
    last_move: Option<Move>,
) -> impl Iterator<Item = (usize, Move)> {
    PHASE2_MOVES
        .into_iter()
        .enumerate()
        .filter(move |(_, move_)| !should_skip_move(last_move, *move_))
}

#[cfg(test)]
pub(super) fn sort_phase2_candidates(candidates: &mut [Phase2Candidate]) {
    sort_phase2_candidates_with_profile(candidates, MoveOrderingProfile::Default);
}

pub(super) fn sort_phase2_candidates_with_profile(
    candidates: &mut [Phase2Candidate],
    profile: MoveOrderingProfile,
) {
    candidates.sort_by_key(|candidate| phase2_sort_key(*candidate, profile));
}

fn phase2_sort_key(
    candidate: Phase2Candidate,
    profile: MoveOrderingProfile,
) -> (usize, usize, usize, usize) {
    candidate_sort_key(
        candidate.estimated_total,
        candidate.heuristic,
        candidate.move_index,
        candidate.move_,
        PHASE2_MOVE_COUNT,
        profile,
    )
}

fn candidate_sort_key(
    estimated_total: usize,
    heuristic: usize,
    move_index: usize,
    move_: Move,
    move_count: usize,
    profile: MoveOrderingProfile,
) -> (usize, usize, usize, usize) {
    match profile {
        MoveOrderingProfile::Default => (estimated_total, heuristic, move_index, 0),
        MoveOrderingProfile::Reverse => (
            estimated_total,
            heuristic,
            move_count.saturating_sub(1).saturating_sub(move_index),
            0,
        ),
        MoveOrderingProfile::HalfTurnsFirst => {
            (estimated_total, turn_priority(move_), heuristic, move_index)
        }
        MoveOrderingProfile::AxisZFirst => (
            estimated_total,
            axis_priority(move_, [Axis::Z, Axis::Y, Axis::X]),
            heuristic,
            move_index,
        ),
        MoveOrderingProfile::AxisXFirst => (
            estimated_total,
            axis_priority(move_, [Axis::X, Axis::Z, Axis::Y]),
            heuristic,
            move_index,
        ),
    }
}

fn turn_priority(move_: Move) -> usize {
    match move_.turn() {
        Turn::Half => 0,
        Turn::Clockwise => 1,
        Turn::CounterClockwise => 2,
    }
}

fn axis_priority(move_: Move, ordered_axes: [Axis; 3]) -> usize {
    ordered_axes
        .into_iter()
        .position(|axis| axis == move_.axis())
        .unwrap_or(ordered_axes.len())
}

pub(super) fn should_skip_move(last_move: Option<Move>, next_move: Move) -> bool {
    last_move.is_some_and(|last_move| {
        let last_face = last_move.face();
        let next_face = next_move.face();

        last_face == next_face
            || (last_face.axis() == next_face.axis()
                && canonical_face_order(last_face) > canonical_face_order(next_face))
    })
}

fn canonical_face_order(face: Face) -> u8 {
    match face {
        Face::U | Face::L | Face::F => 0,
        Face::D | Face::R | Face::B => 1,
    }
}
