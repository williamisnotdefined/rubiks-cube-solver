use std::collections::BTreeMap;
use std::fmt;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::OnceLock;

use super::heuristics::{Heuristic, MaxHeuristic, OrientationPatternDatabaseHeuristic};
use super::ida_star::solve_ida_star_bounded_with_heuristic;
use super::solution::{SearchBudget, SearchOutcome, SearchSolution};
use super::two_phase::solve_generated_two_phase_quality;
use crate::cube::coordinates::{
    corner_orientation_coordinate, corner_permutation_coordinate_from_permutation,
    corner_permutation_from_coordinate, cubie_state_from_corner_orientation_coordinate,
    CORNER_ORIENTATION_COORDINATE_COUNT, CORNER_PERMUTATION_COORDINATE_COUNT,
};
use crate::cube::cubies::Edge;
use crate::cube::moves::FACE_MOVES;
use crate::cube::{Cube, CubeValidationError, CubieState};

pub const CORNER_PATTERN_DATABASE_FILE_NAME: &str = "corner-pattern-database.rpdb";
pub const CORNER_PATTERN_DATABASE_FORMAT_VERSION: u16 = 1;
pub const CORNER_PATTERN_DATABASE_COORDINATE_COUNT: usize =
    CORNER_PERMUTATION_COORDINATE_COUNT * CORNER_ORIENTATION_COORDINATE_COUNT;

const ARTIFACT_MAGIC: [u8; 8] = *b"RCCPDB1\0";
const UNREACHED_DISTANCE: u8 = u8::MAX;
const CHECKSUM_OFFSET_BASIS: u64 = 0xcbf2_9ce4_8422_2325;
const CHECKSUM_PRIME: u64 = 0x0000_0100_0000_01b3;
const FACE_MOVE_COUNT: usize = FACE_MOVES.len();
const CORNER_PDB_MIN_ATTEMPT_NODES: usize = 1_000;

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum CornerPatternDatabaseError {
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
    Coordinate {
        phase: &'static str,
        error: String,
    },
    InvalidRepresentative {
        phase: &'static str,
        index: usize,
        error: CubeValidationError,
    },
}

impl fmt::Display for CornerPatternDatabaseError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Io { path, error } => write!(
                formatter,
                "could not access corner pattern database {}: {error}",
                path.display()
            ),
            Self::TooShort { path } => write!(
                formatter,
                "corner pattern database {} is too short",
                path.display()
            ),
            Self::InvalidMagic { path } => write!(
                formatter,
                "corner pattern database {} has an invalid header",
                path.display()
            ),
            Self::ChecksumMismatch {
                path,
                expected,
                actual,
            } => write!(
                formatter,
                "corner pattern database {} checksum mismatch: expected {expected}, got {actual}",
                path.display()
            ),
            Self::UnsupportedFormatVersion { path, version } => write!(
                formatter,
                "corner pattern database {} uses unsupported format version {version}",
                path.display()
            ),
            Self::UnexpectedEnd { path, field } => write!(
                formatter,
                "corner pattern database {} ended while reading {field}",
                path.display()
            ),
            Self::TrailingBytes { path, trailing } => write!(
                formatter,
                "corner pattern database {} has {trailing} trailing bytes",
                path.display()
            ),
            Self::TableSizeMismatch { expected, actual } => write!(
                formatter,
                "corner pattern database has {actual} entries, expected {expected}"
            ),
            Self::MaxDepthUsesSentinel => formatter.write_str(
                "corner pattern database max depth must be below 255 because 255 marks unreached entries",
            ),
            Self::Coordinate { phase, error } => {
                write!(formatter, "corner pattern database {phase} failed: {error}")
            }
            Self::InvalidRepresentative {
                phase,
                index,
                error,
            } => write!(
                formatter,
                "corner pattern database {phase} representative state {index} is invalid: {error}"
            ),
        }
    }
}

