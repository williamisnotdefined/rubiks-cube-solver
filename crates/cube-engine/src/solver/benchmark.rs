mod fixtures;
mod labels;
mod markdown;
mod runner;
mod types;

pub use fixtures::{generated_real_scramble_fixtures, real_scramble_fixtures, REAL_SCRAMBLE_SPECS};
pub use runner::{run_real_scramble_benchmark, run_real_scramble_benchmark_for_fixtures};
pub use types::{
    GeneratedRealScrambleConfig, RealScrambleBenchmarkError, RealScrambleBenchmarkReport,
    RealScrambleBenchmarkRow, RealScrambleBenchmarkStatus, RealScrambleBenchmarkSummary,
    RealScrambleFixture, RealScrambleSpec,
};

#[cfg(test)]
mod tests {
    use std::time::Duration;

    use super::{
        generated_real_scramble_fixtures, real_scramble_fixtures, run_real_scramble_benchmark,
        GeneratedRealScrambleConfig, RealScrambleBenchmarkReport, RealScrambleBenchmarkRow,
        RealScrambleBenchmarkStatus, REAL_SCRAMBLE_SPECS,
    };
    use crate::cube::Move;
    use crate::solver::{SolverConfig, SolverStrategy};

    #[test]
    fn real_scramble_fixtures_are_valid_unsolved_states() {
        let fixtures = real_scramble_fixtures().expect("real scramble fixtures should build");

        assert_eq!(fixtures.len(), REAL_SCRAMBLE_SPECS.len());
        assert!(fixtures.iter().all(|fixture| fixture.scramble_len >= 19));
        assert!(fixtures.iter().all(|fixture| fixture.state.is_valid()));
        assert!(fixtures
            .iter()
            .all(|fixture| fixture.state != crate::CubieState::solved()));
    }

    #[test]
    fn generated_real_scramble_fixtures_are_deterministic_unique_states() {
        let config = GeneratedRealScrambleConfig {
            count: 4,
            seed: 7,
            scramble_depth: 10,
            include_committed: false,
        };
        let fixtures = generated_real_scramble_fixtures(config)
            .expect("generated real-scramble fixtures should build");
        let repeated = generated_real_scramble_fixtures(config)
            .expect("generated real-scramble fixtures should be repeatable");

        assert_eq!(fixtures, repeated);
        assert_eq!(fixtures.len(), 4);
        assert!(fixtures.iter().all(|fixture| fixture.scramble_len == 10));
        assert!(fixtures.iter().all(|fixture| fixture.state.is_valid()));
        assert_eq!(
            fixtures
                .iter()
                .map(|fixture| fixture.state.serialize())
                .collect::<std::collections::BTreeSet<_>>()
                .len(),
            fixtures.len()
        );
    }

    #[test]
    fn real_scramble_benchmark_uses_configured_state_solver_limits() {
        let report = run_real_scramble_benchmark(SolverConfig::with_strategy(
            0,
            Some(1),
            SolverStrategy::BoundedIdaStar,
        ))
        .expect("benchmark report should run");

        assert_eq!(report.rows().len(), REAL_SCRAMBLE_SPECS.len());
        assert_eq!(report.success_count(), 0);
        assert_eq!(report.setup_elapsed().as_micros(), 0);
        assert!(report.rows().iter().all(|row| row.moves.is_empty()));
    }

    #[test]
    fn real_scramble_benchmark_reports_generated_setup_failures_once() {
        let missing_dir =
            std::env::temp_dir().join("rubiks-cube-solver-missing-real-scramble-generated-tables");
        let _ = std::fs::remove_dir_all(&missing_dir);
        let report = run_real_scramble_benchmark(
            SolverConfig::with_strategy(30, Some(1), SolverStrategy::GeneratedTwoPhase)
                .with_pruning_table_dir(missing_dir),
        )
        .expect("benchmark report should run with missing generated tables");

        assert_eq!(report.rows().len(), REAL_SCRAMBLE_SPECS.len());
        assert!(report.rows().iter().all(|row| {
            row.status == RealScrambleBenchmarkStatus::GeneratedTablesUnavailable
                && row.phase1_nodes.is_none()
                && row.phase2_nodes.is_none()
        }));
        let markdown = report.to_markdown();
        assert!(markdown.contains("Setup elapsed:"));
        assert!(markdown.contains("phase1_nodes"));
        assert!(markdown.contains("table_missing_entries"));
    }

