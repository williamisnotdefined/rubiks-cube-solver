use std::path::{Path, PathBuf};

use crate::search::pruning::DEFAULT_PRUNING_TABLE_DIR;

use super::SolverStrategy;

/// Configuration shared by public solver entry points.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SolverConfig {
    /// Maximum solution depth a solver may explore before reporting a limit failure.
    pub max_depth: usize,
    /// Optional maximum node budget.
    ///
    /// Public solver entry points pass this through to the bounded search budget.
    pub max_nodes: Option<usize>,
    /// Explicit solver path. Constructors default to the bounded product solver.
    pub strategy: SolverStrategy,
    /// Optional directory containing generated pruning-table artifacts.
    ///
    /// When this is `None`, the generated two-phase strategy uses the local ignored default path.
    pub pruning_table_dir: Option<PathBuf>,
}

impl SolverConfig {
    pub const fn new(max_depth: usize) -> Self {
        Self {
            max_depth,
            max_nodes: None,
            strategy: SolverStrategy::BoundedIdaStar,
            pruning_table_dir: None,
        }
    }

    pub const fn with_limits(max_depth: usize, max_nodes: Option<usize>) -> Self {
        Self {
            max_depth,
            max_nodes,
            strategy: SolverStrategy::BoundedIdaStar,
            pruning_table_dir: None,
        }
    }

    pub const fn with_strategy(
        max_depth: usize,
        max_nodes: Option<usize>,
        strategy: SolverStrategy,
    ) -> Self {
        Self {
            max_depth,
            max_nodes,
            strategy,
            pruning_table_dir: None,
        }
    }

    pub fn with_pruning_table_dir(mut self, directory: impl Into<PathBuf>) -> Self {
        self.pruning_table_dir = Some(directory.into());

        self
    }

    pub fn pruning_table_dir(&self) -> &Path {
        self.pruning_table_dir
            .as_deref()
            .unwrap_or_else(|| Path::new(DEFAULT_PRUNING_TABLE_DIR))
    }
}
