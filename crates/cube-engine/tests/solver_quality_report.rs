use cube_engine::solver::quality::{
    quality_fixtures, run_quality_report, QualityFixtureCategory, QualityInputKind,
    QualityReportStatus, QualitySolverSelection,
};
use cube_engine::{Algorithm, Cube, FaceletString};

#[test]
fn quality_fixtures_cover_valid_solved_shallow_and_harder_inputs() {
    let fixtures = quality_fixtures().expect("quality fixtures should build");

    assert!(fixtures.iter().any(|fixture| {
        fixture.category == QualityFixtureCategory::Solved
            && fixture.input_kind == QualityInputKind::Facelet
    }));
    assert!(fixtures.iter().any(|fixture| {
        fixture.category == QualityFixtureCategory::Solved
            && fixture.input_kind == QualityInputKind::Cubie
    }));
    assert!(fixtures.iter().any(|fixture| {
        fixture.category == QualityFixtureCategory::Shallow
            && fixture.input_kind == QualityInputKind::Facelet
    }));
    assert!(fixtures.iter().any(|fixture| {
        fixture.category == QualityFixtureCategory::Shallow
            && fixture.input_kind == QualityInputKind::Cubie
    }));
    assert!(fixtures.iter().any(|fixture| {
        fixture.category == QualityFixtureCategory::Harder
            && fixture.input_kind == QualityInputKind::Facelet
    }));
    assert!(fixtures.iter().any(|fixture| {
        fixture.category == QualityFixtureCategory::Harder
            && fixture.input_kind == QualityInputKind::Cubie
    }));

    for fixture in fixtures {
        fixture
            .state
            .validate()
            .expect("fixture cubie state should be valid");

        if let Some(facelets) = fixture.facelets.as_deref() {
            let recovered = FaceletString::parse(facelets)
                .expect("fixture facelets should parse")
                .to_cubie_state()
                .expect("fixture facelets should convert to cubies");
            assert_eq!(recovered, fixture.state, "{}", fixture.id);
        }

        if fixture.category == QualityFixtureCategory::Harder {
            let cube = Cube::try_from_state(fixture.state.clone())
                .expect("harder fixture should be a valid cube");
            assert!(!cube.is_solved(), "{}", fixture.id);
        }
    }
}

#[test]
fn quality_report_includes_each_solver_selection_for_each_fixture() {
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
    }
}

#[test]
fn successful_quality_rows_are_replay_verified_and_lengths_match() {
    let report = run_quality_report().expect("quality report should run");
    let successes = report
        .rows()
        .iter()
        .filter(|row| row.status == QualityReportStatus::Success)
        .collect::<Vec<_>>();

    assert!(!successes.is_empty());

    for row in successes {
        assert_eq!(row.replay_verified, Some(true), "{}", row.fixture_id);
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
fn quality_report_records_limit_failures_with_metrics() {
    let report = run_quality_report().expect("quality report should run");
    let limit_failures = report
        .rows()
        .iter()
        .filter(|row| row.status == QualityReportStatus::NotFoundWithinLimits)
        .collect::<Vec<_>>();

    assert!(!limit_failures.is_empty());
    assert!(limit_failures.iter().any(|row| {
        row.fixture_category == QualityFixtureCategory::Harder
            && row.solver_selection == QualitySolverSelection::DefaultBoundedIdaStar
    }));

    for row in limit_failures {
        assert_eq!(row.solution_length, None, "{}", row.fixture_id);
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
fn quality_report_markdown_has_stable_headers_and_local_timing_note() {
    let report = run_quality_report().expect("quality report should run");
    let markdown = report.to_markdown();

    assert!(markdown.contains("# Deterministic Solver Quality Report"));
    assert!(markdown.contains("Elapsed time is local measurement output"));
    assert!(markdown.contains("does not claim optimality or a 20-move guarantee"));
    assert!(markdown.contains("| fixture | group | input | scramble | selection | strategy | max_depth | max_nodes | status | solution_len | explored_nodes | elapsed_us | replay_verified | solution |"));
    assert!(markdown.contains("solved-facelets"));
    assert!(markdown.contains("default-bounded-ida-star"));
    assert!(markdown.contains("explicit-two-phase-baseline"));
    assert!(markdown.contains("bounded-ida-star"));
    assert!(markdown.contains("two-phase-baseline"));
    assert!(markdown.contains("not_found_within_limits"));
}

#[test]
fn report_rows_are_emitted_in_fixture_then_solver_order() {
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

    let harder_scramble = rows
        .iter()
        .find(|row| row.fixture_id == "harder-cubie-nine-move")
        .expect("harder cubie fixture should be reported")
        .scramble;
    let algorithm = Algorithm::parse(harder_scramble).expect("reported scramble should parse");

    assert_eq!(algorithm.len(), 9);
}
