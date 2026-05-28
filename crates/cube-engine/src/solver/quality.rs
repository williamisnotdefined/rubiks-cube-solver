mod classical;
mod errors;
mod fixtures;
mod hybrid;
mod labels;
mod markdown;
mod runner;
mod summary;
mod tables;
mod types;

pub use errors::QualityReportError;
pub use fixtures::quality_fixtures;
pub use runner::{
    run_quality_report, run_quality_report_for_fixtures,
    run_quality_report_for_fixtures_with_pruning_table_dir,
    run_quality_report_for_fixtures_with_pruning_table_dir_and_hybrid_value_model_path,
    run_quality_report_for_fixtures_with_pruning_table_dir_and_hybrid_value_outputs_path,
    run_quality_report_with_hybrid_value_model_path,
    run_quality_report_with_hybrid_value_outputs_path,
};
pub use types::{
    QualityExpectation, QualityFixture, QualityFixtureCategory, QualityFixtureExpectations,
    QualityGeneratedTableSummary, QualityHybridArtifactStatus, QualityHybridReportRow,
    QualityHybridReportStatus, QualityInputKind, QualityReport, QualityReportRow,
    QualityReportStatus, QualitySolverSelection, QualityTableStatus,
};

pub const QUALITY_REPORT_PRUNING_TABLE_DIR: &str = "crates/cube-engine/pruning-tables";
pub const QUALITY_REPORT_HYBRID_VALUE_OUTPUT_PATH: &str =
    crate::search::DEFAULT_HYBRID_VALUE_OUTPUT_PATH;

const QUALITY_REPORT_HYBRID_VALUE_MODEL_NODE_CAP: usize = 100_000;
const QUALITY_REPORT_HYBRID_VALUE_MODEL_EXPECTED_NOT_FOUND_NODE_CAP: usize = 10_000;