impl std::error::Error for CornerPatternDatabaseError {}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CornerPatternDatabase {
    max_depth: u8,
    entries: CornerPatternDatabaseEntries,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[allow(dead_code)]
enum CornerPatternDatabaseEntries {
    Dense(Vec<u8>),
    Sparse(BTreeMap<usize, u8>),
}

impl CornerPatternDatabase {
    pub fn generate(max_depth: u8) -> Result<Self, CornerPatternDatabaseError> {
        if max_depth == UNREACHED_DISTANCE {
            return Err(CornerPatternDatabaseError::MaxDepthUsesSentinel);
        }

        let permutation_moves = corner_permutation_move_table()?;
        let orientation_moves = corner_orientation_move_table()?;
        let mut entries = vec![UNREACHED_DISTANCE; CORNER_PATTERN_DATABASE_COORDINATE_COUNT];
        let mut frontier = vec![0_usize];

        entries[0] = 0;

        for depth in 0..max_depth {
            let next_depth = depth + 1;
            let mut next_frontier = Vec::new();

            for coordinate in frontier {
                let permutation = coordinate / CORNER_ORIENTATION_COORDINATE_COUNT;
                let orientation = coordinate % CORNER_ORIENTATION_COORDINATE_COUNT;

                for move_index in 0..FACE_MOVE_COUNT {
                    let next_coordinate = permutation_moves[permutation][move_index]
                        * CORNER_ORIENTATION_COORDINATE_COUNT
                        + orientation_moves[orientation][move_index];

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

        Self::from_dense_entries(max_depth, entries)
    }

    pub fn from_dense_entries(
        max_depth: u8,
        entries: Vec<u8>,
    ) -> Result<Self, CornerPatternDatabaseError> {
        validate_entries(max_depth, entries.len())?;

        Ok(Self {
            max_depth,
            entries: CornerPatternDatabaseEntries::Dense(entries),
        })
    }

    pub fn load_artifact(path: impl AsRef<Path>) -> Result<Self, CornerPatternDatabaseError> {
        let path = path.as_ref();
        let bytes = fs::read(path).map_err(|error| CornerPatternDatabaseError::Io {
            path: path.to_path_buf(),
            error: error.to_string(),
        })?;

        Self::from_artifact_bytes(path, &bytes)
    }

    pub fn save_artifact(&self, path: impl AsRef<Path>) -> Result<(), CornerPatternDatabaseError> {
        let path = path.as_ref();
        let bytes = self.to_artifact_bytes(path)?;

        fs::write(path, bytes).map_err(|error| CornerPatternDatabaseError::Io {
            path: path.to_path_buf(),
            error: error.to_string(),
        })
    }

    pub fn to_artifact_bytes(
        &self,
        _path: impl AsRef<Path>,
    ) -> Result<Vec<u8>, CornerPatternDatabaseError> {
        let entries = match &self.entries {
            CornerPatternDatabaseEntries::Dense(entries) => entries,
            CornerPatternDatabaseEntries::Sparse(_) => {
                return Err(CornerPatternDatabaseError::TableSizeMismatch {
                    expected: CORNER_PATTERN_DATABASE_COORDINATE_COUNT,
                    actual: self.entry_count(),
                });
            }
        };
        validate_entries(self.max_depth, entries.len())?;

        let mut bytes = Vec::with_capacity(
            ARTIFACT_MAGIC.len()
                + std::mem::size_of::<u16>()
                + std::mem::size_of::<u8>()
                + std::mem::size_of::<u64>()
                + entries.len()
                + std::mem::size_of::<u64>(),
        );
        bytes.extend_from_slice(&ARTIFACT_MAGIC);
        push_u16(&mut bytes, CORNER_PATTERN_DATABASE_FORMAT_VERSION);
        push_u8(&mut bytes, self.max_depth);
        push_u64(&mut bytes, entries.len() as u64);
        bytes.extend_from_slice(entries);
        let checksum = corner_pdb_checksum(&bytes);
        push_u64(&mut bytes, checksum);

        Ok(bytes)
    }

    pub fn from_artifact_bytes(
        path: impl AsRef<Path>,
        bytes: &[u8],
    ) -> Result<Self, CornerPatternDatabaseError> {
        let path = path.as_ref();
        let checksum_size = std::mem::size_of::<u64>();
        if bytes.len() < ARTIFACT_MAGIC.len() + checksum_size {
            return Err(CornerPatternDatabaseError::TooShort {
                path: path.to_path_buf(),
            });
        }

        let payload_len = bytes.len() - checksum_size;
        let (payload, checksum_bytes) = bytes.split_at(payload_len);
        let mut checksum = [0_u8; 8];
        checksum.copy_from_slice(checksum_bytes);
        let expected = u64::from_le_bytes(checksum);
        let actual = corner_pdb_checksum(payload);
        if expected != actual {
            return Err(CornerPatternDatabaseError::ChecksumMismatch {
                path: path.to_path_buf(),
                expected,
                actual,
            });
        }

        let mut cursor = ArtifactCursor::new(path, payload);
        let magic = cursor.read_bytes(ARTIFACT_MAGIC.len(), "magic")?;
        if magic != ARTIFACT_MAGIC.as_slice() {
            return Err(CornerPatternDatabaseError::InvalidMagic {
                path: path.to_path_buf(),
            });
        }

        let format_version = cursor.read_u16("format_version")?;
        if format_version != CORNER_PATTERN_DATABASE_FORMAT_VERSION {
            return Err(CornerPatternDatabaseError::UnsupportedFormatVersion {
                path: path.to_path_buf(),
                version: format_version,
            });
        }

        let max_depth = cursor.read_u8("max_depth")?;
        let entry_count = usize::try_from(cursor.read_u64("entry_count")?).map_err(|_| {
            CornerPatternDatabaseError::TableSizeMismatch {
                expected: CORNER_PATTERN_DATABASE_COORDINATE_COUNT,
                actual: usize::MAX,
            }
        })?;
        validate_entries(max_depth, entry_count)?;
        if cursor.remaining_len() < entry_count {
            return Err(CornerPatternDatabaseError::UnexpectedEnd {
                path: path.to_path_buf(),
                field: "entries",
            });
        }

        let entries = cursor.read_bytes(entry_count, "entries")?.to_vec();
        let trailing = cursor.remaining_len();
        if trailing != 0 {
            return Err(CornerPatternDatabaseError::TrailingBytes {
                path: path.to_path_buf(),
                trailing,
            });
        }

        Self::from_dense_entries(max_depth, entries)
    }

    pub const fn max_depth(&self) -> u8 {
        self.max_depth
    }

    pub fn entry_count(&self) -> usize {
        match &self.entries {
            CornerPatternDatabaseEntries::Dense(entries) => entries
                .iter()
                .filter(|distance| **distance != UNREACHED_DISTANCE)
                .count(),
            CornerPatternDatabaseEntries::Sparse(entries) => entries.len(),
        }
    }

    pub fn lower_bound_for_coordinate(&self, coordinate: usize) -> usize {
        match &self.entries {
            CornerPatternDatabaseEntries::Dense(entries) => entries
                .get(coordinate)
                .copied()
                .filter(|distance| *distance != UNREACHED_DISTANCE)
                .map_or(usize::from(self.max_depth) + 1, usize::from),
            CornerPatternDatabaseEntries::Sparse(entries) => entries
                .get(&coordinate)
                .copied()
                .map_or(usize::from(self.max_depth) + 1, usize::from),
        }
    }

    #[cfg(test)]
    fn from_sparse_entries_for_test(
        max_depth: u8,
        entries: impl IntoIterator<Item = (usize, u8)>,
    ) -> Self {
        Self {
            max_depth,
            entries: CornerPatternDatabaseEntries::Sparse(entries.into_iter().collect()),
        }
    }
}

#[derive(Clone, Copy, Debug)]
pub struct CornerPatternDatabaseHeuristic<'a> {
    database: &'a CornerPatternDatabase,
}

impl<'a> CornerPatternDatabaseHeuristic<'a> {
    pub const fn new(database: &'a CornerPatternDatabase) -> Self {
        Self { database }
    }
}

impl Heuristic for CornerPatternDatabaseHeuristic<'_> {
    fn estimate(&self, cube: &Cube) -> usize {
        corner_pattern_coordinate(cube.state())
            .map(|coordinate| self.database.lower_bound_for_coordinate(coordinate))
            .unwrap_or(0)
    }
}

pub(crate) fn solve_optimal_bounded_corner_pdb_quality(
    start: &Cube,
    budget: SearchBudget,
    artifact_dir: &Path,
) -> Result<SearchOutcome, super::two_phase::GeneratedTwoPhaseError> {
    let mut explored_nodes = 0_usize;
    let database_path = corner_pattern_database_path(artifact_dir);

    if let Ok(database) = CornerPatternDatabase::load_artifact(&database_path) {
        let corner_heuristic = CornerPatternDatabaseHeuristic::new(&database);
        let heuristic = MaxHeuristic::new(corner_heuristic, OrientationPatternDatabaseHeuristic);

        for depth_limit in bounded_corner_pdb_depth_schedule(budget.max_depth) {
            let remaining_nodes = remaining_node_budget(budget.max_nodes, explored_nodes);
            if remaining_nodes == Some(0) {
                break;
            }

            let attempt_nodes = bounded_corner_pdb_attempt_nodes(budget.max_nodes, remaining_nodes);
            let outcome = solve_ida_star_bounded_with_heuristic(
                start,
                SearchBudget::with_limits(depth_limit, attempt_nodes),
                &heuristic,
            );

            if let Some(solution) = record_attempt_outcome(outcome, &mut explored_nodes) {
                return Ok(SearchOutcome::Found(solution));
            }
        }
    }

    let remaining_nodes = remaining_node_budget(budget.max_nodes, explored_nodes);
    if remaining_nodes == Some(0) {
        return Ok(SearchOutcome::NotFoundWithinLimits { explored_nodes });
    }

    let fallback = solve_generated_two_phase_quality(
        start,
        SearchBudget::with_limits(budget.max_depth, remaining_nodes),
        artifact_dir,
    )?;
    Ok(offset_outcome_explored_nodes(fallback, explored_nodes))
}

pub fn corner_pattern_database_path(directory: &Path) -> PathBuf {
    directory.join(CORNER_PATTERN_DATABASE_FILE_NAME)
}

pub fn corner_pattern_coordinate(state: &CubieState) -> Result<usize, CornerPatternDatabaseError> {
    let permutation = corner_permutation_coordinate_from_permutation(&state.corner_permutation)
        .map_err(|error| CornerPatternDatabaseError::Coordinate {
            phase: "coordinate_corner_permutation",
            error: error.to_string(),
        })?;
    let orientation = corner_orientation_coordinate(state).map_err(|error| {
        CornerPatternDatabaseError::Coordinate {
            phase: "coordinate_corner_orientation",
            error: error.to_string(),
        }
    })?;

    Ok(permutation * CORNER_ORIENTATION_COORDINATE_COUNT + orientation)
}

fn bounded_corner_pdb_depth_schedule(max_depth: usize) -> Vec<usize> {
    vec![16.min(max_depth)]
}

fn bounded_corner_pdb_attempt_nodes(
    max_nodes: Option<usize>,
    remaining_nodes: Option<usize>,
) -> Option<usize> {
    match max_nodes {
        Some(max_nodes) => {
            let attempt = (max_nodes / 2)
                .max(CORNER_PDB_MIN_ATTEMPT_NODES)
                .min(max_nodes);
            Some(remaining_nodes.map_or(attempt, |remaining| attempt.min(remaining)))
        }
        None => None,
    }
}

fn record_attempt_outcome(
    outcome: SearchOutcome,
    explored_nodes: &mut usize,
) -> Option<SearchSolution> {
    *explored_nodes = explored_nodes.saturating_add(outcome.explored_nodes());

    match outcome {
        SearchOutcome::Found(solution) => Some(SearchSolution::with_metrics(
            solution.moves,
            *explored_nodes,
        )),
        SearchOutcome::NotFoundWithinLimits { .. } => None,
    }
}

fn offset_outcome_explored_nodes(outcome: SearchOutcome, explored_offset: usize) -> SearchOutcome {
    match outcome {
        SearchOutcome::Found(solution) => SearchOutcome::Found(SearchSolution::with_metrics(
            solution.moves,
            solution.explored_nodes.saturating_add(explored_offset),
        )),
        SearchOutcome::NotFoundWithinLimits { explored_nodes } => {
            SearchOutcome::NotFoundWithinLimits {
                explored_nodes: explored_nodes.saturating_add(explored_offset),
            }
        }
    }
}

fn remaining_node_budget(max_nodes: Option<usize>, spent_nodes: usize) -> Option<usize> {
    max_nodes.map(|max_nodes| max_nodes.saturating_sub(spent_nodes))
}

fn validate_entries(max_depth: u8, entry_count: usize) -> Result<(), CornerPatternDatabaseError> {
    if max_depth == UNREACHED_DISTANCE {
        return Err(CornerPatternDatabaseError::MaxDepthUsesSentinel);
    }
    if entry_count != CORNER_PATTERN_DATABASE_COORDINATE_COUNT {
        return Err(CornerPatternDatabaseError::TableSizeMismatch {
            expected: CORNER_PATTERN_DATABASE_COORDINATE_COUNT,
            actual: entry_count,
        });
    }

    Ok(())
}

fn corner_permutation_move_table(
) -> Result<&'static Vec<[usize; FACE_MOVE_COUNT]>, CornerPatternDatabaseError> {
    static TABLE: OnceLock<Result<Vec<[usize; FACE_MOVE_COUNT]>, String>> = OnceLock::new();

