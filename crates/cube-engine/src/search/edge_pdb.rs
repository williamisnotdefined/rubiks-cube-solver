use std::fmt;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::OnceLock;

use super::heuristics::Heuristic;
use crate::cube::cubies::{Edge, EDGE_COUNT};
use crate::cube::moves::FACE_MOVES;
use crate::cube::{Cube, CubeValidationError, CubieState};

pub const EDGE_PATTERN_DATABASE_A_FILE_NAME: &str = "edge-pattern-database-a.repdb";
pub const EDGE_PATTERN_DATABASE_B_FILE_NAME: &str = "edge-pattern-database-b.repdb";
pub const EDGE_PATTERN_DATABASE_FORMAT_VERSION: u16 = 1;
pub const EDGE_PATTERN_SIZE: usize = 6;
pub const EDGE_PATTERN_COMBINATION_COUNT: usize = 924;
pub const EDGE_PATTERN_PERMUTATION_COUNT: usize = 720;
pub const EDGE_PATTERN_ORIENTATION_COUNT: usize = 64;
pub const EDGE_PATTERN_DATABASE_COORDINATE_COUNT: usize = EDGE_PATTERN_COMBINATION_COUNT
    * EDGE_PATTERN_PERMUTATION_COUNT
    * EDGE_PATTERN_ORIENTATION_COUNT;

const ARTIFACT_MAGIC: [u8; 8] = *b"RCEPDB1\0";
const UNREACHED_DISTANCE: u8 = u8::MAX;
const CHECKSUM_OFFSET_BASIS: u64 = 0xcbf2_9ce4_8422_2325;
const CHECKSUM_PRIME: u64 = 0x0000_0100_0000_01b3;
const FACE_MOVE_COUNT: usize = FACE_MOVES.len();

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum EdgePatternDatabaseId {
    A,
    B,
}

impl EdgePatternDatabaseId {
    pub const ALL: [Self; 2] = [Self::A, Self::B];

    pub const fn artifact_value(self) -> u8 {
        match self {
            Self::A => 0,
            Self::B => 1,
        }
    }

    pub const fn from_artifact_value(value: u8) -> Option<Self> {
        match value {
            0 => Some(Self::A),
            1 => Some(Self::B),
            _ => None,
        }
    }

    pub const fn file_name(self) -> &'static str {
        match self {
            Self::A => EDGE_PATTERN_DATABASE_A_FILE_NAME,
            Self::B => EDGE_PATTERN_DATABASE_B_FILE_NAME,
        }
    }

    const fn pattern(self) -> [Edge; EDGE_PATTERN_SIZE] {
        match self {
            Self::A => [Edge::Ur, Edge::Uf, Edge::Ul, Edge::Ub, Edge::Dr, Edge::Df],
            Self::B => [Edge::Dl, Edge::Db, Edge::Fr, Edge::Fl, Edge::Bl, Edge::Br],
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum EdgePatternDatabaseError {
    Io {
        path: PathBuf,
        error: String,
    },
    TooShort {
        path: PathBuf,
    },
    InvalidMagic {
        path: PathBuf,
    },
    ChecksumMismatch {
        path: PathBuf,
        expected: u64,
        actual: u64,
    },
    UnsupportedFormatVersion {
        path: PathBuf,
        version: u16,
    },
    InvalidPatternId {
        path: PathBuf,
        value: u8,
    },
    PatternMismatch {
        path: PathBuf,
        expected: EdgePatternDatabaseId,
        actual: EdgePatternDatabaseId,
    },
    UnexpectedEnd {
        path: PathBuf,
        field: &'static str,
    },
    TrailingBytes {
        path: PathBuf,
        trailing: usize,
    },
    TableSizeMismatch {
        expected: usize,
        actual: usize,
    },
    MaxDepthUsesSentinel,
    InvalidRepresentative {
        pattern: EdgePatternDatabaseId,
        index: usize,
        error: CubeValidationError,
    },
}

impl fmt::Display for EdgePatternDatabaseError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Io { path, error } => write!(
                formatter,
                "could not access edge pattern database {}: {error}",
                path.display()
            ),
            Self::TooShort { path } => write!(
                formatter,
                "edge pattern database {} is too short",
                path.display()
            ),
            Self::InvalidMagic { path } => write!(
                formatter,
                "edge pattern database {} has an invalid header",
                path.display()
            ),
            Self::ChecksumMismatch {
                path,
                expected,
                actual,
            } => write!(
                formatter,
                "edge pattern database {} checksum mismatch: expected {expected}, got {actual}",
                path.display()
            ),
            Self::UnsupportedFormatVersion { path, version } => write!(
                formatter,
                "edge pattern database {} uses unsupported format version {version}",
                path.display()
            ),
            Self::InvalidPatternId { path, value } => write!(
                formatter,
                "edge pattern database {} uses invalid pattern id {value}",
                path.display()
            ),
            Self::PatternMismatch {
                path,
                expected,
                actual,
            } => write!(
                formatter,
                "edge pattern database {} stores pattern {actual:?}, expected {expected:?}",
                path.display()
            ),
            Self::UnexpectedEnd { path, field } => write!(
                formatter,
                "edge pattern database {} ended while reading {field}",
                path.display()
            ),
            Self::TrailingBytes { path, trailing } => write!(
                formatter,
                "edge pattern database {} has {trailing} trailing bytes",
                path.display()
            ),
            Self::TableSizeMismatch { expected, actual } => write!(
                formatter,
                "edge pattern database has {actual} entries, expected {expected}"
            ),
            Self::MaxDepthUsesSentinel => formatter.write_str(
                "edge pattern database max depth must be below 255 because 255 marks unreached entries",
            ),
            Self::InvalidRepresentative {
                pattern,
                index,
                error,
            } => write!(
                formatter,
                "edge pattern database {pattern:?} representative state {index} is invalid: {error}"
            ),
        }
    }
}

