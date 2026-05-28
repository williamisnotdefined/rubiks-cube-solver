use crate::search::solution::SearchOutcome;

use super::metrics::{GeneratedTwoPhaseMetrics, GeneratedTwoPhaseSearchResult};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(super) struct TwoPhaseSearchContext {
    max_nodes: Option<usize>,
    pub(super) metrics: GeneratedTwoPhaseMetrics,
}

impl TwoPhaseSearchContext {
    pub(super) const fn new(max_nodes: Option<usize>) -> Self {
        Self {
            max_nodes,
            metrics: GeneratedTwoPhaseMetrics {
                phase1_nodes: 0,
                phase2_nodes: 0,
                phase1_depth_attempts: 0,
                max_phase1_depth_attempted: None,
                total_depth_attempts: 0,
                max_total_depth_attempted: None,
                phase1_ordered_candidates: 0,
                phase1_ordering_heuristic_evals: 0,
                phase2_ordered_candidates: 0,
                phase2_ordering_heuristic_evals: 0,
                phase2_calls: 0,
                heuristic_prunes: 0,
                node_limit_hits: 0,
                table_missing_entries: 0,
                solutions_found: 0,
                best_solution_length: None,
                best_phase1_length: None,
                best_phase2_length: None,
            },
        }
    }

    pub(super) fn explored_nodes(&self) -> usize {
        self.metrics.explored_nodes()
    }

    pub(super) fn finish(&self, outcome: SearchOutcome) -> GeneratedTwoPhaseSearchResult {
        GeneratedTwoPhaseSearchResult {
            outcome,
            metrics: self.metrics,
        }
    }

    pub(super) fn visit_phase1(&mut self) -> bool {
        self.visit_with(|metrics| metrics.phase1_nodes += 1)
    }

    pub(super) fn visit_phase2(&mut self) -> bool {
        self.visit_with(|metrics| metrics.phase2_nodes += 1)
    }

    fn visit_with(&mut self, increment: impl FnOnce(&mut GeneratedTwoPhaseMetrics)) -> bool {
        if self
            .max_nodes
            .is_some_and(|max_nodes| self.explored_nodes() >= max_nodes)
        {
            self.metrics.node_limit_hits += 1;
            return false;
        }

        increment(&mut self.metrics);

        true
    }

    pub(super) fn record_phase1_depth_attempt(&mut self, depth: usize) {
        self.metrics.phase1_depth_attempts += 1;
        self.metrics.max_phase1_depth_attempted = Some(depth);
    }

    pub(super) fn record_total_depth_attempt(&mut self, depth: usize) {
        self.metrics.total_depth_attempts += 1;
        self.metrics.max_total_depth_attempted = Some(depth);
    }

    pub(super) fn record_solution_candidate(&mut self, phase1_length: usize, phase2_length: usize) {
        let solution_length = phase1_length + phase2_length;
        self.metrics.solutions_found += 1;

        if self
            .metrics
            .best_solution_length
            .is_none_or(|current| solution_length < current)
        {
            self.metrics.best_solution_length = Some(solution_length);
            self.metrics.best_phase1_length = Some(phase1_length);
            self.metrics.best_phase2_length = Some(phase2_length);
        }
    }

    pub(super) fn record_phase2_call(&mut self) {
        self.metrics.phase2_calls += 1;
    }

    pub(super) fn record_phase1_ordered_candidates(&mut self, count: usize) {
        self.metrics.phase1_ordered_candidates += count;
    }

    pub(super) fn record_phase1_ordering_heuristic_eval(&mut self) {
        self.metrics.phase1_ordering_heuristic_evals += 1;
    }

    pub(super) fn record_phase2_ordered_candidates(&mut self, count: usize) {
        self.metrics.phase2_ordered_candidates += count;
    }

    pub(super) fn record_phase2_ordering_heuristic_eval(&mut self) {
        self.metrics.phase2_ordering_heuristic_evals += 1;
    }

    pub(super) fn record_heuristic_prune(&mut self) {
        self.metrics.heuristic_prunes += 1;
    }

    pub(super) fn record_missing_table_entry(&mut self) {
        self.metrics.table_missing_entries += 1;
    }
}
