use std::fs;
use std::path::PathBuf;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use cube_engine::search::pruning::generate_all_pruning_tables;
use cube_engine::solver::quality::{
    quality_fixtures,
    run_quality_report_for_fixtures_with_pruning_table_dir_and_hybrid_value_model_path,
    run_quality_report_for_fixtures_with_pruning_table_dir_and_hybrid_value_outputs_path,
    QualityExpectation, QualityFixtureCategory, QualityHybridArtifactStatus,
    QualityHybridReportRow, QualityHybridReportStatus, QualityInputKind, QualityReport,
    QualityReportRow, QualityReportStatus, QualitySolverSelection, QualityTableStatus,
};
use cube_engine::{Algorithm, Cube, FaceletString, Move};

#[test]
fn solver_quality_report_fixtures_cover_valid_shared_catalog_inputs() {
    let fixtures = quality_fixtures().expect("quality fixtures should build");

    for category in [
        QualityFixtureCategory::Solved,
        QualityFixtureCategory::Shallow,
        QualityFixtureCategory::Nontrivial,
        QualityFixtureCategory::MidDepth,
        QualityFixtureCategory::Harder,
    ] {
        assert!(fixtures.iter().any(|fixture| {
            fixture.category == category && fixture.input_kind == QualityInputKind::Facelet
        }));
        assert!(fixtures.iter().any(|fixture| {
            fixture.category == category && fixture.input_kind == QualityInputKind::Cubie
        }));
    }

    for fixture in fixtures {
        fixture
            .state
            .validate()
            .expect("fixture cubie state should be valid");

        let recovered = FaceletString::parse(&fixture.facelets)
            .expect("fixture facelets should parse")
            .to_cubie_state()
            .expect("fixture facelets should convert to cubies");
        assert_eq!(recovered, fixture.state, "{}", fixture.id);

        if matches!(
            fixture.category,
            QualityFixtureCategory::MidDepth | QualityFixtureCategory::Harder
        ) {
            let cube = Cube::try_from_state(fixture.state.clone())
                .expect("expected-limit fixture should be a valid cube");
            assert!(!cube.is_solved(), "{}", fixture.id);
            assert_eq!(
                fixture.expectation,
                QualityExpectation::ExpectedNotFoundWithinLimits,
                "{}",
                fixture.id
            );
        } else {
            assert_eq!(
                fixture.expectation,
                QualityExpectation::RequiredSuccess,
                "{}",
                fixture.id
            );
        }
    }

    for fixture_id in [
        "generated-mid-depth-facelets-phase2-five-move",
        "generated-mid-depth-cubie-phase2-five-move",
        "generated-harder-facelets-phase2-eight-move",
        "generated-harder-cubie-phase2-eight-move",
    ] {
        let fixture = quality_fixtures()
            .expect("quality fixtures should build")
            .into_iter()
            .find(|fixture| fixture.id == fixture_id)
            .expect("generated fixture should exist");

        assert_eq!(
            fixture
                .solver_expectations
                .for_selection(QualitySolverSelection::DefaultBoundedIdaStar),
            QualityExpectation::ExpectedNotFoundWithinLimits,
            "{}",
            fixture.id
        );
        assert_eq!(
            fixture
                .solver_expectations
                .for_selection(QualitySolverSelection::GeneratedTwoPhase),
            QualityExpectation::RequiredSuccess,
            "{}",
            fixture.id
        );
    }
}

#[test]
fn solver_quality_report_includes_each_solver_selection_for_each_fixture() {
    let fixtures = quality_fixtures().expect("quality fixtures should build");
    let directory = temp_test_dir("selection-missing-hybrid");
    let hybrid_path = directory.join("missing-value_outputs.tsv");
    let report =
        run_quality_report_for_fixtures_with_pruning_table_dir_and_hybrid_value_outputs_path(
            &fixtures,
            &directory,
            &hybrid_path,
        )
        .expect("quality report should run");

    assert_eq!(
        report.rows().len(),
        fixtures.len() * QualitySolverSelection::ALL.len()
    );
    assert_eq!(report.hybrid_rows().len(), fixtures.len());

    for fixture in &fixtures {
        assert!(report.rows().iter().any(|row| {
            row.fixture_id == fixture.id
                && row.solver_selection == QualitySolverSelection::DefaultBoundedIdaStar
        }));
        assert!(report.rows().iter().any(|row| {
            row.fixture_id == fixture.id
                && row.solver_selection == QualitySolverSelection::GeneratedTwoPhase
        }));
        assert!(report.hybrid_rows().iter().any(|row| {
            row.fixture_id == fixture.id
                && row.baseline_selection == QualitySolverSelection::DefaultBoundedIdaStar
        }));
    }

    let _ = fs::remove_dir_all(directory);
}