impl std::error::Error for EdgePatternDatabaseError {}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EdgePatternDatabase {
    id: EdgePatternDatabaseId,
    max_depth: u8,
    entries: Vec<u8>,
}

#[derive(Clone, Copy, Debug)]
pub struct EdgePatternDatabaseHeuristic<'a> {
    database: &'a EdgePatternDatabase,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
struct EdgeMoveEffect {
    next_position: [usize; EDGE_COUNT],
    orientation_delta: [u8; EDGE_COUNT],
}

impl EdgePatternDatabase {
    pub fn generate(
        id: EdgePatternDatabaseId,
        max_depth: u8,
    ) -> Result<Self, EdgePatternDatabaseError> {
        if max_depth == UNREACHED_DISTANCE {
            return Err(EdgePatternDatabaseError::MaxDepthUsesSentinel);
        }

        let mut entries = vec![UNREACHED_DISTANCE; EDGE_PATTERN_DATABASE_COORDINATE_COUNT];
        let solved_coordinate = edge_pattern_coordinate(&CubieState::solved(), id);
        let mut frontier = vec![solved_coordinate];

        entries[solved_coordinate] = 0;

        for depth in 0..max_depth {
            let next_depth = depth + 1;
            let mut next_frontier = Vec::new();

            for coordinate in frontier {
                for effect in edge_move_effects() {
                    let next_coordinate = apply_edge_move_effect(coordinate, *effect);

                    if entries[next_coordinate] == UNREACHED_DISTANCE {
                        entries[next_coordinate] = next_depth;
                        next_frontier.push(next_coordinate);
                    }
                }
            }

            if next_frontier.is_empty() {
                break;
            }

            frontier = next_frontier;
        }

        Self::from_dense_entries(id, max_depth, entries)
    }

    pub fn from_dense_entries(
        id: EdgePatternDatabaseId,
        max_depth: u8,
        entries: Vec<u8>,
    ) -> Result<Self, EdgePatternDatabaseError> {
        validate_entries(max_depth, entries.len())?;

        Ok(Self {
            id,
            max_depth,
            entries,
        })
    }

    pub fn load_artifact_for(
        id: EdgePatternDatabaseId,
        path: impl AsRef<Path>,
    ) -> Result<Self, EdgePatternDatabaseError> {
        let path = path.as_ref();
        let database = Self::load_artifact(path)?;

        if database.id != id {
            return Err(EdgePatternDatabaseError::PatternMismatch {
                path: path.to_path_buf(),
                expected: id,
                actual: database.id,
            });
        }

        Ok(database)
    }

