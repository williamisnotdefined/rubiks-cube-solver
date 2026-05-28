use std::fs;
use std::path::Path;

use super::errors::{PruningArtifactError, PruningCompactEntryError, PruningMetadataError};
use super::metadata::{
    PruningCoordinate, PruningGenerationParameters, PruningPhaseRole, PruningTableMetadata,
};
use super::table::{PruningEntries, PruningTable};
use super::{PRUNING_TABLE_FORMAT_VERSION, UNREACHED_DISTANCE};

pub(super) const ARTIFACT_MAGIC: [u8; 8] = *b"RCPRTB1\0";

const CHECKSUM_OFFSET_BASIS: u64 = 0xcbf2_9ce4_8422_2325;
const CHECKSUM_PRIME: u64 = 0x0000_0100_0000_01b3;
const COMPACT_ENTRY_BYTES: u64 = 9;

impl PruningTable {
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
        let compact_entries = compact_entries_from_table(self).map_err(|error| {
            PruningArtifactError::CompactEntries {
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

        push_u64(&mut bytes, compact_entries.len() as u64);
        for (index, distance) in compact_entries {
            push_u64(&mut bytes, index as u64);
            push_u8(&mut bytes, distance);
        }
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
                    PruningArtifactError::CompactEntries {
                        path: path.to_path_buf(),
                        error: PruningCompactEntryError::InvalidMetadata {
                            error: PruningMetadataError::TableSizeOverflow,
                        },
                    }
                })?;
            coordinates.push(PruningCoordinate::new(name, dimension));
        }

        let metadata = PruningTableMetadata::new(
            format_version,
            table_version,
            phase_role,
            coordinates,
            PruningGenerationParameters::new(max_depth, move_set, source),
        );
        let entry_count = cursor.read_u64("entry_count")?;
        let entries = read_compact_entries(path, &metadata, entry_count, &mut cursor)?;
        let trailing = cursor.remaining_len();
        if trailing != 0 {
            return Err(PruningArtifactError::TrailingBytes {
                path: path.to_path_buf(),
                trailing,
            });
        }

        Ok(Self {
            metadata,
            entries: PruningEntries::Sparse(entries.into_iter().collect()),
        })
    }
}

pub(super) fn compact_entries_from_table(
    table: &PruningTable,
) -> Result<Vec<(usize, u8)>, PruningCompactEntryError> {
    let entries = match &table.entries {
        PruningEntries::Sparse(entries) => entries
            .iter()
            .map(|(index, distance)| (*index, *distance))
            .collect::<Vec<_>>(),
        PruningEntries::Dense(entries) => entries
            .iter()
            .copied()
            .enumerate()
            .filter_map(|(index, distance)| {
                (distance != UNREACHED_DISTANCE).then_some((index, distance))
            })
            .collect::<Vec<_>>(),
    };

    validate_compact_entries(&table.metadata, &entries)?;

    Ok(entries)
}

