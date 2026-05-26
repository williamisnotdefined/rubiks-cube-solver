use std::collections::BTreeSet;
use std::fs;
use std::path::PathBuf;

use cube_engine::dataset::{
    generate_training_examples, generate_training_jsonl, DatasetGenerationConfig,
    DatasetGenerationError, DatasetSplit, DATASET_SCHEMA_VERSION, REVERSIBLE_SCRAMBLE_LABEL_SOURCE,
};
use cube_engine::{Algorithm, Cube, CubieState, Scramble};

#[test]
fn small_fixture_matches_seed_zero_count_twelve() {
    let fixture = fs::read_to_string(small_fixture_path())
        .expect("small dataset fixture should be committed");
    let generated = generate_training_jsonl(DatasetGenerationConfig::new(0, 12))
        .expect("fixture generation should succeed");

    assert_eq!(fixture, generated);
}

#[test]
fn generated_examples_are_unique_valid_and_replay_verified() {
    let examples = generate_training_examples(DatasetGenerationConfig::new(19, 24))
        .expect("dataset generation should succeed");
    let mut states = BTreeSet::new();

    for example in examples {
        assert!(states.insert(example.state.clone()));
        assert_eq!(example.schema_version, DATASET_SCHEMA_VERSION);
        assert_eq!(example.label_source, REVERSIBLE_SCRAMBLE_LABEL_SOURCE);

        let state = CubieState::deserialize(&example.state)
            .expect("serialized cubie state should deserialize");
        state.validate().expect("serialized state should validate");

        let scramble = Scramble::parse(&example.scramble).expect("scramble should parse");
        assert_eq!(example.scramble_depth, scramble.len());

        let solution =
            Algorithm::parse(&example.verified_solution).expect("verified solution should parse");
        assert_eq!(example.verified_solution_length, solution.len());
        assert_eq!(example.best_move, solution.moves().first().copied());

        let mut cube = Cube::try_from_state(state).expect("valid state should build a cube");
        solution.apply_to(&mut cube);
        assert!(cube.is_solved());
    }
}

#[test]
fn generation_is_byte_deterministic_for_same_config() {
    let config = DatasetGenerationConfig::new(42, 16).with_max_scramble_depth(10);

    assert_eq!(
        generate_training_jsonl(config).expect("first generation should succeed"),
        generate_training_jsonl(config).expect("second generation should succeed")
    );
}

#[test]
fn solved_example_documents_schema_field_order_and_null_best_move() {
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
fn duplicate_generation_fails_honestly() {
    let error =
        generate_training_examples(DatasetGenerationConfig::new(0, 2).with_max_scramble_depth(0))
            .expect_err("only one unique state exists at depth zero");

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
fn split_assignment_is_stable_for_train_validation_and_test() {
    assert_eq!(DatasetSplit::for_state("train-state"), DatasetSplit::Train);
    assert_eq!(DatasetSplit::for_state("f"), DatasetSplit::Validation);
    assert_eq!(DatasetSplit::for_state("a"), DatasetSplit::Test);
}

fn small_fixture_path() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../..")
        .join("datasets/fixtures/small.jsonl")
}
