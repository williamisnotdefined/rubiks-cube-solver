use std::path::Path;
use std::sync::Arc;

use cube_engine::GeneratedTwoPhaseSolver;

#[derive(Clone)]
pub struct ApiState {
    pub(crate) generated_solver: Option<Arc<GeneratedTwoPhaseSolver>>,
}

impl ApiState {
    pub fn without_generated_solver() -> Self {
        Self {
            generated_solver: None,
        }
    }

    pub fn load_generated_solver(directory: impl AsRef<Path>) -> Result<Self, String> {
        let solver = GeneratedTwoPhaseSolver::load_from_dir(directory.as_ref())
            .map_err(|error| error.to_string())?;

        Ok(Self {
            generated_solver: Some(Arc::new(solver)),
        })
    }

    pub fn generated_solver_ready(&self) -> bool {
        self.generated_solver.is_some()
    }
}