#[test]
fn solver_quality_report_successful_rows_are_replay_verified_and_lengths_match() {
    let fixtures = quality_fixtures().expect("quality fixtures should build");
    let directory = temp_test_dir("success-missing-hybrid");
    let hybrid_path = directory.join("missing-value_outputs.tsv");
    let report =
        run_quality_report_for_fixtures_with_pruning_table_dir_and_hybrid_value_outputs_path(
            &fixtures,
            &directory,
            &hybrid_path,
        )
        .expect("quality report should run");
    let successes = report
        .rows()
        .iter()
        .filter(|row| row.status == QualityReportStatus::Success)
        .collect::<Vec<_>>();

    assert!(!successes.is_empty());

    for row in successes {
        assert_eq!(row.replay_verified, Some(true), "{}", row.fixture_id);
        assert_ne!(row.table_status, QualityTableStatus::Unavailable);
        assert_ne!(row.table_status, QualityTableStatus::CorruptOrIncompatible);
        assert_eq!(
            row.solution_length,
            Some(row.moves.len()),
            "{}",
            row.fixture_id
        );
        assert!(
            row.explored_nodes > 0,
            "successful row should include explored nodes for {}",
            row.fixture_id
        );
    }

    let _ = fs::remove_dir_all(directory);
}

#[test]
fn solver_quality_report_generated_rows_report_success_metrics_when_tables_are_available() {
    let fixtures = quality_fixtures()
        .expect("quality fixtures should build")
        .into_iter()
        .filter(|fixture| fixture.max_depth <= 6)
        .collect::<Vec<_>>();
    let directory = temp_test_dir("available");
    generate_all_pruning_tables(&directory, 6, 6)
        .expect("depth-six generated pruning tables should build for quality report test");
    let hybrid_path = directory.join("missing-value_outputs.tsv");
    let report =
        run_quality_report_for_fixtures_with_pruning_table_dir_and_hybrid_value_outputs_path(
            &fixtures,
            &directory,
            &hybrid_path,
        )
        .expect("quality report should run with generated tables");
    let generated_successes = report
        .rows()
        .iter()
        .filter(|row| {
            row.solver_selection == QualitySolverSelection::GeneratedTwoPhase
                && row.status == QualityReportStatus::Success
        })
        .collect::<Vec<_>>();

    assert!(!generated_successes.is_empty());
    for fixture_id in [
        "solved-facelets",
        "solved-cubie",
        "shallow-facelets-f",
        "shallow-cubie-r-u",
        "nontrivial-facelets-r-u-rprime-uprime",
        "nontrivial-cubie-r-u-rprime-uprime",
        "generated-mid-depth-facelets-phase2-five-move",
        "generated-mid-depth-cubie-phase2-five-move",
    ] {
        let fixture = fixtures
            .iter()
            .find(|fixture| fixture.id == fixture_id)
            .expect("expected generated fixture should exist");
        let row = generated_successes
            .iter()
            .find(|row| row.fixture_id == fixture_id)
            .unwrap_or_else(|| {
                panic!("generated report should include a success row for {fixture_id}")
            });

        assert_eq!(
            fixture
                .solver_expectations
                .for_selection(QualitySolverSelection::GeneratedTwoPhase),
            QualityExpectation::RequiredSuccess,
            "{}",
            fixture.id
        );
        assert_eq!(row.expectation, QualityExpectation::RequiredSuccess);
        assert_eq!(row.max_depth, fixture.max_depth);
        assert_eq!(row.max_nodes, fixture.max_nodes);
    }

    for row in generated_successes {
        assert_eq!(
            row.solver_selection,
            QualitySolverSelection::GeneratedTwoPhase,
            "{}",
            row.fixture_id
        );
        assert_eq!(
            row.strategy,
            cube_engine::SolverStrategy::GeneratedTwoPhase,
            "{}",
            row.fixture_id
        );
        assert_eq!(
            row.table_status,
            QualityTableStatus::Available,
            "{}",
            row.fixture_id
        );
        assert_eq!(row.replay_verified, Some(true), "{}", row.fixture_id);
        assert_eq!(
            row.solution_length,
            Some(row.moves.len()),
            "{}",
            row.fixture_id
        );
        assert!(
            row.solution_length.expect("success rows have a length") <= row.max_depth,
            "{}",
            row.fixture_id
        );
        assert!(
            row.explored_nodes > 0,
            "generated success row should include explored nodes for {}",
            row.fixture_id
        );
        assert_eq!(
            row.generated_table_depths.as_deref(),
            Some("phase1=6/6/6;phase2=6/6"),
            "{}",
            row.fixture_id
        );
        let metadata = row
            .generated_table_metadata
            .as_deref()
            .expect("generated success row should include table metadata");
        assert!(metadata.contains("format=2"), "{}", row.fixture_id);
        assert!(metadata.contains("tables=5"), "{}", row.fixture_id);
        assert!(
            metadata.contains("generated-phase1-corner-edge-orientation-v2"),
            "{}",
            row.fixture_id
        );
        assert!(
            metadata.contains("phase1-face-turn-metric-v1"),
            "{}",
            row.fixture_id
        );
        assert!(
            metadata.contains("phase2-g1-metric-v1"),
            "{}",
            row.fixture_id
        );
        assert!(
            metadata.contains("sources=deterministic generated pruning-table command"),
            "{}",
            row.fixture_id
        );
        assert!(metadata.contains("coordinates="), "{}", row.fixture_id);
        assert!(
            metadata.contains("corner_orientation:2187+edge_orientation:2048"),
            "{}",
            row.fixture_id
        );
    }

    let _ = fs::remove_dir_all(directory);
}

