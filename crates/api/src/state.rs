use std::path::{Path, PathBuf};
use std::sync::Arc;

use cube_engine::puzzles::cube2::{cube2_pdb_heuristic, Cube2};
use cube_engine::GeneratedTwoPhaseSolver;
use tokio::sync::{OwnedSemaphorePermit, Semaphore};

use crate::{DEFAULT_PRUNING_TABLE_DIR, DEFAULT_SOLVER_MAX_CONCURRENCY, DEFAULT_VISION_URL};

#[derive(Clone)]
pub struct ApiState {
    pub(crate) generated_solver: Option<Arc<GeneratedTwoPhaseSolver>>,
    pub(crate) pruning_table_dir: PathBuf,
    pub(crate) solver_permits: Arc<Semaphore>,
    pub(crate) vision_url: String,
}

impl ApiState {
    pub fn without_generated_solver() -> Self {
        Self {
            generated_solver: None,
            pruning_table_dir: PathBuf::from(DEFAULT_PRUNING_TABLE_DIR),
            solver_permits: Arc::new(Semaphore::new(DEFAULT_SOLVER_MAX_CONCURRENCY)),
            vision_url: DEFAULT_VISION_URL.to_owned(),
        }
    }

    pub fn load_generated_solver(directory: impl AsRef<Path>) -> Result<Self, String> {
        Self::load_generated_solver_with_vision_url(directory, DEFAULT_VISION_URL)
    }

    pub fn load_generated_solver_with_vision_url(
        directory: impl AsRef<Path>,
        vision_url: impl Into<String>,
    ) -> Result<Self, String> {
        let directory = directory.as_ref();
        let solver =
            GeneratedTwoPhaseSolver::load_from_dir(directory).map_err(|error| error.to_string())?;
        let _ = cube2_pdb_heuristic(&Cube2::solved());

        Ok(Self {
            generated_solver: Some(Arc::new(solver)),
            pruning_table_dir: directory.to_path_buf(),
            solver_permits: Arc::new(Semaphore::new(DEFAULT_SOLVER_MAX_CONCURRENCY)),
            vision_url: vision_url.into(),
        })
    }

    pub fn with_vision_url(mut self, vision_url: impl Into<String>) -> Self {
        self.vision_url = vision_url.into();
        self
    }

    pub fn with_solver_max_concurrency(mut self, max_concurrency: usize) -> Self {
        self.solver_permits = Arc::new(Semaphore::new(max_concurrency.max(1)));
        self
    }

    pub(crate) fn try_acquire_solver_permit(&self) -> Option<OwnedSemaphorePermit> {
        self.solver_permits.clone().try_acquire_owned().ok()
    }

    pub fn generated_solver_ready(&self) -> bool {
        self.generated_solver.is_some()
    }
}
