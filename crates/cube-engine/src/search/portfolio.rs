use std::path::Path;

use super::optimal_pdb16::solve_optimal_bounded_pdb16_attempt;
use super::solution::{SearchBudget, SearchOutcome, SearchSolution};
use super::two_phase::{
    solve_generated_two_phase_multiprobe, solve_generated_two_phase_quality, GeneratedTwoPhaseError,
};
use crate::cube::Cube;

const SHORT_SOLUTION_TARGET_DEPTH: usize = 16;

pub(crate) fn solve_short_solution_portfolio(
    start: &Cube,
    budget: SearchBudget,
    artifact_dir: &Path,
) -> Result<SearchOutcome, GeneratedTwoPhaseError> {
    let mut explored_nodes = 0_usize;
    let target_depth = SHORT_SOLUTION_TARGET_DEPTH.min(budget.max_depth);

    if let Some(outcome) = solve_optimal_bounded_pdb16_attempt(
        start,
        SearchBudget::with_limits(target_depth, budget.max_nodes),
        artifact_dir,
    ) {
        if let Some(solution) = record_attempt_outcome(outcome, &mut explored_nodes) {
            return Ok(SearchOutcome::Found(solution));
        }
    }

    let remaining_nodes = remaining_node_budget(budget.max_nodes, explored_nodes);
    if remaining_nodes == Some(0) {
        return Ok(SearchOutcome::NotFoundWithinLimits { explored_nodes });
    }

    let short_probe = solve_generated_two_phase_multiprobe(
        start,
        SearchBudget::with_limits(target_depth, remaining_nodes),
        artifact_dir,
    )?;
    if let Some(solution) = record_attempt_outcome(short_probe, &mut explored_nodes) {
        return Ok(SearchOutcome::Found(solution));
    }

    if budget.max_depth <= target_depth {
        return Ok(SearchOutcome::NotFoundWithinLimits { explored_nodes });
    }

    let remaining_nodes = remaining_node_budget(budget.max_nodes, explored_nodes);
    if remaining_nodes == Some(0) {
        return Ok(SearchOutcome::NotFoundWithinLimits { explored_nodes });
    }

    let fallback = solve_generated_two_phase_quality(
        start,
        SearchBudget::with_limits(budget.max_depth, remaining_nodes),
        artifact_dir,
    )?;

    Ok(offset_outcome_explored_nodes(fallback, explored_nodes))
}

fn record_attempt_outcome(
    outcome: SearchOutcome,
    explored_nodes: &mut usize,
) -> Option<SearchSolution> {
    *explored_nodes = explored_nodes.saturating_add(outcome.explored_nodes());

    match outcome {
        SearchOutcome::Found(solution) => Some(SearchSolution::with_metrics(
            solution.moves,
            *explored_nodes,
        )),
        SearchOutcome::NotFoundWithinLimits { .. } => None,
    }
}

fn offset_outcome_explored_nodes(outcome: SearchOutcome, explored_offset: usize) -> SearchOutcome {
    match outcome {
        SearchOutcome::Found(solution) => SearchOutcome::Found(SearchSolution::with_metrics(
            solution.moves,
            solution.explored_nodes.saturating_add(explored_offset),
        )),
        SearchOutcome::NotFoundWithinLimits { explored_nodes } => {
            SearchOutcome::NotFoundWithinLimits {
                explored_nodes: explored_nodes.saturating_add(explored_offset),
            }
        }
    }
}

fn remaining_node_budget(max_nodes: Option<usize>, spent_nodes: usize) -> Option<usize> {
    max_nodes.map(|max_nodes| max_nodes.saturating_sub(spent_nodes))
}