#[test]
fn solver_quality_report_records_generated_table_availability() {
    let fixtures = quality_fixtures().expect("quality fixtures should build");
    let directory = temp_test_dir("missing");
    let hybrid_path = directory.join("missing-value_outputs.tsv");
    let report =
        run_quality_report_for_fixtures_with_pruning_table_dir_and_hybrid_value_outputs_path(
            &fixtures,
            &directory,
            &hybrid_path,
        )
        .expect("quality report should run with missing generated tables and hybrid values");
    let unavailable = report
        .rows()
        .iter()
        .filter(|row| row.status == QualityReportStatus::GeneratedTablesUnavailable)
        .collect::<Vec<_>>();

    assert_eq!(unavailable.len(), fixtures.len());
    assert!(unavailable.iter().all(|row| {
        row.solver_selection == QualitySolverSelection::GeneratedTwoPhase
            && row.strategy == cube_engine::SolverStrategy::GeneratedTwoPhase
            && row.table_status == QualityTableStatus::Unavailable
            && row.solution_length.is_none()
            && row.moves.is_empty()
            && row.replay_verified.is_none()
    }));
}

#[test]
fn solver_quality_report_exposes_gate_failure_statuses() {
    assert!(!QualityReportStatus::Success.is_gate_failure());
    assert!(!QualityReportStatus::ExpectedNotFoundWithinLimits.is_gate_failure());
    assert!(QualityReportStatus::GeneratedTablesUnavailable.is_gate_failure());
    assert!(QualityReportStatus::GeneratedTablesCorruptOrIncompatible.is_gate_failure());
    assert!(QualityReportStatus::UnexpectedRegression.is_gate_failure());

    assert!(!QualityHybridReportStatus::Success.is_gate_failure());
    assert!(!QualityHybridReportStatus::ExpectedNotFoundWithinLimits.is_gate_failure());
    assert!(!QualityHybridReportStatus::ArtifactDependencyFallback.is_gate_failure());
    assert!(QualityHybridReportStatus::ArtifactUnavailable.is_gate_failure());
    assert!(QualityHybridReportStatus::ArtifactMalformed.is_gate_failure());
    assert!(QualityHybridReportStatus::UnexpectedRegression.is_gate_failure());
}