    pub fn load_artifact(path: impl AsRef<Path>) -> Result<Self, EdgePatternDatabaseError> {
        let path = path.as_ref();
        let bytes = fs::read(path).map_err(|error| EdgePatternDatabaseError::Io {
            path: path.to_path_buf(),
            error: error.to_string(),
        })?;

        Self::from_artifact_bytes(path, &bytes)
    }

    pub fn save_artifact(&self, path: impl AsRef<Path>) -> Result<(), EdgePatternDatabaseError> {
        let path = path.as_ref();
        let bytes = self.to_artifact_bytes(path)?;

        fs::write(path, bytes).map_err(|error| EdgePatternDatabaseError::Io {
            path: path.to_path_buf(),
            error: error.to_string(),
        })
    }

    pub fn to_artifact_bytes(
        &self,
        _path: impl AsRef<Path>,
    ) -> Result<Vec<u8>, EdgePatternDatabaseError> {
        validate_entries(self.max_depth, self.entries.len())?;

        let mut bytes = Vec::with_capacity(
            ARTIFACT_MAGIC.len()
                + std::mem::size_of::<u16>()
                + std::mem::size_of::<u8>()
                + std::mem::size_of::<u8>()
                + std::mem::size_of::<u64>()
                + self.entries.len()
                + std::mem::size_of::<u64>(),
        );
        bytes.extend_from_slice(&ARTIFACT_MAGIC);
        push_u16(&mut bytes, EDGE_PATTERN_DATABASE_FORMAT_VERSION);
        push_u8(&mut bytes, self.id.artifact_value());
        push_u8(&mut bytes, self.max_depth);
        push_u64(&mut bytes, self.entries.len() as u64);
        bytes.extend_from_slice(&self.entries);
        let checksum = edge_pdb_checksum(&bytes);
        push_u64(&mut bytes, checksum);

        Ok(bytes)
    }

    pub fn from_artifact_bytes(
        path: impl AsRef<Path>,
        bytes: &[u8],
    ) -> Result<Self, EdgePatternDatabaseError> {
        let path = path.as_ref();
        let checksum_size = std::mem::size_of::<u64>();
        if bytes.len() < ARTIFACT_MAGIC.len() + checksum_size {
            return Err(EdgePatternDatabaseError::TooShort {
                path: path.to_path_buf(),
            });
        }

        let payload_len = bytes.len() - checksum_size;
        let (payload, checksum_bytes) = bytes.split_at(payload_len);
        let mut checksum = [0_u8; 8];
        checksum.copy_from_slice(checksum_bytes);
        let expected = u64::from_le_bytes(checksum);
        let actual = edge_pdb_checksum(payload);
        if expected != actual {
            return Err(EdgePatternDatabaseError::ChecksumMismatch {
                path: path.to_path_buf(),
                expected,
                actual,
            });
        }

        let mut cursor = ArtifactCursor::new(path, payload);
        let magic = cursor.read_bytes(ARTIFACT_MAGIC.len(), "magic")?;
        if magic != ARTIFACT_MAGIC.as_slice() {
            return Err(EdgePatternDatabaseError::InvalidMagic {
                path: path.to_path_buf(),
            });
        }

        let format_version = cursor.read_u16("format_version")?;
        if format_version != EDGE_PATTERN_DATABASE_FORMAT_VERSION {
            return Err(EdgePatternDatabaseError::UnsupportedFormatVersion {
                path: path.to_path_buf(),
                version: format_version,
            });
        }

        let pattern_value = cursor.read_u8("pattern_id")?;
        let id = EdgePatternDatabaseId::from_artifact_value(pattern_value).ok_or_else(|| {
            EdgePatternDatabaseError::InvalidPatternId {
                path: path.to_path_buf(),
                value: pattern_value,
            }
        })?;
        let max_depth = cursor.read_u8("max_depth")?;
        let entry_count = usize::try_from(cursor.read_u64("entry_count")?).map_err(|_| {
            EdgePatternDatabaseError::TableSizeMismatch {
                expected: EDGE_PATTERN_DATABASE_COORDINATE_COUNT,
                actual: usize::MAX,
            }
        })?;
        validate_entries(max_depth, entry_count)?;
        if cursor.remaining_len() < entry_count {
            return Err(EdgePatternDatabaseError::UnexpectedEnd {
                path: path.to_path_buf(),
                field: "entries",
            });
        }

        let entries = cursor.read_bytes(entry_count, "entries")?.to_vec();
        let trailing = cursor.remaining_len();
        if trailing != 0 {
            return Err(EdgePatternDatabaseError::TrailingBytes {
                path: path.to_path_buf(),
                trailing,
            });
        }

        Self::from_dense_entries(id, max_depth, entries)
    }

