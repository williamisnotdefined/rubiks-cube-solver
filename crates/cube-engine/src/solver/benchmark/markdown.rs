use super::labels::{max_nodes_label, moves_label, optional_bool_label, optional_usize_label};
use super::types::RealScrambleBenchmarkReport;

impl RealScrambleBenchmarkReport {
    pub fn to_markdown(&self) -> String {
        let summary = self.summary();
        let mut output = String::from(
            "# Real Scramble Solver Benchmark\n\n\
This benchmark converts each scramble into a cubie state and gives only that state to the configured solver. It does not pass the inverse scramble to the solver. Every reported success is replay verified from the benchmark state. Setup time is separated from per-scramble search time.\n\n",
        );
        output.push_str(&format!(
            "Setup elapsed: {} us\n\n\
## Summary\n\n\
Only replay-verified successes are counted in solution-length buckets. The buckets are exclusive, so their total equals `replay_verified_successes`.\n\n\
| rows | success | failures | replay_verified_successes | unverified_successes | len_0_to_16 | len_17_to_18 | len_19_to_20 | len_gt_20 | explored_nodes_total | elapsed_us_total |\n\
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |\n\
| {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} |\n\n\
## Rows\n\n\
| fixture | scramble_len | strategy | max_depth | max_nodes | status | solution_len | explored_nodes | elapsed_us | phase1_nodes | phase2_nodes | phase1_depth_attempts | max_phase1_depth | phase1_ordered_candidates | phase1_ordering_heuristic_evals | phase2_ordered_candidates | phase2_ordering_heuristic_evals | phase2_calls | heuristic_prunes | node_limit_hits | table_missing_entries | replay_verified | solution | message |\n\
| --- | ---: | --- | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |\n",
            self.setup_elapsed().as_micros(),
            summary.rows,
            summary.success,
            summary.failures,
            summary.replay_verified_successes,
            summary.unverified_successes,
            summary.solution_len_0_to_16,
            summary.solution_len_17_to_18,
            summary.solution_len_19_to_20,
            summary.solution_len_gt_20,
            summary.explored_nodes_total,
            summary.elapsed.as_micros(),
        ));

        for row in self.rows() {
            output.push_str(&format!(
                "| {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} |\n",
                row.fixture_id,
                row.scramble_len,
                row.strategy.id(),
                row.max_depth,
                max_nodes_label(row.max_nodes),
                row.status.label(),
                optional_usize_label(row.solution_length),
                optional_usize_label(row.explored_nodes),
                row.elapsed.as_micros(),
                optional_usize_label(row.phase1_nodes),
                optional_usize_label(row.phase2_nodes),
                optional_usize_label(row.phase1_depth_attempts),
                optional_usize_label(row.max_phase1_depth_attempted),
                optional_usize_label(row.phase1_ordered_candidates),
                optional_usize_label(row.phase1_ordering_heuristic_evals),
                optional_usize_label(row.phase2_ordered_candidates),
                optional_usize_label(row.phase2_ordering_heuristic_evals),
                optional_usize_label(row.phase2_calls),
                optional_usize_label(row.heuristic_prunes),
                optional_usize_label(row.node_limit_hits),
                optional_usize_label(row.table_missing_entries),
                optional_bool_label(row.replay_verified),
                moves_label(&row.moves),
                row.message.as_deref().unwrap_or(""),
            ));
        }

        output
    }
}
