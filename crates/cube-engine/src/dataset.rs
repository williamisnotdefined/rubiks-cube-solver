use std::collections::BTreeSet;
use std::fmt;
use std::fs::{self, File};
use std::io::{self, BufWriter, Write};
use std::path::Path;

use crate::cube::{Algorithm, Cube, CubeValidationError, CubieState, Move, Scramble};

pub const DATASET_SCHEMA_VERSION: u32 = 1;
pub const DEFAULT_MAX_SCRAMBLE_DEPTH: usize = 12;
pub const REVERSIBLE_SCRAMBLE_LABEL_SOURCE: &str = "reversible_scramble_inverse_replay_verified";

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct DatasetGenerationConfig {
    pub seed: u64,
    pub count: usize,
    pub max_scramble_depth: usize,
}

impl DatasetGenerationConfig {
    pub const fn new(seed: u64, count: usize) -> Self {
        Self {
            seed,
            count,
            max_scramble_depth: DEFAULT_MAX_SCRAMBLE_DEPTH,
        }
    }

    pub const fn with_max_scramble_depth(mut self, max_scramble_depth: usize) -> Self {
        self.max_scramble_depth = max_scramble_depth;
        self
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum DatasetSplit {
    Train,
    Validation,
    Test,
}

impl DatasetSplit {
    pub fn for_state(serialized_state: &str) -> Self {
        match stable_state_hash(serialized_state) % 100 {
            0..=79 => Self::Train,
            80..=89 => Self::Validation,
            _ => Self::Test,
        }
    }

    pub const fn label(self) -> &'static str {
        match self {
            Self::Train => "train",
            Self::Validation => "validation",
            Self::Test => "test",
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TrainingExample {
    pub schema_version: u32,
    pub state: String,
    pub scramble: String,
    pub scramble_depth: usize,
    pub verified_solution: String,
    pub verified_solution_length: usize,
    pub best_move: Option<Move>,
    pub label_source: &'static str,
    pub split: DatasetSplit,
}

impl TrainingExample {
    pub fn to_json_line(&self) -> String {
        let mut output = String::new();

        output.push_str("{\"schema_version\":");
        output.push_str(&self.schema_version.to_string());
        output.push_str(",\"state\":");
        push_json_string(&mut output, &self.state);
        output.push_str(",\"scramble\":");
        push_json_string(&mut output, &self.scramble);
        output.push_str(",\"scramble_depth\":");
        output.push_str(&self.scramble_depth.to_string());
        output.push_str(",\"verified_solution\":");
        push_json_string(&mut output, &self.verified_solution);
        output.push_str(",\"verified_solution_length\":");
        output.push_str(&self.verified_solution_length.to_string());
        output.push_str(",\"best_move\":");
        if let Some(best_move) = self.best_move {
            push_json_string(&mut output, best_move.notation());
        } else {
            output.push_str("null");
        }
        output.push_str(",\"label_source\":");
        push_json_string(&mut output, self.label_source);
        output.push_str(",\"split\":");
        push_json_string(&mut output, self.split.label());
        output.push('}');

        output
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DatasetGenerationError {
    InvalidGeneratedState {
        state: String,
        error: CubeValidationError,
    },
    UnverifiedSolutionLabel {
        state: String,
        scramble: String,
        verified_solution: String,
    },
    UnableToGenerateUniqueExamples {
        requested: usize,
        generated: usize,
        attempts: usize,
        max_scramble_depth: usize,
    },
}

impl fmt::Display for DatasetGenerationError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidGeneratedState { state, error } => write!(
                formatter,
                "generated invalid cubie state {state:?}: {error}"
            ),
            Self::UnverifiedSolutionLabel {
                state,
                scramble,
                verified_solution,
            } => write!(
                formatter,
                "verified solution label {verified_solution:?} for state {state:?} from scramble {scramble:?} did not solve the cube"
            ),
            Self::UnableToGenerateUniqueExamples {
                requested,
                generated,
                attempts,
                max_scramble_depth,
            } => write!(
                formatter,
                "could not generate {requested} unique examples with max scramble depth {max_scramble_depth}; generated {generated} after {attempts} attempts"
            ),
        }
    }
}

impl std::error::Error for DatasetGenerationError {}

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

pub fn training_examples_to_jsonl(examples: &[TrainingExample]) -> String {
    let mut output = String::new();

    for example in examples {
        output.push_str(&example.to_json_line());
        output.push('\n');
    }

    output
}

pub fn write_training_examples_jsonl(
    path: impl AsRef<Path>,
    examples: &[TrainingExample],
) -> io::Result<()> {
    let path = path.as_ref();
    if let Some(parent) = path.parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent)?;
        }
    }

    let file = File::create(path)?;
    let mut writer = BufWriter::new(file);

    for example in examples {
        writeln!(writer, "{}", example.to_json_line())?;
    }

    writer.flush()
}

pub fn stable_state_hash(serialized_state: &str) -> u64 {
    let mut hash = 0xcbf2_9ce4_8422_2325_u64;

    for byte in serialized_state.bytes() {
        hash ^= u64::from(byte);
        hash = hash.wrapping_mul(0x0000_0100_0000_01b3);
    }

    hash
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

fn push_json_string(output: &mut String, value: &str) {
    output.push('"');

    for character in value.chars() {
        match character {
            '"' => output.push_str("\\\""),
            '\\' => output.push_str("\\\\"),
            '\n' => output.push_str("\\n"),
            '\r' => output.push_str("\\r"),
            '\t' => output.push_str("\\t"),
            character if character.is_control() => {
                output.push_str(&format!("\\u{:04x}", character as u32));
            }
            character => output.push(character),
        }
    }

    output.push('"');
}

#[derive(Clone, Copy, Debug)]
struct DatasetRng {
    state: u64,
}

impl DatasetRng {
    const fn new(seed: u64) -> Self {
        Self {
            state: seed ^ 0xa076_1d64_78bd_642f,
        }
    }

    fn next_u64(&mut self) -> u64 {
        self.state = self
            .state
            .wrapping_mul(6_364_136_223_846_793_005)
            .wrapping_add(1_442_695_040_888_963_407);

        self.state
    }

    fn next_index(&mut self, upper_bound: usize) -> usize {
        debug_assert!(upper_bound > 0);

        (self.next_u64() % upper_bound as u64) as usize
    }
}

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