#[test]
fn solver_quality_report_detects_report_level_gate_failures() {
    let successful_report = QualityReport::with_hybrid_rows(
        vec![quality_row(QualityReportStatus::Success)],
        vec![
            hybrid_row(QualityHybridReportStatus::Success),
            hybrid_row(QualityHybridReportStatus::ArtifactDependencyFallback),
        ],
    );
    assert!(!successful_report.has_gate_failures());

    let native_failure = QualityReport::with_hybrid_rows(
        vec![quality_row(QualityReportStatus::GeneratedTablesUnavailable)],
        vec![hybrid_row(QualityHybridReportStatus::Success)],
    );
    assert!(native_failure.has_gate_failures());

    let hybrid_failure = QualityReport::with_hybrid_rows(
        vec![quality_row(QualityReportStatus::Success)],
        vec![hybrid_row(QualityHybridReportStatus::ArtifactMalformed)],
    );
    assert!(hybrid_failure.has_gate_failures());
}

#[test]
fn solver_quality_report_records_missing_hybrid_value_outputs_without_changing_classical_rows() {
    let fixtures = quality_fixtures().expect("quality fixtures should build");
    let directory = temp_test_dir("hybrid-missing");
    let hybrid_path = directory.join("missing-value_outputs.tsv");
    let report =
        run_quality_report_for_fixtures_with_pruning_table_dir_and_hybrid_value_outputs_path(
            &fixtures,
            &directory,
            &hybrid_path,
        )
        .expect("quality report should run with missing hybrid value outputs");

    assert_eq!(
        report.rows().len(),
        fixtures.len() * QualitySolverSelection::ALL.len()
    );
    assert_eq!(report.hybrid_rows().len(), fixtures.len());
    assert!(report.hybrid_rows().iter().all(|row| {
        row.artifact_path == hybrid_path.display().to_string()
            && row.artifact_status == QualityHybridArtifactStatus::Missing
            && row.status == QualityHybridReportStatus::ArtifactUnavailable
            && row.solution_length.is_none()
            && row.explored_nodes == 0
            && row.replay_verified.is_none()
            && row.scored_move_lookups == 0
            && row.missing_score_lookups == 0
            && row.model_score_evals == 0
            && row.moves.is_empty()
    }));

    let _ = fs::remove_dir_all(directory);
}

#[test]
fn solver_quality_report_records_hybrid_dependency_fallback_metadata() {
    let fixture = single_quality_fixture("shallow-facelets-f");
    let directory = temp_test_dir("hybrid-fallback");
    fs::create_dir_all(&directory).expect("temp directory should be created");
    let hybrid_path = directory.join("value_outputs.tsv");
    write_value_outputs_artifact(
        &hybrid_path,
        "constant_train_mean_dependency_fallback",
        false,
        &[(Cube::solved().state().serialize(), 1.0)],
    );

    let report =
        run_quality_report_for_fixtures_with_pruning_table_dir_and_hybrid_value_outputs_path(
            &[fixture],
            &directory,
            &hybrid_path,
        )
        .expect("quality report should run with fallback hybrid value outputs");
    let row = report
        .hybrid_rows()
        .first()
        .expect("hybrid fallback row should exist");

    assert_eq!(
        row.artifact_status,
        QualityHybridArtifactStatus::DependencyFallback
    );
    assert_eq!(
        row.status,
        QualityHybridReportStatus::ArtifactDependencyFallback
    );
    assert_eq!(row.explored_nodes, 0);
    assert!(row.moves.is_empty());
    let metadata = row
        .artifact_metadata
        .as_deref()
        .expect("fallback metadata should be reported");
    assert!(metadata.contains("model_type=constant_train_mean_dependency_fallback"));
    assert!(metadata.contains("pytorch_available=false"));

    let _ = fs::remove_dir_all(directory);
}

#[test]
fn solver_quality_report_records_malformed_hybrid_value_outputs() {
    let fixture = single_quality_fixture("shallow-facelets-f");
    let directory = temp_test_dir("hybrid-malformed");
    fs::create_dir_all(&directory).expect("temp directory should be created");
    let hybrid_path = directory.join("value_outputs.tsv");
    fs::write(
        &hybrid_path,
        "# format=rubiks_cube_solver_value_outputs_v1\n# model_type=pytorch_mlp\n# pytorch_available=true\nnot-a-state\t1.0\n",
    )
    .expect("malformed value outputs should be writable");

    let report =
        run_quality_report_for_fixtures_with_pruning_table_dir_and_hybrid_value_outputs_path(
            &[fixture],
            &directory,
            &hybrid_path,
        )
        .expect("quality report should run with malformed hybrid value outputs");
    let row = report
        .hybrid_rows()
        .first()
        .expect("hybrid malformed row should exist");

    assert_eq!(row.artifact_status, QualityHybridArtifactStatus::Malformed);
    assert_eq!(row.status, QualityHybridReportStatus::ArtifactMalformed);
    assert_eq!(row.explored_nodes, 0);
    assert!(row
        .artifact_metadata
        .as_deref()
        .expect("malformed metadata should include the error")
        .contains("invalid CubieState"));

    let _ = fs::remove_dir_all(directory);
}