    pub const fn id(&self) -> EdgePatternDatabaseId {
        self.id
    }

    pub const fn max_depth(&self) -> u8 {
        self.max_depth
    }

    pub fn entry_count(&self) -> usize {
        self.entries
            .iter()
            .filter(|distance| **distance != UNREACHED_DISTANCE)
            .count()
    }

    pub fn lower_bound_for_state(&self, state: &CubieState) -> usize {
        let coordinate = edge_pattern_coordinate(state, self.id);

        self.lower_bound_for_coordinate(coordinate)
    }

    pub fn lower_bound_for_coordinate(&self, coordinate: usize) -> usize {
        self.entries
            .get(coordinate)
            .copied()
            .filter(|distance| *distance != UNREACHED_DISTANCE)
            .map_or(usize::from(self.max_depth) + 1, usize::from)
    }
}

impl<'a> EdgePatternDatabaseHeuristic<'a> {
    pub const fn new(database: &'a EdgePatternDatabase) -> Self {
        Self { database }
    }
}

impl Heuristic for EdgePatternDatabaseHeuristic<'_> {
    fn estimate(&self, cube: &Cube) -> usize {
        self.database.lower_bound_for_state(cube.state())
    }
}

impl EdgeMoveEffect {
    const fn identity() -> Self {
        Self {
            next_position: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
            orientation_delta: [0; EDGE_COUNT],
        }
    }
}

pub fn edge_pattern_database_path(directory: &Path, id: EdgePatternDatabaseId) -> PathBuf {
    directory.join(id.file_name())
}

pub fn edge_pattern_coordinate(state: &CubieState, id: EdgePatternDatabaseId) -> usize {
    let pattern = id.pattern();
    let mut positions = [0_usize; EDGE_PATTERN_SIZE];
    let mut permutation = [0_usize; EDGE_PATTERN_SIZE];
    let mut orientations = [0_u8; EDGE_PATTERN_SIZE];
    let mut count = 0_usize;

    for position in 0..EDGE_COUNT {
        if let Some(pattern_index) = pattern_index(pattern, state.edge_permutation[position]) {
            positions[count] = position;
            permutation[count] = pattern_index;
            orientations[count] = state.edge_orientation[position];
            count += 1;
        }
    }

    debug_assert_eq!(count, EDGE_PATTERN_SIZE);

    let combination = rank_combination(&positions);
    let permutation = rank_permutation(&permutation);
    let orientation = rank_orientation(&orientations);

    (combination * EDGE_PATTERN_PERMUTATION_COUNT + permutation) * EDGE_PATTERN_ORIENTATION_COUNT
        + orientation
}

fn apply_edge_move_effect(coordinate: usize, effect: EdgeMoveEffect) -> usize {
    let orientation = coordinate % EDGE_PATTERN_ORIENTATION_COUNT;
    let coordinate = coordinate / EDGE_PATTERN_ORIENTATION_COUNT;
    let permutation = coordinate % EDGE_PATTERN_PERMUTATION_COUNT;
    let combination = coordinate / EDGE_PATTERN_PERMUTATION_COUNT;
    let positions = unrank_combination(combination);
    let permutation = unrank_permutation(permutation);
    let orientations = unrank_orientation(orientation);
    let mut moved = [(0_usize, 0_usize, 0_u8); EDGE_PATTERN_SIZE];

    for index in 0..EDGE_PATTERN_SIZE {
        let position = positions[index];
        moved[index] = (
            effect.next_position[position],
            permutation[index],
            orientations[index] ^ effect.orientation_delta[position],
        );
    }

    moved.sort_by_key(|(position, _, _)| *position);

    let mut next_positions = [0_usize; EDGE_PATTERN_SIZE];
    let mut next_permutation = [0_usize; EDGE_PATTERN_SIZE];
    let mut next_orientations = [0_u8; EDGE_PATTERN_SIZE];

    for (index, (position, edge, orientation)) in moved.into_iter().enumerate() {
        next_positions[index] = position;
        next_permutation[index] = edge;
        next_orientations[index] = orientation;
    }

    (rank_combination(&next_positions) * EDGE_PATTERN_PERMUTATION_COUNT
        + rank_permutation(&next_permutation))
        * EDGE_PATTERN_ORIENTATION_COUNT
        + rank_orientation(&next_orientations)
}

