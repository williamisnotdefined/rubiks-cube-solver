use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use cube_engine::search::pruning::{generate_all_pruning_tables, GENERATED_PRUNING_TABLE_SPECS};
use cube_engine::solver::quality::{quality_fixtures, QualityExpectation, QualitySolverSelection};
use cube_engine::{
    solve_cubie_state, solve_cubie_state_with_generated_pruning_tables, solve_facelet_string,
    solve_facelet_string_with_generated_pruning_tables, Cube, GeneratedPruningTableArtifact, Move,
    SolveError, SolverConfig, SolverStrategy,
};

#[test]
fn generated_two_phase_missing_tables_returns_structured_unavailable_error() {
    let state = scrambled(&[Move::R, Move::U]).state().clone();
    let directory = temp_test_dir("missing");
    let config = generated_config(&directory, 2);

    let error = solve_cubie_state(state.clone(), config.clone())
        .expect_err("missing generated tables should be reported separately");

    assert!(matches!(
        error,
        SolveError::GeneratedTablesUnavailable { .. }
    ));

    let default_result = solve_cubie_state(state.clone(), SolverConfig::new(2))
        .expect("default bounded solver should remain unchanged");
    assert_solution_solves_state(state, default_result.moves());
}

#[test]
fn generated_two_phase_missing_artifact_bytes_returns_structured_unavailable_error() {
    let state = scrambled(&[Move::R, Move::U]).state().clone();
    let artifacts =
        vec![GeneratedPruningTableArtifact::unavailable(); GENERATED_PRUNING_TABLE_SPECS.len()];

    let error = solve_cubie_state_with_generated_pruning_tables(
        state.clone(),
        4,
        Some(1_000_000),
        &artifacts,
    )
    .expect_err("missing generated table bytes should be reported separately");

    assert!(matches!(
        error,
        SolveError::GeneratedTablesUnavailable { .. }
    ));

    let default_result = solve_cubie_state(state.clone(), SolverConfig::new(2))
        .expect("default bounded solver should remain unchanged");
    assert_solution_solves_state(state, default_result.moves());
}

#[test]
fn generated_two_phase_incomplete_artifact_bytes_returns_structured_unavailable_error() {
    let directory = temp_test_dir("incomplete-bytes");
    generate_all_pruning_tables(&directory, 2, 2)
        .expect("depth-two generated pruning tables should build for incomplete bytes test");
    let mut artifact_bytes = generated_artifact_bytes(&directory);
    artifact_bytes.pop();
    let artifacts = available_artifacts(&artifact_bytes);
    let state = scrambled(&[Move::R, Move::U]).state().clone();

    let error = solve_cubie_state_with_generated_pruning_tables(
        state.clone(),
        4,
        Some(1_000_000),
        &artifacts,
    )
    .expect_err("incomplete generated table bytes should be reported separately");

    assert!(matches!(
        error,
        SolveError::GeneratedTablesUnavailable { .. }
    ));

    let default_result = solve_cubie_state(state.clone(), SolverConfig::new(2))
        .expect("default bounded solver should remain unchanged");
    assert_solution_solves_state(state, default_result.moves());

    let _ = fs::remove_dir_all(directory);
}

