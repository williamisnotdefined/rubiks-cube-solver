use std::collections::{BTreeMap, VecDeque};
use std::fmt;
use std::fs;
use std::path::{Path, PathBuf};

use crate::cube::coordinates::{
    corner_orientation_coordinate, corner_permutation_coordinate_from_permutation,
    corner_permutation_from_coordinate, cubie_state_from_corner_orientation_coordinate,
    cubie_state_from_edge_orientation_coordinate, edge_orientation_coordinate,
    slice_edge_permutation_coordinate_from_permutation, slice_edge_permutation_from_coordinate,
    ud_edge_permutation_coordinate_from_permutation, ud_edge_permutation_from_coordinate,
    ud_slice_edge_combination_coordinate, ud_slice_edge_combination_membership_from_coordinate,
    CORNER_ORIENTATION_COORDINATE_COUNT, CORNER_PERMUTATION_COORDINATE_COUNT,
    EDGE_ORIENTATION_COORDINATE_COUNT, SLICE_EDGE_PERMUTATION_COORDINATE_COUNT,
    UD_EDGE_PERMUTATION_COORDINATE_COUNT, UD_SLICE_EDGE_COMBINATION_COORDINATE_COUNT,
};
use crate::cube::cubies::{Corner, CubieState, Edge, EDGE_COUNT};
use crate::cube::moves::{Move, FACE_MOVES};
use crate::cube::{Cube, CubeValidationError};

pub const PRUNING_TABLE_FORMAT_VERSION: u16 = 1;
pub const DEFAULT_PRUNING_TABLE_DIR: &str = "crates/cube-engine/pruning-tables";

const ARTIFACT_MAGIC: [u8; 8] = *b"RCPRTB1\0";
const UNREACHED_DISTANCE: u8 = u8::MAX;
const CHECKSUM_OFFSET_BASIS: u64 = 0xcbf2_9ce4_8422_2325;
const CHECKSUM_PRIME: u64 = 0x0000_0100_0000_01b3;
const ARTIFACT_GENERATION_SOURCE: &str = "deterministic generated pruning-table command";
const PHASE1_MOVE_SET: &str = "phase1-face-turn-metric-v1";
const PHASE2_MOVE_SET: &str = "phase2-g1-metric-v1";
const PHASE2_MOVES: [Move; 10] = [
    Move::U,
    Move::U2,
    Move::UPrime,
    Move::D,
    Move::D2,
    Move::DPrime,
    Move::L2,
    Move::R2,
    Move::F2,
    Move::B2,
];

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum PruningPhaseRole {
    Phase1,
    Phase2,
}

impl PruningPhaseRole {
    const fn artifact_value(self) -> u8 {
        match self {
            Self::Phase1 => 1,
            Self::Phase2 => 2,
        }
    }

    fn from_artifact_value(value: u8) -> Option<Self> {
        match value {
            1 => Some(Self::Phase1),
            2 => Some(Self::Phase2),
            _ => None,
        }
    }

    fn from_fixture_value(line: usize, value: &str) -> Result<Self, PruningFixtureError> {
        match value {
            "phase1" => Ok(Self::Phase1),
            "phase2" => Ok(Self::Phase2),
            _ => Err(PruningFixtureError::InvalidPhaseRole {
                line,
                value: value.to_owned(),
            }),
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PruningCoordinate {
    pub name: String,
    pub dimension: usize,
}

impl PruningCoordinate {
    pub fn new(name: impl Into<String>, dimension: usize) -> Self {
        Self {
            name: name.into(),
            dimension,
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PruningGenerationParameters {
    pub max_depth: u8,
    pub move_set: String,
    pub source: String,
}

impl PruningGenerationParameters {
    pub fn new(max_depth: u8, move_set: impl Into<String>, source: impl Into<String>) -> Self {
        Self {
            max_depth,
            move_set: move_set.into(),
            source: source.into(),
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PruningTableMetadata {
    pub format_version: u16,
    pub table_version: String,
    pub phase_role: PruningPhaseRole,
    pub coordinates: Vec<PruningCoordinate>,
    pub generation: PruningGenerationParameters,
}

impl PruningTableMetadata {
    pub fn new(
        format_version: u16,
        table_version: impl Into<String>,
        phase_role: PruningPhaseRole,
        coordinates: Vec<PruningCoordinate>,
        generation: PruningGenerationParameters,
    ) -> Self {
        Self {
            format_version,
            table_version: table_version.into(),
            phase_role,
            coordinates,
            generation,
        }
    }

    pub fn table_size(&self) -> Result<usize, PruningMetadataError> {
        if self.coordinates.is_empty() {
            return Err(PruningMetadataError::NoCoordinates);
        }

        self.coordinates
            .iter()
            .try_fold(1_usize, |size, coordinate| {
                if coordinate.dimension == 0 {
                    return Err(PruningMetadataError::CoordinateDimensionZero {
                        coordinate: coordinate.name.clone(),
                    });
                }

                size.checked_mul(coordinate.dimension)
                    .ok_or(PruningMetadataError::TableSizeOverflow)
            })
    }

    pub fn coordinate_index(&self, coordinates: &[usize]) -> Result<usize, PruningLookupError> {
        if self.coordinates.is_empty() {
            return Err(PruningLookupError::InvalidMetadata {
                error: PruningMetadataError::NoCoordinates,
            });
        }

        if coordinates.len() != self.coordinates.len() {
            return Err(PruningLookupError::CoordinateArityMismatch {
                expected: self.coordinates.len(),
                actual: coordinates.len(),
            });
        }

        let mut index = 0_usize;

        for (coordinate_index, coordinate) in coordinates.iter().zip(&self.coordinates) {
            if coordinate.dimension == 0 {
                return Err(PruningLookupError::InvalidMetadata {
                    error: PruningMetadataError::CoordinateDimensionZero {
                        coordinate: coordinate.name.clone(),
                    },
                });
            }

            if *coordinate_index >= coordinate.dimension {
                return Err(PruningLookupError::CoordinateOutOfRange {
                    coordinate: coordinate.name.clone(),
                    index: *coordinate_index,
                    dimension: coordinate.dimension,
                });
            }

            index = index
                .checked_mul(coordinate.dimension)
                .and_then(|index| index.checked_add(*coordinate_index))
                .ok_or(PruningLookupError::InvalidMetadata {
                    error: PruningMetadataError::TableSizeOverflow,
                })?;
        }

        Ok(index)
    }

    pub fn coordinates_from_index(&self, index: usize) -> Result<Vec<usize>, PruningLookupError> {
        let table_size = self
            .table_size()
            .map_err(|error| PruningLookupError::InvalidMetadata { error })?;

        if index >= table_size {
            return Err(PruningLookupError::IndexOutOfRange { index, table_size });
        }

        let mut remaining = index;
        let mut coordinates = vec![0; self.coordinates.len()];

        for (slot, coordinate) in coordinates.iter_mut().zip(&self.coordinates).rev() {
            *slot = remaining % coordinate.dimension;
            remaining /= coordinate.dimension;
        }

        Ok(coordinates)
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum PruningMetadataError {
    NoCoordinates,
    CoordinateDimensionZero { coordinate: String },
    TableSizeOverflow,
}

impl fmt::Display for PruningMetadataError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::NoCoordinates => formatter.write_str("pruning-table metadata has no coordinates"),
            Self::CoordinateDimensionZero { coordinate } => write!(
                formatter,
                "pruning-table coordinate {coordinate} has zero dimension"
            ),
            Self::TableSizeOverflow => {
                formatter.write_str("pruning-table dimensions overflow usize")
            }
        }
    }
}

impl std::error::Error for PruningMetadataError {}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum PruningLookupError {
    MetadataMismatch {
        expected: Box<PruningTableMetadata>,
        actual: Box<PruningTableMetadata>,
    },
    CoordinateArityMismatch {
        expected: usize,
        actual: usize,
    },
    CoordinateOutOfRange {
        coordinate: String,
        index: usize,
        dimension: usize,
    },
    IndexOutOfRange {
        index: usize,
        table_size: usize,
    },
    MissingEntry {
        index: usize,
    },
    InvalidMetadata {
        error: PruningMetadataError,
    },
}

impl fmt::Display for PruningLookupError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::MetadataMismatch { .. } => {
                formatter.write_str("pruning-table metadata does not match expected metadata")
            }
            Self::CoordinateArityMismatch { expected, actual } => write!(
                formatter,
                "pruning-table lookup expected {expected} coordinates, got {actual}"
            ),
            Self::CoordinateOutOfRange {
                coordinate,
                index,
                dimension,
            } => write!(
                formatter,
                "pruning-table coordinate {coordinate} index {index} is outside 0..{dimension}"
            ),
            Self::IndexOutOfRange { index, table_size } => write!(
                formatter,
                "pruning-table index {index} is outside 0..{table_size}"
            ),
            Self::MissingEntry { index } => {
                write!(
                    formatter,
                    "pruning-table fixture has no entry for index {index}"
                )
            }
            Self::InvalidMetadata { error } => {
                write!(formatter, "invalid pruning metadata: {error}")
            }
        }
    }
}

impl std::error::Error for PruningLookupError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::InvalidMetadata { error } => Some(error),
            _ => None,
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum PruningFixtureError {
    MissingField {
        field: &'static str,
    },
    DuplicateField {
        line: usize,
        field: &'static str,
    },
    InvalidLine {
        line: usize,
        content: String,
    },
    InvalidNumber {
        line: usize,
        field: &'static str,
        value: String,
    },
    InvalidPhaseRole {
        line: usize,
        value: String,
    },
    CoordinateDimensionZero {
        line: usize,
        coordinate: String,
    },
    EntryIndexOutOfRange {
        line: usize,
        index: usize,
        table_size: usize,
    },
    DistanceExceedsMaxDepth {
        line: usize,
        distance: u8,
        max_depth: u8,
    },
    DuplicateEntry {
        line: usize,
        index: usize,
    },
    InvalidMetadata {
        error: PruningMetadataError,
    },
}

impl fmt::Display for PruningFixtureError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::MissingField { field } => {
                write!(formatter, "pruning fixture is missing field {field}")
            }
            Self::DuplicateField { line, field } => write!(
                formatter,
                "pruning fixture line {line} duplicates field {field}"
            ),
            Self::InvalidLine { line, content } => {
                write!(formatter, "invalid pruning fixture line {line}: {content}")
            }
            Self::InvalidNumber { line, field, value } => write!(
                formatter,
                "invalid pruning fixture number for {field} on line {line}: {value}"
            ),
            Self::InvalidPhaseRole { line, value } => write!(
                formatter,
                "invalid pruning fixture phase role on line {line}: {value}"
            ),
            Self::CoordinateDimensionZero { line, coordinate } => write!(
                formatter,
                "pruning fixture coordinate {coordinate} has zero dimension on line {line}"
            ),
            Self::EntryIndexOutOfRange {
                line,
                index,
                table_size,
            } => write!(
                formatter,
                "pruning fixture entry index {index} on line {line} is outside 0..{table_size}"
            ),
            Self::DistanceExceedsMaxDepth {
                line,
                distance,
                max_depth,
            } => write!(
                formatter,
                "pruning fixture distance {distance} on line {line} exceeds max depth {max_depth}"
            ),
            Self::DuplicateEntry { line, index } => write!(
                formatter,
                "pruning fixture line {line} duplicates entry index {index}"
            ),
            Self::InvalidMetadata { error } => {
                write!(formatter, "invalid pruning metadata: {error}")
            }
        }
    }
}

impl std::error::Error for PruningFixtureError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::InvalidMetadata { error } => Some(error),
            _ => None,
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum PruningDenseTableError {
    InvalidMetadata {
        error: PruningMetadataError,
    },
    EntryCountMismatch {
        expected: usize,
        actual: usize,
    },
    DistanceExceedsMaxDepth {
        index: usize,
        distance: u8,
        max_depth: u8,
    },
}

impl fmt::Display for PruningDenseTableError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidMetadata { error } => write!(formatter, "invalid pruning metadata: {error}"),
            Self::EntryCountMismatch { expected, actual } => write!(
                formatter,
                "dense pruning table has {actual} entries, expected {expected}"
            ),
            Self::DistanceExceedsMaxDepth {
                index,
                distance,
                max_depth,
            } => write!(
                formatter,
                "dense pruning table entry {index} has distance {distance}, exceeding max depth {max_depth}"
            ),
        }
    }
}