#[cfg(test)]
fn cube_from_edge_pattern_coordinate(
    id: EdgePatternDatabaseId,
    coordinate: usize,
) -> Result<Cube, EdgePatternDatabaseError> {
    let orientation = coordinate % EDGE_PATTERN_ORIENTATION_COUNT;
    let coordinate = coordinate / EDGE_PATTERN_ORIENTATION_COUNT;
    let permutation = coordinate % EDGE_PATTERN_PERMUTATION_COUNT;
    let combination = coordinate / EDGE_PATTERN_PERMUTATION_COUNT;
    let pattern = id.pattern();
    let positions = unrank_combination(combination);
    let permutation = unrank_permutation(permutation);
    let orientations = unrank_orientation(orientation);
    let mut state = CubieState::solved();
    let mut non_pattern_edges = Edge::ALL
        .into_iter()
        .filter(|edge| pattern_index(pattern, *edge).is_none());
    let mut non_pattern_positions = Vec::with_capacity(EDGE_COUNT - EDGE_PATTERN_SIZE);
    let mut pattern_position_index = 0_usize;

    for position in 0..EDGE_COUNT {
        if pattern_position_index < EDGE_PATTERN_SIZE
            && positions[pattern_position_index] == position
        {
            state.edge_permutation[position] = pattern[permutation[pattern_position_index]];
            state.edge_orientation[position] = orientations[pattern_position_index];
            pattern_position_index += 1;
        } else {
            state.edge_permutation[position] = non_pattern_edges.next().ok_or({
                EdgePatternDatabaseError::TableSizeMismatch {
                    expected: EDGE_COUNT,
                    actual: position,
                }
            })?;
            state.edge_orientation[position] = 0;
            non_pattern_positions.push(position);
        }
    }

    if state
        .edge_orientation
        .iter()
        .map(|orientation| u16::from(*orientation))
        .sum::<u16>()
        % 2
        != 0
    {
        state.edge_orientation[non_pattern_positions[0]] = 1;
    }

    match Cube::try_from_state(state.clone()) {
        Ok(cube) => Ok(cube),
        Err(CubeValidationError::InvalidPermutationParity { .. }) => {
            state
                .edge_permutation
                .swap(non_pattern_positions[0], non_pattern_positions[1]);
            Cube::try_from_state(state).map_err(|error| {
                EdgePatternDatabaseError::InvalidRepresentative {
                    pattern: id,
                    index: coordinate,
                    error,
                }
            })
        }
        Err(error) => Err(EdgePatternDatabaseError::InvalidRepresentative {
            pattern: id,
            index: coordinate,
            error,
        }),
    }
}

fn pattern_index(pattern: [Edge; EDGE_PATTERN_SIZE], edge: Edge) -> Option<usize> {
    pattern.iter().position(|candidate| *candidate == edge)
}

fn edge_move_effects() -> &'static [EdgeMoveEffect; FACE_MOVE_COUNT] {
    static EFFECTS: OnceLock<[EdgeMoveEffect; FACE_MOVE_COUNT]> = OnceLock::new();

    EFFECTS.get_or_init(generate_edge_move_effects)
}