#[test]
fn generated_two_phase_solves_documented_cubie_and_facelet_fixtures() {
    let directory = temp_test_dir("available");
    generate_all_pruning_tables(&directory, 6, 6)
        .expect("depth-six generated pruning tables should build for integration test");
    let artifact_bytes = generated_artifact_bytes(&directory);
    let artifacts = available_artifacts(&artifact_bytes);
    let fixtures = quality_fixtures().expect("shared quality fixtures should build");
    let generated_required_fixtures = fixtures
        .iter()
        .filter(|fixture| {
            fixture.max_depth <= 6
                && fixture
                    .solver_expectations
                    .for_selection(QualitySolverSelection::GeneratedTwoPhase)
                    == QualityExpectation::RequiredSuccess
        })
        .collect::<Vec<_>>();

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
        assert!(
            generated_required_fixtures
                .iter()
                .any(|fixture| fixture.id == fixture_id),
            "generated required fixture set should include {fixture_id}"
        );
    }

    for fixture in generated_required_fixtures {
        let state = fixture.state.clone();
        let cube = Cube::try_from_state(state.clone()).expect("quality fixture should be valid");
        let config = generated_config(&directory, fixture.max_depth);

        let cubie_result =
            solve_cubie_state(state.clone(), config.clone()).unwrap_or_else(|error| {
                panic!(
                    "generated two-phase should solve {} cubie fixture: {error}",
                    fixture.id
                )
            });
        assert_solution_solves_state(state.clone(), cubie_result.moves());
        assert!(
            cubie_result.length() <= fixture.max_depth,
            "{} cubie solution should stay within documented depth",
            fixture.id
        );
        assert!(cubie_result.explored_nodes() > 0);

        let facelet_result =
            solve_facelet_string(&fixture.facelets, config).unwrap_or_else(|error| {
                panic!(
                    "generated two-phase should solve {} facelet fixture: {error}",
                    fixture.id
                )
            });
        assert_solution_solves_cube(cube.clone(), facelet_result.moves());
        assert!(
            facelet_result.length() <= fixture.max_depth,
            "{} facelet solution should stay within documented depth",
            fixture.id
        );
        assert!(facelet_result.explored_nodes() > 0);

        let bytes_cubie_result = solve_cubie_state_with_generated_pruning_tables(
            state.clone(),
            fixture.max_depth,
            Some(1_000_000),
            &artifacts,
        )
        .unwrap_or_else(|error| {
            panic!(
                "generated two-phase bytes should solve {} cubie fixture: {error}",
                fixture.id
            )
        });
        assert_solution_solves_state(state, bytes_cubie_result.moves());
        assert!(
            bytes_cubie_result.length() <= fixture.max_depth,
            "{} cubie byte-artifact solution should stay within documented depth",
            fixture.id
        );
        assert!(bytes_cubie_result.explored_nodes() > 0);

        let bytes_facelet_result = solve_facelet_string_with_generated_pruning_tables(
            &fixture.facelets,
            fixture.max_depth,
            Some(1_000_000),
            &artifacts,
        )
        .unwrap_or_else(|error| {
            panic!(
                "generated two-phase bytes should solve {} facelet fixture: {error}",
                fixture.id
            )
        });
        assert_solution_solves_cube(cube, bytes_facelet_result.moves());
        assert!(
            bytes_facelet_result.length() <= fixture.max_depth,
            "{} facelet byte-artifact solution should stay within documented depth",
            fixture.id
        );
        assert!(bytes_facelet_result.explored_nodes() > 0);
    }

    let _ = fs::remove_dir_all(directory);
}

#[test]
fn generated_two_phase_respects_max_depth_with_metrics() {
    let directory = temp_test_dir("max-depth");
    generate_all_pruning_tables(&directory, 6, 6)
        .expect("depth-six generated pruning tables should build for max-depth test");
    let fixtures = quality_fixtures().expect("shared quality fixtures should build");
    let fixture = fixtures
        .iter()
        .find(|fixture| fixture.id == "generated-mid-depth-cubie-phase2-five-move")
        .expect("generated mid-depth cubie fixture should exist");
    let config = generated_config(&directory, 0);

    let error = solve_cubie_state(fixture.state.clone(), config.clone())
        .expect_err("depth-zero generated two-phase search should not solve mid-depth fixture");

    match error {
        SolveError::NotFoundWithinLimits {
            config: actual_config,
            explored_nodes,
        } => {
            assert_eq!(actual_config, config);
            assert!(explored_nodes > 0);
        }
        SolveError::InvalidInput { .. }
        | SolveError::GeneratedTablesUnavailable { .. }
        | SolveError::GeneratedTablesCorrupt { .. } => {
            panic!("depth limit should not be invalid input or table unavailable")
        }
    }

    let harder_fixture = fixtures
        .iter()
        .find(|fixture| fixture.id == "generated-harder-cubie-phase2-eight-move")
        .expect("generated harder cubie fixture should exist");
    let config = generated_config(&directory, harder_fixture.max_depth);

    let error = solve_cubie_state(harder_fixture.state.clone(), config.clone()).expect_err(
        "depth-six generated artifacts should be insufficient for the depth-eight harder fixture",
    );

    match error {
        SolveError::NotFoundWithinLimits {
            config: actual_config,
            explored_nodes,
        } => {
            assert_eq!(actual_config, config);
            assert!(explored_nodes > 0);
        }
        SolveError::InvalidInput { .. }
        | SolveError::GeneratedTablesUnavailable { .. }
        | SolveError::GeneratedTablesCorrupt { .. } => {
            panic!("insufficient generated artifacts should report a search limit failure")
        }
    }

    let _ = fs::remove_dir_all(directory);
}

