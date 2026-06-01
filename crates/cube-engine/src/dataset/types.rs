use crate::cube::Move;

pub const DATASET_SCHEMA_VERSION: u32 = 1;
pub const SOLVER_VERIFIED_LABEL_SOURCE: &str = "generated_two_phase_solver_replay_verified";
pub const SOLVER_QUALITY_VERIFIED_LABEL_SOURCE: &str =
    "generated_two_phase_quality_solver_replay_verified";
pub const SOLVER_MULTIPROBE_VERIFIED_LABEL_SOURCE: &str =
    "generated_two_phase_multiprobe_solver_replay_verified";

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

pub fn stable_state_hash(serialized_state: &str) -> u64 {
    let mut hash = 0xcbf2_9ce4_8422_2325_u64;

    for byte in serialized_state.bytes() {
        hash ^= u64::from(byte);
        hash = hash.wrapping_mul(0x0000_0100_0000_01b3);
    }

    hash
}