fn generate_edge_move_effects() -> [EdgeMoveEffect; FACE_MOVE_COUNT] {
    let mut effects = [EdgeMoveEffect::identity(); FACE_MOVE_COUNT];

    for (move_index, move_) in FACE_MOVES.into_iter().enumerate() {
        let mut cube = Cube::solved();
        cube.apply_move(move_);

        for (old_position, edge) in Edge::ALL.into_iter().enumerate() {
            let new_position = cube
                .state()
                .edge_permutation
                .iter()
                .position(|candidate| *candidate == edge)
                .expect("moved solved cube should contain every edge");
            effects[move_index].next_position[old_position] = new_position;
            effects[move_index].orientation_delta[old_position] =
                cube.state().edge_orientation[new_position];
        }
    }

    effects
}

fn rank_combination(positions: &[usize; EDGE_PATTERN_SIZE]) -> usize {
    let mut rank = 0_usize;
    let mut start = 0_usize;

    for (index, position) in positions.iter().copied().enumerate() {
        for candidate in start..position {
            rank += binomial(EDGE_COUNT - candidate - 1, EDGE_PATTERN_SIZE - index - 1);
        }
        start = position + 1;
    }

    rank
}

fn unrank_combination(mut rank: usize) -> [usize; EDGE_PATTERN_SIZE] {
    let mut positions = [0_usize; EDGE_PATTERN_SIZE];
    let mut start = 0_usize;

    for (index, slot) in positions.iter_mut().enumerate() {
        for candidate in start..EDGE_COUNT {
            let count = binomial(EDGE_COUNT - candidate - 1, EDGE_PATTERN_SIZE - index - 1);
            if rank < count {
                *slot = candidate;
                start = candidate + 1;
                break;
            }
            rank -= count;
        }
    }

    positions
}

fn rank_permutation(permutation: &[usize; EDGE_PATTERN_SIZE]) -> usize {
    let mut rank = 0_usize;

    for index in 0..EDGE_PATTERN_SIZE {
        let smaller_unused = permutation[index + 1..]
            .iter()
            .filter(|value| **value < permutation[index])
            .count();
        rank += smaller_unused * factorial(EDGE_PATTERN_SIZE - index - 1);
    }

    rank
}

fn unrank_permutation(mut rank: usize) -> [usize; EDGE_PATTERN_SIZE] {
    let mut values = Vec::from([0, 1, 2, 3, 4, 5]);
    let mut permutation = [0_usize; EDGE_PATTERN_SIZE];

    for (index, slot) in permutation.iter_mut().enumerate() {
        let block = factorial(EDGE_PATTERN_SIZE - index - 1);
        let selected = rank / block;
        rank %= block;
        *slot = values.remove(selected);
    }

    permutation
}

fn rank_orientation(orientations: &[u8; EDGE_PATTERN_SIZE]) -> usize {
    orientations
        .iter()
        .enumerate()
        .fold(0_usize, |rank, (index, orientation)| {
            rank | (usize::from(*orientation) << index)
        })
}

fn unrank_orientation(rank: usize) -> [u8; EDGE_PATTERN_SIZE] {
    let mut orientations = [0_u8; EDGE_PATTERN_SIZE];

    for (index, orientation) in orientations.iter_mut().enumerate() {
        *orientation = ((rank >> index) & 1) as u8;
    }

    orientations
}

const fn factorial(value: usize) -> usize {
    match value {
        0 | 1 => 1,
        2 => 2,
        3 => 6,
        4 => 24,
        5 => 120,
        6 => 720,
        _ => panic!("edge pattern permutation rank only supports small factorials"),
    }
}

const fn binomial(n: usize, k: usize) -> usize {
    if k > n {
        return 0;
    }

    let k = if k < n - k { k } else { n - k };
    match (n, k) {
        (_, 0) => 1,
        (n, 1) => n,
        (n, 2) => n * (n - 1) / 2,
        (n, 3) => n * (n - 1) * (n - 2) / 6,
        (n, 4) => n * (n - 1) * (n - 2) * (n - 3) / 24,
        (n, 5) => n * (n - 1) * (n - 2) * (n - 3) * (n - 4) / 120,
        (n, 6) => n * (n - 1) * (n - 2) * (n - 3) * (n - 4) * (n - 5) / 720,
        _ => panic!("edge pattern combination rank only supports k <= 6"),
    }
}