impl std::error::Error for PruningDenseTableError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::InvalidMetadata { error } => Some(error),
            Self::EntryCountMismatch { .. } | Self::DistanceExceedsMaxDepth { .. } => None,
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum PruningArtifactError {
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
    InvalidPhaseRole {
        path: PathBuf,
        value: u8,
    },
    InvalidUtf8 {
        path: PathBuf,
        field: &'static str,
    },
    UnexpectedEnd {
        path: PathBuf,
        field: &'static str,
    },
    TrailingBytes {
        path: PathBuf,
        trailing: usize,
    },
    CoordinateCountMismatch {
        path: PathBuf,
        expected: usize,
        actual: usize,
    },
    DenseTable {
        path: PathBuf,
        error: PruningDenseTableError,
    },
    SpecMismatch {
        path: PathBuf,
        table: &'static str,
        field: &'static str,
        expected: String,
        actual: String,
    },
}

impl fmt::Display for PruningArtifactError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Io { path, error } => {
                write!(
                    formatter,
                    "could not access pruning-table artifact {}: {error}",
                    path.display()
                )
            }
            Self::TooShort { path } => write!(
                formatter,
                "pruning-table artifact {} is too short",
                path.display()
            ),
            Self::InvalidMagic { path } => write!(
                formatter,
                "pruning-table artifact {} has an invalid header",
                path.display()
            ),
            Self::ChecksumMismatch {
                path,
                expected,
                actual,
            } => write!(
                formatter,
                "pruning-table artifact {} checksum mismatch: expected {expected}, got {actual}",
                path.display()
            ),
            Self::UnsupportedFormatVersion { path, version } => write!(
                formatter,
                "pruning-table artifact {} uses unsupported format version {version}",
                path.display()
            ),
            Self::InvalidPhaseRole { path, value } => write!(
                formatter,
                "pruning-table artifact {} has invalid phase role {value}",
                path.display()
            ),
            Self::InvalidUtf8 { path, field } => write!(
                formatter,
                "pruning-table artifact {} has invalid UTF-8 in {field}",
                path.display()
            ),
            Self::UnexpectedEnd { path, field } => write!(
                formatter,
                "pruning-table artifact {} ended while reading {field}",
                path.display()
            ),
            Self::TrailingBytes { path, trailing } => write!(
                formatter,
                "pruning-table artifact {} has {trailing} trailing bytes",
                path.display()
            ),
            Self::CoordinateCountMismatch {
                path,
                expected,
                actual,
            } => write!(
                formatter,
                "pruning-table artifact {} has {actual} coordinates, expected {expected}",
                path.display()
            ),
            Self::DenseTable { path, error } => write!(
                formatter,
                "pruning-table artifact {} is invalid: {error}",
                path.display()
            ),
            Self::SpecMismatch {
                path,
                table,
                field,
                expected,
                actual,
            } => write!(
                formatter,
                "pruning-table artifact {} for {table} has {field} {actual}, expected {expected}",
                path.display()
            ),
        }
    }
}

impl std::error::Error for PruningArtifactError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::DenseTable { error, .. } => Some(error),
            _ => None,
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum PruningGenerationError {
    MaxDepthUsesSentinel,
    InvalidMetadata {
        table: &'static str,
        error: PruningMetadataError,
    },
    CoordinateLookup {
        table: &'static str,
        index: usize,
    },
    CoordinateError {
        table: &'static str,
        message: String,
    },
    InvalidRepresentative {
        table: &'static str,
        index: usize,
        error: CubeValidationError,
    },
    DenseTable {
        table: &'static str,
        error: PruningDenseTableError,
    },
}

impl fmt::Display for PruningGenerationError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::MaxDepthUsesSentinel => formatter.write_str(
                "pruning-table max depth must be below 255 because 255 marks unreachable entries",
            ),
            Self::InvalidMetadata { table, error } => {
                write!(
                    formatter,
                    "generated pruning-table {table} has invalid metadata: {error}"
                )
            }
            Self::CoordinateLookup { table, index } => write!(
                formatter,
                "generated pruning-table {table} could not decompose coordinate index {index}"
            ),
            Self::CoordinateError { table, message } => write!(
                formatter,
                "generated pruning-table {table} coordinate conversion failed: {message}"
            ),
            Self::InvalidRepresentative {
                table,
                index,
                error,
            } => write!(
                formatter,
                "generated pruning-table {table} representative state {index} is invalid: {error}"
            ),
            Self::DenseTable { table, error } => {
                write!(
                    formatter,
                    "generated pruning-table {table} is invalid: {error}"
                )
            }
        }
    }
}

impl std::error::Error for PruningGenerationError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::InvalidMetadata { error, .. } => Some(error),
            Self::InvalidRepresentative { error, .. } => Some(error),
            Self::DenseTable { error, .. } => Some(error),
            Self::MaxDepthUsesSentinel
            | Self::CoordinateLookup { .. }
            | Self::CoordinateError { .. } => None,
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum PruningTableCommandError {
    CreateOutputDir {
        path: PathBuf,
        error: String,
    },
    Generate {
        table: &'static str,
        error: PruningGenerationError,
    },
    Save {
        table: &'static str,
        error: PruningArtifactError,
    },
    Load {
        table: &'static str,
        error: PruningArtifactError,
    },
    Validate {
        table: &'static str,
        error: PruningArtifactError,
    },
}

impl fmt::Display for PruningTableCommandError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::CreateOutputDir { path, error } => write!(
                formatter,
                "could not create pruning-table output directory {}: {error}",
                path.display()
            ),
            Self::Generate { table, error } => {
                write!(
                    formatter,
                    "could not generate pruning-table {table}: {error}"
                )
            }
            Self::Save { table, error } => {
                write!(formatter, "could not save pruning-table {table}: {error}")
            }
            Self::Load { table, error } => {
                write!(formatter, "could not reload pruning-table {table}: {error}")
            }
            Self::Validate { table, error } => {
                write!(
                    formatter,
                    "generated pruning-table {table} failed validation: {error}"
                )
            }
        }
    }
}

