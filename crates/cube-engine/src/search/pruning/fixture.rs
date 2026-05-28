use std::collections::BTreeMap;

use super::errors::PruningFixtureError;
use super::metadata::{
    PruningCoordinate, PruningGenerationParameters, PruningPhaseRole, PruningTableMetadata,
};
use super::table::{PruningEntries, PruningTable};

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