fn validate_entries(max_depth: u8, entry_count: usize) -> Result<(), EdgePatternDatabaseError> {
    if max_depth == UNREACHED_DISTANCE {
        return Err(EdgePatternDatabaseError::MaxDepthUsesSentinel);
    }
    if entry_count != EDGE_PATTERN_DATABASE_COORDINATE_COUNT {
        return Err(EdgePatternDatabaseError::TableSizeMismatch {
            expected: EDGE_PATTERN_DATABASE_COORDINATE_COUNT,
            actual: entry_count,
        });
    }

    Ok(())
}

fn push_u8(bytes: &mut Vec<u8>, value: u8) {
    bytes.push(value);
}

fn push_u16(bytes: &mut Vec<u8>, value: u16) {
    bytes.extend_from_slice(&value.to_le_bytes());
}

fn push_u64(bytes: &mut Vec<u8>, value: u64) {
    bytes.extend_from_slice(&value.to_le_bytes());
}

fn edge_pdb_checksum(bytes: &[u8]) -> u64 {
    bytes.iter().fold(CHECKSUM_OFFSET_BASIS, |checksum, byte| {
        (checksum ^ u64::from(*byte)).wrapping_mul(CHECKSUM_PRIME)
    })
}

struct ArtifactCursor<'a> {
    path: &'a Path,
    bytes: &'a [u8],
    offset: usize,
}

impl<'a> ArtifactCursor<'a> {
    const fn new(path: &'a Path, bytes: &'a [u8]) -> Self {
        Self {
            path,
            bytes,
            offset: 0,
        }
    }

    fn remaining_len(&self) -> usize {
        self.bytes.len().saturating_sub(self.offset)
    }

    fn read_bytes(
        &mut self,
        len: usize,
        field: &'static str,
    ) -> Result<&'a [u8], EdgePatternDatabaseError> {
        let Some(end) = self.offset.checked_add(len) else {
            return Err(EdgePatternDatabaseError::UnexpectedEnd {
                path: self.path.to_path_buf(),
                field,
            });
        };
        let Some(bytes) = self.bytes.get(self.offset..end) else {
            return Err(EdgePatternDatabaseError::UnexpectedEnd {
                path: self.path.to_path_buf(),
                field,
            });
        };
        self.offset = end;

        Ok(bytes)
    }

    fn read_u8(&mut self, field: &'static str) -> Result<u8, EdgePatternDatabaseError> {
        Ok(self.read_bytes(1, field)?[0])
    }

    fn read_u16(&mut self, field: &'static str) -> Result<u16, EdgePatternDatabaseError> {
        let mut bytes = [0_u8; 2];
        bytes.copy_from_slice(self.read_bytes(2, field)?);

        Ok(u16::from_le_bytes(bytes))
    }

    fn read_u64(&mut self, field: &'static str) -> Result<u64, EdgePatternDatabaseError> {
        let mut bytes = [0_u8; 8];
        bytes.copy_from_slice(self.read_bytes(8, field)?);

        Ok(u64::from_le_bytes(bytes))
    }
}

#[cfg(test)]
mod tests {
    use super::{
        cube_from_edge_pattern_coordinate, edge_move_effects, edge_pattern_coordinate,
        edge_pattern_database_path, rank_combination, rank_orientation, rank_permutation,
        unrank_combination, unrank_orientation, unrank_permutation, EdgePatternDatabase,
        EdgePatternDatabaseError, EdgePatternDatabaseHeuristic, EdgePatternDatabaseId,
        EDGE_PATTERN_DATABASE_COORDINATE_COUNT,
    };
    use crate::cube::{Cube, Move};
    use crate::search::Heuristic;
    use std::path::Path;

    #[test]
    fn edge_pattern_coordinate_has_explicit_range() {
        assert_eq!(EDGE_PATTERN_DATABASE_COORDINATE_COUNT, 42_577_920);
    }

    #[test]
    fn edge_pattern_paths_are_stable() {
        assert_eq!(
            edge_pattern_database_path(Path::new("tables"), EdgePatternDatabaseId::A),
            Path::new("tables/edge-pattern-database-a.repdb")
        );
        assert_eq!(
            edge_pattern_database_path(Path::new("tables"), EdgePatternDatabaseId::B),
            Path::new("tables/edge-pattern-database-b.repdb")
        );
    }