#[test]
fn solver_quality_report_uses_available_hybrid_values_for_replay_verified_move_ordering() {
    let fixture = single_quality_fixture("shallow-facelets-f");
    let directory = temp_test_dir("hybrid-available");
    fs::create_dir_all(&directory).expect("temp directory should be created");
    let hybrid_path = directory.join("value_outputs.tsv");
    write_value_outputs_artifact(
        &hybrid_path,
        "pytorch_mlp",
        true,
        &[(Cube::solved().state().serialize(), 0.0)],
    );

    let report =
        run_quality_report_for_fixtures_with_pruning_table_dir_and_hybrid_value_outputs_path(
            &[fixture],
            &directory,
            &hybrid_path,
        )
        .expect("quality report should run with available hybrid value outputs");

    assert_eq!(report.rows().len(), QualitySolverSelection::ALL.len());
    assert!(report.rows().iter().any(|row| {
        row.solver_selection == QualitySolverSelection::DefaultBoundedIdaStar
            && row.status == QualityReportStatus::Success
            && row.replay_verified == Some(true)
    }));

    let row = report
        .hybrid_rows()
        .first()
        .expect("hybrid available row should exist");
    assert_eq!(row.artifact_status, QualityHybridArtifactStatus::Available);
    assert_eq!(row.status, QualityHybridReportStatus::Success);
    assert_eq!(row.replay_verified, Some(true));
    assert_eq!(row.solution_length, Some(1));
    assert_eq!(row.moves, vec![Move::FPrime]);
    assert!(row.explored_nodes > 0);
    assert!(row.scored_move_lookups > 0);
    assert!(row.missing_score_lookups > 0);
    assert_eq!(row.model_score_evals, 0);
    assert!(row
        .artifact_metadata
        .as_deref()
        .expect("available metadata should be reported")
        .contains("model_type=pytorch_mlp"));

    let _ = fs::remove_dir_all(directory);
}

#[test]
fn solver_quality_report_uses_hybrid_value_model_for_unseen_move_scores() {
    let fixture = single_quality_fixture("shallow-facelets-f");
    let directory = temp_test_dir("hybrid-model");
    fs::create_dir_all(&directory).expect("temp directory should be created");
    let hybrid_path = directory.join("model.json");
    write_constant_model_artifact(&hybrid_path);

    let report =
        run_quality_report_for_fixtures_with_pruning_table_dir_and_hybrid_value_model_path(
            &[fixture],
            &directory,
            &hybrid_path,
        )
        .expect("quality report should run with available hybrid value model");

    let row = report
        .hybrid_rows()
        .first()
        .expect("hybrid model row should exist");
    assert_eq!(row.artifact_status, QualityHybridArtifactStatus::Available);
    assert_eq!(row.status, QualityHybridReportStatus::Success);
    assert_eq!(row.replay_verified, Some(true));
    assert_eq!(row.solution_length, Some(1));
    assert_eq!(row.moves, vec![Move::FPrime]);
    assert!(row.scored_move_lookups > 0);
    assert_eq!(row.missing_score_lookups, 0);
    assert_eq!(row.model_score_evals, row.scored_move_lookups);
    assert!(row
        .artifact_metadata
        .as_deref()
        .expect("model metadata should be reported")
        .contains("format=rubiks_cube_solver_value_model_v1"));

    let _ = fs::remove_dir_all(directory);
}

