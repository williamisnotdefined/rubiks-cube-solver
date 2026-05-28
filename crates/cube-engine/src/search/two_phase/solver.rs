use std::path::Path;

use crate::cube::Cube;
use crate::search::solution::{SearchBudget, SearchOutcome};

use super::artifacts::GeneratedPruningTableArtifact;
use super::metrics::GeneratedTwoPhaseSearchResult;
use super::tables::GeneratedPruningTables;
use super::{
    solve_generated_two_phase_multiprobe_with_tables,
    solve_generated_two_phase_quality_schedule_with_tables, solve_generated_two_phase_with_tables,
    GeneratedTwoPhaseError,
};

pub fn solve_generated_two_phase(
    start: &Cube,
    budget: SearchBudget,
    table_dir: &Path,
) -> Result<SearchOutcome, GeneratedTwoPhaseError> {
    let solver = GeneratedTwoPhaseSolver::load_from_dir(table_dir)?;

    solver.solve(start, budget).map(|result| result.outcome)
}

pub fn solve_generated_two_phase_quality(
    start: &Cube,
    budget: SearchBudget,
    table_dir: &Path,
) -> Result<SearchOutcome, GeneratedTwoPhaseError> {
    let solver = GeneratedTwoPhaseSolver::load_from_dir(table_dir)?;

    solver
        .solve_quality(start, budget)
        .map(|result| result.outcome)
}

pub fn solve_generated_two_phase_multiprobe(
    start: &Cube,
    budget: SearchBudget,
    table_dir: &Path,
) -> Result<SearchOutcome, GeneratedTwoPhaseError> {
    let solver = GeneratedTwoPhaseSolver::load_from_dir(table_dir)?;

    solver
        .solve_multiprobe(start, budget)
        .map(|result| result.outcome)
}

pub fn solve_generated_two_phase_with_artifacts(
    start: &Cube,
    budget: SearchBudget,
    artifacts: &[GeneratedPruningTableArtifact<'_>],
) -> Result<SearchOutcome, GeneratedTwoPhaseError> {
    let solver = GeneratedTwoPhaseSolver::load_from_artifacts(artifacts)?;

    solver.solve(start, budget).map(|result| result.outcome)
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct GeneratedTwoPhaseSolver {
    tables: GeneratedPruningTables,
}

impl GeneratedTwoPhaseSolver {
    pub fn load_from_dir(directory: &Path) -> Result<Self, GeneratedTwoPhaseError> {
        Ok(Self {
            tables: GeneratedPruningTables::load_from_dir(directory)?,
        })
    }

    pub fn load_from_artifacts(
        artifacts: &[GeneratedPruningTableArtifact<'_>],
    ) -> Result<Self, GeneratedTwoPhaseError> {
        Ok(Self {
            tables: GeneratedPruningTables::load_from_artifacts(artifacts)?,
        })
    }

    pub fn solve(
        &self,
        start: &Cube,
        budget: SearchBudget,
    ) -> Result<GeneratedTwoPhaseSearchResult, GeneratedTwoPhaseError> {
        solve_generated_two_phase_with_tables(start, budget, &self.tables)
    }

    pub fn solve_quality(
        &self,
        start: &Cube,
        budget: SearchBudget,
    ) -> Result<GeneratedTwoPhaseSearchResult, GeneratedTwoPhaseError> {
        solve_generated_two_phase_quality_schedule_with_tables(start, budget, &self.tables)
    }

    pub fn solve_multiprobe(
        &self,
        start: &Cube,
        budget: SearchBudget,
    ) -> Result<GeneratedTwoPhaseSearchResult, GeneratedTwoPhaseError> {
        solve_generated_two_phase_multiprobe_with_tables(start, budget, &self.tables)
    }
}
