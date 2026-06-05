use std::collections::BTreeMap;

use super::errors::{PruningDenseTableError, PruningLookupError};
use super::metadata::PruningTableMetadata;
use super::UNREACHED_DISTANCE;

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PruningTable {
    pub(super) metadata: PruningTableMetadata,
    pub(super) entries: PruningEntries,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub(super) enum PruningEntries {
    Sparse(BTreeMap<usize, u8>),
    Dense(Vec<u8>),
}

impl PruningTable {
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

    pub fn into_dense(self) -> Result<Self, PruningDenseTableError> {
        let Self { metadata, entries } = self;

        match entries {
            PruningEntries::Dense(entries) => Ok(Self {
                metadata,
                entries: PruningEntries::Dense(entries),
            }),
            PruningEntries::Sparse(entries) => {
                let table_size = metadata
                    .table_size()
                    .map_err(|error| PruningDenseTableError::InvalidMetadata { error })?;
                let mut dense_entries = vec![UNREACHED_DISTANCE; table_size];

                for (index, distance) in entries {
                    if let Some(entry) = dense_entries.get_mut(index) {
                        *entry = distance;
                    }
                }

                Self::from_dense_entries(metadata, dense_entries)
            }
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
        match &self.entries {
            PruningEntries::Sparse(entries) => {
                let table_size = self
                    .metadata
                    .table_size()
                    .map_err(|error| PruningLookupError::InvalidMetadata { error })?;

                if index >= table_size {
                    return Err(PruningLookupError::IndexOutOfRange { index, table_size });
                }

                entries
                    .get(&index)
                    .copied()
                    .ok_or(PruningLookupError::MissingEntry { index })
            }
            PruningEntries::Dense(entries) => match entries.get(index).copied() {
                Some(UNREACHED_DISTANCE) => Err(PruningLookupError::MissingEntry { index }),
                Some(distance) => Ok(distance),
                None => Err(PruningLookupError::IndexOutOfRange {
                    index,
                    table_size: entries.len(),
                }),
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
