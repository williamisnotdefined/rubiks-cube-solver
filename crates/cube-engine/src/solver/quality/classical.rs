use std::path::Path;
use std::time::{Duration, Instant};

use crate::cube::Move;
use crate::solver::{
    solve_cubie_state, solve_facelet_string, SolveError, SolverConfig, SolverStrategy,
};

use super::errors::QualityReportError;
use super::labels::table_status_for_success;
use super::runner::{expectation_for, replay_verifies};
use super::types::{
    QualityExpectation, QualityFixture, QualityGeneratedTableSummary, QualityInputKind,
    QualityReportRow, QualityReportStatus, QualitySolverSelection, QualityTableStatus,
};

pub(super) fn run_quality_row(
    fixture: &QualityFixture,
    solver_selection: QualitySolverSelection,
    generated_pruning_table_dir: &Path,
    generated_table_summary: Option<&QualityGeneratedTableSummary>,
) -> Result<QualityReportRow, QualityReportError> {
    let expectation = expectation_for(fixture, solver_selection);
    let mut config = solver_selection.config(fixture.max_depth, fixture.max_nodes);
    if matches!(
        config.strategy,
        SolverStrategy::GeneratedTwoPhase
            | SolverStrategy::GeneratedTwoPhaseQuality
            | SolverStrategy::GeneratedTwoPhaseMultiprobe
            | SolverStrategy::OptimalBoundedCornerPdb
            | SolverStrategy::OptimalBoundedPdb16
    ) {
        config = config.with_pruning_table_dir(generated_pruning_table_dir.to_path_buf());
    }
    let started = Instant::now();
    let result = match fixture.input_kind {
        QualityInputKind::Facelet => solve_facelet_string(&fixture.facelets, config.clone()),
        QualityInputKind::Cubie => solve_cubie_state(fixture.state.clone(), config.clone()),
    };
    let elapsed = started.elapsed();

    match result {
        Ok(result) => {
            let replay_verified = replay_verifies(fixture, result.moves());
            let status = if replay_verified {
                QualityReportStatus::Success
            } else {
                QualityReportStatus::UnexpectedRegression
            };

            Ok(report_row(
                fixture,
                solver_selection,
                expectation,
                &config,
                table_status_for_success(config.strategy),
                generated_table_summary,
                status,
                Some(result.length()),
                result.explored_nodes(),
                elapsed,
                Some(replay_verified),
                result.moves,
            ))
        }
        Err(SolveError::NotFoundWithinLimits { explored_nodes, .. }) => {
            let status = match expectation {
                QualityExpectation::RequiredSuccess => QualityReportStatus::UnexpectedRegression,
                QualityExpectation::ExpectedNotFoundWithinLimits => {
                    QualityReportStatus::ExpectedNotFoundWithinLimits
                }
            };

            Ok(report_row(
                fixture,
                solver_selection,
                expectation,
                &config,
                table_status_for_success(config.strategy),
                generated_table_summary,
                status,
                None,
                explored_nodes,
                elapsed,
                None,
                Vec::new(),
            ))
        }
        Err(SolveError::GeneratedTablesUnavailable { .. }) => Ok(report_row(
            fixture,
            solver_selection,
            expectation,
            &config,
            QualityTableStatus::Unavailable,
            generated_table_summary,
            QualityReportStatus::GeneratedTablesUnavailable,
            None,
            0,
            elapsed,
            None,
            Vec::new(),
        )),
        Err(SolveError::GeneratedTablesCorrupt { .. }) => Ok(report_row(
            fixture,
            solver_selection,
            expectation,
            &config,
            QualityTableStatus::CorruptOrIncompatible,
            generated_table_summary,
            QualityReportStatus::GeneratedTablesCorruptOrIncompatible,
            None,
            0,
            elapsed,
            None,
            Vec::new(),
        )),
        Err(SolveError::InvalidInput { .. }) => Ok(report_row(
            fixture,
            solver_selection,
            expectation,
            &config,
            table_status_for_success(config.strategy),
            generated_table_summary,
            QualityReportStatus::UnexpectedRegression,
            None,
            0,
            elapsed,
            None,
            Vec::new(),
        )),
    }
}

#[allow(clippy::too_many_arguments)]
fn report_row(
    fixture: &QualityFixture,
    solver_selection: QualitySolverSelection,
    expectation: QualityExpectation,
    config: &SolverConfig,
    table_status: QualityTableStatus,
    generated_table_summary: Option<&QualityGeneratedTableSummary>,
    status: QualityReportStatus,
    solution_length: Option<usize>,
    explored_nodes: usize,
    elapsed: Duration,
    replay_verified: Option<bool>,
    moves: Vec<Move>,
) -> QualityReportRow {
    let (generated_table_depths, generated_table_metadata) = if matches!(
        config.strategy,
        SolverStrategy::GeneratedTwoPhase
            | SolverStrategy::GeneratedTwoPhaseQuality
            | SolverStrategy::GeneratedTwoPhaseMultiprobe
            | SolverStrategy::OptimalBoundedCornerPdb
            | SolverStrategy::OptimalBoundedPdb16
    ) && table_status
        == QualityTableStatus::Available
    {
        generated_table_summary
            .map(|summary| (Some(summary.depths.clone()), Some(summary.metadata.clone())))
            .unwrap_or((None, None))
    } else {
        (None, None)
    };

    QualityReportRow {
        fixture_id: fixture.id,
        fixture_category: fixture.category,
        input_kind: fixture.input_kind,
        expectation,
        scramble: fixture.scramble,
        solver_selection,
        strategy: config.strategy,
        max_depth: config.max_depth,
        max_nodes: config.max_nodes,
        table_status,
        generated_table_depths,
        generated_table_metadata,
        status,
        solution_length,
        explored_nodes,
        elapsed,
        replay_verified,
        moves,
    }
}