#[test]
fn solver_quality_report_records_generated_table_corrupt_or_incompatible() {
    let fixtures = quality_fixtures().expect("quality fixtures should build");
    let directory = temp_test_dir("corrupt");
    let paths = generate_all_pruning_tables(&directory, 2, 2)
        .expect("generated pruning tables should build for corruption test");
    let first_path = paths
        .first()
        .expect("generator should return generated table paths");
    let mut bytes = fs::read(first_path).expect("generated artifact should be readable");
    bytes[12] ^= 0x01;
    fs::write(first_path, bytes).expect("generated artifact should be corruptible");

    let hybrid_path = directory.join("missing-value_outputs.tsv");
    let report =
        run_quality_report_for_fixtures_with_pruning_table_dir_and_hybrid_value_outputs_path(
            &fixtures,
            &directory,
            &hybrid_path,
        )
        .expect("quality report should run with corrupt generated tables");
    let corrupt = report
        .rows()
        .iter()
        .filter(|row| row.status == QualityReportStatus::GeneratedTablesCorruptOrIncompatible)
        .collect::<Vec<_>>();

    assert_eq!(corrupt.len(), fixtures.len());
    assert!(corrupt.iter().all(|row| {
        row.solver_selection == QualitySolverSelection::GeneratedTwoPhase
            && row.strategy == cube_engine::SolverStrategy::GeneratedTwoPhase
            && row.table_status == QualityTableStatus::CorruptOrIncompatible
            && row.solution_length.is_none()
            && row.moves.is_empty()
            && row.replay_verified.is_none()
    }));

    let _ = fs::remove_dir_all(directory);
}

#[test]
fn solver_quality_report_records_limit_failures_with_metrics() {
    let fixtures = quality_fixtures().expect("quality fixtures should build");
    let directory = temp_test_dir("missing");
    let hybrid_path = directory.join("missing-value_outputs.tsv");
    let report =
        run_quality_report_for_fixtures_with_pruning_table_dir_and_hybrid_value_outputs_path(
            &fixtures,
            &directory,
            &hybrid_path,
        )
        .expect("quality report should run with missing generated tables");
    let limit_failures = report
        .rows()
        .iter()
        .filter(|row| row.status == QualityReportStatus::ExpectedNotFoundWithinLimits)
        .collect::<Vec<_>>();

    assert!(!limit_failures.is_empty());
    assert!(limit_failures.iter().any(|row| {
        row.fixture_category == QualityFixtureCategory::Harder
            && row.solver_selection == QualitySolverSelection::DefaultBoundedIdaStar
    }));

    for row in limit_failures {
        assert_eq!(
            row.expectation,
            QualityExpectation::ExpectedNotFoundWithinLimits,
            "{}",
            row.fixture_id
        );
        assert_eq!(row.solution_length, None, "{}", row.fixture_id);
        assert_eq!(
            row.table_status,
            QualityTableStatus::NotRequired,
            "{}",
            row.fixture_id
        );
        assert!(row.moves.is_empty(), "{}", row.fixture_id);
        assert_eq!(row.replay_verified, None, "{}", row.fixture_id);
        assert!(
            row.explored_nodes > 0,
            "limit failure should include explored nodes for {}",
            row.fixture_id
        );
    }
}

#[test]
fn solver_quality_report_unexpected_required_success_failures_become_regression_rows() {
    let mut fixture = quality_fixtures()
        .expect("quality fixtures should build")
        .into_iter()
        .find(|fixture| fixture.id == "shallow-cubie-r-u")
        .expect("test fixture should exist");
    fixture.max_depth = 0;
    fixture.max_nodes = Some(1);
    fixture.expectation = QualityExpectation::RequiredSuccess;

    let directory = temp_test_dir("unexpected-regression");
    let hybrid_path = directory.join("missing-value_outputs.tsv");
    let report =
        run_quality_report_for_fixtures_with_pruning_table_dir_and_hybrid_value_outputs_path(
            &[fixture],
            &directory,
            &hybrid_path,
        )
        .expect("quality report should keep unexpected solver failures row-level");

    let default_row = report
        .rows()
        .iter()
        .find(|row| row.solver_selection == QualitySolverSelection::DefaultBoundedIdaStar)
        .expect("default solver row should exist");

    assert_eq!(
        default_row.status,
        QualityReportStatus::UnexpectedRegression
    );
    assert_eq!(default_row.expectation, QualityExpectation::RequiredSuccess);
    assert_eq!(default_row.solution_length, None);
    assert!(default_row.explored_nodes > 0);

    let _ = fs::remove_dir_all(directory);
}