    #[test]
    fn real_scramble_benchmark_summary_counts_quality_buckets() {
        let report = RealScrambleBenchmarkReport::new(
            Duration::from_micros(7),
            vec![
                benchmark_row(
                    RealScrambleBenchmarkStatus::Success,
                    Some(16),
                    Some(10),
                    Some(true),
                    3,
                ),
                benchmark_row(
                    RealScrambleBenchmarkStatus::Success,
                    Some(18),
                    Some(20),
                    Some(true),
                    4,
                ),
                benchmark_row(
                    RealScrambleBenchmarkStatus::Success,
                    Some(20),
                    Some(30),
                    Some(true),
                    5,
                ),
                benchmark_row(
                    RealScrambleBenchmarkStatus::Success,
                    Some(21),
                    Some(40),
                    Some(true),
                    6,
                ),
                benchmark_row(
                    RealScrambleBenchmarkStatus::UnverifiedSuccess,
                    Some(12),
                    Some(50),
                    Some(false),
                    7,
                ),
                benchmark_row(
                    RealScrambleBenchmarkStatus::NotFoundWithinLimits,
                    None,
                    Some(60),
                    None,
                    8,
                ),
            ],
        );
        let summary = report.summary();

        assert_eq!(summary.rows, 6);
        assert_eq!(summary.success, 4);
        assert_eq!(summary.failures, 2);
        assert_eq!(summary.replay_verified_successes, 4);
        assert_eq!(summary.unverified_successes, 1);
        assert_eq!(summary.solution_len_0_to_16, 1);
        assert_eq!(summary.solution_len_17_to_18, 1);
        assert_eq!(summary.solution_len_19_to_20, 1);
        assert_eq!(summary.solution_len_gt_20, 1);
        assert_eq!(summary.explored_nodes_total, 210);
        assert_eq!(summary.elapsed.as_micros(), 33);
        assert_eq!(report.failure_count(), 2);
        assert_eq!(report.replay_verified_success_count(), 4);

        let markdown = report.to_markdown();
        assert!(markdown.contains("## Summary"));
        assert!(markdown.contains("len_0_to_16"));
        assert!(markdown.contains("replay_verified_successes"));
        assert!(markdown.contains("## Rows"));
    }

    fn benchmark_row(
        status: RealScrambleBenchmarkStatus,
        solution_length: Option<usize>,
        explored_nodes: Option<usize>,
        replay_verified: Option<bool>,
        elapsed_us: u64,
    ) -> RealScrambleBenchmarkRow {
        RealScrambleBenchmarkRow {
            fixture_id: "test".to_owned(),
            scramble: "R U".to_owned(),
            scramble_len: 2,
            strategy: SolverStrategy::GeneratedTwoPhase,
            max_depth: 30,
            max_nodes: Some(1_000),
            status,
            solution_length,
            explored_nodes,
            elapsed: Duration::from_micros(elapsed_us),
            phase1_nodes: None,
            phase2_nodes: None,
            phase1_depth_attempts: None,
            max_phase1_depth_attempted: None,
            total_depth_attempts: None,
            max_total_depth_attempted: None,
            phase1_ordered_candidates: None,
            phase1_ordering_heuristic_evals: None,
            phase2_ordered_candidates: None,
            phase2_ordering_heuristic_evals: None,
            phase2_calls: None,
            heuristic_prunes: None,
            node_limit_hits: None,
            table_missing_entries: None,
            solutions_found: None,
            best_solution_length: None,
            best_phase1_length: None,
            best_phase2_length: None,
            replay_verified,
            moves: solution_length.map_or_else(Vec::new, |_| vec![Move::U]),
            message: None,
        }
    }
}
