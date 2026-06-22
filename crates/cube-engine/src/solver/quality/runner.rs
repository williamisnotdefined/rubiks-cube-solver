use std::path::Path;

use crate::cube::{Algorithm, Cube, Move};
use crate::solver::playback_facelet_solution;

use super::classical::run_quality_row;
use super::errors::QualityReportError;
use super::fixtures::{quality_fixtures, validate_quality_fixture};
use super::tables::generated_table_summary;
use super::types::{
    QualityExpectation, QualityFixture, QualityInputKind, QualityReport, QualitySolverSelection,
};
use super::QUALITY_REPORT_PRUNING_TABLE_DIR;

pub fn run_quality_report() -> Result<QualityReport, QualityReportError> {
    let fixtures = quality_fixtures()?;

    run_quality_report_for_fixtures(&fixtures)
}

pub fn run_quality_report_for_fixtures(
    fixtures: &[QualityFixture],
) -> Result<QualityReport, QualityReportError> {
    run_quality_report_for_fixtures_with_pruning_table_dir(
        fixtures,
        QUALITY_REPORT_PRUNING_TABLE_DIR,
    )
}

pub fn run_quality_report_for_fixtures_with_pruning_table_dir(
    fixtures: &[QualityFixture],
    generated_pruning_table_dir: impl AsRef<Path>,
) -> Result<QualityReport, QualityReportError> {
    let generated_pruning_table_dir = generated_pruning_table_dir.as_ref();
    let generated_table_summary = generated_table_summary(generated_pruning_table_dir).ok();
    let mut rows = Vec::with_capacity(fixtures.len() * QualitySolverSelection::ALL.len());

    for fixture in fixtures {
        validate_quality_fixture(fixture)?;

        for solver_selection in QualitySolverSelection::ALL {
            rows.push(run_quality_row(
                fixture,
                solver_selection,
                generated_pruning_table_dir,
                generated_table_summary.as_ref(),
            )?);
        }
    }

    Ok(QualityReport::new(rows))
}

pub(super) fn expectation_for(
    fixture: &QualityFixture,
    solver_selection: QualitySolverSelection,
) -> QualityExpectation {
    fixture.solver_expectations.for_selection(solver_selection)
}

pub(super) fn replay_verifies(fixture: &QualityFixture, moves: &[Move]) -> bool {
    match fixture.input_kind {
        QualityInputKind::Facelet => playback_facelet_solution(
            &fixture.facelets,
            &Algorithm::new(moves.to_vec()).to_string(),
        )
        .map(|result| result.final_is_solved())
        .unwrap_or(false),
        QualityInputKind::Cubie => {
            let Ok(mut cube) = Cube::try_from_state(fixture.state.clone()) else {
                return false;
            };
            cube.apply_moves(moves);

            cube.is_solved()
        }
    }
}
