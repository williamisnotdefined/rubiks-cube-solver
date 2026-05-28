mod artifact;
mod errors;
mod fixture;
mod generation;
mod metadata;
mod table;

pub use errors::{
    PruningArtifactError, PruningCompactEntryError, PruningDenseTableError, PruningFixtureError,
    PruningGenerationError, PruningLookupError, PruningMetadataError, PruningTableCommandError,
};
pub use generation::{
    generate_all_pruning_tables, GeneratedPruningTableKind, GeneratedPruningTableSpec,
    GENERATED_PRUNING_TABLE_SPECS,
};
pub use metadata::{
    PruningCoordinate, PruningGenerationParameters, PruningPhaseRole, PruningTableMetadata,
};
pub use table::PruningTable;

#[cfg(test)]
use artifact::{pruning_checksum, push_string, push_u16, push_u64, push_u8, ARTIFACT_MAGIC};

pub const PRUNING_TABLE_FORMAT_VERSION: u16 = 2;
pub const DEFAULT_PRUNING_TABLE_DIR: &str = "crates/cube-engine/pruning-tables";

const UNREACHED_DISTANCE: u8 = u8::MAX;

#[cfg(test)]
mod tests {
    use super::{
        pruning_checksum, GeneratedPruningTableKind, PruningArtifactError,
        PruningCompactEntryError, PruningCoordinate, PruningDenseTableError, PruningFixtureError,
        PruningGenerationParameters, PruningLookupError, PruningMetadataError, PruningPhaseRole,
        PruningTable, PruningTableMetadata, GENERATED_PRUNING_TABLE_SPECS,
        PRUNING_TABLE_FORMAT_VERSION,
    };
    use crate::cube::coordinates::{
        corner_orientation_coordinate, edge_orientation_coordinate,
        ud_slice_edge_combination_coordinate, CORNER_ORIENTATION_COORDINATE_COUNT,
        EDGE_ORIENTATION_COORDINATE_COUNT, UD_SLICE_EDGE_COMBINATION_COORDINATE_COUNT,
    };
    use crate::cube::{Cube, Move};
    use std::fs;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    const TINY_PHASE1_DEPTH1_FIXTURE: &str =
        include_str!("../../tests/fixtures/pruning_tables/tiny_phase1_depth1.txt");
    const TINY_PHASE2_DEPTH0_FIXTURE: &str =
        include_str!("../../tests/fixtures/pruning_tables/tiny_phase2_depth0.txt");

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
    fn phase2_fixture_metadata_records_pruning_table_boundary() {
        let table = PruningTable::from_fixture_str(TINY_PHASE2_DEPTH0_FIXTURE)
            .expect("tiny phase-2 pruning fixture should parse");
        let metadata = table.metadata();

        assert_eq!(metadata.format_version, 1);
        assert_eq!(metadata.table_version, "tiny-phase2-depth0-v1");
        assert_eq!(metadata.phase_role, PruningPhaseRole::Phase2);
        assert_eq!(metadata.generation.max_depth, 0);
        assert_eq!(metadata.generation.move_set, "phase2-g1-metric-depth0");
        assert_eq!(
            metadata.coordinates,
            vec![
                PruningCoordinate::new("corner_permutation", 40320),
                PruningCoordinate::new("slice_edge_permutation", 24),
            ]
        );
        assert_eq!(table.checked_lookup_index(metadata, 0), Ok(0));
        assert_eq!(table.entry_count(), 1);
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
    fn public_coordinate_decomposition_reports_checked_errors() {
        let metadata = PruningTableMetadata::new(
            PRUNING_TABLE_FORMAT_VERSION,
            "checked-coordinate-test-v1",
            PruningPhaseRole::Phase1,
            vec![
                PruningCoordinate::new("first", 2),
                PruningCoordinate::new("second", 3),
            ],
            PruningGenerationParameters::new(1, "test-moves", "unit test"),
        );

        assert_eq!(metadata.coordinates_from_index(5), Ok(vec![1, 2]));
        assert_eq!(
            metadata.coordinates_from_index(6),
            Err(PruningLookupError::IndexOutOfRange {
                index: 6,
                table_size: 6,
            })
        );

        let invalid_metadata = PruningTableMetadata::new(
            PRUNING_TABLE_FORMAT_VERSION,
            "invalid-coordinate-test-v1",
            PruningPhaseRole::Phase1,
            Vec::new(),
            PruningGenerationParameters::new(1, "test-moves", "unit test"),
        );

        assert_eq!(
            invalid_metadata.coordinates_from_index(0),
            Err(PruningLookupError::InvalidMetadata {
                error: PruningMetadataError::NoCoordinates,
            })
        );
    }

    #[test]
    fn public_lookup_helpers_report_checked_errors() {
        let metadata = PruningTableMetadata::new(
            PRUNING_TABLE_FORMAT_VERSION,
            "checked-lookup-test-v1",
            PruningPhaseRole::Phase1,
            vec![PruningCoordinate::new("coordinate", 2)],
            PruningGenerationParameters::new(1, "test-moves", "unit test"),
        );
        let table = PruningTable::from_dense_entries(metadata, vec![0, u8::MAX])
            .expect("dense checked-lookup table should build");

        assert_eq!(table.checked_lookup_coordinates(&[0]), Ok(0));
        assert_eq!(
            table.checked_lookup_coordinates(&[1]),
            Err(PruningLookupError::MissingEntry { index: 1 })
        );
        assert_eq!(
            table.checked_lookup_coordinates(&[2]),
            Err(PruningLookupError::CoordinateOutOfRange {
                coordinate: "coordinate".to_owned(),
                index: 2,
                dimension: 2,
            })
        );
        assert_eq!(
            table.lookup_index(2),
            Err(PruningLookupError::IndexOutOfRange {
                index: 2,
                table_size: 2,
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

    #[test]
    fn compact_artifact_round_trips_with_metadata_and_lookup() {
        let path = PathBuf::from("test-table.rpt");
        let metadata = PruningTableMetadata::new(
            PRUNING_TABLE_FORMAT_VERSION,
            "compact-test-v1",
            PruningPhaseRole::Phase1,
            vec![PruningCoordinate::new("test", 3)],
            PruningGenerationParameters::new(2, "test-moves", "unit test"),
        );
        let table = PruningTable::from_dense_entries(metadata.clone(), vec![0, 1, u8::MAX])
            .expect("dense test table should build");
        let bytes = table
            .to_artifact_bytes(&path)
            .expect("dense test table should serialize");
        let loaded = PruningTable::from_artifact_bytes(&path, &bytes)
            .expect("compact test table should load");

        assert_eq!(loaded.metadata(), &metadata);
        assert!(!loaded.is_dense());
        assert!(!loaded.is_complete());
        assert_eq!(loaded.entry_count(), 2);
        assert_eq!(loaded.lookup_index(0), Ok(0));
        assert_eq!(loaded.lookup_index(1), Ok(1));
        assert_eq!(
            loaded.lookup_index(2),
            Err(PruningLookupError::MissingEntry { index: 2 })
        );

        let dense = loaded
            .into_dense()
            .expect("loaded compact table should expand to dense entries");
        assert!(dense.is_dense());
        assert_eq!(dense.entry_count(), 2);
        assert_eq!(dense.lookup_index(0), Ok(0));
        assert_eq!(dense.lookup_index(1), Ok(1));
        assert_eq!(
            dense.lookup_index(2),
            Err(PruningLookupError::MissingEntry { index: 2 })
        );
    }

    #[test]
    fn compact_artifact_is_smaller_than_sparse_coordinate_space() {
        let path = PathBuf::from("compact-large-coordinate-space.rpt");
        let table = PruningTable::from_fixture_str(
            "format_version=2\n\
             table_version=compact-large-test-v1\n\
             phase_role=phase1\n\
             max_depth=1\n\
             move_set=test-moves\n\
             source=unit test\n\
             coordinate=large_coordinate:1000000\n\
             entries:\n\
             0=0\n\
             999999=1\n",
        )
        .expect("compact sparse fixture should parse");
        let bytes = table
            .to_artifact_bytes(&path)
            .expect("compact sparse fixture should serialize");

        assert!(
            bytes.len()
                < table
                    .metadata()
                    .table_size()
                    .expect("metadata should be valid"),
            "compact artifact should be smaller than a dense coordinate-space payload"
        );
        assert_eq!(
            PruningTable::from_artifact_bytes(&path, &bytes)
                .expect("compact artifact should load")
                .entry_count(),
            2
        );
    }

    #[test]
    fn dense_artifact_rejects_distance_above_max_depth() {
        let metadata = PruningTableMetadata::new(
            PRUNING_TABLE_FORMAT_VERSION,
            "dense-test-v1",
            PruningPhaseRole::Phase1,
            vec![PruningCoordinate::new("test", 2)],
            PruningGenerationParameters::new(1, "test-moves", "unit test"),
        );

        assert_eq!(
            PruningTable::from_dense_entries(metadata, vec![0, 2]),
            Err(PruningDenseTableError::DistanceExceedsMaxDepth {
                index: 1,
                distance: 2,
                max_depth: 1,
            })
        );
    }

    #[test]
    fn generated_table_artifact_bytes_are_deterministic() {
        let spec = generated_spec_for_test(
            GeneratedPruningTableKind::Phase2CornerPermutationSliceEdgePermutation,
        );
        let first = spec
            .generate(1)
            .expect("phase-2 generated table should build to depth one");
        let second = spec
            .generate(1)
            .expect("phase-2 generated table should build deterministically");
        let path = PathBuf::from(spec.file_name);

        assert_eq!(first.metadata(), second.metadata());
        assert_eq!(first.entry_count(), second.entry_count());
        assert_eq!(
            first
                .to_artifact_bytes(&path)
                .expect("first artifact should serialize"),
            second
                .to_artifact_bytes(&path)
                .expect("second artifact should serialize")
        );
    }

    #[test]
    fn generated_artifact_rejects_checksum_corruption() {
        let path = PathBuf::from("corrupt-checksum.rpt");
        let metadata = PruningTableMetadata::new(
            PRUNING_TABLE_FORMAT_VERSION,
            "dense-test-v1",
            PruningPhaseRole::Phase1,
            vec![PruningCoordinate::new("test", 2)],
            PruningGenerationParameters::new(1, "test-moves", "unit test"),
        );
        let table = PruningTable::from_dense_entries(metadata, vec![0, 1])
            .expect("dense test table should build");
        let mut bytes = table
            .to_artifact_bytes(&path)
            .expect("dense test table should serialize");
        bytes[12] ^= 0x01;

        assert!(matches!(
            PruningTable::from_artifact_bytes(&path, &bytes),
            Err(PruningArtifactError::ChecksumMismatch { .. })
        ));
    }

    #[test]
    fn generated_artifact_rejects_corrupt_header_after_checksum_update() {
        let path = PathBuf::from("corrupt-header.rpt");
        let metadata = PruningTableMetadata::new(
            PRUNING_TABLE_FORMAT_VERSION,
            "dense-test-v1",
            PruningPhaseRole::Phase1,
            vec![PruningCoordinate::new("test", 2)],
            PruningGenerationParameters::new(1, "test-moves", "unit test"),
        );
        let table = PruningTable::from_dense_entries(metadata, vec![0, 1])
            .expect("dense test table should build");
        let mut bytes = table
            .to_artifact_bytes(&path)
            .expect("dense test table should serialize");
        bytes[0] = b'X';
        update_checksum(&mut bytes);

        assert!(matches!(
            PruningTable::from_artifact_bytes(&path, &bytes),
            Err(PruningArtifactError::InvalidMagic { .. })
        ));
    }

    #[test]
    fn generated_artifact_rejects_unsupported_format_version_after_checksum_update() {
        let path = PathBuf::from("corrupt-version.rpt");
        let metadata = PruningTableMetadata::new(
            PRUNING_TABLE_FORMAT_VERSION,
            "compact-test-v1",
            PruningPhaseRole::Phase1,
            vec![PruningCoordinate::new("test", 2)],
            PruningGenerationParameters::new(1, "test-moves", "unit test"),
        );
        let table = PruningTable::from_dense_entries(metadata, vec![0, 1])
            .expect("dense test table should build");
        let mut bytes = table
            .to_artifact_bytes(&path)
            .expect("compact test table should serialize");
        bytes[8..10].copy_from_slice(&1_u16.to_le_bytes());
        update_checksum(&mut bytes);

        assert!(matches!(
            PruningTable::from_artifact_bytes(&path, &bytes),
            Err(PruningArtifactError::UnsupportedFormatVersion { version: 1, .. })
        ));
    }

    #[test]
    fn generated_artifact_rejects_entry_count_larger_than_payload_before_allocation() {
        let path = PathBuf::from("entry-count-payload-mismatch.rpt");
        let metadata = compact_test_metadata(1_000_000, 1);
        let bytes = compact_artifact_bytes_with_entry_count(&metadata, 1_000_000, &[]);

        assert_eq!(
            PruningTable::from_artifact_bytes(&path, &bytes),
            Err(PruningArtifactError::UnexpectedEnd {
                path,
                field: "compact_entries",
            })
        );
    }

    #[test]
    fn generated_artifact_rejects_entry_payload_size_overflow_before_allocation() {
        let path = PathBuf::from("entry-count-overflow.rpt");
        let metadata = PruningTableMetadata::new(
            PRUNING_TABLE_FORMAT_VERSION,
            "compact-test-v1",
            PruningPhaseRole::Phase1,
            vec![PruningCoordinate::new("test", usize::MAX)],
            PruningGenerationParameters::new(1, "test-moves", "unit test"),
        );
        let bytes = compact_artifact_bytes_with_entry_count(
            &metadata,
            u64::try_from(usize::MAX).expect("usize should fit in u64"),
            &[],
        );

        assert_eq!(
            PruningTable::from_artifact_bytes(&path, &bytes),
            Err(PruningArtifactError::UnexpectedEnd {
                path,
                field: "compact_entries",
            })
        );
    }

    #[test]
    fn generated_artifact_rejects_out_of_range_compact_entry() {
        let path = PathBuf::from("entry-out-of-range.rpt");
        let metadata = compact_test_metadata(2, 1);
        let bytes = compact_artifact_bytes(&metadata, &[(2, 1)]);

        assert_eq!(
            PruningTable::from_artifact_bytes(&path, &bytes),
            Err(PruningArtifactError::CompactEntries {
                path,
                error: PruningCompactEntryError::EntryIndexOutOfRange {
                    index: 2,
                    table_size: 2,
                },
            })
        );
    }

    #[test]
    fn generated_artifact_rejects_duplicate_compact_entry() {
        let path = PathBuf::from("duplicate-entry.rpt");
        let metadata = compact_test_metadata(3, 1);
        let bytes = compact_artifact_bytes(&metadata, &[(0, 0), (0, 1)]);

        assert_eq!(
            PruningTable::from_artifact_bytes(&path, &bytes),
            Err(PruningArtifactError::CompactEntries {
                path,
                error: PruningCompactEntryError::DuplicateEntry { index: 0 },
            })
        );
    }

    #[test]
    fn generated_artifact_rejects_unsorted_compact_entries() {
        let path = PathBuf::from("unsorted-entry.rpt");
        let metadata = compact_test_metadata(3, 1);
        let bytes = compact_artifact_bytes(&metadata, &[(2, 1), (1, 1)]);

        assert_eq!(
            PruningTable::from_artifact_bytes(&path, &bytes),
            Err(PruningArtifactError::CompactEntries {
                path,
                error: PruningCompactEntryError::EntriesOutOfOrder {
                    previous: 2,
                    index: 1,
                },
            })
        );
    }

    #[test]
    fn generated_artifact_rejects_compact_distance_above_max_depth() {
        let path = PathBuf::from("distance-above-depth.rpt");
        let metadata = compact_test_metadata(2, 1);
        let bytes = compact_artifact_bytes(&metadata, &[(1, 2)]);

        assert_eq!(
            PruningTable::from_artifact_bytes(&path, &bytes),
            Err(PruningArtifactError::CompactEntries {
                path,
                error: PruningCompactEntryError::DistanceExceedsMaxDepth {
                    index: 1,
                    distance: 2,
                    max_depth: 1,
                },
            })
        );
    }

    #[test]
    fn generated_table_validation_rejects_metadata_mismatch() {
        let spec = generated_spec_for_test(
            GeneratedPruningTableKind::Phase2CornerPermutationSliceEdgePermutation,
        );
        let path = PathBuf::from(spec.file_name);
        let mut metadata = spec.metadata(0);
        metadata.generation.source = "wrong source".to_owned();
        let table_size = metadata
            .table_size()
            .expect("spec metadata should be valid");
        let mut entries = vec![u8::MAX; table_size];
        entries[0] = 0;
        let table = PruningTable::from_dense_entries(metadata, entries)
            .expect("metadata mismatch table should build");

        assert!(matches!(
            spec.validate_table(&table, &path),
            Err(PruningArtifactError::SpecMismatch {
                field: "source",
                ..
            })
        ));
    }

    #[test]
    fn missing_artifact_load_is_structured_io_error() {
        let directory = temp_test_dir("missing-artifact");
        fs::create_dir_all(&directory).expect("temp test directory should be created");
        let path = directory.join("missing.rpt");

        assert!(matches!(
            PruningTable::load_artifact(&path),
            Err(PruningArtifactError::Io { .. })
        ));

        let _ = fs::remove_dir_all(directory);
    }

    fn tiny_fixture_table() -> PruningTable {
        PruningTable::from_fixture_str(TINY_PHASE1_DEPTH1_FIXTURE)
            .expect("tiny phase-1 pruning fixture should parse")
    }

    fn generated_spec_for_test(
        kind: GeneratedPruningTableKind,
    ) -> &'static super::GeneratedPruningTableSpec {
        GENERATED_PRUNING_TABLE_SPECS
            .iter()
            .find(|spec| spec.kind == kind)
            .expect("test generated table spec should exist")
    }

    fn compact_test_metadata(dimension: usize, max_depth: u8) -> PruningTableMetadata {
        PruningTableMetadata::new(
            PRUNING_TABLE_FORMAT_VERSION,
            "compact-test-v1",
            PruningPhaseRole::Phase1,
            vec![PruningCoordinate::new("test", dimension)],
            PruningGenerationParameters::new(max_depth, "test-moves", "unit test"),
        )
    }

    fn compact_artifact_bytes(metadata: &PruningTableMetadata, entries: &[(u64, u8)]) -> Vec<u8> {
        compact_artifact_bytes_with_entry_count(metadata, entries.len() as u64, entries)
    }

    fn compact_artifact_bytes_with_entry_count(
        metadata: &PruningTableMetadata,
        entry_count: u64,
        entries: &[(u64, u8)],
    ) -> Vec<u8> {
        let mut bytes = Vec::new();
        bytes.extend_from_slice(&super::ARTIFACT_MAGIC);
        super::push_u16(&mut bytes, metadata.format_version);
        super::push_u8(&mut bytes, metadata.phase_role.artifact_value());
        super::push_u8(&mut bytes, metadata.coordinates.len() as u8);
        super::push_u8(&mut bytes, metadata.generation.max_depth);
        super::push_string(&mut bytes, &metadata.table_version);
        super::push_string(&mut bytes, &metadata.generation.move_set);
        super::push_string(&mut bytes, &metadata.generation.source);

        for coordinate in &metadata.coordinates {
            super::push_string(&mut bytes, &coordinate.name);
            super::push_u64(&mut bytes, coordinate.dimension as u64);
        }

        super::push_u64(&mut bytes, entry_count);
        for (index, distance) in entries {
            super::push_u64(&mut bytes, *index);
            super::push_u8(&mut bytes, *distance);
        }

        let checksum = pruning_checksum(&bytes);
        super::push_u64(&mut bytes, checksum);

        bytes
    }

    fn update_checksum(bytes: &mut [u8]) {
        let payload_len = bytes.len() - 8;
        let checksum = pruning_checksum(&bytes[..payload_len]);
        bytes[payload_len..].copy_from_slice(&checksum.to_le_bytes());
    }

    fn temp_test_dir(name: &str) -> PathBuf {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time should be after UNIX epoch")
            .as_nanos();

        std::env::temp_dir().join(format!(
            "cube-engine-pruning-{name}-{}-{nonce}",
            std::process::id()
        ))
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