    TABLE
        .get_or_init(generate_corner_permutation_move_table)
        .as_ref()
        .map_err(|error| CornerPatternDatabaseError::Coordinate {
            phase: "corner_permutation_move_table",
            error: error.clone(),
        })
}

fn corner_orientation_move_table(
) -> Result<&'static Vec<[usize; FACE_MOVE_COUNT]>, CornerPatternDatabaseError> {
    static TABLE: OnceLock<Result<Vec<[usize; FACE_MOVE_COUNT]>, String>> = OnceLock::new();

    TABLE
        .get_or_init(generate_corner_orientation_move_table)
        .as_ref()
        .map_err(|error| CornerPatternDatabaseError::Coordinate {
            phase: "corner_orientation_move_table",
            error: error.clone(),
        })
}

fn generate_corner_permutation_move_table() -> Result<Vec<[usize; FACE_MOVE_COUNT]>, String> {
    let mut table = Vec::with_capacity(CORNER_PERMUTATION_COORDINATE_COUNT);

    for index in 0..CORNER_PERMUTATION_COORDINATE_COUNT {
        let mut state = CubieState::solved();
        state.corner_permutation =
            corner_permutation_from_coordinate(index).map_err(|error| error.to_string())?;
        let cube =
            cube_from_corner_representative_state("corner_permutation_move_table", index, state)
                .map_err(|error| error.to_string())?;
        table.push(corner_coordinate_move_row(&cube, |cube| {
            corner_permutation_coordinate_from_permutation(&cube.state().corner_permutation)
                .map_err(|error| error.to_string())
        })?);
    }

    Ok(table)
}

