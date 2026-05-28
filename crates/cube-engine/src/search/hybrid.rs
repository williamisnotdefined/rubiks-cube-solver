mod artifact;
mod encoding;
mod ordering;
mod parser;
mod types;

pub(crate) const DEFAULT_HYBRID_VALUE_OUTPUT_PATH: &str =
    "ml/outputs/value-baseline/value_outputs.tsv";

pub(crate) use artifact::{load_hybrid_value_model, load_hybrid_value_outputs};
pub(crate) use ordering::solve_hybrid_move_ordering;
#[allow(unused_imports)]
pub(crate) use types::{
    HybridMoveOrderingMetrics, HybridSearchResult, HybridValueArtifact,
    HybridValueArtifactMetadata, HybridValueArtifactStatus, HybridValueModel, HybridValueSource,
    HybridValueTable,
};

#[cfg(test)]
use parser::{parse_hybrid_value_model, parse_hybrid_value_outputs};

#[cfg(test)]
mod tests {
    use super::{
        load_hybrid_value_outputs, parse_hybrid_value_model, parse_hybrid_value_outputs,
        solve_hybrid_move_ordering, HybridValueArtifact, HybridValueArtifactStatus,
    };
    use crate::cube::{Cube, Move};
    use crate::search::{SearchBudget, SearchOutcome};

    #[test]
    fn missing_artifact_reports_missing_status() {
        let path = std::env::temp_dir().join(format!(
            "rubiks-cube-solver-missing-value-output-test-{}.tsv",
            std::process::id()
        ));
        let _ = std::fs::remove_file(&path);
        let artifact = load_hybrid_value_outputs(path);

        assert_eq!(artifact.status(), HybridValueArtifactStatus::Missing);
    }

    #[test]
    fn dependency_fallback_metadata_is_not_loaded_as_learned_values() {
        let artifact = parse_hybrid_value_outputs(&format!(
            "# format=rubiks_cube_solver_value_outputs_v1\n# model_type=constant_train_mean_dependency_fallback\n# pytorch_available=false\n{}\t1.0\n",
            Cube::solved().state().serialize()
        ));

        assert_eq!(
            artifact.status(),
            HybridValueArtifactStatus::DependencyFallback
        );
    }

    #[test]
    fn solved_child_score_orders_shallow_solution_first() {
        let artifact = parse_hybrid_value_outputs(&format!(
            "# format=rubiks_cube_solver_value_outputs_v1\n# model_type=pytorch_mlp\n# pytorch_available=true\n{}\t0.0\n",
            Cube::solved().state().serialize()
        ));
        let HybridValueArtifact::Available(source) = artifact else {
            panic!("test value artifact should load")
        };
        let mut cube = Cube::solved();
        cube.apply_move(Move::F);

        let result = solve_hybrid_move_ordering(&cube, SearchBudget::new(1), &source);

        match result.outcome {
            SearchOutcome::Found(solution) => assert_eq!(solution.moves(), &[Move::FPrime]),
            SearchOutcome::NotFoundWithinLimits { .. } => panic!("hybrid ordering should solve F"),
        }
        assert!(result.metrics.scored_move_lookups > 0);
        assert!(result.metrics.missing_score_lookups > 0);
    }

    #[test]
    fn value_model_scores_all_child_states_without_lookup_misses() {
        let artifact = parse_hybrid_value_model(&format!(
            r#"{{
                "format":"rubiks_cube_solver_value_model_v1",
                "model_type":"pytorch_mlp",
                "pytorch_available":true,
                "examples":1,
                "label_target":"verified_solution_length",
                "label_source":"generated_two_phase_quality_solver_replay_verified",
                "feature_dim":40,
                "hidden_dim":1,
                "layers":[{{"type":"linear","weight":[[{}]],"bias":[1.25]}}]
            }}"#,
            vec!["0.0"; 40].join(",")
        ));
        let HybridValueArtifact::Available(source) = artifact else {
            panic!("test model artifact should load")
        };
        let mut cube = Cube::solved();
        cube.apply_move(Move::F);

        let result = solve_hybrid_move_ordering(&cube, SearchBudget::new(1), &source);

        match result.outcome {
            SearchOutcome::Found(solution) => assert_eq!(solution.moves(), &[Move::FPrime]),
            SearchOutcome::NotFoundWithinLimits { .. } => panic!("model ordering should solve F"),
        }
        assert!(result.metrics.scored_move_lookups > 0);
        assert_eq!(result.metrics.missing_score_lookups, 0);
        assert_eq!(
            result.metrics.model_score_evals,
            result.metrics.scored_move_lookups
        );
    }
}