#[test]
fn solver_quality_report_markdown_has_stable_headers_and_local_timing_note() {
    let fixtures = quality_fixtures().expect("quality fixtures should build");
    let directory = temp_test_dir("missing");
    let hybrid_path = directory.join("missing-value_outputs.tsv");
    let report =
        run_quality_report_for_fixtures_with_pruning_table_dir_and_hybrid_value_outputs_path(
            &fixtures,
            &directory,
            &hybrid_path,
        )
        .expect("quality report should run with missing generated tables and hybrid values");
    let markdown = report.to_markdown();

    assert!(markdown.contains("# Deterministic Solver Quality Report"));
    assert!(markdown.contains("crates/cube-engine/pruning-tables"));
    assert!(markdown.contains("Elapsed time is local measurement output"));
    assert!(markdown.contains("does not claim optimality or a 20-move guarantee"));
    assert!(markdown.contains("## Summary"));
    assert!(markdown.contains("Status counts are grouped by solver selection"));
    assert!(markdown.contains("local and non-deterministic"));
    assert!(markdown.contains("| selection | rows | success | generated_tables_unavailable | generated_tables_corrupt_or_incompatible | expected_not_found_within_limits | unexpected_regression | replay_verified_successes | solution_len_range | explored_nodes_total |"));
    assert!(markdown.contains("| default-bounded-ida-star |"));
    assert!(markdown.contains(&format!(
        "| generated-two-phase | {} | 0 | {} | 0 | 0 | 0 | 0 | - | 0 |",
        fixtures.len(),
        fixtures.len()
    )));
    assert!(markdown.contains("| all |"));
    assert!(markdown.contains("## Rows"));
    assert!(markdown.contains("| fixture | group | input | expectation | scramble | selection | strategy | max_depth | max_nodes | table_status | table_depths | table_metadata | status | solution_len | explored_nodes | elapsed_us | replay_verified | solution |"));
    assert!(markdown.contains("solved-facelets"));
    assert!(markdown.contains("mid_depth"));
    assert!(markdown.contains("required_success"));
    assert!(markdown.contains("default-bounded-ida-star"));
    assert!(markdown.contains("generated-two-phase"));
    assert!(markdown.contains("bounded-ida-star"));
    assert!(markdown.contains("| true |"));
    assert!(markdown.contains("generated_tables_unavailable"));
    assert!(markdown.contains("unavailable"));
    assert!(markdown.contains("expected_not_found_within_limits"));
    assert!(markdown.contains("## Hybrid Move Ordering Experiment"));
    assert!(markdown.contains("default-bounded-ida-star"));
    assert!(markdown.contains("value_outputs.tsv"));
    assert!(markdown.contains("do not validate states, prune branches, change limits"));
    assert!(markdown.contains("artifact_unavailable"));
    assert!(markdown.contains("missing-value_outputs.tsv"));
    assert!(markdown.contains("| fixture | group | input | expectation | scramble | baseline_selection | max_depth | max_nodes | artifact_path | artifact_status | artifact_metadata | status | solution_len | explored_nodes | elapsed_us | replay_verified | scored_move_lookups | missing_score_lookups | model_score_evals | solution |"));
    assert_eq!(report.hybrid_rows().len(), fixtures.len());
}

#[test]
fn solver_quality_report_rows_are_emitted_in_fixture_then_solver_order() {
    let fixtures = quality_fixtures().expect("quality fixtures should build");
    let directory = temp_test_dir("order-missing-hybrid");
    let hybrid_path = directory.join("missing-value_outputs.tsv");
    let report =
        run_quality_report_for_fixtures_with_pruning_table_dir_and_hybrid_value_outputs_path(
            &fixtures,
            &directory,
            &hybrid_path,
        )
        .expect("quality report should run");
    let rows = report.rows();

    assert_eq!(rows[0].fixture_id, "solved-facelets");
    assert_eq!(
        rows[0].solver_selection,
        QualitySolverSelection::DefaultBoundedIdaStar
    );
    assert_eq!(rows[1].fixture_id, "solved-facelets");
    assert_eq!(
        rows[1].solver_selection,
        QualitySolverSelection::GeneratedTwoPhase
    );
    assert_eq!(report.hybrid_rows()[0].fixture_id, "solved-facelets");
    assert_eq!(
        report.hybrid_rows()[0].baseline_selection,
        QualitySolverSelection::DefaultBoundedIdaStar
    );

    let harder_scramble = rows
        .iter()
        .find(|row| row.fixture_id == "harder-cubie-nine-move")
        .expect("harder cubie fixture should be reported")
        .scramble;
    let algorithm = Algorithm::parse(harder_scramble).expect("reported scramble should parse");

    assert_eq!(algorithm.len(), 9);

    let _ = fs::remove_dir_all(directory);
}