fn generate_corner_orientation_move_table() -> Result<Vec<[usize; FACE_MOVE_COUNT]>, String> {
    let mut table = Vec::with_capacity(CORNER_ORIENTATION_COORDINATE_COUNT);

    for index in 0..CORNER_ORIENTATION_COORDINATE_COUNT {
        let state = cubie_state_from_corner_orientation_coordinate(index)
            .map_err(|error| error.to_string())?;
        let cube =
            cube_from_corner_representative_state("corner_orientation_move_table", index, state)
                .map_err(|error| error.to_string())?;
        table.push(corner_coordinate_move_row(&cube, |cube| {
            corner_orientation_coordinate(cube.state()).map_err(|error| error.to_string())
        })?);
    }

    Ok(table)
}

fn corner_coordinate_move_row(
    cube: &Cube,
    coordinate: impl Fn(&Cube) -> Result<usize, String>,
) -> Result<[usize; FACE_MOVE_COUNT], String> {
    let mut row = [0; FACE_MOVE_COUNT];

    for (move_index, move_) in FACE_MOVES.into_iter().enumerate() {
        let mut next_cube = cube.clone();
        next_cube.apply_move(move_);
        row[move_index] = coordinate(&next_cube)?;
    }

    Ok(row)
}

fn cube_from_corner_representative_state(
    phase: &'static str,
    index: usize,
    mut state: CubieState,
) -> Result<Cube, CornerPatternDatabaseError> {
    match Cube::try_from_state(state.clone()) {
        Ok(cube) => Ok(cube),
        Err(CubeValidationError::InvalidPermutationParity { .. }) => {
            state
                .edge_permutation
                .swap(Edge::Ur.index(), Edge::Uf.index());
            Cube::try_from_state(state).map_err(|error| {
                CornerPatternDatabaseError::InvalidRepresentative {
                    phase,
                    index,
                    error,
                }
            })
        }
        Err(error) => Err(CornerPatternDatabaseError::InvalidRepresentative {
            phase,
            index,
            error,
        }),
    }
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

fn corner_pdb_checksum(bytes: &[u8]) -> u64 {
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
    fn new(path: &'a Path, bytes: &'a [u8]) -> Self {
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
    ) -> Result<&'a [u8], CornerPatternDatabaseError> {
        let Some(end) = self.offset.checked_add(len) else {
            return Err(CornerPatternDatabaseError::UnexpectedEnd {
                path: self.path.to_path_buf(),
                field,
            });
        };
        let Some(bytes) = self.bytes.get(self.offset..end) else {
            return Err(CornerPatternDatabaseError::UnexpectedEnd {
                path: self.path.to_path_buf(),
                field,
            });
        };
        self.offset = end;

        Ok(bytes)
    }

    fn read_u8(&mut self, field: &'static str) -> Result<u8, CornerPatternDatabaseError> {
        Ok(self.read_bytes(1, field)?[0])
    }

    fn read_u16(&mut self, field: &'static str) -> Result<u16, CornerPatternDatabaseError> {
        let mut bytes = [0_u8; 2];
        bytes.copy_from_slice(self.read_bytes(2, field)?);

        Ok(u16::from_le_bytes(bytes))
    }

    fn read_u64(&mut self, field: &'static str) -> Result<u64, CornerPatternDatabaseError> {
        let mut bytes = [0_u8; 8];
        bytes.copy_from_slice(self.read_bytes(8, field)?);

        Ok(u64::from_le_bytes(bytes))
    }
}

