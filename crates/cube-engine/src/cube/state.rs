use super::cubies::CubieState;
use super::moves::Move;

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Cube {
    state: CubieState,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum MoveApplicationError {
    MoveTablesNotImplemented(Move),
}

impl Cube {
    pub const fn solved() -> Self {
        Self {
            state: CubieState::solved(),
        }
    }

    pub fn state(&self) -> &CubieState {
        &self.state
    }

    pub fn is_solved(&self) -> bool {
        self.state.is_solved()
    }

    pub fn apply_move(&mut self, move_: Move) -> Result<(), MoveApplicationError> {
        Err(MoveApplicationError::MoveTablesNotImplemented(move_))
    }
}

impl Default for Cube {
    fn default() -> Self {
        Self::solved()
    }
}

#[cfg(test)]
mod tests {
    use super::Cube;

    #[test]
    fn solved_cube_is_solved() {
        assert!(Cube::solved().is_solved());
    }
}
