use crate::search::solution::SearchOutcome;

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct GeneratedTwoPhaseMetrics {
    pub phase1_nodes: usize,
    pub phase2_nodes: usize,
    pub phase1_depth_attempts: usize,
    pub max_phase1_depth_attempted: Option<usize>,
    pub total_depth_attempts: usize,
    pub max_total_depth_attempted: Option<usize>,
    pub phase1_ordered_candidates: usize,
    pub phase1_ordering_heuristic_evals: usize,
    pub phase2_ordered_candidates: usize,
    pub phase2_ordering_heuristic_evals: usize,
    pub phase2_calls: usize,
    pub heuristic_prunes: usize,
    pub node_limit_hits: usize,
    pub table_missing_entries: usize,
    pub solutions_found: usize,
    pub best_solution_length: Option<usize>,
    pub best_phase1_length: Option<usize>,
    pub best_phase2_length: Option<usize>,
}

impl GeneratedTwoPhaseMetrics {
    pub const fn explored_nodes(self) -> usize {
        self.phase1_nodes + self.phase2_nodes
    }

    pub(super) fn saturating_add(self, other: Self) -> Self {
        Self {
            phase1_nodes: self.phase1_nodes.saturating_add(other.phase1_nodes),
            phase2_nodes: self.phase2_nodes.saturating_add(other.phase2_nodes),
            phase1_depth_attempts: self
                .phase1_depth_attempts
                .saturating_add(other.phase1_depth_attempts),
            max_phase1_depth_attempted: max_option(
                self.max_phase1_depth_attempted,
                other.max_phase1_depth_attempted,
            ),
            total_depth_attempts: self
                .total_depth_attempts
                .saturating_add(other.total_depth_attempts),
            max_total_depth_attempted: max_option(
                self.max_total_depth_attempted,
                other.max_total_depth_attempted,
            ),
            phase1_ordered_candidates: self
                .phase1_ordered_candidates
                .saturating_add(other.phase1_ordered_candidates),
            phase1_ordering_heuristic_evals: self
                .phase1_ordering_heuristic_evals
                .saturating_add(other.phase1_ordering_heuristic_evals),
            phase2_ordered_candidates: self
                .phase2_ordered_candidates
                .saturating_add(other.phase2_ordered_candidates),
            phase2_ordering_heuristic_evals: self
                .phase2_ordering_heuristic_evals
                .saturating_add(other.phase2_ordering_heuristic_evals),
            phase2_calls: self.phase2_calls.saturating_add(other.phase2_calls),
            heuristic_prunes: self.heuristic_prunes.saturating_add(other.heuristic_prunes),
            node_limit_hits: self.node_limit_hits.saturating_add(other.node_limit_hits),
            table_missing_entries: self
                .table_missing_entries
                .saturating_add(other.table_missing_entries),
            solutions_found: self.solutions_found.saturating_add(other.solutions_found),
            best_solution_length: min_option(self.best_solution_length, other.best_solution_length),
            best_phase1_length: best_phase_length(
                self.best_solution_length,
                self.best_phase1_length,
                other.best_solution_length,
                other.best_phase1_length,
            ),
            best_phase2_length: best_phase_length(
                self.best_solution_length,
                self.best_phase2_length,
                other.best_solution_length,
                other.best_phase2_length,
            ),
        }
    }
}

fn max_option(left: Option<usize>, right: Option<usize>) -> Option<usize> {
    match (left, right) {
        (Some(left), Some(right)) => Some(left.max(right)),
        (Some(value), None) | (None, Some(value)) => Some(value),
        (None, None) => None,
    }
}

fn min_option(left: Option<usize>, right: Option<usize>) -> Option<usize> {
    match (left, right) {
        (Some(left), Some(right)) => Some(left.min(right)),
        (Some(value), None) | (None, Some(value)) => Some(value),
        (None, None) => None,
    }
}

fn best_phase_length(
    left_solution_length: Option<usize>,
    left_phase_length: Option<usize>,
    right_solution_length: Option<usize>,
    right_phase_length: Option<usize>,
) -> Option<usize> {
    match (left_solution_length, right_solution_length) {
        (Some(left), Some(right)) if right < left => right_phase_length,
        (Some(_), Some(_)) | (Some(_), None) => left_phase_length,
        (None, Some(_)) => right_phase_length,
        (None, None) => None,
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct GeneratedTwoPhaseSearchResult {
    pub outcome: SearchOutcome,
    pub metrics: GeneratedTwoPhaseMetrics,
}