fn single_quality_fixture(id: &str) -> cube_engine::solver::quality::QualityFixture {
    quality_fixtures()
        .expect("quality fixtures should build")
        .into_iter()
        .find(|fixture| fixture.id == id)
        .unwrap_or_else(|| panic!("quality fixture {id} should exist"))
}

fn write_value_outputs_artifact(
    path: &PathBuf,
    model_type: &str,
    pytorch_available: bool,
    rows: &[(String, f64)],
) {
    let mut content = format!(
        "# format=rubiks_cube_solver_value_outputs_v1\n# model_type={model_type}\n# pytorch_available={}\n# examples={}\n# label_target=verified_solution_length\n# label_source=reversible_scramble_inverse_replay_verified\n",
        if pytorch_available { "true" } else { "false" },
        rows.len()
    );
    for (state, score) in rows {
        content.push_str(&format!("{state}\t{score}\n"));
    }
    fs::write(path, content).expect("value output artifact should be writable");
}

fn write_constant_model_artifact(path: &PathBuf) {
    let weight = vec!["0.0"; 40].join(",");
    let content = format!(
        r#"{{
            "format":"rubiks_cube_solver_value_model_v1",
            "model_type":"pytorch_mlp",
            "pytorch_available":true,
            "examples":1,
            "label_target":"verified_solution_length",
            "label_source":"reversible_scramble_inverse_replay_verified",
            "feature_dim":40,
            "hidden_dim":1,
            "layers":[{{"type":"linear","weight":[[{weight}]],"bias":[1.0]}}]
        }}
        "#
    );
    fs::write(path, content).expect("model artifact should be writable");
}

fn temp_test_dir(name: &str) -> PathBuf {
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system time should be after UNIX epoch")
        .as_nanos();

    std::env::temp_dir().join(format!(
        "cube-engine-quality-report-{name}-{}-{nonce}",
        std::process::id()
    ))
}

fn quality_row(status: QualityReportStatus) -> QualityReportRow {
    QualityReportRow {
        fixture_id: "fixture",
        fixture_category: QualityFixtureCategory::Solved,
        input_kind: QualityInputKind::Cubie,
        expectation: QualityExpectation::RequiredSuccess,
        scramble: "",
        solver_selection: QualitySolverSelection::DefaultBoundedIdaStar,
        strategy: cube_engine::SolverStrategy::BoundedIdaStar,
        max_depth: 0,
        max_nodes: Some(1),
        table_status: QualityTableStatus::NotRequired,
        generated_table_depths: None,
        generated_table_metadata: None,
        status,
        solution_length: if status == QualityReportStatus::Success {
            Some(0)
        } else {
            None
        },
        explored_nodes: 1,
        elapsed: Duration::ZERO,
        replay_verified: if status == QualityReportStatus::Success {
            Some(true)
        } else {
            None
        },
        moves: Vec::new(),
    }
}

fn hybrid_row(status: QualityHybridReportStatus) -> QualityHybridReportRow {
    QualityHybridReportRow {
        fixture_id: "fixture",
        fixture_category: QualityFixtureCategory::Solved,
        input_kind: QualityInputKind::Cubie,
        expectation: QualityExpectation::RequiredSuccess,
        scramble: "",
        baseline_selection: QualitySolverSelection::DefaultBoundedIdaStar,
        max_depth: 0,
        max_nodes: Some(1),
        artifact_path: "value_outputs.tsv".to_owned(),
        artifact_status: QualityHybridArtifactStatus::Available,
        artifact_metadata: None,
        status,
        solution_length: if status == QualityHybridReportStatus::Success {
            Some(0)
        } else {
            None
        },
        explored_nodes: if status == QualityHybridReportStatus::Success {
            1
        } else {
            0
        },
        elapsed: Duration::ZERO,
        replay_verified: if status == QualityHybridReportStatus::Success {
            Some(true)
        } else {
            None
        },
        scored_move_lookups: 0,
        missing_score_lookups: 0,
        model_score_evals: 0,
        moves: Vec::new(),
    }
}