    #[test]
    fn edge_pattern_coordinates_round_trip_representatives() {
        for id in EdgePatternDatabaseId::ALL {
            for coordinate in [0, 1, 42, 1_024, 17_777, 1_000_000, 42_577_919] {
                let cube = cube_from_edge_pattern_coordinate(id, coordinate)
                    .expect("representative should be valid");

                assert_eq!(edge_pattern_coordinate(cube.state(), id), coordinate);
            }
        }
    }

    #[test]
    fn edge_pattern_ranks_round_trip() {
        let positions = [0, 2, 4, 7, 9, 11];
        let permutation = [2, 0, 5, 3, 1, 4];
        let orientations = [1, 0, 1, 1, 0, 1];

        assert_eq!(unrank_combination(rank_combination(&positions)), positions);
        assert_eq!(
            unrank_permutation(rank_permutation(&permutation)),
            permutation
        );
        assert_eq!(
            unrank_orientation(rank_orientation(&orientations)),
            orientations
        );
    }

    #[test]
    fn abstract_edge_move_effect_matches_cube_move() {
        for id in EdgePatternDatabaseId::ALL {
            for coordinate in [0, 42, 1_024, 42_577_919] {
                let cube = cube_from_edge_pattern_coordinate(id, coordinate)
                    .expect("representative should be valid");

                for (move_index, move_) in crate::cube::moves::FACE_MOVES.into_iter().enumerate() {
                    let mut moved_cube = cube.clone();
                    moved_cube.apply_move(move_);
                    let expected = edge_pattern_coordinate(moved_cube.state(), id);
                    let actual = super::apply_edge_move_effect(
                        edge_pattern_coordinate(cube.state(), id),
                        edge_move_effects()[move_index],
                    );

                    assert_eq!(actual, expected);
                }
            }
        }
    }

    #[test]
    fn generated_depth_one_database_is_admissible_for_one_move_scrambles() {
        let database = EdgePatternDatabase::generate(EdgePatternDatabaseId::A, 1)
            .expect("depth-one database should generate");
        let heuristic = EdgePatternDatabaseHeuristic::new(&database);

        assert_eq!(heuristic.estimate(&Cube::solved()), 0);

        for move_ in [Move::R, Move::U, Move::F] {
            let mut cube = Cube::solved();
            cube.apply_move(move_);

            assert!(heuristic.estimate(&cube) <= 1);
        }
    }

    #[test]
    fn edge_pattern_artifact_round_trips() {
        let mut entries = vec![u8::MAX; EDGE_PATTERN_DATABASE_COORDINATE_COUNT];
        entries[edge_pattern_coordinate(Cube::solved().state(), EdgePatternDatabaseId::A)] = 0;
        let database =
            EdgePatternDatabase::from_dense_entries(EdgePatternDatabaseId::A, 0, entries)
                .expect("test database should build");
        let bytes = database
            .to_artifact_bytes("edge-a.repdb")
            .expect("artifact should encode");
        let decoded = EdgePatternDatabase::from_artifact_bytes("edge-a.repdb", &bytes)
            .expect("artifact should decode");

        assert_eq!(decoded.id(), EdgePatternDatabaseId::A);
        assert_eq!(decoded.max_depth(), 0);
        assert_eq!(decoded.lower_bound_for_state(Cube::solved().state()), 0);
    }

    #[test]
    fn edge_pattern_artifact_rejects_pattern_mismatch() {
        let mut entries = vec![u8::MAX; EDGE_PATTERN_DATABASE_COORDINATE_COUNT];
        entries[edge_pattern_coordinate(Cube::solved().state(), EdgePatternDatabaseId::A)] = 0;
        let database =
            EdgePatternDatabase::from_dense_entries(EdgePatternDatabaseId::A, 0, entries)
                .expect("test database should build");
        let path =
            std::env::temp_dir().join(format!("edge-pdb-mismatch-{}.repdb", std::process::id()));

        database
            .save_artifact(&path)
            .expect("test artifact should save");
        let result = EdgePatternDatabase::load_artifact_for(EdgePatternDatabaseId::B, &path);
        let _ = std::fs::remove_file(&path);

        assert!(matches!(
            result,
            Err(EdgePatternDatabaseError::PatternMismatch { .. })
        ));
    }
}
