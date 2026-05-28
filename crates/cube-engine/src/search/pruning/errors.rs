use std::fmt;
use std::path::PathBuf;

use crate::cube::CubeValidationError;

use super::metadata::PruningTableMetadata;

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
                write!(formatter, "pruning table has no entry for index {index}")
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
pub enum PruningCompactEntryError {
    InvalidMetadata {
        error: PruningMetadataError,
    },
    MaxDepthUsesSentinel,
    EntryCountExceedsTableSize {
        entry_count: u64,
        table_size: usize,
    },
    EntryAllocationFailed {
        entry_count: u64,
    },
    EntryIndexOutOfRange {
        index: u64,
        table_size: usize,
    },
    DuplicateEntry {
        index: usize,
    },
    EntriesOutOfOrder {
        previous: usize,
        index: usize,
    },
    DistanceExceedsMaxDepth {
        index: usize,
        distance: u8,
        max_depth: u8,
    },
}

impl fmt::Display for PruningCompactEntryError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidMetadata { error } => write!(formatter, "invalid pruning metadata: {error}"),
            Self::MaxDepthUsesSentinel => formatter.write_str(
                "compact pruning table max depth must be below 255 because 255 marks unreachable entries",
            ),
            Self::EntryCountExceedsTableSize {
                entry_count,
                table_size,
            } => write!(
                formatter,
                "compact pruning table has {entry_count} entries, exceeding table size {table_size}"
            ),
            Self::EntryAllocationFailed { entry_count } => write!(
                formatter,
                "compact pruning table could not reserve {entry_count} entries"
            ),
            Self::EntryIndexOutOfRange { index, table_size } => write!(
                formatter,
                "compact pruning table entry index {index} is outside 0..{table_size}"
            ),
            Self::DuplicateEntry { index } => {
                write!(formatter, "compact pruning table duplicates entry index {index}")
            }
            Self::EntriesOutOfOrder { previous, index } => write!(
                formatter,
                "compact pruning table entry index {index} appears after {previous}; entries must be sorted"
            ),
            Self::DistanceExceedsMaxDepth {
                index,
                distance,
                max_depth,
            } => write!(
                formatter,
                "compact pruning table entry {index} has distance {distance}, exceeding max depth {max_depth}"
            ),
        }
    }
}

impl std::error::Error for PruningCompactEntryError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::InvalidMetadata { error } => Some(error),
            Self::MaxDepthUsesSentinel
            | Self::EntryCountExceedsTableSize { .. }
            | Self::EntryAllocationFailed { .. }
            | Self::EntryIndexOutOfRange { .. }
            | Self::DuplicateEntry { .. }
            | Self::EntriesOutOfOrder { .. }
            | Self::DistanceExceedsMaxDepth { .. } => None,
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
    CompactEntries {
        path: PathBuf,
        error: PruningCompactEntryError,
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
            Self::CompactEntries { path, error } => write!(
                formatter,
                "pruning-table artifact {} has invalid compact entries: {error}",
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
            Self::CompactEntries { error, .. } => Some(error),
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
