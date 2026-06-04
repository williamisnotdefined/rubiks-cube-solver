use crate::cube::Move;

pub const DATASET_SCHEMA_VERSION: u32 = 1;
pub const DATASET_SCHEMA_VERSION_V2: u32 = 2;
pub const SOLVER_VERIFIED_LABEL_SOURCE: &str = "generated_two_phase_solver_replay_verified";
pub const SOLVER_QUALITY_VERIFIED_LABEL_SOURCE: &str =
    "generated_two_phase_quality_solver_replay_verified";
pub const SOLVER_MULTIPROBE_VERIFIED_LABEL_SOURCE: &str =
    "generated_two_phase_multiprobe_solver_replay_verified";
pub const CUBE2_PDB_VERIFIED_LABEL_SOURCE: &str = "cube2_pdb_ida_star_solver_replay_verified";
pub const VERIFIED_SOLUTION_LENGTH_LABEL_TARGET: &str = "verified_solution_length";

pub const CUBE3_DATASET_COMPATIBILITY: DatasetCompatibility = DatasetCompatibility {
    puzzle_id: "cube/3x3x3",
    puzzle_slug: "cube-3x3x3",
    state_encoding_id: "cube3-cubie-v1",
    move_set_id: "cube3-htm-v1",
    metric: "htm",
};

pub const CUBE2_DATASET_COMPATIBILITY: DatasetCompatibility = DatasetCompatibility {
    puzzle_id: "cube/2x2x2",
    puzzle_slug: "cube-2x2x2",
    state_encoding_id: "cube2-corners-v1",
    move_set_id: "cube2-htm-v1",
    metric: "htm",
};

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

    pub fn for_puzzle_state(
        puzzle_id: &str,
        state_encoding_id: &str,
        serialized_state: &str,
    ) -> Self {
        match stable_puzzle_state_hash(puzzle_id, state_encoding_id, serialized_state) % 100 {
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

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct DatasetCompatibility {
    pub puzzle_id: &'static str,
    pub puzzle_slug: &'static str,
    pub state_encoding_id: &'static str,
    pub move_set_id: &'static str,
    pub metric: &'static str,
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

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TrainingExampleV2 {
    pub schema_version: u32,
    pub puzzle_id: &'static str,
    pub puzzle_slug: &'static str,
    pub state_encoding_id: &'static str,
    pub move_set_id: &'static str,
    pub metric: &'static str,
    pub state: String,
    pub scramble: String,
    pub scramble_depth: usize,
    pub verified_solution: String,
    pub verified_solution_length: usize,
    pub best_move: Option<String>,
    pub label_source: &'static str,
    pub label_target: &'static str,
    pub split: DatasetSplit,
    pub generator_seed: u64,
    pub solver_strategy_id: &'static str,
    pub replay_verified: bool,
}

impl TrainingExampleV2 {
    pub fn from_compatibility(
        compatibility: DatasetCompatibility,
        state: String,
        scramble: String,
        scramble_depth: usize,
        verified_solution: String,
        verified_solution_length: usize,
        best_move: Option<String>,
        label_source: &'static str,
        generator_seed: u64,
        solver_strategy_id: &'static str,
        replay_verified: bool,
    ) -> Self {
        let split = DatasetSplit::for_puzzle_state(
            compatibility.puzzle_id,
            compatibility.state_encoding_id,
            &state,
        );

        Self {
            schema_version: DATASET_SCHEMA_VERSION_V2,
            puzzle_id: compatibility.puzzle_id,
            puzzle_slug: compatibility.puzzle_slug,
            state_encoding_id: compatibility.state_encoding_id,
            move_set_id: compatibility.move_set_id,
            metric: compatibility.metric,
            state,
            scramble,
            scramble_depth,
            verified_solution,
            verified_solution_length,
            best_move,
            label_source,
            label_target: VERIFIED_SOLUTION_LENGTH_LABEL_TARGET,
            split,
            generator_seed,
            solver_strategy_id,
            replay_verified,
        }
    }
}

pub fn stable_state_hash(serialized_state: &str) -> u64 {
    stable_hash_bytes(serialized_state.bytes())
}

pub fn stable_puzzle_state_hash(
    puzzle_id: &str,
    state_encoding_id: &str,
    serialized_state: &str,
) -> u64 {
    let mut hash = 0xcbf2_9ce4_8422_2325_u64;

    for byte in puzzle_id
        .bytes()
        .chain([0])
        .chain(state_encoding_id.bytes())
        .chain([0])
        .chain(serialized_state.bytes())
    {
        hash ^= u64::from(byte);
        hash = hash.wrapping_mul(0x0000_0100_0000_01b3);
    }

    hash
}

fn stable_hash_bytes(bytes: impl IntoIterator<Item = u8>) -> u64 {
    let mut hash = 0xcbf2_9ce4_8422_2325_u64;

    for byte in bytes {
        hash ^= u64::from(byte);
        hash = hash.wrapping_mul(0x0000_0100_0000_01b3);
    }

    hash
}

#[cfg(test)]
mod tests {
    use super::{
        stable_puzzle_state_hash, stable_state_hash, DatasetSplit, CUBE2_DATASET_COMPATIBILITY,
        CUBE3_DATASET_COMPATIBILITY,
    };

    const SOLVED_CUBE2_STATE: &str = "cp=0,1,2,3,4,5,6,7;co=0,0,0,0,0,0,0,0";

    #[test]
    fn legacy_state_hash_depends_only_on_state() {
        assert_eq!(
            stable_state_hash(SOLVED_CUBE2_STATE),
            stable_state_hash(SOLVED_CUBE2_STATE)
        );
    }

    #[test]
    fn puzzle_state_hash_includes_puzzle_and_encoding() {
        let cube2_hash = stable_puzzle_state_hash(
            CUBE2_DATASET_COMPATIBILITY.puzzle_id,
            CUBE2_DATASET_COMPATIBILITY.state_encoding_id,
            SOLVED_CUBE2_STATE,
        );
        let cube3_hash = stable_puzzle_state_hash(
            CUBE3_DATASET_COMPATIBILITY.puzzle_id,
            CUBE3_DATASET_COMPATIBILITY.state_encoding_id,
            SOLVED_CUBE2_STATE,
        );

        assert_ne!(cube2_hash, cube3_hash);
    }

    #[test]
    fn puzzle_state_split_is_stable() {
        let first = DatasetSplit::for_puzzle_state(
            CUBE2_DATASET_COMPATIBILITY.puzzle_id,
            CUBE2_DATASET_COMPATIBILITY.state_encoding_id,
            SOLVED_CUBE2_STATE,
        );
        let second = DatasetSplit::for_puzzle_state(
            CUBE2_DATASET_COMPATIBILITY.puzzle_id,
            CUBE2_DATASET_COMPATIBILITY.state_encoding_id,
            SOLVED_CUBE2_STATE,
        );

        assert_eq!(first, second);
    }
}
