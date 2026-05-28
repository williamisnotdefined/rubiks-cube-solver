mod errors;
mod generation;
mod jsonl;
mod rng;
mod types;

pub use errors::DatasetGenerationError;
pub use generation::{generate_training_examples, generate_training_jsonl};
pub use jsonl::{training_examples_to_jsonl, write_training_examples_jsonl};
pub use types::{
    stable_state_hash, DatasetGenerationConfig, DatasetSplit, TrainingExample,
    DATASET_SCHEMA_VERSION, DEFAULT_MAX_SCRAMBLE_DEPTH, REVERSIBLE_SCRAMBLE_LABEL_SOURCE,
    SOLVER_MULTIPROBE_VERIFIED_LABEL_SOURCE, SOLVER_QUALITY_VERIFIED_LABEL_SOURCE,
    SOLVER_VERIFIED_LABEL_SOURCE,
};

#[cfg(test)]
mod tests {
    use super::{
        generate_training_examples, generate_training_jsonl, DatasetGenerationConfig,
        DatasetGenerationError, DatasetSplit, DATASET_SCHEMA_VERSION,
        REVERSIBLE_SCRAMBLE_LABEL_SOURCE,
    };
    use crate::cube::{Algorithm, Cube, CubieState, Scramble};

    #[test]
    fn generated_jsonl_is_deterministic_for_seed_and_count() {
        let config = DatasetGenerationConfig::new(7, 8);

        assert_eq!(
            generate_training_jsonl(config).expect("first generation should succeed"),
            generate_training_jsonl(config).expect("second generation should succeed")
        );
    }

    #[test]
    fn generated_examples_are_valid_deserializable_states() {
        let examples = generate_training_examples(DatasetGenerationConfig::new(3, 12))
            .expect("dataset generation should succeed");

        for example in examples {
            let state = CubieState::deserialize(&example.state)
                .expect("generated serialized state should deserialize");
            state
                .validate()
                .expect("generated serialized state should validate");
        }
    }

    #[test]
    fn verified_solution_and_best_move_are_replay_verified() {
        let examples = generate_training_examples(DatasetGenerationConfig::new(11, 12))
            .expect("dataset generation should succeed");

        for example in examples {
            let state = CubieState::deserialize(&example.state)
                .expect("generated serialized state should deserialize");
            let mut cube = Cube::try_from_state(state).expect("state should be valid");
            let solution = Algorithm::parse(&example.verified_solution)
                .expect("verified solution should parse as notation");

            assert_eq!(example.verified_solution_length, solution.len());
            assert_eq!(example.best_move, solution.moves().first().copied());
            solution.apply_to(&mut cube);

            assert!(cube.is_solved());
        }
    }

    #[test]
    fn duplicate_only_generation_fails_instead_of_emitting_duplicates() {
        let error = generate_training_examples(
            DatasetGenerationConfig::new(0, 2).with_max_scramble_depth(0),
        )
        .expect_err("depth-zero generation can only produce the solved state once");

        assert!(matches!(
            error,
            DatasetGenerationError::UnableToGenerateUniqueExamples {
                requested: 2,
                generated: 1,
                max_scramble_depth: 0,
                ..
            }
        ));
    }

    #[test]
    fn training_example_schema_has_stable_field_order_and_labels() {
        let jsonl =
            generate_training_jsonl(DatasetGenerationConfig::new(0, 1).with_max_scramble_depth(0))
                .expect("single solved example should generate");

        assert_eq!(
            jsonl,
            concat!(
                "{\"schema_version\":1,",
                "\"state\":\"cp=0,1,2,3,4,5,6,7;co=0,0,0,0,0,0,0,0;ep=0,1,2,3,4,5,6,7,8,9,10,11;eo=0,0,0,0,0,0,0,0,0,0,0,0\",",
                "\"scramble\":\"\",",
                "\"scramble_depth\":0,",
                "\"verified_solution\":\"\",",
                "\"verified_solution_length\":0,",
                "\"best_move\":null,",
                "\"label_source\":\"reversible_scramble_inverse_replay_verified\",",
                "\"split\":\"train\"}\n",
            )
        );
    }

    #[test]
    fn generated_examples_use_documented_label_source_and_schema_version() {
        let examples = generate_training_examples(DatasetGenerationConfig::new(5, 6))
            .expect("dataset generation should succeed");

        for example in examples {
            assert_eq!(example.schema_version, DATASET_SCHEMA_VERSION);
            assert_eq!(example.label_source, REVERSIBLE_SCRAMBLE_LABEL_SOURCE);
            assert_eq!(
                example.scramble_depth,
                Scramble::parse(&example.scramble).unwrap().len()
            );
        }
    }

    #[test]
    fn split_assignment_is_stable_for_known_states() {
        assert_eq!(DatasetSplit::for_state("train-state"), DatasetSplit::Train);
        assert_eq!(DatasetSplit::for_state("f"), DatasetSplit::Validation);
        assert_eq!(DatasetSplit::for_state("a"), DatasetSplit::Test);
    }
}