#[cfg(test)]
mod tests {
    use super::{
        bounded_corner_pdb_attempt_nodes, bounded_corner_pdb_depth_schedule,
        corner_pattern_coordinate, record_attempt_outcome, CornerPatternDatabase,
        CornerPatternDatabaseHeuristic, CORNER_ORIENTATION_COORDINATE_COUNT,
    };
    use crate::cube::{Cube, Move};
    use crate::search::{Heuristic, SearchOutcome, SearchSolution};

    #[test]
    fn corner_pattern_coordinate_combines_permutation_and_orientation() {
        assert_eq!(corner_pattern_coordinate(Cube::solved().state()), Ok(0));

        let mut cube = Cube::solved();
        cube.apply_move(Move::R);
        let coordinate = corner_pattern_coordinate(cube.state())
            .expect("moved cube should have corner pattern coordinate");

        assert!(coordinate >= CORNER_ORIENTATION_COORDINATE_COUNT);
    }

    #[test]
    fn sparse_corner_pdb_heuristic_uses_depth_plus_one_for_missing_entries() {
        let database = CornerPatternDatabase::from_sparse_entries_for_test(3, [(0, 0)]);
        let heuristic = CornerPatternDatabaseHeuristic::new(&database);

        assert_eq!(heuristic.estimate(&Cube::solved()), 0);

        let mut cube = Cube::solved();
        cube.apply_move(Move::R);
        assert_eq!(heuristic.estimate(&cube), 4);
    }