fn read_compact_entries(
    path: &Path,
    metadata: &PruningTableMetadata,
    entry_count: u64,
    cursor: &mut ArtifactCursor<'_>,
) -> Result<Vec<(usize, u8)>, PruningArtifactError> {
    let table_size = metadata.table_size().map_err(|error| {
        compact_entries_artifact_error(path, PruningCompactEntryError::InvalidMetadata { error })
    })?;
    let table_size_u64 = u64::try_from(table_size).map_err(|_| {
        compact_entries_artifact_error(
            path,
            PruningCompactEntryError::InvalidMetadata {
                error: PruningMetadataError::TableSizeOverflow,
            },
        )
    })?;

    if entry_count > table_size_u64 {
        return Err(compact_entries_artifact_error(
            path,
            PruningCompactEntryError::EntryCountExceedsTableSize {
                entry_count,
                table_size,
            },
        ));
    }

    let required_payload_bytes = entry_count
        .checked_mul(COMPACT_ENTRY_BYTES)
        .ok_or_else(|| PruningArtifactError::UnexpectedEnd {
            path: path.to_path_buf(),
            field: "compact_entries",
        })?;
    if required_payload_bytes > cursor.remaining_len() as u64 {
        return Err(PruningArtifactError::UnexpectedEnd {
            path: path.to_path_buf(),
            field: "compact_entries",
        });
    }

    let entry_capacity = usize::try_from(entry_count).map_err(|_| {
        compact_entries_artifact_error(
            path,
            PruningCompactEntryError::EntryCountExceedsTableSize {
                entry_count,
                table_size,
            },
        )
    })?;
    let mut entries = Vec::new();
    entries.try_reserve(entry_capacity).map_err(|_| {
        compact_entries_artifact_error(
            path,
            PruningCompactEntryError::EntryAllocationFailed { entry_count },
        )
    })?;

    for _ in 0..entry_count {
        let raw_index = cursor.read_u64("entry.index")?;
        let index = usize::try_from(raw_index).map_err(|_| {
            compact_entries_artifact_error(
                path,
                PruningCompactEntryError::EntryIndexOutOfRange {
                    index: raw_index,
                    table_size,
                },
            )
        })?;
        let distance = cursor.read_u8("entry.distance")?;
        entries.push((index, distance));
    }

    validate_compact_entries(metadata, &entries)
        .map_err(|error| compact_entries_artifact_error(path, error))?;

    Ok(entries)
}

fn validate_compact_entries(
    metadata: &PruningTableMetadata,
    entries: &[(usize, u8)],
) -> Result<(), PruningCompactEntryError> {
    if metadata.generation.max_depth == UNREACHED_DISTANCE {
        return Err(PruningCompactEntryError::MaxDepthUsesSentinel);
    }

    let table_size = metadata
        .table_size()
        .map_err(|error| PruningCompactEntryError::InvalidMetadata { error })?;
    let entry_count = u64::try_from(entries.len()).unwrap_or(u64::MAX);

    if entries.len() > table_size {
        return Err(PruningCompactEntryError::EntryCountExceedsTableSize {
            entry_count,
            table_size,
        });
    }

    let mut previous = None;
    for &(index, distance) in entries {
        if index >= table_size {
            return Err(PruningCompactEntryError::EntryIndexOutOfRange {
                index: index as u64,
                table_size,
            });
        }

        if let Some(previous_index) = previous {
            if index == previous_index {
                return Err(PruningCompactEntryError::DuplicateEntry { index });
            }

            if index < previous_index {
                return Err(PruningCompactEntryError::EntriesOutOfOrder {
                    previous: previous_index,
                    index,
                });
            }
        }

        if distance > metadata.generation.max_depth {
            return Err(PruningCompactEntryError::DistanceExceedsMaxDepth {
                index,
                distance,
                max_depth: metadata.generation.max_depth,
            });
        }

        previous = Some(index);
    }

    Ok(())
}

fn compact_entries_artifact_error(
    path: &Path,
    error: PruningCompactEntryError,
) -> PruningArtifactError {
    PruningArtifactError::CompactEntries {
        path: path.to_path_buf(),
        error,
    }
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

pub(super) fn push_u8(bytes: &mut Vec<u8>, value: u8) {
    bytes.push(value);
}

pub(super) fn push_u16(bytes: &mut Vec<u8>, value: u16) {
    bytes.extend_from_slice(&value.to_le_bytes());
}

pub(super) fn push_u64(bytes: &mut Vec<u8>, value: u64) {
    bytes.extend_from_slice(&value.to_le_bytes());
}

pub(super) fn push_string(bytes: &mut Vec<u8>, value: &str) {
    let length = u16::try_from(value.len()).unwrap_or(u16::MAX);
    push_u16(bytes, length);
    bytes.extend_from_slice(&value.as_bytes()[..usize::from(length)]);
}

pub(super) fn pruning_checksum(bytes: &[u8]) -> u64 {
    bytes.iter().fold(CHECKSUM_OFFSET_BASIS, |checksum, byte| {
        (checksum ^ u64::from(*byte)).wrapping_mul(CHECKSUM_PRIME)
    })
}
