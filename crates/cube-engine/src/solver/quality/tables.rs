use std::path::Path;

use crate::search::pruning::{
    PruningPhaseRole, PruningTable, PruningTableMetadata, GENERATED_PRUNING_TABLE_SPECS,
};

use super::types::QualityGeneratedTableSummary;

pub(super) fn generated_table_summary(
    directory: &Path,
) -> Result<QualityGeneratedTableSummary, ()> {
    let mut phase1_depths = Vec::new();
    let mut phase2_depths = Vec::new();
    let mut format_versions = Vec::new();
    let mut table_versions = Vec::new();
    let mut move_sets = Vec::new();
    let mut sources = Vec::new();
    let mut coordinate_profiles = Vec::new();

    for spec in GENERATED_PRUNING_TABLE_SPECS {
        let path = spec.file_path(directory);
        let table = PruningTable::load_artifact(&path).map_err(|_| ())?;
        spec.validate_table(&table, &path).map_err(|_| ())?;
        let metadata = table.metadata();

        match metadata.phase_role {
            PruningPhaseRole::Phase1 => phase1_depths.push(metadata.generation.max_depth),
            PruningPhaseRole::Phase2 => phase2_depths.push(metadata.generation.max_depth),
        }
        if !format_versions.contains(&metadata.format_version) {
            format_versions.push(metadata.format_version);
        }
        table_versions.push(metadata.table_version.clone());
        if !move_sets.contains(&metadata.generation.move_set) {
            move_sets.push(metadata.generation.move_set.clone());
        }
        if !sources.contains(&metadata.generation.source) {
            sources.push(metadata.generation.source.clone());
        }
        coordinate_profiles.push(format!(
            "{}[{}]",
            metadata.table_version,
            coordinate_profile_label(metadata)
        ));
    }

    Ok(QualityGeneratedTableSummary {
        depths: format!(
            "phase1={};phase2={}",
            u8_list_label(&phase1_depths),
            u8_list_label(&phase2_depths)
        ),
        metadata: format!(
            "format={};tables={};versions={};move_sets={};sources={};coordinates={}",
            u16_list_label(&format_versions),
            GENERATED_PRUNING_TABLE_SPECS.len(),
            table_versions.join(","),
            move_sets.join(","),
            sources.join(","),
            coordinate_profiles.join(",")
        ),
    })
}

fn coordinate_profile_label(metadata: &PruningTableMetadata) -> String {
    metadata
        .coordinates
        .iter()
        .map(|coordinate| format!("{}:{}", coordinate.name, coordinate.dimension))
        .collect::<Vec<_>>()
        .join("+")
}

fn u8_list_label(values: &[u8]) -> String {
    values
        .iter()
        .map(u8::to_string)
        .collect::<Vec<_>>()
        .join("/")
}

fn u16_list_label(values: &[u16]) -> String {
    values
        .iter()
        .map(u16::to_string)
        .collect::<Vec<_>>()
        .join("/")
}