    #[test]
    fn bounded_corner_pdb_depth_schedule_targets_short_limits_only() {
        assert_eq!(bounded_corner_pdb_depth_schedule(0), vec![0]);
        assert_eq!(bounded_corner_pdb_depth_schedule(17), vec![16]);
        assert_eq!(bounded_corner_pdb_depth_schedule(20), vec![16]);
        assert_eq!(bounded_corner_pdb_depth_schedule(30), vec![16]);
    }

    #[test]
    fn bounded_corner_pdb_attempt_nodes_keeps_fallback_budget() {
        assert_eq!(
            bounded_corner_pdb_attempt_nodes(Some(10_000_000), Some(9_000_000)),
            Some(5_000_000)
        );
        assert_eq!(
            bounded_corner_pdb_attempt_nodes(Some(100_000_000), Some(100_000_000)),
            Some(50_000_000)
        );
        assert_eq!(
            bounded_corner_pdb_attempt_nodes(Some(10_000_000), Some(500)),
            Some(500)
        );
        assert_eq!(bounded_corner_pdb_attempt_nodes(None, None), None);
    }

    #[test]
    fn record_attempt_outcome_returns_cumulative_found_solution() {
        let mut explored_nodes = 10;
        let outcome = SearchOutcome::Found(SearchSolution::with_metrics(vec![Move::U], 7));
        let solution = record_attempt_outcome(outcome, &mut explored_nodes)
            .expect("found attempt should return solution");

        assert_eq!(explored_nodes, 17);
        assert_eq!(solution.explored_nodes(), 17);
        assert_eq!(solution.moves(), &[Move::U]);
    }
}
