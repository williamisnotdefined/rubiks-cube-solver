mod classical;
mod errors;
mod fixtures;
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
};
pub use types::{
    QualityExpectation, QualityFixture, QualityFixtureCategory, QualityFixtureExpectations,
    QualityGeneratedTableSummary, QualityInputKind, QualityReport, QualityReportRow,
    QualityReportStatus, QualitySolverSelection, QualityTableStatus,
};

pub const QUALITY_REPORT_PRUNING_TABLE_DIR: &str = "crates/cube-engine/pruning-tables";
