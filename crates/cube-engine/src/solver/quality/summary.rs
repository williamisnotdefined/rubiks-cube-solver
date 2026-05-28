use super::types::{QualityReportRow, QualityReportStatus, QualitySolverSelection};

#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub(super) struct QualityReportSummary {
    rows: usize,
    success: usize,
    generated_tables_unavailable: usize,
    generated_tables_corrupt_or_incompatible: usize,
    expected_not_found_within_limits: usize,
    unexpected_regression: usize,
    replay_verified_successes: usize,
    solution_len_min: Option<usize>,
    solution_len_max: Option<usize>,
    explored_nodes_total: usize,
}

impl QualityReportSummary {
    fn record(&mut self, row: &QualityReportRow) {
        self.rows += 1;
        match row.status {
            QualityReportStatus::Success => self.success += 1,
            QualityReportStatus::GeneratedTablesUnavailable => {
                self.generated_tables_unavailable += 1;
            }
            QualityReportStatus::GeneratedTablesCorruptOrIncompatible => {
                self.generated_tables_corrupt_or_incompatible += 1;
            }
            QualityReportStatus::ExpectedNotFoundWithinLimits => {
                self.expected_not_found_within_limits += 1;
            }
            QualityReportStatus::UnexpectedRegression => self.unexpected_regression += 1,
        }
        if row.status == QualityReportStatus::Success && row.replay_verified == Some(true) {
            self.replay_verified_successes += 1;
        }
        if let Some(solution_length) = row.solution_length {
            self.solution_len_min = Some(match self.solution_len_min {
                Some(current) => current.min(solution_length),
                None => solution_length,
            });
            self.solution_len_max = Some(match self.solution_len_max {
                Some(current) => current.max(solution_length),
                None => solution_length,
            });
        }
        self.explored_nodes_total += row.explored_nodes;
    }

    fn solution_len_range_label(&self) -> String {
        match (self.solution_len_min, self.solution_len_max) {
            (Some(min), Some(max)) if min == max => min.to_string(),
            (Some(min), Some(max)) => format!("{min}-{max}"),
            _ => "-".to_owned(),
        }
    }
}

pub(super) fn quality_summary_for_selection(
    rows: &[QualityReportRow],
    selection: QualitySolverSelection,
) -> QualityReportSummary {
    let mut summary = QualityReportSummary::default();
    for row in rows.iter().filter(|row| row.solver_selection == selection) {
        summary.record(row);
    }

    summary
}

pub(super) fn quality_summary_for_all(rows: &[QualityReportRow]) -> QualityReportSummary {
    let mut summary = QualityReportSummary::default();
    for row in rows {
        summary.record(row);
    }

    summary
}

pub(super) fn push_quality_summary_row(
    output: &mut String,
    selection_label: &str,
    summary: &QualityReportSummary,
) {
    output.push_str(&format!(
        "| {} | {} | {} | {} | {} | {} | {} | {} | {} | {} |\n",
        selection_label,
        summary.rows,
        summary.success,
        summary.generated_tables_unavailable,
        summary.generated_tables_corrupt_or_incompatible,
        summary.expected_not_found_within_limits,
        summary.unexpected_regression,
        summary.replay_verified_successes,
        summary.solution_len_range_label(),
        summary.explored_nodes_total,
    ));
}
