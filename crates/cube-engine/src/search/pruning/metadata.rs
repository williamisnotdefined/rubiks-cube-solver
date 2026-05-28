use super::errors::{PruningFixtureError, PruningLookupError, PruningMetadataError};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum PruningPhaseRole {
    Phase1,
    Phase2,
}

impl PruningPhaseRole {
    pub(crate) const fn artifact_value(self) -> u8 {
        match self {
            Self::Phase1 => 1,
            Self::Phase2 => 2,
        }
    }

    pub(crate) fn from_artifact_value(value: u8) -> Option<Self> {
        match value {
            1 => Some(Self::Phase1),
            2 => Some(Self::Phase2),
            _ => None,
        }
    }

    pub(crate) fn from_fixture_value(
        line: usize,
        value: &str,
    ) -> Result<Self, PruningFixtureError> {
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
