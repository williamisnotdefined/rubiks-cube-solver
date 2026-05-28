use std::path::Path;

use super::super::table::PruningTable;
use super::specs::GeneratedPruningTableSpec;

pub(super) fn existing_generated_table_matches(
    spec: GeneratedPruningTableSpec,
    path: &Path,
    max_depth: u8,
) -> bool {
    let Ok(table) = PruningTable::load_artifact(path) else {
        return false;
    };

    spec.validate_table(&table, path).is_ok() && table.metadata().generation.max_depth == max_depth
}
