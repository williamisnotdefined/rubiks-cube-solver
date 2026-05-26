use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

use cube_engine::search::pruning::generate_all_pruning_tables;
use cube_engine::solver::quality::{
    quality_fixtures, run_quality_report, run_quality_report_for_fixtures_with_pruning_table_dir,
    QualityExpectation, QualityFixtureCategory, QualityInputKind, QualityReportStatus,
    QualitySolverSelection, QualityTableStatus,
};
use cube_engine::{Algorithm, Cube, FaceletString};

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
                .for_selection(QualitySolverSelection::ExplicitTwoPhaseBaseline),
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
    let report = run_quality_report().expect("quality report should run");

    assert_eq!(
        report.rows().len(),
        fixtures.len() * QualitySolverSelection::ALL.len()
    );

    for fixture in &fixtures {
        assert!(report.rows().iter().any(|row| {
            row.fixture_id == fixture.id
                && row.solver_selection == QualitySolverSelection::DefaultBoundedIdaStar
        }));
        assert!(report.rows().iter().any(|row| {
            row.fixture_id == fixture.id
                && row.solver_selection == QualitySolverSelection::ExplicitTwoPhaseBaseline
        }));
        assert!(report.rows().iter().any(|row| {
            row.fixture_id == fixture.id
                && row.solver_selection == QualitySolverSelection::GeneratedTwoPhase
        }));
    }
}

#[test]
fn solver_quality_report_successful_rows_are_replay_verified_and_lengths_match() {
    let report = run_quality_report().expect("quality report should run");
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
}

#[test]
fn solver_quality_report_generated_rows_report_success_metrics_when_tables_are_available() {
    let fixtures = quality_fixtures().expect("quality fixtures should build");
    let directory = temp_test_dir("available");
    generate_all_pruning_tables(&directory, 8, 8)
        .expect("depth-eight generated pruning tables should build for quality report test");
    let report = run_quality_report_for_fixtures_with_pruning_table_dir(&fixtures, &directory)
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
        "generated-harder-facelets-phase2-eight-move",
        "generated-harder-cubie-phase2-eight-move",
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
            Some("phase1=8/8/8;phase2=8/8"),
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
    let report = run_quality_report_for_fixtures_with_pruning_table_dir(&fixtures, &directory)
        .expect("quality report should run with missing generated tables");
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

    let report = run_quality_report_for_fixtures_with_pruning_table_dir(&fixtures, &directory)
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
    let report = run_quality_report_for_fixtures_with_pruning_table_dir(&fixtures, &directory)
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
    let report = run_quality_report_for_fixtures_with_pruning_table_dir(&[fixture], &directory)
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
    let report = run_quality_report_for_fixtures_with_pruning_table_dir(&fixtures, &directory)
        .expect("quality report should run with missing generated tables");
    let markdown = report.to_markdown();

    assert!(markdown.contains("# Deterministic Solver Quality Report"));
    assert!(markdown.contains("/tmp/rubiks-cube-solver-pruning-tables"));
    assert!(markdown.contains("Elapsed time is local measurement output"));
    assert!(markdown.contains("does not claim optimality or a 20-move guarantee"));
    assert!(markdown.contains("| fixture | group | input | expectation | scramble | selection | strategy | max_depth | max_nodes | table_status | table_depths | table_metadata | status | solution_len | explored_nodes | elapsed_us | replay_verified | solution |"));
    assert!(markdown.contains("solved-facelets"));
    assert!(markdown.contains("mid_depth"));
    assert!(markdown.contains("required_success"));
    assert!(markdown.contains("default-bounded-ida-star"));
    assert!(markdown.contains("explicit-two-phase-baseline"));
    assert!(markdown.contains("generated-two-phase"));
    assert!(markdown.contains("bounded-ida-star"));
    assert!(markdown.contains("two-phase-baseline"));
    assert!(markdown.contains("| true |"));
    assert!(markdown.contains("generated_tables_unavailable"));
    assert!(markdown.contains("unavailable"));
    assert!(markdown.contains("expected_not_found_within_limits"));
}

#[test]
fn solver_quality_report_rows_are_emitted_in_fixture_then_solver_order() {
    let report = run_quality_report().expect("quality report should run");
    let rows = report.rows();

    assert_eq!(rows[0].fixture_id, "solved-facelets");
    assert_eq!(
        rows[0].solver_selection,
        QualitySolverSelection::DefaultBoundedIdaStar
    );
    assert_eq!(rows[1].fixture_id, "solved-facelets");
    assert_eq!(
        rows[1].solver_selection,
        QualitySolverSelection::ExplicitTwoPhaseBaseline
    );
    assert_eq!(rows[2].fixture_id, "solved-facelets");
    assert_eq!(
        rows[2].solver_selection,
        QualitySolverSelection::GeneratedTwoPhase
    );

    let harder_scramble = rows
        .iter()
        .find(|row| row.fixture_id == "harder-cubie-nine-move")
        .expect("harder cubie fixture should be reported")
        .scramble;
    let algorithm = Algorithm::parse(harder_scramble).expect("reported scramble should parse");

    assert_eq!(algorithm.len(), 9);
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
