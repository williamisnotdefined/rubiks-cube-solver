use std::path::{Path, PathBuf};
use std::sync::Arc;

use cube_engine::GeneratedTwoPhaseSolver;

use crate::DEFAULT_PRUNING_TABLE_DIR;

#[derive(Clone)]
pub struct ApiState {
    pub(crate) generated_solver: Option<Arc<GeneratedTwoPhaseSolver>>,
    pub(crate) pruning_table_dir: PathBuf,
}

impl ApiState {
    pub fn without_generated_solver() -> Self {
        Self {
            generated_solver: None,
            pruning_table_dir: PathBuf::from(DEFAULT_PRUNING_TABLE_DIR),
        }
    }

    pub fn load_generated_solver(directory: impl AsRef<Path>) -> Result<Self, String> {
        let directory = directory.as_ref();
        let solver =
            GeneratedTwoPhaseSolver::load_from_dir(directory).map_err(|error| error.to_string())?;

        Ok(Self {
            generated_solver: Some(Arc::new(solver)),
            pruning_table_dir: directory.to_path_buf(),
        })
    }

    pub fn generated_solver_ready(&self) -> bool {
        self.generated_solver.is_some()
    }
}
