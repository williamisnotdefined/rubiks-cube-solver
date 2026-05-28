use std::path::{Path, PathBuf};

use crate::search::pruning::{
    GeneratedPruningTableKind, GeneratedPruningTableSpec, PruningArtifactError, PruningTable,
    GENERATED_PRUNING_TABLE_SPECS,
};

use super::GeneratedTwoPhaseError;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct GeneratedPruningTableArtifact<'a> {
    pub available: bool,
    pub bytes: &'a [u8],
}

impl<'a> GeneratedPruningTableArtifact<'a> {
    pub const fn available(bytes: &'a [u8]) -> Self {
        Self {
            available: true,
            bytes,
        }
    }

    pub const fn unavailable() -> Self {
        Self {
            available: false,
            bytes: &[],
        }
    }
}

pub(super) fn load_generated_table_from_dir(
    directory: &Path,
    kind: GeneratedPruningTableKind,
) -> Result<PruningTable, GeneratedTwoPhaseError> {
    let spec = generated_spec(kind)?;
    let path = spec.file_path(directory);
    let table = match PruningTable::load_artifact(&path) {
        Ok(table) => table,
        Err(error) if pruning_artifact_is_unavailable(&error) => {
            return Err(GeneratedTwoPhaseError::TableUnavailable {
                table: spec.table_name,
                path,
                error: Box::new(error),
            });
        }
        Err(error) => {
            return Err(GeneratedTwoPhaseError::TableCorrupt {
                table: spec.table_name,
                path,
                error: Box::new(error),
            });
        }
    };
    validate_generated_table(spec, &path, table)
}

pub(super) fn load_generated_table_from_artifacts(
    artifacts: &[GeneratedPruningTableArtifact<'_>],
    kind: GeneratedPruningTableKind,
) -> Result<PruningTable, GeneratedTwoPhaseError> {
    let (index, spec) = generated_spec_with_index(kind)?;
    let path = PathBuf::from(spec.file_name);
    let Some(artifact) = artifacts.get(index) else {
        return Err(GeneratedTwoPhaseError::TableMissing {
            table: spec.table_name,
            path,
        });
    };

    if !artifact.available {
        return Err(GeneratedTwoPhaseError::TableMissing {
            table: spec.table_name,
            path,
        });
    }

    let table = PruningTable::from_artifact_bytes(&path, artifact.bytes).map_err(|error| {
        GeneratedTwoPhaseError::TableCorrupt {
            table: spec.table_name,
            path: path.clone(),
            error: Box::new(error),
        }
    })?;

    validate_generated_table(spec, &path, table)
}

fn validate_generated_table(
    spec: &GeneratedPruningTableSpec,
    path: &Path,
    table: PruningTable,
) -> Result<PruningTable, GeneratedTwoPhaseError> {
    spec.validate_table(&table, path).map_err(|error| {
        GeneratedTwoPhaseError::TableIncompatible {
            table: spec.table_name,
            path: path.to_path_buf(),
            error: Box::new(error),
        }
    })?;

    table
        .into_dense()
        .map_err(|error| GeneratedTwoPhaseError::Coordinate {
            phase: "generated_table_load",
            error: error.to_string(),
        })
}

fn pruning_artifact_is_unavailable(error: &PruningArtifactError) -> bool {
    matches!(error, PruningArtifactError::Io { .. })
}

fn generated_spec(
    kind: GeneratedPruningTableKind,
) -> Result<&'static GeneratedPruningTableSpec, GeneratedTwoPhaseError> {
    generated_spec_with_index(kind).map(|(_, spec)| spec)
}

fn generated_spec_with_index(
    kind: GeneratedPruningTableKind,
) -> Result<(usize, &'static GeneratedPruningTableSpec), GeneratedTwoPhaseError> {
    GENERATED_PRUNING_TABLE_SPECS
        .iter()
        .enumerate()
        .find(|(_, spec)| spec.kind == kind)
        .ok_or(GeneratedTwoPhaseError::MissingSpec { kind })
}
