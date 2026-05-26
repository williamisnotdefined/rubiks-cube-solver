use std::collections::BTreeMap;
use std::fmt;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum PruningPhaseRole {
    Phase1,
    Phase2,
}

impl PruningPhaseRole {
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
pub struct PruningTable {
    metadata: PruningTableMetadata,
    entries: BTreeMap<usize, u8>,
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

        Ok(Self { metadata, entries })
    }

    pub fn metadata(&self) -> &PruningTableMetadata {
        &self.metadata
    }

    pub fn entry_count(&self) -> usize {
        self.entries.len()
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

        self.entries
            .get(&index)
            .copied()
            .ok_or(PruningLookupError::MissingEntry { index })
    }
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

#[cfg(test)]
mod tests {
    use super::{
        PruningCoordinate, PruningFixtureError, PruningGenerationParameters, PruningLookupError,
        PruningMetadataError, PruningPhaseRole, PruningTable, PruningTableMetadata,
    };
    use crate::cube::coordinates::{
        corner_orientation_coordinate, edge_orientation_coordinate,
        ud_slice_edge_combination_coordinate, CORNER_ORIENTATION_COORDINATE_COUNT,
        EDGE_ORIENTATION_COORDINATE_COUNT, UD_SLICE_EDGE_COMBINATION_COORDINATE_COUNT,
    };
    use crate::cube::{Cube, Move};

    const TINY_PHASE1_DEPTH1_FIXTURE: &str =
        include_str!("../../tests/fixtures/pruning_tables/tiny_phase1_depth1.txt");

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

    fn tiny_fixture_table() -> PruningTable {
        PruningTable::from_fixture_str(TINY_PHASE1_DEPTH1_FIXTURE)
            .expect("tiny phase-1 pruning fixture should parse")
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
