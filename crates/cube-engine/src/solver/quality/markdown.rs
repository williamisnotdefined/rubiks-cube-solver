use super::labels::{
    max_nodes_label, moves_label, optional_str_label, optional_usize_label, replay_verified_label,
    scramble_label, strategy_label,
};
use super::summary::{
    push_quality_summary_row, quality_summary_for_all, quality_summary_for_selection,
};
use super::types::{QualityReport, QualitySolverSelection};

impl QualityReport {
    pub fn to_markdown(&self) -> String {
        let mut output = String::from(
            "# Deterministic Solver Quality Report\n\n\
Fixtures, solver selections, table availability, expectations, generated artifact metadata, and limits are fixed. Generated two-phase rows read local pruning-table artifacts from crates/cube-engine/pruning-tables by default. Elapsed time is local measurement output; use it as a rough local signal, not as a deterministic value. Compare fixture order, solver selection, expectation, table status, generated artifact depths, compatibility metadata, configured limits, status, solution length, explored nodes, and replay verification for regressions. This report does not claim optimality or a 20-move guarantee.\n\n",
        );

        output.push_str(
            "## Summary\n\n\
Status counts are grouped by solver selection. Elapsed timing stays in the row table because it is local and non-deterministic.\n\n\
| selection | rows | success | generated_tables_unavailable | generated_tables_corrupt_or_incompatible | expected_not_found_within_limits | unexpected_regression | replay_verified_successes | solution_len_range | explored_nodes_total |\n\
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: |\n",
        );

        for selection in QualitySolverSelection::ALL {
            push_quality_summary_row(
                &mut output,
                selection.label(),
                &quality_summary_for_selection(self.rows(), selection),
            );
        }
        push_quality_summary_row(&mut output, "all", &quality_summary_for_all(self.rows()));

        output.push_str(
            "\n## Rows\n\n\
| fixture | group | input | expectation | scramble | selection | strategy | max_depth | max_nodes | table_status | table_depths | table_metadata | status | solution_len | explored_nodes | elapsed_us | replay_verified | solution |\n\
| --- | --- | --- | --- | --- | --- | --- | ---: | ---: | --- | --- | --- | --- | ---: | ---: | ---: | --- | --- |\n",
        );

        for row in self.rows() {
            output.push_str(&format!(
                "| {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} |\n",
                row.fixture_id,
                row.fixture_category.label(),
                row.input_kind.label(),
                row.expectation.label(),
                scramble_label(row.scramble),
                row.solver_selection.label(),
                strategy_label(row.strategy),
                row.max_depth,
                max_nodes_label(row.max_nodes),
                row.table_status.label(),
                optional_str_label(row.generated_table_depths.as_deref()),
                optional_str_label(row.generated_table_metadata.as_deref()),
                row.status.label(),
                optional_usize_label(row.solution_length),
                row.explored_nodes,
                row.elapsed.as_micros(),
                replay_verified_label(row.replay_verified),
                moves_label(&row.moves),
            ));
        }

        output.push_str(
            "\n## Hybrid Move Ordering Experiment\n\n\
Hybrid rows compare the isolated learned-value move-ordering experiment against the `default-bounded-ida-star` fixture budgets. Value outputs are local diagnostic artifacts, while value models can score unseen child states. Model artifacts use a capped per-fixture node budget in this report to keep the experiment bounded. The learned values only order legal child moves; they do not validate states, prune branches, change limits, claim admissibility, or replace Rust replay verification. Missing, fallback, or malformed artifacts are reported as experiment statuses without changing product solver defaults.\n\n\
| fixture | group | input | expectation | scramble | baseline_selection | max_depth | max_nodes | artifact_path | artifact_status | artifact_metadata | status | solution_len | explored_nodes | elapsed_us | replay_verified | scored_move_lookups | missing_score_lookups | model_score_evals | solution |\n\
| --- | --- | --- | --- | --- | --- | ---: | ---: | --- | --- | --- | --- | ---: | ---: | ---: | --- | ---: | ---: | ---: | --- |\n",
        );

        for row in self.hybrid_rows() {
            output.push_str(&format!(
                "| {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} |\n",
                row.fixture_id,
                row.fixture_category.label(),
                row.input_kind.label(),
                row.expectation.label(),
                scramble_label(row.scramble),
                row.baseline_selection.label(),
                row.max_depth,
                max_nodes_label(row.max_nodes),
                row.artifact_path,
                row.artifact_status.label(),
                optional_str_label(row.artifact_metadata.as_deref()),
                row.status.label(),
                optional_usize_label(row.solution_length),
                row.explored_nodes,
                row.elapsed.as_micros(),
                replay_verified_label(row.replay_verified),
                row.scored_move_lookups,
                row.missing_score_lookups,
                row.model_score_evals,
                moves_label(&row.moves),
            ));
        }

        output
    }
}