impl std::error::Error for PruningTableCommandError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::Generate { error, .. } => Some(error),
            Self::Save { error, .. } | Self::Load { error, .. } | Self::Validate { error, .. } => {
                Some(error)
            }
            Self::CreateOutputDir { .. } => None,
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PruningTable {
    metadata: PruningTableMetadata,
    entries: PruningEntries,
}

#[derive(Clone, Debug, Eq, PartialEq)]
enum PruningEntries {
    Sparse(BTreeMap<usize, u8>),
    Dense(Vec<u8>),
}

impl PruningTable {
    pub fn from_fixture_str(input: &str) -> Result<Self, PruningFixtureError> {
        let mut format_version = None;
        let mut table_version = None;
        let mut phase_role = None;
        let mut max_depth = None;
        let mut move_set = None;
        let mut source = None;
        let mut coordinates = Vec::new();
        let mut parsed_entries = Vec::new();
        let mut in_entries = false;

        for (line_index, raw_line) in input.lines().enumerate() {
            let line_number = line_index + 1;
            let line = raw_line.trim();

            if line.is_empty() || line.starts_with('#') {
                continue;
            }

            if line == "entries:" {
                if in_entries {
                    return Err(PruningFixtureError::DuplicateField {
                        line: line_number,
                        field: "entries",
                    });
                }

                in_entries = true;
                continue;
            }

            let (key, value) =
                line.split_once('=')
                    .ok_or_else(|| PruningFixtureError::InvalidLine {
                        line: line_number,
                        content: line.to_owned(),
                    })?;
            let key = key.trim();
            let value = value.trim();

            if key.is_empty() || value.is_empty() {
                return Err(PruningFixtureError::InvalidLine {
                    line: line_number,
                    content: line.to_owned(),
                });
            }

            if in_entries {
                parsed_entries.push((
                    line_number,
                    parse_usize(line_number, "entry index", key)?,
                    parse_u8(line_number, "entry distance", value)?,
                ));
                continue;
            }

            match key {
                "format_version" => set_once(
                    &mut format_version,
                    parse_u16(line_number, "format_version", value)?,
                    line_number,
                    "format_version",
                )?,
                "table_version" => set_once(
                    &mut table_version,
                    value.to_owned(),
                    line_number,
                    "table_version",
                )?,
                "phase_role" => set_once(
                    &mut phase_role,
                    PruningPhaseRole::from_fixture_value(line_number, value)?,
                    line_number,
                    "phase_role",
                )?,
                "max_depth" => set_once(
                    &mut max_depth,
                    parse_u8(line_number, "max_depth", value)?,
                    line_number,
                    "max_depth",
                )?,
                "move_set" => set_once(&mut move_set, value.to_owned(), line_number, "move_set")?,
                "source" => set_once(&mut source, value.to_owned(), line_number, "source")?,
                "coordinate" => coordinates.push(parse_coordinate(line_number, value)?),
                _ => {
                    return Err(PruningFixtureError::InvalidLine {
                        line: line_number,
                        content: line.to_owned(),
                    });
                }
            }
        }

        if !in_entries {
            return Err(PruningFixtureError::MissingField { field: "entries" });
        }

        let generation = PruningGenerationParameters::new(
            required(max_depth, "max_depth")?,
            required(move_set, "move_set")?,
            required(source, "source")?,
        );
        let metadata = PruningTableMetadata::new(
            required(format_version, "format_version")?,
            required(table_version, "table_version")?,
            required(phase_role, "phase_role")?,
            coordinates,
            generation,
        );
        let table_size = metadata
            .table_size()
            .map_err(|error| PruningFixtureError::InvalidMetadata { error })?;
        let mut entries = BTreeMap::new();

        for (line, index, distance) in parsed_entries {
            if index >= table_size {
                return Err(PruningFixtureError::EntryIndexOutOfRange {
                    line,
                    index,
                    table_size,
                });
            }

            if distance > metadata.generation.max_depth {
                return Err(PruningFixtureError::DistanceExceedsMaxDepth {
                    line,
                    distance,
                    max_depth: metadata.generation.max_depth,
                });
            }

            if entries.insert(index, distance).is_some() {
                return Err(PruningFixtureError::DuplicateEntry { line, index });
            }
        }

        Ok(Self {
            metadata,
            entries: PruningEntries::Sparse(entries),
        })
    }

    pub fn from_dense_entries(
        metadata: PruningTableMetadata,
        entries: Vec<u8>,
    ) -> Result<Self, PruningDenseTableError> {
        validate_dense_entries(&metadata, &entries)?;

        Ok(Self {
            metadata,
            entries: PruningEntries::Dense(entries),
        })
    }

    pub fn load_artifact(path: impl AsRef<Path>) -> Result<Self, PruningArtifactError> {
        let path = path.as_ref();
        let bytes = fs::read(path).map_err(|error| PruningArtifactError::Io {
            path: path.to_path_buf(),
            error: error.to_string(),
        })?;

        Self::from_artifact_bytes(path, &bytes)
    }

    pub fn save_artifact(&self, path: impl AsRef<Path>) -> Result<(), PruningArtifactError> {
        let path = path.as_ref();
        let bytes = self.to_artifact_bytes(path)?;

        fs::write(path, bytes).map_err(|error| PruningArtifactError::Io {
            path: path.to_path_buf(),
            error: error.to_string(),
        })
    }

    pub fn to_artifact_bytes(
        &self,
        path: impl AsRef<Path>,
    ) -> Result<Vec<u8>, PruningArtifactError> {
        let path = path.as_ref();
        let dense_entries = match &self.entries {
            PruningEntries::Dense(entries) => entries,
            PruningEntries::Sparse(_) => {
                return Err(PruningArtifactError::DenseTable {
                    path: path.to_path_buf(),
                    error: PruningDenseTableError::EntryCountMismatch {
                        expected: self.metadata.table_size().unwrap_or(0),
                        actual: self.entry_count(),
                    },
                });
            }
        };

        validate_dense_entries(&self.metadata, dense_entries).map_err(|error| {
            PruningArtifactError::DenseTable {
                path: path.to_path_buf(),
                error,
            }
        })?;

        let mut bytes = Vec::new();
        bytes.extend_from_slice(&ARTIFACT_MAGIC);
        push_u16(&mut bytes, self.metadata.format_version);
        push_u8(&mut bytes, self.metadata.phase_role.artifact_value());
        push_u8(&mut bytes, self.metadata.coordinates.len() as u8);
        push_u8(&mut bytes, self.metadata.generation.max_depth);
        push_string(&mut bytes, &self.metadata.table_version);
        push_string(&mut bytes, &self.metadata.generation.move_set);
        push_string(&mut bytes, &self.metadata.generation.source);

        for coordinate in &self.metadata.coordinates {
            push_string(&mut bytes, &coordinate.name);
            push_u64(&mut bytes, coordinate.dimension as u64);
        }

        push_u64(&mut bytes, dense_entries.len() as u64);
        bytes.extend_from_slice(dense_entries);
        let checksum = pruning_checksum(&bytes);
        push_u64(&mut bytes, checksum);

        Ok(bytes)
    }

    pub fn from_artifact_bytes(
        path: impl AsRef<Path>,
        bytes: &[u8],
    ) -> Result<Self, PruningArtifactError> {
        let path = path.as_ref();
        let checksum_size = std::mem::size_of::<u64>();
        if bytes.len() < ARTIFACT_MAGIC.len() + checksum_size {
            return Err(PruningArtifactError::TooShort {
                path: path.to_path_buf(),
            });
        }

        let payload_len = bytes.len() - checksum_size;
        let (payload, checksum_bytes) = bytes.split_at(payload_len);
        let mut checksum = [0_u8; 8];
        checksum.copy_from_slice(checksum_bytes);
        let expected_checksum = u64::from_le_bytes(checksum);
        let actual_checksum = pruning_checksum(payload);
        if expected_checksum != actual_checksum {
            return Err(PruningArtifactError::ChecksumMismatch {
                path: path.to_path_buf(),
                expected: expected_checksum,
                actual: actual_checksum,
            });
        }

        let mut cursor = ArtifactCursor::new(path, payload);
        let magic = cursor.read_bytes(ARTIFACT_MAGIC.len(), "magic")?;
        if magic != ARTIFACT_MAGIC.as_slice() {
            return Err(PruningArtifactError::InvalidMagic {
                path: path.to_path_buf(),
            });
        }

        let format_version = cursor.read_u16("format_version")?;
        if format_version != PRUNING_TABLE_FORMAT_VERSION {
            return Err(PruningArtifactError::UnsupportedFormatVersion {
                path: path.to_path_buf(),
                version: format_version,
            });
        }

        let phase_value = cursor.read_u8("phase_role")?;
        let phase_role = PruningPhaseRole::from_artifact_value(phase_value).ok_or_else(|| {
            PruningArtifactError::InvalidPhaseRole {
                path: path.to_path_buf(),
                value: phase_value,
            }
        })?;
        let coordinate_count = usize::from(cursor.read_u8("coordinate_count")?);
        let max_depth = cursor.read_u8("max_depth")?;
        let table_version = cursor.read_string("table_version")?;
        let move_set = cursor.read_string("move_set")?;
        let source = cursor.read_string("source")?;
        let mut coordinates = Vec::with_capacity(coordinate_count);

        for _ in 0..coordinate_count {
            let name = cursor.read_string("coordinate.name")?;
            let dimension =
                usize::try_from(cursor.read_u64("coordinate.dimension")?).map_err(|_| {
                    PruningArtifactError::DenseTable {
                        path: path.to_path_buf(),
                        error: PruningDenseTableError::InvalidMetadata {
                            error: PruningMetadataError::TableSizeOverflow,
                        },
                    }
                })?;
            coordinates.push(PruningCoordinate::new(name, dimension));
        }

        let entry_count = usize::try_from(cursor.read_u64("entry_count")?).map_err(|_| {
            PruningArtifactError::DenseTable {
                path: path.to_path_buf(),
                error: PruningDenseTableError::InvalidMetadata {
                    error: PruningMetadataError::TableSizeOverflow,
                },
            }
        })?;
        let entries = cursor.read_bytes(entry_count, "entries")?.to_vec();
        let trailing = cursor.remaining_len();
        if trailing != 0 {
            return Err(PruningArtifactError::TrailingBytes {
                path: path.to_path_buf(),
                trailing,
            });
        }

        let metadata = PruningTableMetadata::new(
            format_version,
            table_version,
            phase_role,
            coordinates,
            PruningGenerationParameters::new(max_depth, move_set, source),
        );

        Self::from_dense_entries(metadata, entries).map_err(|error| {
            PruningArtifactError::DenseTable {
                path: path.to_path_buf(),
                error,
            }
        })
    }

