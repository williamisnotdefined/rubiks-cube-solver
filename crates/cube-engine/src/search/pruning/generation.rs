mod existing;
mod representatives;
mod specs;

use std::collections::VecDeque;
use std::fs;
use std::path::{Path, PathBuf};

use existing::existing_generated_table_matches;
use specs::ARTIFACT_GENERATION_SOURCE;
pub use specs::{
    GeneratedPruningTableKind, GeneratedPruningTableSpec, GENERATED_PRUNING_TABLE_SPECS,
};

use super::artifact::compact_entries_from_table;
use super::errors::{PruningArtifactError, PruningGenerationError, PruningTableCommandError};
use super::metadata::PruningPhaseRole;
use super::table::PruningTable;
use super::{PRUNING_TABLE_FORMAT_VERSION, UNREACHED_DISTANCE};

impl GeneratedPruningTableSpec {
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
        if metadata.generation.source != ARTIFACT_GENERATION_SOURCE {
            return Err(spec_mismatch(
                path,
                self,
                "source",
                ARTIFACT_GENERATION_SOURCE.to_owned(),
                metadata.generation.source.clone(),
            ));
        }
        compact_entries_from_table(table).map_err(|error| {
            PruningArtifactError::CompactEntries {
                path: path.to_path_buf(),
                error,
            }
        })?;

        Ok(())
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
        if existing_generated_table_matches(spec, &path, max_depth) {
            paths.push(path);
            continue;
        }

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
