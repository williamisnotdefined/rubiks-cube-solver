use std::path::Path;

use super::corner_pdb::{
    corner_pattern_database_path, CornerPatternDatabase, CornerPatternDatabaseHeuristic,
};
use super::edge_pdb::{
    edge_pattern_database_path, EdgePatternDatabase, EdgePatternDatabaseHeuristic,
    EdgePatternDatabaseId,
};
use super::heuristics::{Heuristic, OrientationPatternDatabaseHeuristic};
use super::ida_star::solve_ida_star_bounded_with_heuristic;
use super::solution::{SearchBudget, SearchOutcome, SearchSolution};
use super::two_phase::{solve_generated_two_phase_quality, GeneratedTwoPhaseError};
use crate::cube::Cube;

const PDB16_TARGET_DEPTH: usize = 16;
const PDB16_ATTEMPT_NODE_CAP: usize = 5_000_000;

#[derive(Clone, Debug)]
struct Pdb16Databases {
    corner: CornerPatternDatabase,
    edge_a: EdgePatternDatabase,
    edge_b: EdgePatternDatabase,
}

#[derive(Clone, Copy, Debug)]
struct Pdb16Heuristic<'a> {
    corner: CornerPatternDatabaseHeuristic<'a>,
    edge_a: EdgePatternDatabaseHeuristic<'a>,
    edge_b: EdgePatternDatabaseHeuristic<'a>,
}

impl Pdb16Databases {
    fn load_from_dir(directory: &Path) -> Option<Self> {
        Some(Self {
            corner: CornerPatternDatabase::load_artifact(corner_pattern_database_path(directory))
                .ok()?,
            edge_a: EdgePatternDatabase::load_artifact_for(
                EdgePatternDatabaseId::A,
                edge_pattern_database_path(directory, EdgePatternDatabaseId::A),
            )
            .ok()?,
            edge_b: EdgePatternDatabase::load_artifact_for(
                EdgePatternDatabaseId::B,
                edge_pattern_database_path(directory, EdgePatternDatabaseId::B),
            )
            .ok()?,
        })
    }

    const fn heuristic(&self) -> Pdb16Heuristic<'_> {
        Pdb16Heuristic {
            corner: CornerPatternDatabaseHeuristic::new(&self.corner),
            edge_a: EdgePatternDatabaseHeuristic::new(&self.edge_a),
            edge_b: EdgePatternDatabaseHeuristic::new(&self.edge_b),
        }
    }
}

impl Heuristic for Pdb16Heuristic<'_> {
    fn estimate(&self, cube: &Cube) -> usize {
        self.corner
            .estimate(cube)
            .max(self.edge_a.estimate(cube))
            .max(self.edge_b.estimate(cube))
            .max(OrientationPatternDatabaseHeuristic.estimate(cube))
    }
}

pub(crate) fn solve_optimal_bounded_pdb16_quality(
    start: &Cube,
    budget: SearchBudget,
    artifact_dir: &Path,
) -> Result<SearchOutcome, GeneratedTwoPhaseError> {
    let mut explored_nodes = 0_usize;

    if let Some(databases) = Pdb16Databases::load_from_dir(artifact_dir) {
        let depth_limit = PDB16_TARGET_DEPTH.min(budget.max_depth);
        let attempt_nodes = pdb16_attempt_nodes(
            budget.max_nodes,
            remaining_node_budget(budget.max_nodes, explored_nodes),
        );
        if attempt_nodes != Some(0) {
            let heuristic = databases.heuristic();
            let outcome = solve_ida_star_bounded_with_heuristic(
                start,
                SearchBudget::with_limits(depth_limit, attempt_nodes),
                &heuristic,
            );

            if let Some(solution) = record_attempt_outcome(outcome, &mut explored_nodes) {
                return Ok(SearchOutcome::Found(solution));
            }
        }
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

fn pdb16_attempt_nodes(max_nodes: Option<usize>, remaining_nodes: Option<usize>) -> Option<usize> {
    match max_nodes {
        Some(max_nodes) => {
            let attempt = (max_nodes / 2)
                .clamp(1_000, PDB16_ATTEMPT_NODE_CAP)
                .min(max_nodes);
            Some(remaining_nodes.map_or(attempt, |remaining| attempt.min(remaining)))
        }
        None => Some(PDB16_ATTEMPT_NODE_CAP),
    }
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

#[cfg(test)]
mod tests {
    use super::pdb16_attempt_nodes;

    #[test]
    fn pdb16_attempt_nodes_preserves_fallback_budget() {
        assert_eq!(
            pdb16_attempt_nodes(Some(10_000_000), Some(10_000_000)),
            Some(5_000_000)
        );
        assert_eq!(pdb16_attempt_nodes(Some(10_000_000), Some(500)), Some(500));
        assert_eq!(pdb16_attempt_nodes(None, None), Some(5_000_000));
    }
}
