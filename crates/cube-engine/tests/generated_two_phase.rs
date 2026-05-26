use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use cube_engine::search::pruning::generate_all_pruning_tables;
use cube_engine::{
    solve_cubie_state, solve_facelet_string, Cube, FaceletString, Move, SolveError, SolverConfig,
    SolverStrategy,
};

#[test]
fn generated_two_phase_missing_tables_returns_structured_unavailable_error() {
    let state = scrambled(&[Move::R, Move::U]).state().clone();
    let directory = temp_test_dir("missing");
    let config = generated_config(&directory);

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
fn generated_two_phase_solves_documented_cubie_and_facelet_fixtures() {
    let directory = temp_test_dir("available");
    generate_all_pruning_tables(&directory, 2, 2)
        .expect("depth-two generated pruning tables should build for integration test");

    let cube = scrambled(&[Move::R, Move::U]);
    let state = cube.state().clone();
    let config = generated_config(&directory);

    let cubie_result = solve_cubie_state(state.clone(), config.clone())
        .expect("generated two-phase should solve documented R U cubie fixture");
    assert_solution_solves_state(state, cubie_result.moves());
    assert!(cubie_result.length() <= 2);
    assert!(cubie_result.explored_nodes() > 0);

    let facelets = FaceletString::from_cube(&cube).to_string();
    let facelet_result = solve_facelet_string(&facelets, config)
        .expect("generated two-phase should solve documented R U facelet fixture");
    assert_solution_solves_cube(cube, facelet_result.moves());
    assert!(facelet_result.length() <= 2);
    assert!(facelet_result.explored_nodes() > 0);

    let _ = fs::remove_dir_all(directory);
}

#[test]
fn generated_two_phase_corrupt_table_returns_structured_unavailable_error() {
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
    let error = solve_cubie_state(state, generated_config(&directory))
        .expect_err("corrupt generated table should be reported separately");

    assert!(matches!(
        error,
        SolveError::GeneratedTablesUnavailable { .. }
    ));

    let _ = fs::remove_dir_all(directory);
}

fn generated_config(directory: &Path) -> SolverConfig {
    SolverConfig::with_strategy(2, Some(1_000_000), SolverStrategy::GeneratedTwoPhase)
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