    pub fn metadata(&self) -> &PruningTableMetadata {
        &self.metadata
    }

    pub fn entry_count(&self) -> usize {
        match &self.entries {
            PruningEntries::Sparse(entries) => entries.len(),
            PruningEntries::Dense(entries) => entries
                .iter()
                .filter(|distance| **distance != UNREACHED_DISTANCE)
                .count(),
        }
    }

    pub fn is_dense(&self) -> bool {
        matches!(self.entries, PruningEntries::Dense(_))
    }

    pub fn is_complete(&self) -> bool {
        match &self.entries {
            PruningEntries::Sparse(entries) => self
                .metadata
                .table_size()
                .is_ok_and(|table_size| entries.len() == table_size),
            PruningEntries::Dense(entries) => entries
                .iter()
                .all(|distance| *distance != UNREACHED_DISTANCE),
        }
    }

    pub fn checked_lookup_coordinates(
        &self,
        coordinates: &[usize],
    ) -> Result<u8, PruningLookupError> {
        let index = self.metadata.coordinate_index(coordinates)?;

        self.checked_lookup_index_after_metadata_check(index)
    }

    pub fn lookup_index(&self, index: usize) -> Result<u8, PruningLookupError> {
        self.checked_lookup_index_after_metadata_check(index)
    }

    pub fn checked_lookup(
        &self,
        expected_metadata: &PruningTableMetadata,
        coordinates: &[usize],
    ) -> Result<u8, PruningLookupError> {
        self.ensure_metadata(expected_metadata)?;
        let index = self.metadata.coordinate_index(coordinates)?;

        self.checked_lookup_index_after_metadata_check(index)
    }

    pub fn checked_lookup_index(
        &self,
        expected_metadata: &PruningTableMetadata,
        index: usize,
    ) -> Result<u8, PruningLookupError> {
        self.ensure_metadata(expected_metadata)?;

        self.checked_lookup_index_after_metadata_check(index)
    }

    fn ensure_metadata(
        &self,
        expected_metadata: &PruningTableMetadata,
    ) -> Result<(), PruningLookupError> {
        if &self.metadata == expected_metadata {
            return Ok(());
        }

        Err(PruningLookupError::MetadataMismatch {
            expected: Box::new(expected_metadata.clone()),
            actual: Box::new(self.metadata.clone()),
        })
    }

    fn checked_lookup_index_after_metadata_check(
        &self,
        index: usize,
    ) -> Result<u8, PruningLookupError> {
        let table_size = self
            .metadata
            .table_size()
            .map_err(|error| PruningLookupError::InvalidMetadata { error })?;

        if index >= table_size {
            return Err(PruningLookupError::IndexOutOfRange { index, table_size });
        }

        match &self.entries {
            PruningEntries::Sparse(entries) => entries
                .get(&index)
                .copied()
                .ok_or(PruningLookupError::MissingEntry { index }),
            PruningEntries::Dense(entries) => match entries.get(index).copied() {
                Some(UNREACHED_DISTANCE) => Err(PruningLookupError::MissingEntry { index }),
                Some(distance) => Ok(distance),
                None => Err(PruningLookupError::IndexOutOfRange { index, table_size }),
            },
        }
    }
}

fn validate_dense_entries(
    metadata: &PruningTableMetadata,
    entries: &[u8],
) -> Result<(), PruningDenseTableError> {
    let table_size = metadata
        .table_size()
        .map_err(|error| PruningDenseTableError::InvalidMetadata { error })?;

    if entries.len() != table_size {
        return Err(PruningDenseTableError::EntryCountMismatch {
            expected: table_size,
            actual: entries.len(),
        });
    }

    for (index, distance) in entries.iter().copied().enumerate() {
        if distance != UNREACHED_DISTANCE && distance > metadata.generation.max_depth {
            return Err(PruningDenseTableError::DistanceExceedsMaxDepth {
                index,
                distance,
                max_depth: metadata.generation.max_depth,
            });
        }
    }

    Ok(())
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
        self.bytes.len() - self.offset
    }

    fn read_u8(&mut self, field: &'static str) -> Result<u8, PruningArtifactError> {
        Ok(self.read_bytes(1, field)?[0])
    }

    fn read_u16(&mut self, field: &'static str) -> Result<u16, PruningArtifactError> {
        let bytes = self.read_bytes(2, field)?;

        Ok(u16::from_le_bytes([bytes[0], bytes[1]]))
    }

    fn read_u64(&mut self, field: &'static str) -> Result<u64, PruningArtifactError> {
        let bytes = self.read_bytes(8, field)?;
        let mut value = [0_u8; 8];
        value.copy_from_slice(bytes);

        Ok(u64::from_le_bytes(value))
    }

    fn read_string(&mut self, field: &'static str) -> Result<String, PruningArtifactError> {
        let length = usize::from(self.read_u16(field)?);
        let bytes = self.read_bytes(length, field)?;

        std::str::from_utf8(bytes).map(str::to_owned).map_err(|_| {
            PruningArtifactError::InvalidUtf8 {
                path: self.path.to_path_buf(),
                field,
            }
        })
    }

    fn read_bytes(
        &mut self,
        length: usize,
        field: &'static str,
    ) -> Result<&'a [u8], PruningArtifactError> {
        let end =
            self.offset
                .checked_add(length)
                .ok_or_else(|| PruningArtifactError::UnexpectedEnd {
                    path: self.path.to_path_buf(),
                    field,
                })?;

        if end > self.bytes.len() {
            return Err(PruningArtifactError::UnexpectedEnd {
                path: self.path.to_path_buf(),
                field,
            });
        }

        let bytes = &self.bytes[self.offset..end];
        self.offset = end;

        Ok(bytes)
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

fn push_string(bytes: &mut Vec<u8>, value: &str) {
    let length = u16::try_from(value.len()).unwrap_or(u16::MAX);
    push_u16(bytes, length);
    bytes.extend_from_slice(&value.as_bytes()[..usize::from(length)]);
}

fn pruning_checksum(bytes: &[u8]) -> u64 {
    bytes.iter().fold(CHECKSUM_OFFSET_BASIS, |checksum, byte| {
        (checksum ^ u64::from(*byte)).wrapping_mul(CHECKSUM_PRIME)
    })
}

fn parse_coordinate(line: usize, value: &str) -> Result<PruningCoordinate, PruningFixtureError> {
    let (name, dimension) =
        value
            .split_once(':')
            .ok_or_else(|| PruningFixtureError::InvalidLine {
                line,
                content: format!("coordinate={value}"),
            })?;
    let name = name.trim();
    let dimension = parse_usize(line, "coordinate dimension", dimension.trim())?;

    if name.is_empty() {
        return Err(PruningFixtureError::InvalidLine {
            line,
            content: format!("coordinate={value}"),
        });
    }

    if dimension == 0 {
        return Err(PruningFixtureError::CoordinateDimensionZero {
            line,
            coordinate: name.to_owned(),
        });
    }

    Ok(PruningCoordinate::new(name, dimension))
}

fn set_once<T>(
    target: &mut Option<T>,
    value: T,
    line: usize,
    field: &'static str,
) -> Result<(), PruningFixtureError> {
    if target.replace(value).is_some() {
        return Err(PruningFixtureError::DuplicateField { line, field });
    }

    Ok(())
}

fn required<T>(target: Option<T>, field: &'static str) -> Result<T, PruningFixtureError> {
    target.ok_or(PruningFixtureError::MissingField { field })
}