#[test]
fn generated_two_phase_respects_max_nodes_with_metrics() {
    let directory = temp_test_dir("max-nodes");
    generate_all_pruning_tables(&directory, 6, 6)
        .expect("depth-six generated pruning tables should build for max-nodes test");
    let fixture = quality_fixtures()
        .expect("shared quality fixtures should build")
        .into_iter()
        .find(|fixture| fixture.id == "generated-mid-depth-cubie-phase2-five-move")
        .expect("generated mid-depth cubie fixture should exist");
    let config = generated_config_with_nodes(&directory, fixture.max_depth, Some(1));

    let error = solve_cubie_state(fixture.state, config.clone())
        .expect_err("one-node generated two-phase search should exhaust node budget");

    match error {
        SolveError::NotFoundWithinLimits {
            config: actual_config,
            explored_nodes,
        } => {
            assert_eq!(actual_config, config);
            assert!(explored_nodes > 0);
        }
        SolveError::InvalidInput { .. }
        | SolveError::GeneratedTablesUnavailable { .. }
        | SolveError::GeneratedTablesCorrupt { .. } => {
            panic!("node limit should not be invalid input or table unavailable")
        }
    }

    let _ = fs::remove_dir_all(directory);
}

#[test]
fn generated_two_phase_corrupt_table_returns_structured_corrupt_error() {
    let directory = temp_test_dir("corrupt");
    let paths = generate_all_pruning_tables(&directory, 2, 2)
        .expect("depth-two generated pruning tables should build for corruption test");
    let first_path = paths
        .first()
        .expect("generator should return generated table paths");
    let mut bytes = fs::read(first_path).expect("generated artifact should be readable");
    bytes[12] ^= 0x01;
    fs::write(first_path, bytes).expect("generated artifact should be corruptible");

    let state = scrambled(&[Move::R, Move::U]).state().clone();
    let error = solve_cubie_state(state, generated_config(&directory, 4))
        .expect_err("corrupt generated table should be reported separately");

    assert!(matches!(error, SolveError::GeneratedTablesCorrupt { .. }));

    let artifact_bytes = generated_artifact_bytes(&directory);
    let artifacts = available_artifacts(&artifact_bytes);
    let error = solve_cubie_state_with_generated_pruning_tables(
        scrambled(&[Move::R, Move::U]).state().clone(),
        4,
        Some(1_000_000),
        &artifacts,
    )
    .expect_err("corrupt generated table bytes should be reported separately");

    assert!(matches!(error, SolveError::GeneratedTablesCorrupt { .. }));

    let _ = fs::remove_dir_all(directory);
}

fn generated_config(directory: &Path, max_depth: usize) -> SolverConfig {
    generated_config_with_nodes(directory, max_depth, Some(1_000_000))
}

fn generated_config_with_nodes(
    directory: &Path,
    max_depth: usize,
    max_nodes: Option<usize>,
) -> SolverConfig {
    SolverConfig::with_strategy(max_depth, max_nodes, SolverStrategy::GeneratedTwoPhase)
        .with_pruning_table_dir(directory.to_path_buf())
}

fn scrambled(moves: &[Move]) -> Cube {
    let mut cube = Cube::solved();
    cube.apply_moves(moves);
    cube
}

fn assert_solution_solves_state(state: cube_engine::CubieState, solution: &[Move]) {
    let cube = Cube::try_from_state(state).expect("test state should be valid");

    assert_solution_solves_cube(cube, solution);
}

fn assert_solution_solves_cube(mut cube: Cube, solution: &[Move]) {
    cube.apply_moves(solution);

    assert!(cube.is_solved());
}

fn generated_artifact_bytes(directory: &Path) -> Vec<Vec<u8>> {
    GENERATED_PRUNING_TABLE_SPECS
        .iter()
        .map(|spec| {
            fs::read(spec.file_path(directory))
                .unwrap_or_else(|error| panic!("{} should be readable: {error}", spec.file_name))
        })
        .collect()
}

fn available_artifacts(bytes: &[Vec<u8>]) -> Vec<GeneratedPruningTableArtifact<'_>> {
    bytes
        .iter()
        .map(|bytes| GeneratedPruningTableArtifact::available(bytes))
        .collect()
}

fn temp_test_dir(name: &str) -> PathBuf {
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system time should be after UNIX epoch")
        .as_nanos();

    std::env::temp_dir().join(format!(
        "cube-engine-generated-two-phase-{name}-{}-{nonce}",
        std::process::id()
    ))
}
