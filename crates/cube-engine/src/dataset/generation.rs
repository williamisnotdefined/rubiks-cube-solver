use std::collections::BTreeSet;

use crate::cube::{Algorithm, Cube, CubieState, Scramble};

use super::errors::DatasetGenerationError;
use super::jsonl::training_examples_to_jsonl;
use super::rng::DatasetRng;
use super::types::{
    DatasetGenerationConfig, DatasetSplit, TrainingExample, DATASET_SCHEMA_VERSION,
    REVERSIBLE_SCRAMBLE_LABEL_SOURCE,
};

pub fn generate_training_examples(
    config: DatasetGenerationConfig,
) -> Result<Vec<TrainingExample>, DatasetGenerationError> {
    let mut examples = Vec::with_capacity(config.count);
    let mut seen_states = BTreeSet::new();
    let mut rng = DatasetRng::new(config.seed);
    let max_attempts = config.count.saturating_mul(500).saturating_add(500);
    let mut attempts = 0;

    while examples.len() < config.count && attempts < max_attempts {
        let depth = candidate_depth(&mut rng, attempts, config.max_scramble_depth);
        let scramble_seed = rng
            .next_u64()
            .wrapping_add(config.seed)
            .wrapping_add((attempts as u64).wrapping_mul(0x9e37_79b9_7f4a_7c15));
        let scramble = Scramble::generate(depth, scramble_seed);
        let example = training_example_from_scramble(scramble)?;

        if seen_states.insert(example.state.clone()) {
            examples.push(example);
        }

        attempts += 1;
    }

    if examples.len() != config.count {
        return Err(DatasetGenerationError::UnableToGenerateUniqueExamples {
            requested: config.count,
            generated: examples.len(),
            attempts,
            max_scramble_depth: config.max_scramble_depth,
        });
    }

    Ok(examples)
}

pub fn generate_training_jsonl(
    config: DatasetGenerationConfig,
) -> Result<String, DatasetGenerationError> {
    let examples = generate_training_examples(config)?;

    Ok(training_examples_to_jsonl(&examples))
}

fn training_example_from_scramble(
    scramble: Scramble,
) -> Result<TrainingExample, DatasetGenerationError> {
    let mut cube = Cube::solved();
    scramble.apply_to(&mut cube);

    let state = cube.state().clone();
    let serialized_state = state.serialize();
    state
        .validate()
        .map_err(|error| DatasetGenerationError::InvalidGeneratedState {
            state: serialized_state.clone(),
            error,
        })?;

    let verified_solution_moves = scramble.inverse();
    let verified_solution = Algorithm::new(verified_solution_moves.clone());
    verify_solution_label(&state, scramble.to_string(), &verified_solution)?;

    Ok(TrainingExample {
        schema_version: DATASET_SCHEMA_VERSION,
        state: serialized_state.clone(),
        scramble: scramble.to_string(),
        scramble_depth: scramble.len(),
        verified_solution: verified_solution.to_string(),
        verified_solution_length: verified_solution.len(),
        best_move: verified_solution.moves().first().copied(),
        label_source: REVERSIBLE_SCRAMBLE_LABEL_SOURCE,
        split: DatasetSplit::for_state(&serialized_state),
    })
}

fn verify_solution_label(
    state: &CubieState,
    scramble: String,
    verified_solution: &Algorithm,
) -> Result<(), DatasetGenerationError> {
    let mut cube = Cube::try_from_state(state.clone()).map_err(|error| {
        DatasetGenerationError::InvalidGeneratedState {
            state: state.serialize(),
            error,
        }
    })?;
    verified_solution.apply_to(&mut cube);

    if cube.is_solved() {
        return Ok(());
    }

    Err(DatasetGenerationError::UnverifiedSolutionLabel {
        state: state.serialize(),
        scramble,
        verified_solution: verified_solution.to_string(),
    })
}

fn candidate_depth(rng: &mut DatasetRng, attempts: usize, max_scramble_depth: usize) -> usize {
    if attempts == 0 || max_scramble_depth == 0 {
        return 0;
    }

    rng.next_index(max_scramble_depth) + 1
}
