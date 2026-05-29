use crate::search::solution::{SearchBudget, SearchOutcome, SearchSolution};

use super::constants::{
    MULTIPROBE_NODE_CAP, QUALITY_DEPTH_16_NODE_CAP, QUALITY_DEPTH_18_NODE_CAP,
    QUALITY_DEPTH_20_DEEP_NODE_CAP, QUALITY_DEPTH_20_DEEP_NODE_THRESHOLD,
    QUALITY_DEPTH_20_NODE_CAP, QUALITY_PROBE_MAX_DEPTH, QUALITY_PROBE_NODE_CAP,
};
use super::metrics::{GeneratedTwoPhaseMetrics, GeneratedTwoPhaseSearchResult};

pub(super) fn record_quality_attempt(
    attempt: GeneratedTwoPhaseSearchResult,
    metrics: &mut GeneratedTwoPhaseMetrics,
    explored_nodes: &mut usize,
) -> Option<SearchSolution> {
    let attempt_nodes = attempt.metrics.explored_nodes();
    *metrics = metrics.saturating_add(attempt.metrics);
    *explored_nodes = explored_nodes.saturating_add(attempt_nodes);

    match attempt.outcome {
        SearchOutcome::Found(solution) => Some(SearchSolution::with_metrics(
            solution.moves,
            *explored_nodes,
        )),
        SearchOutcome::NotFoundWithinLimits { .. } => None,
    }
}

pub(super) fn quality_depth_schedule(max_depth: usize) -> Vec<usize> {
    let mut depths = Vec::new();

    for depth in [16, 18, 20, max_depth] {
        let depth = depth.min(max_depth);
        if depths.last() != Some(&depth) {
            depths.push(depth);
        }
    }

    depths
}

pub(super) fn quality_probe_budget(budget: SearchBudget) -> SearchBudget {
    SearchBudget::with_limits(
        budget.max_depth.min(QUALITY_PROBE_MAX_DEPTH),
        quality_probe_node_budget(budget.max_nodes),
    )
}

fn quality_probe_node_budget(max_nodes: Option<usize>) -> Option<usize> {
    match max_nodes {
        Some(0) => Some(0),
        Some(max_nodes) => {
            let proportional = (max_nodes / 5).max(1_000);
            Some(proportional.min(QUALITY_PROBE_NODE_CAP).min(max_nodes))
        }
        None => Some(QUALITY_PROBE_NODE_CAP),
    }
}

pub(super) fn multiprobe_node_budget(
    max_nodes: Option<usize>,
    remaining_nodes: Option<usize>,
) -> Option<usize> {
    match max_nodes {
        Some(0) => Some(0),
        Some(max_nodes) => {
            let candidate = (max_nodes / 5)
                .clamp(1_000, MULTIPROBE_NODE_CAP)
                .min(max_nodes);
            Some(remaining_nodes.map_or(candidate, |remaining| candidate.min(remaining)))
        }
        None => Some(MULTIPROBE_NODE_CAP),
    }
}

pub(super) fn quality_depth_node_budget(
    max_nodes: Option<usize>,
    remaining_nodes: Option<usize>,
    depth_limit: usize,
) -> Option<usize> {
    let candidate = match max_nodes {
        Some(0) => 0,
        Some(max_nodes) if depth_limit <= 16 => (max_nodes / 5)
            .clamp(1_000, QUALITY_DEPTH_16_NODE_CAP)
            .min(max_nodes),
        Some(max_nodes) if depth_limit <= 18 => (max_nodes / 10)
            .clamp(1_000, QUALITY_DEPTH_18_NODE_CAP)
            .min(max_nodes),
        Some(max_nodes)
            if depth_limit <= 20 && max_nodes >= QUALITY_DEPTH_20_DEEP_NODE_THRESHOLD =>
        {
            (max_nodes.saturating_mul(4) / 5)
                .clamp(QUALITY_DEPTH_20_NODE_CAP, QUALITY_DEPTH_20_DEEP_NODE_CAP)
                .min(max_nodes)
        }
        Some(max_nodes) => (max_nodes.saturating_mul(3) / 10)
            .clamp(1_000, QUALITY_DEPTH_20_NODE_CAP)
            .min(max_nodes),
        None if depth_limit <= 16 => QUALITY_DEPTH_16_NODE_CAP,
        None if depth_limit <= 18 => QUALITY_DEPTH_18_NODE_CAP,
        None => QUALITY_DEPTH_20_NODE_CAP,
    };

    Some(remaining_nodes.map_or(candidate, |remaining| candidate.min(remaining)))
}

pub(super) fn remaining_node_budget(max_nodes: Option<usize>, spent_nodes: usize) -> Option<usize> {
    max_nodes.map(|max_nodes| max_nodes.saturating_sub(spent_nodes))
}
