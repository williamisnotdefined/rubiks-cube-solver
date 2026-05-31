use crate::cube::cubies::{Corner, Edge, CORNER_COUNT, EDGE_COUNT};
use crate::cube::facelets::FACELET_COUNT;
use crate::cube::{
    CubieState, Facelet, FaceletString, CORNER_FACELET_MAPPINGS, EDGE_FACELET_MAPPINGS,
};

pub const SCAN_FACE_COUNT: usize = 6;
pub const SCAN_FACELET_COUNT: usize = FACELET_COUNT;
pub const SCAN_FACELET_SYMBOL_COUNT: usize = 6;
pub const SCAN_STICKERS_PER_FACE: usize = 9;

const CENTER_STICKER_INDEX: usize = 4;
const DEFAULT_PROBABILITY: f64 = 1.0 / SCAN_FACELET_SYMBOL_COUNT as f64;
const MIN_PROBABILITY: f64 = 1.0e-9;
const ROTATIONS: [u16; 4] = [0, 90, 180, 270];

pub type ScanFaceletProbabilities = [[f64; SCAN_FACELET_SYMBOL_COUNT]; SCAN_FACELET_COUNT];

#[derive(Clone, Debug, PartialEq)]
pub struct ScanInferenceInput {
    pub facelet_probabilities: ScanFaceletProbabilities,
    pub manual_overrides: Vec<ScanManualOverride>,
    pub face_rotation_priors: [Option<u16>; SCAN_FACE_COUNT],
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct ScanManualOverride {
    pub position: usize,
    pub facelet: Facelet,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct ScanInferenceOptions {
    pub min_candidate_margin: f64,
    pub low_sticker_probability: f64,
    pub low_confidence_stickers_per_face: usize,
    pub manual_probability_margin: f64,
    pub max_manual_target_stickers: usize,
    pub max_candidate_cost: f64,
    pub corner_beam_per_mask: usize,
    pub edge_beam_per_mask: usize,
    pub candidates_per_rotation: usize,
    pub max_rotation_combinations: usize,
}

impl Default for ScanInferenceOptions {
    fn default() -> Self {
        Self {
            min_candidate_margin: 1.2,
            low_sticker_probability: 0.45,
            low_confidence_stickers_per_face: 3,
            manual_probability_margin: 0.12,
            max_manual_target_stickers: 3,
            max_candidate_cost: 50.0,
            corner_beam_per_mask: 16,
            edge_beam_per_mask: 16,
            candidates_per_rotation: 8,
            max_rotation_combinations: 512,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ScanInferenceStatus {
    Accepted,
    NeedsRescanFace,
    NeedsManualConfirmation,
    StateAmbiguous,
    InvalidCubeState,
}

impl ScanInferenceStatus {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Accepted => "accepted",
            Self::NeedsRescanFace => "needs_rescan_face",
            Self::NeedsManualConfirmation => "needs_manual_confirmation",
            Self::StateAmbiguous => "state_ambiguous",
            Self::InvalidCubeState => "invalid_cube_state",
        }
    }
}

#[derive(Clone, Debug, PartialEq)]
pub struct ScanInferenceResult {
    pub status: ScanInferenceStatus,
    pub best_candidate: Option<ScanInferenceCandidate>,
    pub runner_up: Option<ScanInferenceCandidate>,
    pub margin: Option<f64>,
    pub state_confidence: f64,
    pub rescan_faces: Vec<Facelet>,
    pub manual_targets: Vec<ScanInferenceManualTarget>,
}

#[derive(Clone, Debug, PartialEq)]
pub struct ScanInferenceCandidate {
    pub state: CubieState,
    pub facelets: String,
    pub cost: f64,
    pub face_rotations: [u16; SCAN_FACE_COUNT],
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ScanInferenceManualTarget {
    pub face: Facelet,
    pub stickers: Vec<usize>,
}

#[derive(Clone, Copy, Debug)]
struct CornerPieceCandidate {
    corner: Corner,
    orientation: u8,
    cost: f64,
}

#[derive(Clone, Copy, Debug)]
struct EdgePieceCandidate {
    edge: Edge,
    orientation: u8,
    cost: f64,
}

#[derive(Clone, Debug)]
struct PartialCornerAssignment {
    mask: u16,
    permutation: [Corner; CORNER_COUNT],
    orientation: [u8; CORNER_COUNT],
    cost: f64,
}

#[derive(Clone, Debug)]
struct PartialEdgeAssignment {
    mask: u16,
    permutation: [Edge; EDGE_COUNT],
    orientation: [u8; EDGE_COUNT],
    cost: f64,
}

pub fn infer_scan(input: &ScanInferenceInput) -> ScanInferenceResult {
    let options = ScanInferenceOptions::default();
    infer_scan_with_options(input, &options)
}

pub fn infer_scan_with_options(
    input: &ScanInferenceInput,
    options: &ScanInferenceOptions,
) -> ScanInferenceResult {
    let normalized = normalize_scan_observations(input);
    let mut best_candidate = None;
    let mut runner_up = None;

    for rotations in face_rotation_hypotheses(input, options.max_rotation_combinations) {
        let rotated = apply_face_rotations(&normalized, rotations);
        for candidate in infer_candidates_for_rotation(&rotated, rotations, options) {
            consider_candidate(&mut best_candidate, &mut runner_up, candidate);
        }
    }

    let Some(best) = best_candidate.as_ref() else {
        let rescan_faces = low_confidence_faces_from_probabilities(&normalized, options);
        let status = if rescan_faces.is_empty() {
            ScanInferenceStatus::InvalidCubeState
        } else {
            ScanInferenceStatus::NeedsRescanFace
        };

        return ScanInferenceResult {
            status,
            best_candidate,
            runner_up,
            margin: None,
            state_confidence: 0.0,
            rescan_faces,
            manual_targets: Vec::new(),
        };
    };

    let best_rotated = apply_face_rotations(&normalized, best.face_rotations);
    let rescan_faces = low_confidence_faces_for_candidate(&best_rotated, best, options);
    let visual_manual_targets = manual_targets_for_candidate(&best_rotated, best, options);
    let margin = runner_up
        .as_ref()
        .map(|runner_up| runner_up.cost - best.cost);
    let state_confidence = margin.map_or(1.0, confidence_from_margin);

    if best.cost > options.max_candidate_cost {
        let evidence_rescan_faces = low_confidence_faces_from_probabilities(&normalized, options);
        let status = if evidence_rescan_faces.is_empty() {
            ScanInferenceStatus::InvalidCubeState
        } else {
            ScanInferenceStatus::NeedsRescanFace
        };

        return ScanInferenceResult {
            status,
            best_candidate,
            runner_up,
            margin,
            state_confidence: 0.0,
            rescan_faces: evidence_rescan_faces,
            manual_targets: Vec::new(),
        };
    }

    if !rescan_faces.is_empty() {
        return ScanInferenceResult {
            status: ScanInferenceStatus::NeedsRescanFace,
            best_candidate,
            runner_up,
            margin,
            state_confidence,
            rescan_faces,
            manual_targets: Vec::new(),
        };
    }

    let visual_manual_count = visual_manual_targets
        .iter()
        .map(|target| target.stickers.len())
        .sum::<usize>();
    if (1..=options.max_manual_target_stickers).contains(&visual_manual_count) {
        return ScanInferenceResult {
            status: ScanInferenceStatus::NeedsManualConfirmation,
            best_candidate,
            runner_up,
            margin,
            state_confidence,
            rescan_faces: Vec::new(),
            manual_targets: visual_manual_targets,
        };
    }

    if margin.is_some_and(|margin| margin < options.min_candidate_margin) {
        if let Some(runner_up) = runner_up.as_ref() {
            let runner_manual_targets = manual_targets_between_candidates(best, runner_up);
            let runner_manual_count = runner_manual_targets
                .iter()
                .map(|target| target.stickers.len())
                .sum::<usize>();

            if (1..=options.max_manual_target_stickers).contains(&runner_manual_count) {
                return ScanInferenceResult {
                    status: ScanInferenceStatus::NeedsManualConfirmation,
                    best_candidate,
                    runner_up: Some(runner_up.clone()),
                    margin,
                    state_confidence,
                    rescan_faces: Vec::new(),
                    manual_targets: runner_manual_targets,
                };
            }
        }

        return ScanInferenceResult {
            status: ScanInferenceStatus::StateAmbiguous,
            best_candidate,
            runner_up,
            margin,
            state_confidence,
            rescan_faces: Vec::new(),
            manual_targets: Vec::new(),
        };
    }

    ScanInferenceResult {
        status: ScanInferenceStatus::Accepted,
        best_candidate,
        runner_up,
        margin,
        state_confidence,
        rescan_faces: Vec::new(),
        manual_targets: Vec::new(),
    }
}

fn normalize_scan_observations(input: &ScanInferenceInput) -> ScanFaceletProbabilities {
    let mut probabilities = input.facelet_probabilities;

    for row in &mut probabilities {
        let mut sum = 0.0;
        for value in row.iter_mut() {
            if !value.is_finite() || *value < 0.0 {
                *value = 0.0;
            } else if *value > 1.0 {
                *value = 1.0;
            }
            sum += *value;
        }

        if sum <= 0.0 {
            *row = [DEFAULT_PROBABILITY; SCAN_FACELET_SYMBOL_COUNT];
        } else {
            for value in row {
                *value /= sum;
            }
        }
    }

    for (face_index, facelet) in Facelet::ALL.into_iter().enumerate() {
        probabilities[face_index * SCAN_STICKERS_PER_FACE + CENTER_STICKER_INDEX] =
            one_hot_probabilities(facelet);
    }

    for override_ in &input.manual_overrides {
        if override_.position < SCAN_FACELET_COUNT {
            probabilities[override_.position] = one_hot_probabilities(override_.facelet);
        }
    }

    probabilities
}

fn one_hot_probabilities(facelet: Facelet) -> [f64; SCAN_FACELET_SYMBOL_COUNT] {
    let mut probabilities = [0.0; SCAN_FACELET_SYMBOL_COUNT];
    probabilities[facelet.index()] = 1.0;
    probabilities
}

fn face_rotation_hypotheses(
    input: &ScanInferenceInput,
    limit: usize,
) -> Vec<[u16; SCAN_FACE_COUNT]> {
    let choices: [Vec<u16>; SCAN_FACE_COUNT] = input.face_rotation_priors.each_ref().map(|prior| {
        prior.map_or_else(
            || ROTATIONS.to_vec(),
            |rotation| vec![normalize_rotation(rotation)],
        )
    });
    let mut base = [0_u16; SCAN_FACE_COUNT];

    for (index, choice) in choices.iter().enumerate() {
        base[index] = choice.first().copied().unwrap_or(0);
    }

    let mut hypotheses = Vec::new();
    push_rotation_hypothesis(&mut hypotheses, base, limit);

    for changed_faces in 1..=SCAN_FACE_COUNT {
        if hypotheses.len() >= limit {
            break;
        }

        let mut candidate = base;
        generate_rotation_hypotheses(
            &choices,
            &mut hypotheses,
            &mut candidate,
            changed_faces,
            0,
            limit,
        );
    }

    hypotheses
}

fn generate_rotation_hypotheses(
    choices: &[Vec<u16>; SCAN_FACE_COUNT],
    hypotheses: &mut Vec<[u16; SCAN_FACE_COUNT]>,
    candidate: &mut [u16; SCAN_FACE_COUNT],
    remaining_changes: usize,
    start_face: usize,
    limit: usize,
) {
    if hypotheses.len() >= limit {
        return;
    }

    if remaining_changes == 0 {
        push_rotation_hypothesis(hypotheses, *candidate, limit);
        return;
    }

    for face_index in start_face..SCAN_FACE_COUNT {
        if choices[face_index].len() <= 1 {
            continue;
        }

        let original = candidate[face_index];
        for rotation in choices[face_index].iter().copied().skip(1) {
            candidate[face_index] = rotation;
            generate_rotation_hypotheses(
                choices,
                hypotheses,
                candidate,
                remaining_changes - 1,
                face_index + 1,
                limit,
            );

            if hypotheses.len() >= limit {
                candidate[face_index] = original;
                return;
            }
        }
        candidate[face_index] = original;
    }
}

fn push_rotation_hypothesis(
    hypotheses: &mut Vec<[u16; SCAN_FACE_COUNT]>,
    candidate: [u16; SCAN_FACE_COUNT],
    limit: usize,
) {
    if hypotheses.len() < limit && !hypotheses.contains(&candidate) {
        hypotheses.push(candidate);
    }
}

fn normalize_rotation(rotation: u16) -> u16 {
    match rotation % 360 {
        90 => 90,
        180 => 180,
        270 => 270,
        _ => 0,
    }
}

fn apply_face_rotations(
    probabilities: &ScanFaceletProbabilities,
    rotations: [u16; SCAN_FACE_COUNT],
) -> ScanFaceletProbabilities {
    let mut rotated = [[0.0; SCAN_FACELET_SYMBOL_COUNT]; SCAN_FACELET_COUNT];

    for (face_index, rotation) in rotations.into_iter().enumerate() {
        let face_start = face_index * SCAN_STICKERS_PER_FACE;

        for target_local_index in 0..SCAN_STICKERS_PER_FACE {
            let source_local_index = rotate_sticker_index_clockwise(target_local_index, rotation);
            rotated[face_start + target_local_index] =
                probabilities[face_start + source_local_index];
        }
    }

    rotated
}

fn rotate_sticker_index_clockwise(index: usize, rotation: u16) -> usize {
    let mut rotated = index;
    for _ in 0..(normalize_rotation(rotation) / 90) {
        rotated = match rotated {
            0 => 2,
            1 => 5,
            2 => 8,
            3 => 1,
            4 => 4,
            5 => 7,
            6 => 0,
            7 => 3,
            8 => 6,
            _ => rotated,
        };
    }

    rotated
}

fn infer_candidates_for_rotation(
    probabilities: &ScanFaceletProbabilities,
    rotations: [u16; SCAN_FACE_COUNT],
    options: &ScanInferenceOptions,
) -> Vec<ScanInferenceCandidate> {
    let corner_assignments = infer_corner_assignments(
        &corner_piece_candidates(probabilities),
        options.corner_beam_per_mask,
    );
    let edge_assignments = infer_edge_assignments(
        &edge_piece_candidates(probabilities),
        options.edge_beam_per_mask,
    );
    let mut candidates = Vec::new();

    for corner_assignment in &corner_assignments {
        for edge_assignment in &edge_assignments {
            let state = CubieState {
                corner_permutation: corner_assignment.permutation,
                corner_orientation: corner_assignment.orientation,
                edge_permutation: edge_assignment.permutation,
                edge_orientation: edge_assignment.orientation,
            };

            if state.validate().is_err() {
                continue;
            }

            let Ok(facelets) = FaceletString::from_cubie_state(&state) else {
                continue;
            };

            candidates.push(ScanInferenceCandidate {
                state,
                facelets: facelets.to_string(),
                cost: corner_assignment.cost + edge_assignment.cost,
                face_rotations: rotations,
            });
        }
    }

    candidates.sort_by(|left, right| left.cost.total_cmp(&right.cost));

    let mut unique = Vec::new();
    for candidate in candidates {
        if unique
            .iter()
            .any(|existing: &ScanInferenceCandidate| existing.facelets == candidate.facelets)
        {
            continue;
        }

        unique.push(candidate);
        if unique.len() >= options.candidates_per_rotation {
            break;
        }
    }

    unique
}

fn corner_piece_candidates(
    probabilities: &ScanFaceletProbabilities,
) -> Vec<Vec<CornerPieceCandidate>> {
    CORNER_FACELET_MAPPINGS
        .iter()
        .map(|target_mapping| {
            let mut candidates = Vec::new();

            for corner in Corner::ALL {
                let source_mapping = &CORNER_FACELET_MAPPINGS[corner.index()];
                for orientation in 0..3 {
                    let mut cost = 0.0;

                    for (source_index, source_sticker) in source_mapping.stickers.iter().enumerate()
                    {
                        let target_index =
                            (source_index + orientation) % target_mapping.stickers.len();
                        let target_sticker = target_mapping.stickers[target_index];
                        cost += sticker_cost(
                            probabilities,
                            target_sticker.position,
                            source_sticker.facelet,
                        );
                    }

                    candidates.push(CornerPieceCandidate {
                        corner,
                        orientation: orientation as u8,
                        cost,
                    });
                }
            }

            candidates.sort_by(|left, right| left.cost.total_cmp(&right.cost));
            candidates
        })
        .collect()
}

fn edge_piece_candidates(probabilities: &ScanFaceletProbabilities) -> Vec<Vec<EdgePieceCandidate>> {
    EDGE_FACELET_MAPPINGS
        .iter()
        .map(|target_mapping| {
            let mut candidates = Vec::new();

            for edge in Edge::ALL {
                let source_mapping = &EDGE_FACELET_MAPPINGS[edge.index()];
                for orientation in 0..2 {
                    let mut cost = 0.0;

                    for (source_index, source_sticker) in source_mapping.stickers.iter().enumerate()
                    {
                        let target_index =
                            (source_index + orientation) % target_mapping.stickers.len();
                        let target_sticker = target_mapping.stickers[target_index];
                        cost += sticker_cost(
                            probabilities,
                            target_sticker.position,
                            source_sticker.facelet,
                        );
                    }

                    candidates.push(EdgePieceCandidate {
                        edge,
                        orientation: orientation as u8,
                        cost,
                    });
                }
            }

            candidates.sort_by(|left, right| left.cost.total_cmp(&right.cost));
            candidates
        })
        .collect()
}

fn sticker_cost(
    probabilities: &ScanFaceletProbabilities,
    position: usize,
    facelet: Facelet,
) -> f64 {
    -probabilities[position][facelet.index()]
        .max(MIN_PROBABILITY)
        .ln()
}

fn infer_corner_assignments(
    candidates_by_slot: &[Vec<CornerPieceCandidate>],
    beam_per_mask: usize,
) -> Vec<PartialCornerAssignment> {
    let mut current = vec![PartialCornerAssignment {
        mask: 0,
        permutation: Corner::ALL,
        orientation: [0; CORNER_COUNT],
        cost: 0.0,
    }];

    for (slot_index, candidates) in candidates_by_slot.iter().enumerate() {
        let mut buckets = vec![Vec::new(); 1 << CORNER_COUNT];

        for state in &current {
            for candidate in candidates {
                let bit = 1_u16 << candidate.corner.index();
                if state.mask & bit != 0 {
                    continue;
                }

                let mut next = state.clone();
                next.mask |= bit;
                next.permutation[slot_index] = candidate.corner;
                next.orientation[slot_index] = candidate.orientation;
                next.cost += candidate.cost;
                buckets[usize::from(next.mask)].push(next);
            }
        }

        current = prune_corner_buckets(buckets, beam_per_mask);
    }

    current.sort_by(|left, right| left.cost.total_cmp(&right.cost));
    current
}

fn prune_corner_buckets(
    mut buckets: Vec<Vec<PartialCornerAssignment>>,
    beam_per_mask: usize,
) -> Vec<PartialCornerAssignment> {
    let mut pruned = Vec::new();

    for bucket in &mut buckets {
        bucket.sort_by(|left, right| left.cost.total_cmp(&right.cost));
        bucket.truncate(beam_per_mask);
        pruned.append(bucket);
    }

    pruned
}

fn infer_edge_assignments(
    candidates_by_slot: &[Vec<EdgePieceCandidate>],
    beam_per_mask: usize,
) -> Vec<PartialEdgeAssignment> {
    let mut current = vec![PartialEdgeAssignment {
        mask: 0,
        permutation: Edge::ALL,
        orientation: [0; EDGE_COUNT],
        cost: 0.0,
    }];

    for (slot_index, candidates) in candidates_by_slot.iter().enumerate() {
        let mut buckets = vec![Vec::new(); 1 << EDGE_COUNT];

        for state in &current {
            for candidate in candidates {
                let bit = 1_u16 << candidate.edge.index();
                if state.mask & bit != 0 {
                    continue;
                }

                let mut next = state.clone();
                next.mask |= bit;
                next.permutation[slot_index] = candidate.edge;
                next.orientation[slot_index] = candidate.orientation;
                next.cost += candidate.cost;
                buckets[usize::from(next.mask)].push(next);
            }
        }

        current = prune_edge_buckets(buckets, beam_per_mask);
    }

    current.sort_by(|left, right| left.cost.total_cmp(&right.cost));
    current
}

fn prune_edge_buckets(
    mut buckets: Vec<Vec<PartialEdgeAssignment>>,
    beam_per_mask: usize,
) -> Vec<PartialEdgeAssignment> {
    let mut pruned = Vec::new();

    for bucket in &mut buckets {
        bucket.sort_by(|left, right| left.cost.total_cmp(&right.cost));
        bucket.truncate(beam_per_mask);
        pruned.append(bucket);
    }

    pruned
}

fn consider_candidate(
    best_candidate: &mut Option<ScanInferenceCandidate>,
    runner_up: &mut Option<ScanInferenceCandidate>,
    candidate: ScanInferenceCandidate,
) {
    if best_candidate
        .as_ref()
        .is_some_and(|best| best.facelets == candidate.facelets)
    {
        if best_candidate
            .as_ref()
            .is_some_and(|best| candidate.cost < best.cost)
        {
            *best_candidate = Some(candidate);
        }
        return;
    }

    if runner_up
        .as_ref()
        .is_some_and(|runner| runner.facelets == candidate.facelets)
    {
        if runner_up
            .as_ref()
            .is_some_and(|runner| candidate.cost < runner.cost)
        {
            *runner_up = Some(candidate);
        }
        return;
    }

    match best_candidate.as_ref() {
        None => *best_candidate = Some(candidate),
        Some(best) if candidate.cost < best.cost => {
            let previous_best = best_candidate.replace(candidate);
            if let Some(previous_best) = previous_best {
                *runner_up = Some(previous_best);
            }
        }
        Some(_) => match runner_up.as_ref() {
            None => *runner_up = Some(candidate),
            Some(runner) if candidate.cost < runner.cost => *runner_up = Some(candidate),
            Some(_) => {}
        },
    }
}

fn low_confidence_faces_from_probabilities(
    probabilities: &ScanFaceletProbabilities,
    options: &ScanInferenceOptions,
) -> Vec<Facelet> {
    let mut counts = [0_usize; SCAN_FACE_COUNT];

    for (position, row) in probabilities.iter().enumerate() {
        if is_center_position(position) {
            continue;
        }

        let max_probability = row.iter().copied().fold(0.0, f64::max);
        if max_probability < options.low_sticker_probability {
            counts[position / SCAN_STICKERS_PER_FACE] += 1;
        }
    }

    faces_from_low_confidence_counts(counts, options.low_confidence_stickers_per_face)
}

fn low_confidence_faces_for_candidate(
    probabilities: &ScanFaceletProbabilities,
    candidate: &ScanInferenceCandidate,
    options: &ScanInferenceOptions,
) -> Vec<Facelet> {
    let mut counts = [0_usize; SCAN_FACE_COUNT];
    let facelets = candidate.facelets.as_bytes();

    for position in 0..SCAN_FACELET_COUNT {
        if is_center_position(position) {
            continue;
        }

        let Some(facelet) = Facelet::from_symbol(char::from(facelets[position])) else {
            continue;
        };

        if probabilities[position][facelet.index()] < options.low_sticker_probability {
            counts[position / SCAN_STICKERS_PER_FACE] += 1;
        }
    }

    faces_from_low_confidence_counts(counts, options.low_confidence_stickers_per_face)
}

fn faces_from_low_confidence_counts(
    counts: [usize; SCAN_FACE_COUNT],
    minimum_count: usize,
) -> Vec<Facelet> {
    counts
        .into_iter()
        .enumerate()
        .filter_map(|(face_index, count)| {
            (count >= minimum_count).then_some(Facelet::ALL[face_index])
        })
        .collect()
}

fn manual_targets_for_candidate(
    probabilities: &ScanFaceletProbabilities,
    candidate: &ScanInferenceCandidate,
    options: &ScanInferenceOptions,
) -> Vec<ScanInferenceManualTarget> {
    let mut counts = [
        Vec::new(),
        Vec::new(),
        Vec::new(),
        Vec::new(),
        Vec::new(),
        Vec::new(),
    ];
    let facelets = candidate.facelets.as_bytes();

    for position in 0..SCAN_FACELET_COUNT {
        if is_center_position(position) {
            continue;
        }

        let Some(facelet) = Facelet::from_symbol(char::from(facelets[position])) else {
            continue;
        };
        let row = probabilities[position];
        let best_probability = row[facelet.index()];
        let top_margin = top_probability_margin(row);

        if best_probability < options.low_sticker_probability
            || top_margin < options.manual_probability_margin
        {
            let face_index = position / SCAN_STICKERS_PER_FACE;
            let sticker_index = position % SCAN_STICKERS_PER_FACE;
            counts[face_index].push(sticker_index);
        }
    }

    manual_targets_from_counts(counts)
}

fn top_probability_margin(row: [f64; SCAN_FACELET_SYMBOL_COUNT]) -> f64 {
    let mut first = 0.0;
    let mut second = 0.0;

    for probability in row {
        if probability > first {
            second = first;
            first = probability;
        } else if probability > second {
            second = probability;
        }
    }

    first - second
}

fn manual_targets_between_candidates(
    best: &ScanInferenceCandidate,
    runner_up: &ScanInferenceCandidate,
) -> Vec<ScanInferenceManualTarget> {
    let mut counts = [
        Vec::new(),
        Vec::new(),
        Vec::new(),
        Vec::new(),
        Vec::new(),
        Vec::new(),
    ];

    for position in 0..SCAN_FACELET_COUNT {
        if is_center_position(position)
            || best.facelets.as_bytes()[position] == runner_up.facelets.as_bytes()[position]
        {
            continue;
        }

        let face_index = position / SCAN_STICKERS_PER_FACE;
        let sticker_index = position % SCAN_STICKERS_PER_FACE;
        counts[face_index].push(sticker_index);
    }

    manual_targets_from_counts(counts)
}

fn manual_targets_from_counts(
    counts: [Vec<usize>; SCAN_FACE_COUNT],
) -> Vec<ScanInferenceManualTarget> {
    counts
        .into_iter()
        .enumerate()
        .filter_map(|(face_index, stickers)| {
            (!stickers.is_empty()).then_some(ScanInferenceManualTarget {
                face: Facelet::ALL[face_index],
                stickers,
            })
        })
        .collect()
}

fn is_center_position(position: usize) -> bool {
    position % SCAN_STICKERS_PER_FACE == CENTER_STICKER_INDEX
}

fn confidence_from_margin(margin: f64) -> f64 {
    1.0 - (-margin.max(0.0)).exp()
}

#[cfg(test)]
mod tests {
    use super::{
        infer_scan, infer_scan_with_options, rotate_sticker_index_clockwise,
        ScanFaceletProbabilities, ScanInferenceInput, ScanInferenceOptions, ScanInferenceStatus,
        ScanManualOverride, DEFAULT_PROBABILITY, SCAN_FACELET_COUNT, SCAN_FACELET_SYMBOL_COUNT,
        SCAN_FACE_COUNT, SCAN_STICKERS_PER_FACE,
    };
    use crate::{Cube, CubieState, Facelet, FaceletString, Move};

    const SOLVED_FACELETS: &str = "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB";

    #[test]
    fn solved_high_confidence_scan_is_accepted() {
        let result = infer_scan(&input_from_facelets(SOLVED_FACELETS));

        assert_eq!(result.status, ScanInferenceStatus::Accepted);
        let candidate = result.best_candidate.expect("candidate should be inferred");
        assert_eq!(candidate.state, CubieState::solved());
        assert_eq!(candidate.facelets, SOLVED_FACELETS);
    }

    #[test]
    fn client_rotation_prior_recovers_rotated_face_observations() {
        let mut cube = Cube::solved();
        cube.apply_move(Move::R);
        let facelets = FaceletString::from_cube(&cube).to_string();
        let mut input = input_from_facelets(&facelets);
        rotate_observed_face(&mut input.facelet_probabilities, Facelet::U.index(), 90);
        input.face_rotation_priors[Facelet::U.index()] = Some(90);

        let result = infer_scan(&input);

        assert_eq!(result.status, ScanInferenceStatus::Accepted);
        assert_eq!(result.best_candidate.expect("candidate").facelets, facelets);
    }

    #[test]
    fn visually_ambiguous_single_sticker_requests_manual_confirmation() {
        let mut input = input_from_facelets(SOLVED_FACELETS);
        input.facelet_probabilities[0] = [0.42, 0.41, 0.04, 0.04, 0.04, 0.05];

        let result = infer_scan(&input);

        assert_eq!(result.status, ScanInferenceStatus::NeedsManualConfirmation);
        assert_eq!(result.manual_targets.len(), 1);
        assert_eq!(result.manual_targets[0].face, Facelet::U);
        assert_eq!(result.manual_targets[0].stickers, vec![0]);
    }

    #[test]
    fn manual_override_forces_sticker_evidence() {
        let mut input = input_from_facelets(SOLVED_FACELETS);
        input.facelet_probabilities[0] = [0.42, 0.41, 0.04, 0.04, 0.04, 0.05];
        input.manual_overrides.push(ScanManualOverride {
            position: 0,
            facelet: Facelet::U,
        });

        let result = infer_scan(&input);

        assert_eq!(result.status, ScanInferenceStatus::Accepted);
        assert_eq!(
            result.best_candidate.expect("candidate").facelets,
            SOLVED_FACELETS
        );
    }

    #[test]
    fn close_valid_runner_up_returns_state_ambiguous() {
        let mut cube = Cube::solved();
        cube.apply_move(Move::R);
        let moved_facelets = FaceletString::from_cube(&cube).to_string();
        let input = mixed_input_from_facelets(SOLVED_FACELETS, &moved_facelets);
        let options = ScanInferenceOptions {
            max_rotation_combinations: 1,
            ..ScanInferenceOptions::default()
        };

        let result = infer_scan_with_options(&input, &options);

        assert_eq!(result.status, ScanInferenceStatus::StateAmbiguous);
        assert!(result
            .margin
            .is_some_and(|margin| margin < options.min_candidate_margin));
    }

    #[test]
    fn low_confidence_face_requests_rescan() {
        let mut input = input_from_facelets(SOLVED_FACELETS);
        let face_start = Facelet::F.index() * SCAN_STICKERS_PER_FACE;
        for local_index in 0..SCAN_STICKERS_PER_FACE {
            if local_index == 4 {
                continue;
            }
            input.facelet_probabilities[face_start + local_index] =
                [DEFAULT_PROBABILITY; SCAN_FACELET_SYMBOL_COUNT];
        }

        let result = infer_scan(&input);

        assert_eq!(result.status, ScanInferenceStatus::NeedsRescanFace);
        assert_eq!(result.rescan_faces, vec![Facelet::F]);
    }

    #[test]
    fn impossible_high_confidence_evidence_is_rejected() {
        let mut probabilities = [[0.004; SCAN_FACELET_SYMBOL_COUNT]; SCAN_FACELET_COUNT];
        for row in &mut probabilities {
            row[Facelet::U.index()] = 0.98;
        }
        let input = ScanInferenceInput {
            facelet_probabilities: probabilities,
            manual_overrides: Vec::new(),
            face_rotation_priors: [Some(0); SCAN_FACE_COUNT],
        };

        let result = infer_scan(&input);

        assert_eq!(result.status, ScanInferenceStatus::InvalidCubeState);
    }

    fn input_from_facelets(facelets: &str) -> ScanInferenceInput {
        ScanInferenceInput {
            facelet_probabilities: probabilities_from_facelets(facelets),
            manual_overrides: Vec::new(),
            face_rotation_priors: [Some(0); SCAN_FACE_COUNT],
        }
    }

    fn probabilities_from_facelets(facelets: &str) -> ScanFaceletProbabilities {
        assert_eq!(facelets.len(), SCAN_FACELET_COUNT);
        let mut probabilities = [[0.004; SCAN_FACELET_SYMBOL_COUNT]; SCAN_FACELET_COUNT];

        for (position, symbol) in facelets.chars().enumerate() {
            let facelet = Facelet::from_symbol(symbol).expect("test facelet should parse");
            probabilities[position][facelet.index()] = 0.98;
        }

        probabilities
    }

    fn mixed_input_from_facelets(left: &str, right: &str) -> ScanInferenceInput {
        assert_eq!(left.len(), SCAN_FACELET_COUNT);
        assert_eq!(right.len(), SCAN_FACELET_COUNT);
        let mut probabilities = [[0.004; SCAN_FACELET_SYMBOL_COUNT]; SCAN_FACELET_COUNT];

        for (position, (left_symbol, right_symbol)) in left.chars().zip(right.chars()).enumerate() {
            let left_facelet = Facelet::from_symbol(left_symbol).expect("left facelet");
            let right_facelet = Facelet::from_symbol(right_symbol).expect("right facelet");
            probabilities[position] = [0.004; SCAN_FACELET_SYMBOL_COUNT];

            if left_facelet == right_facelet {
                probabilities[position][left_facelet.index()] = 0.98;
            } else {
                probabilities[position][left_facelet.index()] = 0.49;
                probabilities[position][right_facelet.index()] = 0.49;
            }
        }

        ScanInferenceInput {
            facelet_probabilities: probabilities,
            manual_overrides: Vec::new(),
            face_rotation_priors: [Some(0); SCAN_FACE_COUNT],
        }
    }

    fn rotate_observed_face(
        probabilities: &mut ScanFaceletProbabilities,
        face_index: usize,
        rotation: u16,
    ) {
        let original = *probabilities;
        let face_start = face_index * SCAN_STICKERS_PER_FACE;

        for canonical_local_index in 0..SCAN_STICKERS_PER_FACE {
            let observed_local_index =
                rotate_sticker_index_clockwise(canonical_local_index, rotation);
            probabilities[face_start + observed_local_index] =
                original[face_start + canonical_local_index];
        }
    }
}
