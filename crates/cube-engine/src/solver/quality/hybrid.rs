use std::path::Path;
use std::time::{Duration, Instant};

use crate::cube::{Cube, Move};
use crate::search::{
    solve_hybrid_move_ordering, HybridMoveOrderingMetrics, HybridValueArtifact,
    HybridValueArtifactStatus, SearchBudget, SearchOutcome,
};

use super::errors::QualityReportError;
use super::runner::{expectation_for, replay_verifies};
use super::types::{
    QualityExpectation, QualityFixture, QualityHybridArtifactStatus, QualityHybridReportRow,
    QualityHybridReportStatus, QualitySolverSelection,
};
use super::{
    QUALITY_REPORT_HYBRID_VALUE_MODEL_EXPECTED_NOT_FOUND_NODE_CAP,
    QUALITY_REPORT_HYBRID_VALUE_MODEL_NODE_CAP,
};

pub(super) fn run_hybrid_quality_row(
    fixture: &QualityFixture,
    hybrid_value_outputs_path: &Path,
    artifact: &HybridValueArtifact,
) -> Result<QualityHybridReportRow, QualityReportError> {
    let expectation = expectation_for(fixture, QualitySolverSelection::DefaultBoundedIdaStar);
    let artifact_status = quality_hybrid_artifact_status(artifact.status());
    let artifact_metadata = artifact.metadata_label();
    let hybrid_max_nodes = hybrid_max_nodes_for_artifact(fixture.max_nodes, expectation, artifact);

    let HybridValueArtifact::Available(value_source) = artifact else {
        return Ok(hybrid_report_row(
            fixture,
            expectation,
            fixture.max_nodes,
            hybrid_value_outputs_path,
            artifact_status,
            artifact_metadata,
            unavailable_hybrid_status(artifact_status),
            None,
            0,
            Duration::ZERO,
            None,
            HybridMoveOrderingMetrics::default(),
            Vec::new(),
        ));
    };

    let cube = Cube::try_from_state(fixture.state.clone()).map_err(|error| {
        QualityReportError::FixtureCubieValidation {
            fixture_id: fixture.id,
            error,
        }
    })?;
    let started = Instant::now();
    let result = solve_hybrid_move_ordering(
        &cube,
        SearchBudget::with_limits(fixture.max_depth, hybrid_max_nodes),
        value_source,
    );
    let elapsed = started.elapsed();

    match result.outcome {
        SearchOutcome::Found(solution) => {
            let replay_verified = replay_verifies(fixture, solution.moves());
            let status = if replay_verified {
                QualityHybridReportStatus::Success
            } else {
                QualityHybridReportStatus::UnexpectedRegression
            };

            Ok(hybrid_report_row(
                fixture,
                expectation,
                hybrid_max_nodes,
                hybrid_value_outputs_path,
                artifact_status,
                artifact_metadata,
                status,
                Some(solution.len()),
                solution.explored_nodes(),
                elapsed,
                Some(replay_verified),
                result.metrics,
                solution.moves,
            ))
        }
        SearchOutcome::NotFoundWithinLimits { explored_nodes } => {
            let status = match expectation {
                QualityExpectation::RequiredSuccess => {
                    QualityHybridReportStatus::UnexpectedRegression
                }
                QualityExpectation::ExpectedNotFoundWithinLimits => {
                    QualityHybridReportStatus::ExpectedNotFoundWithinLimits
                }
            };

            Ok(hybrid_report_row(
                fixture,
                expectation,
                hybrid_max_nodes,
                hybrid_value_outputs_path,
                artifact_status,
                artifact_metadata,
                status,
                None,
                explored_nodes,
                elapsed,
                None,
                result.metrics,
                Vec::new(),
            ))
        }
    }
}

#[allow(clippy::too_many_arguments)]
fn hybrid_report_row(
    fixture: &QualityFixture,
    expectation: QualityExpectation,
    max_nodes: Option<usize>,
    hybrid_value_outputs_path: &Path,
    artifact_status: QualityHybridArtifactStatus,
    artifact_metadata: Option<String>,
    status: QualityHybridReportStatus,
    solution_length: Option<usize>,
    explored_nodes: usize,
    elapsed: Duration,
    replay_verified: Option<bool>,
    metrics: HybridMoveOrderingMetrics,
    moves: Vec<Move>,
) -> QualityHybridReportRow {
    QualityHybridReportRow {
        fixture_id: fixture.id,
        fixture_category: fixture.category,
        input_kind: fixture.input_kind,
        expectation,
        scramble: fixture.scramble,
        baseline_selection: QualitySolverSelection::DefaultBoundedIdaStar,
        max_depth: fixture.max_depth,
        max_nodes,
        artifact_path: hybrid_value_outputs_path.display().to_string(),
        artifact_status,
        artifact_metadata,
        status,
        solution_length,
        explored_nodes,
        elapsed,
        replay_verified,
        scored_move_lookups: metrics.scored_move_lookups,
        missing_score_lookups: metrics.missing_score_lookups,
        model_score_evals: metrics.model_score_evals,
        moves,
    }
}

fn hybrid_max_nodes_for_artifact(
    fixture_max_nodes: Option<usize>,
    expectation: QualityExpectation,
    artifact: &HybridValueArtifact,
) -> Option<usize> {
    if artifact.is_model() {
        let cap = match expectation {
            QualityExpectation::RequiredSuccess => QUALITY_REPORT_HYBRID_VALUE_MODEL_NODE_CAP,
            QualityExpectation::ExpectedNotFoundWithinLimits => {
                QUALITY_REPORT_HYBRID_VALUE_MODEL_EXPECTED_NOT_FOUND_NODE_CAP
            }
        };
        Some(fixture_max_nodes.unwrap_or(cap).min(cap))
    } else {
        fixture_max_nodes
    }
}

fn quality_hybrid_artifact_status(
    status: HybridValueArtifactStatus,
) -> QualityHybridArtifactStatus {
    match status {
        HybridValueArtifactStatus::Available => QualityHybridArtifactStatus::Available,
        HybridValueArtifactStatus::Missing => QualityHybridArtifactStatus::Missing,
        HybridValueArtifactStatus::DependencyFallback => {
            QualityHybridArtifactStatus::DependencyFallback
        }
        HybridValueArtifactStatus::Malformed => QualityHybridArtifactStatus::Malformed,
    }
}

fn unavailable_hybrid_status(
    artifact_status: QualityHybridArtifactStatus,
) -> QualityHybridReportStatus {
    match artifact_status {
        QualityHybridArtifactStatus::Available => QualityHybridReportStatus::UnexpectedRegression,
        QualityHybridArtifactStatus::Missing => QualityHybridReportStatus::ArtifactUnavailable,
        QualityHybridArtifactStatus::DependencyFallback => {
            QualityHybridReportStatus::ArtifactDependencyFallback
        }
        QualityHybridArtifactStatus::Malformed => QualityHybridReportStatus::ArtifactMalformed,
    }
}
