use std::path::Path;

use crate::cube::{Algorithm, Cube, Move};
use crate::search::{load_hybrid_value_model, load_hybrid_value_outputs, HybridValueArtifact};
use crate::solver::playback_facelet_solution;

use super::classical::run_quality_row;
use super::errors::QualityReportError;
use super::fixtures::{quality_fixtures, validate_quality_fixture};
use super::hybrid::run_hybrid_quality_row;
use super::tables::generated_table_summary;
use super::types::{
    QualityExpectation, QualityFixture, QualityInputKind, QualityReport, QualitySolverSelection,
};
use super::{QUALITY_REPORT_HYBRID_VALUE_OUTPUT_PATH, QUALITY_REPORT_PRUNING_TABLE_DIR};

pub fn run_quality_report() -> Result<QualityReport, QualityReportError> {
    let fixtures = quality_fixtures()?;

    run_quality_report_for_fixtures(&fixtures)
}

pub fn run_quality_report_with_hybrid_value_outputs_path(
    hybrid_value_outputs_path: impl AsRef<Path>,
) -> Result<QualityReport, QualityReportError> {
    let fixtures = quality_fixtures()?;

    run_quality_report_for_fixtures_with_pruning_table_dir_and_hybrid_value_outputs_path(
        &fixtures,
        Path::new(QUALITY_REPORT_PRUNING_TABLE_DIR),
        hybrid_value_outputs_path,
    )
}

pub fn run_quality_report_with_hybrid_value_model_path(
    hybrid_value_model_path: impl AsRef<Path>,
) -> Result<QualityReport, QualityReportError> {
    let fixtures = quality_fixtures()?;

    run_quality_report_for_fixtures_with_pruning_table_dir_and_hybrid_value_model_path(
        &fixtures,
        Path::new(QUALITY_REPORT_PRUNING_TABLE_DIR),
        hybrid_value_model_path,
    )
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
    run_quality_report_for_fixtures_with_pruning_table_dir_and_hybrid_value_outputs_path(
        fixtures,
        generated_pruning_table_dir,
        QUALITY_REPORT_HYBRID_VALUE_OUTPUT_PATH,
    )
}

pub fn run_quality_report_for_fixtures_with_pruning_table_dir_and_hybrid_value_outputs_path(
    fixtures: &[QualityFixture],
    generated_pruning_table_dir: impl AsRef<Path>,
    hybrid_value_outputs_path: impl AsRef<Path>,
) -> Result<QualityReport, QualityReportError> {
    let generated_pruning_table_dir = generated_pruning_table_dir.as_ref();
    let hybrid_value_outputs_path = hybrid_value_outputs_path.as_ref();
    let hybrid_artifact = load_hybrid_value_outputs(hybrid_value_outputs_path);

    run_quality_report_for_fixtures_with_pruning_table_dir_and_hybrid_artifact(
        fixtures,
        generated_pruning_table_dir,
        hybrid_value_outputs_path,
        hybrid_artifact,
    )
}

pub fn run_quality_report_for_fixtures_with_pruning_table_dir_and_hybrid_value_model_path(
    fixtures: &[QualityFixture],
    generated_pruning_table_dir: impl AsRef<Path>,
    hybrid_value_model_path: impl AsRef<Path>,
) -> Result<QualityReport, QualityReportError> {
    let generated_pruning_table_dir = generated_pruning_table_dir.as_ref();
    let hybrid_value_model_path = hybrid_value_model_path.as_ref();
    let hybrid_artifact = load_hybrid_value_model(hybrid_value_model_path);

    run_quality_report_for_fixtures_with_pruning_table_dir_and_hybrid_artifact(
        fixtures,
        generated_pruning_table_dir,
        hybrid_value_model_path,
        hybrid_artifact,
    )
}

fn run_quality_report_for_fixtures_with_pruning_table_dir_and_hybrid_artifact(
    fixtures: &[QualityFixture],
    generated_pruning_table_dir: &Path,
    hybrid_artifact_path: &Path,
    hybrid_artifact: HybridValueArtifact,
) -> Result<QualityReport, QualityReportError> {
    let generated_table_summary = generated_table_summary(generated_pruning_table_dir).ok();
    let mut rows = Vec::with_capacity(fixtures.len() * QualitySolverSelection::ALL.len());
    let mut hybrid_rows = Vec::with_capacity(fixtures.len());

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
        hybrid_rows.push(run_hybrid_quality_row(
            fixture,
            hybrid_artifact_path,
            &hybrid_artifact,
        )?);
    }

    Ok(QualityReport::with_hybrid_rows(rows, hybrid_rows))
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