fn parse_u16(line: usize, field: &'static str, value: &str) -> Result<u16, PruningFixtureError> {
    value
        .parse()
        .map_err(|_| PruningFixtureError::InvalidNumber {
            line,
            field,
            value: value.to_owned(),
        })
}

fn parse_u8(line: usize, field: &'static str, value: &str) -> Result<u8, PruningFixtureError> {
    value
        .parse()
        .map_err(|_| PruningFixtureError::InvalidNumber {
            line,
            field,
            value: value.to_owned(),
        })
}

fn parse_usize(
    line: usize,
    field: &'static str,
    value: &str,
) -> Result<usize, PruningFixtureError> {
    value
        .parse()
        .map_err(|_| PruningFixtureError::InvalidNumber {
            line,
            field,
            value: value.to_owned(),
        })
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum GeneratedPruningTableKind {
    Phase1CornerEdgeOrientation,
    Phase1CornerOrientationUdSlice,
    Phase1EdgeOrientationUdSlice,
    Phase2CornerPermutationSliceEdgePermutation,
    Phase2UdEdgePermutationSliceEdgePermutation,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct GeneratedPruningTableSpec {
    pub kind: GeneratedPruningTableKind,
    pub table_name: &'static str,
    pub file_name: &'static str,
    pub table_version: &'static str,
    pub phase_role: PruningPhaseRole,
    pub move_set: &'static str,
}

pub const GENERATED_PRUNING_TABLE_SPECS: [GeneratedPruningTableSpec; 5] = [
    GeneratedPruningTableSpec {
        kind: GeneratedPruningTableKind::Phase1CornerEdgeOrientation,
        table_name: "phase1-corner-edge-orientation",
        file_name: "phase1-corner-edge-orientation.rpt",
        table_version: "generated-phase1-corner-edge-orientation-v1",
        phase_role: PruningPhaseRole::Phase1,
        move_set: PHASE1_MOVE_SET,
    },
    GeneratedPruningTableSpec {
        kind: GeneratedPruningTableKind::Phase1CornerOrientationUdSlice,
        table_name: "phase1-corner-orientation-ud-slice",
        file_name: "phase1-corner-orientation-ud-slice.rpt",
        table_version: "generated-phase1-corner-orientation-ud-slice-v1",
        phase_role: PruningPhaseRole::Phase1,
        move_set: PHASE1_MOVE_SET,
    },
    GeneratedPruningTableSpec {
        kind: GeneratedPruningTableKind::Phase1EdgeOrientationUdSlice,
        table_name: "phase1-edge-orientation-ud-slice",
        file_name: "phase1-edge-orientation-ud-slice.rpt",
        table_version: "generated-phase1-edge-orientation-ud-slice-v1",
        phase_role: PruningPhaseRole::Phase1,
        move_set: PHASE1_MOVE_SET,
    },
    GeneratedPruningTableSpec {
        kind: GeneratedPruningTableKind::Phase2CornerPermutationSliceEdgePermutation,
        table_name: "phase2-corner-permutation-slice-edge-permutation",
        file_name: "phase2-corner-permutation-slice-edge-permutation.rpt",
        table_version: "generated-phase2-corner-permutation-slice-edge-permutation-v1",
        phase_role: PruningPhaseRole::Phase2,
        move_set: PHASE2_MOVE_SET,
    },
    GeneratedPruningTableSpec {
        kind: GeneratedPruningTableKind::Phase2UdEdgePermutationSliceEdgePermutation,
        table_name: "phase2-ud-edge-permutation-slice-edge-permutation",
        file_name: "phase2-ud-edge-permutation-slice-edge-permutation.rpt",
        table_version: "generated-phase2-ud-edge-permutation-slice-edge-permutation-v1",
        phase_role: PruningPhaseRole::Phase2,
        move_set: PHASE2_MOVE_SET,
    },
];

impl GeneratedPruningTableSpec {
    pub fn metadata(&self, max_depth: u8) -> PruningTableMetadata {
        PruningTableMetadata::new(
            PRUNING_TABLE_FORMAT_VERSION,
            self.table_version,
            self.phase_role,
            self.coordinates(),
            PruningGenerationParameters::new(max_depth, self.move_set, ARTIFACT_GENERATION_SOURCE),
        )
    }

    pub fn coordinates(&self) -> Vec<PruningCoordinate> {
        match self.kind {
            GeneratedPruningTableKind::Phase1CornerEdgeOrientation => vec![
                PruningCoordinate::new("corner_orientation", CORNER_ORIENTATION_COORDINATE_COUNT),
                PruningCoordinate::new("edge_orientation", EDGE_ORIENTATION_COORDINATE_COUNT),
            ],
            GeneratedPruningTableKind::Phase1CornerOrientationUdSlice => vec![
                PruningCoordinate::new("corner_orientation", CORNER_ORIENTATION_COORDINATE_COUNT),
                PruningCoordinate::new(
                    "ud_slice_edge_combination",
                    UD_SLICE_EDGE_COMBINATION_COORDINATE_COUNT,
                ),
            ],
            GeneratedPruningTableKind::Phase1EdgeOrientationUdSlice => vec![
                PruningCoordinate::new("edge_orientation", EDGE_ORIENTATION_COORDINATE_COUNT),
                PruningCoordinate::new(
                    "ud_slice_edge_combination",
                    UD_SLICE_EDGE_COMBINATION_COORDINATE_COUNT,
                ),
            ],
            GeneratedPruningTableKind::Phase2CornerPermutationSliceEdgePermutation => vec![
                PruningCoordinate::new("corner_permutation", CORNER_PERMUTATION_COORDINATE_COUNT),
                PruningCoordinate::new(
                    "slice_edge_permutation",
                    SLICE_EDGE_PERMUTATION_COORDINATE_COUNT,
                ),
            ],
            GeneratedPruningTableKind::Phase2UdEdgePermutationSliceEdgePermutation => vec![
                PruningCoordinate::new("ud_edge_permutation", UD_EDGE_PERMUTATION_COORDINATE_COUNT),
                PruningCoordinate::new(
                    "slice_edge_permutation",
                    SLICE_EDGE_PERMUTATION_COORDINATE_COUNT,
                ),
            ],
        }
    }

    pub fn file_path(&self, directory: impl AsRef<Path>) -> PathBuf {
        directory.as_ref().join(self.file_name)
    }

    pub fn generate(&self, max_depth: u8) -> Result<PruningTable, PruningGenerationError> {
        if max_depth == UNREACHED_DISTANCE {
            return Err(PruningGenerationError::MaxDepthUsesSentinel);
        }

        let metadata = self.metadata(max_depth);
        let table_size =
            metadata
                .table_size()
                .map_err(|error| PruningGenerationError::InvalidMetadata {
                    table: self.table_name,
                    error,
                })?;
        let mut entries = vec![UNREACHED_DISTANCE; table_size];
        let mut queue = VecDeque::new();

        entries[0] = 0;
        queue.push_back(0_usize);

        while let Some(index) = queue.pop_front() {
            let distance = entries[index];
            if distance >= max_depth {
                continue;
            }

            let cube = self.cube_from_index(&metadata, index)?;
            for &move_ in self.moves() {
                let mut next_cube = cube.clone();
                next_cube.apply_move(move_);
                let next_index = self.index_for_cube(&metadata, &next_cube)?;

                if entries[next_index] == UNREACHED_DISTANCE {
                    entries[next_index] = distance + 1;
                    queue.push_back(next_index);
                }
            }
        }

        PruningTable::from_dense_entries(metadata, entries).map_err(|error| {
            PruningGenerationError::DenseTable {
                table: self.table_name,
                error,
            }
        })
    }

    pub fn validate_table(
        &self,
        table: &PruningTable,
        path: impl AsRef<Path>,
    ) -> Result<(), PruningArtifactError> {
        let path = path.as_ref();
        let metadata = table.metadata();

        if metadata.format_version != PRUNING_TABLE_FORMAT_VERSION {
            return Err(spec_mismatch(
                path,
                self,
                "format_version",
                PRUNING_TABLE_FORMAT_VERSION.to_string(),
                metadata.format_version.to_string(),
            ));
        }
        if metadata.table_version != self.table_version {
            return Err(spec_mismatch(
                path,
                self,
                "table_version",
                self.table_version.to_owned(),
                metadata.table_version.clone(),
            ));
        }
        if metadata.phase_role != self.phase_role {
            return Err(spec_mismatch(
                path,
                self,
                "phase_role",
                format!("{:?}", self.phase_role),
                format!("{:?}", metadata.phase_role),
            ));
        }
        if metadata.coordinates != self.coordinates() {
            return Err(spec_mismatch(
                path,
                self,
                "coordinates",
                format!("{:?}", self.coordinates()),
                format!("{:?}", metadata.coordinates),
            ));
        }
        if metadata.generation.move_set != self.move_set {
            return Err(spec_mismatch(
                path,
                self,
                "move_set",
                self.move_set.to_owned(),
                metadata.generation.move_set.clone(),
            ));
        }
        if !table.is_dense() {
            return Err(PruningArtifactError::DenseTable {
                path: path.to_path_buf(),
                error: PruningDenseTableError::EntryCountMismatch {
                    expected: metadata.table_size().unwrap_or(0),
                    actual: table.entry_count(),
                },
            });
        }

        Ok(())
    }

    fn moves(&self) -> &'static [Move] {
        match self.phase_role {
            PruningPhaseRole::Phase1 => &FACE_MOVES,
            PruningPhaseRole::Phase2 => &PHASE2_MOVES,
        }
    }

    fn cube_from_index(
        &self,
        metadata: &PruningTableMetadata,
        index: usize,
    ) -> Result<Cube, PruningGenerationError> {
        let coordinates = metadata.coordinates_from_index(index).map_err(|_| {
            PruningGenerationError::CoordinateLookup {
                table: self.table_name,
                index,
            }
        })?;

        match self.kind {
            GeneratedPruningTableKind::Phase1CornerEdgeOrientation => {
                let mut state = CubieState::solved();
                state.corner_orientation =
                    cubie_state_from_corner_orientation_coordinate(coordinates[0])
                        .map_err(|error| PruningGenerationError::CoordinateError {
                            table: self.table_name,
                            message: error.to_string(),
                        })?
                        .corner_orientation;
                state.edge_orientation =
                    cubie_state_from_edge_orientation_coordinate(coordinates[1])
                        .map_err(|error| PruningGenerationError::CoordinateError {
                            table: self.table_name,
                            message: error.to_string(),
                        })?
                        .edge_orientation;

                cube_from_representative_state(self, index, state)
            }
            GeneratedPruningTableKind::Phase1CornerOrientationUdSlice => {
                let mut state = CubieState::solved();
                state.corner_orientation =
                    cubie_state_from_corner_orientation_coordinate(coordinates[0])
                        .map_err(|error| PruningGenerationError::CoordinateError {
                            table: self.table_name,
                            message: error.to_string(),
                        })?
                        .corner_orientation;
                state.edge_permutation = edge_permutation_from_ud_slice_coordinate(coordinates[1])
                    .map_err(|error| PruningGenerationError::CoordinateError {
                        table: self.table_name,
                        message: error.to_string(),
                    })?;

                cube_from_representative_state(self, index, state)
            }
            GeneratedPruningTableKind::Phase1EdgeOrientationUdSlice => {
                let mut state = CubieState::solved();
                state.edge_orientation =
                    cubie_state_from_edge_orientation_coordinate(coordinates[0])
                        .map_err(|error| PruningGenerationError::CoordinateError {
                            table: self.table_name,
                            message: error.to_string(),
                        })?
                        .edge_orientation;
                state.edge_permutation = edge_permutation_from_ud_slice_coordinate(coordinates[1])
                    .map_err(|error| PruningGenerationError::CoordinateError {
                        table: self.table_name,
                        message: error.to_string(),
                    })?;

                cube_from_representative_state(self, index, state)
            }
            GeneratedPruningTableKind::Phase2CornerPermutationSliceEdgePermutation => {
                let mut state = CubieState::solved();
                state.corner_permutation = corner_permutation_from_coordinate(coordinates[0])
                    .map_err(|error| PruningGenerationError::CoordinateError {
                        table: self.table_name,
                        message: error.to_string(),
                    })?;
                apply_slice_edge_permutation(&mut state, coordinates[1])?;

                cube_from_state_adjusting_ud_edge_parity(self, index, state)
            }
            GeneratedPruningTableKind::Phase2UdEdgePermutationSliceEdgePermutation => {
                let mut state = CubieState::solved();
                let ud_edges =
                    ud_edge_permutation_from_coordinate(coordinates[0]).map_err(|error| {
                        PruningGenerationError::CoordinateError {
                            table: self.table_name,
                            message: error.to_string(),
                        }
                    })?;
                state.edge_permutation[..8].copy_from_slice(&ud_edges);
                apply_slice_edge_permutation(&mut state, coordinates[1])?;

                cube_from_state_adjusting_corner_parity(self, index, state)
            }
        }
    }

    fn index_for_cube(
        &self,
        metadata: &PruningTableMetadata,
        cube: &Cube,
    ) -> Result<usize, PruningGenerationError> {
        let state = cube.state();
        let coordinates =
            match self.kind {
                GeneratedPruningTableKind::Phase1CornerEdgeOrientation => vec![
                    corner_orientation_coordinate(state).map_err(|error| {
                        PruningGenerationError::CoordinateError {
                            table: self.table_name,
                            message: error.to_string(),
                        }
                    })?,
                    edge_orientation_coordinate(state).map_err(|error| {
                        PruningGenerationError::CoordinateError {
                            table: self.table_name,
                            message: error.to_string(),
                        }
                    })?,
                ],
                GeneratedPruningTableKind::Phase1CornerOrientationUdSlice => vec![
                    corner_orientation_coordinate(state).map_err(|error| {
                        PruningGenerationError::CoordinateError {
                            table: self.table_name,
                            message: error.to_string(),
                        }
                    })?,
                    ud_slice_edge_combination_coordinate(state).map_err(|error| {
                        PruningGenerationError::CoordinateError {
                            table: self.table_name,
                            message: error.to_string(),
                        }
                    })?,
                ],
                GeneratedPruningTableKind::Phase1EdgeOrientationUdSlice => vec![
                    edge_orientation_coordinate(state).map_err(|error| {
                        PruningGenerationError::CoordinateError {
                            table: self.table_name,
                            message: error.to_string(),
                        }
                    })?,
                    ud_slice_edge_combination_coordinate(state).map_err(|error| {
                        PruningGenerationError::CoordinateError {
                            table: self.table_name,
                            message: error.to_string(),
                        }
                    })?,
                ],
                GeneratedPruningTableKind::Phase2CornerPermutationSliceEdgePermutation => vec![
                    corner_permutation_coordinate_from_permutation(&state.corner_permutation)
                        .map_err(|error| PruningGenerationError::CoordinateError {
                            table: self.table_name,
                            message: error.to_string(),
                        })?,
                    slice_edge_permutation_coordinate_from_permutation(&state.edge_permutation)
                        .map_err(|error| PruningGenerationError::CoordinateError {
                            table: self.table_name,
                            message: error.to_string(),
                        })?,
                ],
                GeneratedPruningTableKind::Phase2UdEdgePermutationSliceEdgePermutation => vec![
                    ud_edge_permutation_coordinate_from_permutation(&state.edge_permutation)
                        .map_err(|error| PruningGenerationError::CoordinateError {
                            table: self.table_name,
                            message: error.to_string(),
                        })?,
                    slice_edge_permutation_coordinate_from_permutation(&state.edge_permutation)
                        .map_err(|error| PruningGenerationError::CoordinateError {
                            table: self.table_name,
                            message: error.to_string(),
                        })?,
                ],
            };

        metadata.coordinate_index(&coordinates).map_err(|error| {
            PruningGenerationError::CoordinateError {
                table: self.table_name,
                message: error.to_string(),
            }
        })
    }
}

pub fn generate_all_pruning_tables(
    output_dir: impl AsRef<Path>,
    phase1_max_depth: u8,
    phase2_max_depth: u8,
) -> Result<Vec<PathBuf>, PruningTableCommandError> {
    let output_dir = output_dir.as_ref();
    fs::create_dir_all(output_dir).map_err(|error| PruningTableCommandError::CreateOutputDir {
        path: output_dir.to_path_buf(),
        error: error.to_string(),
    })?;

    let mut paths = Vec::with_capacity(GENERATED_PRUNING_TABLE_SPECS.len());
    for spec in GENERATED_PRUNING_TABLE_SPECS {
        let max_depth = match spec.phase_role {
            PruningPhaseRole::Phase1 => phase1_max_depth,
            PruningPhaseRole::Phase2 => phase2_max_depth,
        };
        let path = spec.file_path(output_dir);
        let table =
            spec.generate(max_depth)
                .map_err(|error| PruningTableCommandError::Generate {
                    table: spec.table_name,
                    error,
                })?;
        table
            .save_artifact(&path)
            .map_err(|error| PruningTableCommandError::Save {
                table: spec.table_name,
                error,
            })?;
        let loaded =
            PruningTable::load_artifact(&path).map_err(|error| PruningTableCommandError::Load {
                table: spec.table_name,
                error,
            })?;
        spec.validate_table(&loaded, &path).map_err(|error| {
            PruningTableCommandError::Validate {
                table: spec.table_name,
                error,
            }
        })?;
        paths.push(path);
    }

    Ok(paths)
}

fn spec_mismatch(
    path: &Path,
    spec: &GeneratedPruningTableSpec,
    field: &'static str,
    expected: String,
    actual: String,
) -> PruningArtifactError {
    PruningArtifactError::SpecMismatch {
        path: path.to_path_buf(),
        table: spec.table_name,
        field,
        expected,
        actual,
    }
}

fn edge_permutation_from_ud_slice_coordinate(index: usize) -> Result<[Edge; EDGE_COUNT], String> {
    let membership = ud_slice_edge_combination_membership_from_coordinate(index)
        .map_err(|error| error.to_string())?;
    let mut permutation = Edge::ALL;
    let mut slice_edges = [Edge::Fr, Edge::Fl, Edge::Bl, Edge::Br].into_iter();
    let mut ud_edges = [
        Edge::Ur,
        Edge::Uf,
        Edge::Ul,
        Edge::Ub,
        Edge::Dr,
        Edge::Df,
        Edge::Dl,
        Edge::Db,
    ]
    .into_iter();

    for (position, is_slice) in membership.iter().copied().enumerate() {
        permutation[position] = if is_slice {
            slice_edges
                .next()
                .ok_or_else(|| "UD-slice membership selected too many slice edges".to_owned())?
        } else {
            ud_edges
                .next()
                .ok_or_else(|| "UD-slice membership selected too many U/D edges".to_owned())?
        };
    }

    Ok(permutation)
}

fn apply_slice_edge_permutation(
    state: &mut CubieState,
    coordinate: usize,
) -> Result<(), PruningGenerationError> {
    let slice_edges = slice_edge_permutation_from_coordinate(coordinate).map_err(|error| {
        PruningGenerationError::CoordinateError {
            table: "slice-edge-permutation",
            message: error.to_string(),
        }
    })?;
    state.edge_permutation[8..].copy_from_slice(&slice_edges);

    Ok(())
}

fn cube_from_representative_state(
    spec: &GeneratedPruningTableSpec,
    index: usize,
    state: CubieState,
) -> Result<Cube, PruningGenerationError> {
    cube_from_state_adjusting_corner_parity(spec, index, state)
}

fn cube_from_state_adjusting_corner_parity(
    spec: &GeneratedPruningTableSpec,
    index: usize,
    mut state: CubieState,
) -> Result<Cube, PruningGenerationError> {
    match Cube::try_from_state(state.clone()) {
        Ok(cube) => Ok(cube),
        Err(CubeValidationError::InvalidPermutationParity { .. }) => {
            state
                .corner_permutation
                .swap(Corner::Urf.index(), Corner::Ufl.index());
            Cube::try_from_state(state).map_err(|error| {
                PruningGenerationError::InvalidRepresentative {
                    table: spec.table_name,
                    index,
                    error,
                }
            })
        }
        Err(error) => Err(PruningGenerationError::InvalidRepresentative {
            table: spec.table_name,
            index,
            error,
        }),
    }
}

fn cube_from_state_adjusting_ud_edge_parity(
    spec: &GeneratedPruningTableSpec,
    index: usize,
    mut state: CubieState,
) -> Result<Cube, PruningGenerationError> {
    match Cube::try_from_state(state.clone()) {
        Ok(cube) => Ok(cube),
        Err(CubeValidationError::InvalidPermutationParity { .. }) => {
            state
                .edge_permutation
                .swap(Edge::Ur.index(), Edge::Uf.index());
            Cube::try_from_state(state).map_err(|error| {
                PruningGenerationError::InvalidRepresentative {
                    table: spec.table_name,
                    index,
                    error,
                }
            })
        }
        Err(error) => Err(PruningGenerationError::InvalidRepresentative {
            table: spec.table_name,
            index,
            error,
        }),
    }
}

#[cfg(test)]
mod tests {
    use super::{
        pruning_checksum, GeneratedPruningTableKind, PruningArtifactError, PruningCoordinate,
        PruningDenseTableError, PruningFixtureError, PruningGenerationParameters,
        PruningLookupError, PruningMetadataError, PruningPhaseRole, PruningTable,
        PruningTableMetadata, GENERATED_PRUNING_TABLE_SPECS, PRUNING_TABLE_FORMAT_VERSION,
    };
    use crate::cube::coordinates::{
        corner_orientation_coordinate, edge_orientation_coordinate,
        ud_slice_edge_combination_coordinate, CORNER_ORIENTATION_COORDINATE_COUNT,
        EDGE_ORIENTATION_COORDINATE_COUNT, UD_SLICE_EDGE_COMBINATION_COORDINATE_COUNT,
    };
    use crate::cube::{Cube, Move};
    use std::fs;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    const TINY_PHASE1_DEPTH1_FIXTURE: &str =
        include_str!("../../tests/fixtures/pruning_tables/tiny_phase1_depth1.txt");
    const TINY_PHASE2_DEPTH0_FIXTURE: &str =
        include_str!("../../tests/fixtures/pruning_tables/tiny_phase2_depth0.txt");

    #[test]
    fn fixture_metadata_records_pruning_table_boundary() {
        let table = tiny_fixture_table();
        let metadata = table.metadata();

        assert_eq!(metadata.format_version, 1);
        assert_eq!(metadata.table_version, "tiny-phase1-depth1-v1");
        assert_eq!(metadata.phase_role, PruningPhaseRole::Phase1);
        assert_eq!(metadata.generation.max_depth, 1);
        assert_eq!(metadata.generation.move_set, "face-turn-metric-depth1");
        assert_eq!(
            metadata.generation.source,
            "committed deterministic test fixture"
        );
        assert_eq!(
            metadata.coordinates,
            vec![
                PruningCoordinate::new("corner_orientation", CORNER_ORIENTATION_COORDINATE_COUNT,),
                PruningCoordinate::new("edge_orientation", EDGE_ORIENTATION_COORDINATE_COUNT),
                PruningCoordinate::new(
                    "ud_slice_edge_combination",
                    UD_SLICE_EDGE_COMBINATION_COORDINATE_COUNT,
                ),
            ]
        );
        assert_eq!(table.entry_count(), 2);
    }

    #[test]
    fn phase2_fixture_metadata_records_pruning_table_boundary() {
        let table = PruningTable::from_fixture_str(TINY_PHASE2_DEPTH0_FIXTURE)
            .expect("tiny phase-2 pruning fixture should parse");
        let metadata = table.metadata();

        assert_eq!(metadata.format_version, 1);
        assert_eq!(metadata.table_version, "tiny-phase2-depth0-v1");
        assert_eq!(metadata.phase_role, PruningPhaseRole::Phase2);
        assert_eq!(metadata.generation.max_depth, 0);
        assert_eq!(metadata.generation.move_set, "phase2-g1-metric-depth0");
        assert_eq!(
            metadata.coordinates,
            vec![
                PruningCoordinate::new("corner_permutation", 40320),
                PruningCoordinate::new("slice_edge_permutation", 24),
            ]
        );
        assert_eq!(table.checked_lookup_index(metadata, 0), Ok(0));
        assert_eq!(table.entry_count(), 1);
    }

    #[test]
    fn table_size_uses_checked_coordinate_dimensions() {
        let metadata = tiny_fixture_table().metadata().clone();

        assert_eq!(metadata.table_size(), Ok(2_217_093_120));

        let overflowing_metadata = PruningTableMetadata::new(
            1,
            "overflow",
            PruningPhaseRole::Phase1,
            vec![
                PruningCoordinate::new("a", usize::MAX),
                PruningCoordinate::new("b", 2),
            ],
            PruningGenerationParameters::new(1, "test", "test"),
        );

        assert_eq!(
            overflowing_metadata.table_size(),
            Err(PruningMetadataError::TableSizeOverflow)
        );
    }

    #[test]
    fn coordinate_index_composes_dimensions_without_allocating_full_table() {
        let metadata = tiny_fixture_table().metadata().clone();
        let mut cube = Cube::solved();
        cube.apply_move(Move::F);

        assert_eq!(
            metadata.coordinate_index(&phase1_coordinates(&Cube::solved())),
            Ok(0)
        );
        assert_eq!(
            metadata.coordinate_index(&phase1_coordinates(&cube)),
            Ok(1_253_279_840)
        );
    }

    #[test]
    fn solved_and_shallow_fixture_lookups_return_distances() {
        let table = tiny_fixture_table();
        let metadata = table.metadata().clone();
        let mut front_turn = Cube::solved();
        front_turn.apply_move(Move::F);

        assert_eq!(
            table.checked_lookup(&metadata, &phase1_coordinates(&Cube::solved())),
            Ok(0)
        );
        assert_eq!(
            table.checked_lookup(&metadata, &phase1_coordinates(&front_turn)),
            Ok(1)
        );
    }

    #[test]
    fn checked_lookup_reports_metadata_mismatch() {
        let table = tiny_fixture_table();
        let mut expected = table.metadata().clone();
        expected.table_version = "different-version".to_owned();

        assert!(matches!(
            table.checked_lookup(&expected, &[0, 0, 0]),
            Err(PruningLookupError::MetadataMismatch { .. })
        ));
    }

    #[test]
    fn checked_lookup_reports_missing_sparse_entry() {
        let table = tiny_fixture_table();

        assert_eq!(
            table.checked_lookup_index(table.metadata(), 1),
            Err(PruningLookupError::MissingEntry { index: 1 })
        );
    }

    #[test]
    fn checked_lookup_reports_out_of_range_coordinate_component() {
        let table = tiny_fixture_table();

        assert_eq!(
            table.checked_lookup(
                table.metadata(),
                &[CORNER_ORIENTATION_COORDINATE_COUNT, 0, 0],
            ),
            Err(PruningLookupError::CoordinateOutOfRange {
                coordinate: "corner_orientation".to_owned(),
                index: CORNER_ORIENTATION_COORDINATE_COUNT,
                dimension: CORNER_ORIENTATION_COORDINATE_COUNT,
            })
        );
    }

    #[test]
    fn checked_lookup_reports_out_of_range_composed_index() {
        let table = tiny_fixture_table();
        let table_size = table
            .metadata()
            .table_size()
            .expect("fixture metadata is valid");

        assert_eq!(
            table.checked_lookup_index(table.metadata(), table_size),
            Err(PruningLookupError::IndexOutOfRange {
                index: table_size,
                table_size,
            })
        );
    }

    #[test]
    fn checked_lookup_reports_coordinate_arity_mismatch() {
        let table = tiny_fixture_table();

        assert_eq!(
            table.checked_lookup(table.metadata(), &[0, 0]),
            Err(PruningLookupError::CoordinateArityMismatch {
                expected: 3,
                actual: 2,
            })
        );
    }

    #[test]
    fn corrupted_fixture_line_is_rejected() {
        assert_eq!(
            PruningTable::from_fixture_str("format_version=1\nnot valid\nentries:\n0=0\n"),
            Err(PruningFixtureError::InvalidLine {
                line: 2,
                content: "not valid".to_owned(),
            })
        );
    }

    #[test]
    fn fixture_missing_metadata_is_rejected() {
        assert_eq!(
            PruningTable::from_fixture_str(
                "format_version=1\n\
                 table_version=test\n\
                 phase_role=phase1\n\
                 max_depth=1\n\
                 move_set=test\n\
                 source=test\n\
                 entries:\n\
                 0=0\n",
            ),
            Err(PruningFixtureError::InvalidMetadata {
                error: PruningMetadataError::NoCoordinates,
            })
        );
    }

    #[test]
    fn fixture_out_of_range_entry_index_is_rejected() {
        assert_eq!(
            PruningTable::from_fixture_str(
                "format_version=1\n\
                 table_version=test\n\
                 phase_role=phase1\n\
                 max_depth=1\n\
                 move_set=test\n\
                 source=test\n\
                 coordinate=test:2\n\
                 entries:\n\
                 2=1\n",
            ),
            Err(PruningFixtureError::EntryIndexOutOfRange {
                line: 9,
                index: 2,
                table_size: 2,
            })
        );
    }

    #[test]
    fn fixture_distance_above_max_depth_is_rejected() {
        assert_eq!(
            PruningTable::from_fixture_str(
                "format_version=1\n\
                 table_version=test\n\
                 phase_role=phase1\n\
                 max_depth=1\n\
                 move_set=test\n\
                 source=test\n\
                 coordinate=test:2\n\
                 entries:\n\
                 1=2\n",
            ),
            Err(PruningFixtureError::DistanceExceedsMaxDepth {
                line: 9,
                distance: 2,
                max_depth: 1,
            })
        );
    }

    #[test]
    fn dense_artifact_round_trips_with_metadata_and_lookup() {
        let path = PathBuf::from("test-table.rpt");
        let metadata = PruningTableMetadata::new(
            PRUNING_TABLE_FORMAT_VERSION,
            "dense-test-v1",
            PruningPhaseRole::Phase1,
            vec![PruningCoordinate::new("test", 3)],
            PruningGenerationParameters::new(2, "test-moves", "unit test"),
        );
        let table = PruningTable::from_dense_entries(metadata.clone(), vec![0, 1, u8::MAX])
            .expect("dense test table should build");
        let bytes = table
            .to_artifact_bytes(&path)
            .expect("dense test table should serialize");
        let loaded =
            PruningTable::from_artifact_bytes(&path, &bytes).expect("dense test table should load");

        assert_eq!(loaded.metadata(), &metadata);
        assert!(loaded.is_dense());
        assert!(!loaded.is_complete());
        assert_eq!(loaded.entry_count(), 2);
        assert_eq!(loaded.lookup_index(0), Ok(0));
        assert_eq!(loaded.lookup_index(1), Ok(1));
        assert_eq!(
            loaded.lookup_index(2),
            Err(PruningLookupError::MissingEntry { index: 2 })
        );
    }

    #[test]
    fn dense_artifact_rejects_distance_above_max_depth() {
        let metadata = PruningTableMetadata::new(
            PRUNING_TABLE_FORMAT_VERSION,
            "dense-test-v1",
            PruningPhaseRole::Phase1,
            vec![PruningCoordinate::new("test", 2)],
            PruningGenerationParameters::new(1, "test-moves", "unit test"),
        );

        assert_eq!(
            PruningTable::from_dense_entries(metadata, vec![0, 2]),
            Err(PruningDenseTableError::DistanceExceedsMaxDepth {
                index: 1,
                distance: 2,
                max_depth: 1,
            })
        );
    }

    #[test]
    fn generated_table_artifact_bytes_are_deterministic() {
        let spec = generated_spec_for_test(
            GeneratedPruningTableKind::Phase2CornerPermutationSliceEdgePermutation,
        );
        let first = spec
            .generate(1)
            .expect("phase-2 generated table should build to depth one");
        let second = spec
            .generate(1)
            .expect("phase-2 generated table should build deterministically");
        let path = PathBuf::from(spec.file_name);

        assert_eq!(first.metadata(), second.metadata());
        assert_eq!(first.entry_count(), second.entry_count());
        assert_eq!(
            first
                .to_artifact_bytes(&path)
                .expect("first artifact should serialize"),
            second
                .to_artifact_bytes(&path)
                .expect("second artifact should serialize")
        );
    }

    #[test]
    fn generated_artifact_rejects_checksum_corruption() {
        let path = PathBuf::from("corrupt-checksum.rpt");
        let metadata = PruningTableMetadata::new(
            PRUNING_TABLE_FORMAT_VERSION,
            "dense-test-v1",
            PruningPhaseRole::Phase1,
            vec![PruningCoordinate::new("test", 2)],
            PruningGenerationParameters::new(1, "test-moves", "unit test"),
        );
        let table = PruningTable::from_dense_entries(metadata, vec![0, 1])
            .expect("dense test table should build");
        let mut bytes = table
            .to_artifact_bytes(&path)
            .expect("dense test table should serialize");
        bytes[12] ^= 0x01;

        assert!(matches!(
            PruningTable::from_artifact_bytes(&path, &bytes),
            Err(PruningArtifactError::ChecksumMismatch { .. })
        ));
    }

    #[test]
    fn generated_artifact_rejects_corrupt_header_after_checksum_update() {
        let path = PathBuf::from("corrupt-header.rpt");
        let metadata = PruningTableMetadata::new(
            PRUNING_TABLE_FORMAT_VERSION,
            "dense-test-v1",
            PruningPhaseRole::Phase1,
            vec![PruningCoordinate::new("test", 2)],
            PruningGenerationParameters::new(1, "test-moves", "unit test"),
        );
        let table = PruningTable::from_dense_entries(metadata, vec![0, 1])
            .expect("dense test table should build");
        let mut bytes = table
            .to_artifact_bytes(&path)
            .expect("dense test table should serialize");
        bytes[0] = b'X';
        update_checksum(&mut bytes);

        assert!(matches!(
            PruningTable::from_artifact_bytes(&path, &bytes),
            Err(PruningArtifactError::InvalidMagic { .. })
        ));
    }

    #[test]
    fn missing_artifact_load_is_structured_io_error() {
        let directory = temp_test_dir("missing-artifact");
        fs::create_dir_all(&directory).expect("temp test directory should be created");
        let path = directory.join("missing.rpt");

        assert!(matches!(
            PruningTable::load_artifact(&path),
            Err(PruningArtifactError::Io { .. })
        ));

        let _ = fs::remove_dir_all(directory);
    }

    fn tiny_fixture_table() -> PruningTable {
        PruningTable::from_fixture_str(TINY_PHASE1_DEPTH1_FIXTURE)
            .expect("tiny phase-1 pruning fixture should parse")
    }

    fn generated_spec_for_test(
        kind: GeneratedPruningTableKind,
    ) -> &'static super::GeneratedPruningTableSpec {
        GENERATED_PRUNING_TABLE_SPECS
            .iter()
            .find(|spec| spec.kind == kind)
            .expect("test generated table spec should exist")
    }

    fn update_checksum(bytes: &mut [u8]) {
        let payload_len = bytes.len() - 8;
        let checksum = pruning_checksum(&bytes[..payload_len]);
        bytes[payload_len..].copy_from_slice(&checksum.to_le_bytes());
    }

    fn temp_test_dir(name: &str) -> PathBuf {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time should be after UNIX epoch")
            .as_nanos();

        std::env::temp_dir().join(format!(
            "cube-engine-pruning-{name}-{}-{nonce}",
            std::process::id()
        ))
    }

    fn phase1_coordinates(cube: &Cube) -> [usize; 3] {
        [
            corner_orientation_coordinate(cube.state())
                .expect("fixture cube should have a valid corner-orientation coordinate"),
            edge_orientation_coordinate(cube.state())
                .expect("fixture cube should have a valid edge-orientation coordinate"),
            ud_slice_edge_combination_coordinate(cube.state())
                .expect("fixture cube should have a valid UD-slice coordinate"),
        ]
    }
}
