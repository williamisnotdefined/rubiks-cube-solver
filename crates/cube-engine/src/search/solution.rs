use crate::cube::{Cube, Move};

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SearchSolution {
    pub moves: Vec<Move>,
    pub explored_nodes: usize,
}

impl SearchSolution {
    pub fn new(moves: Vec<Move>) -> Self {
        Self::with_metrics(moves, 0)
    }

    pub fn with_metrics(moves: Vec<Move>, explored_nodes: usize) -> Self {
        Self {
            moves,
            explored_nodes,
        }
    }

    pub fn moves(&self) -> &[Move] {
        &self.moves
    }

    pub fn len(&self) -> usize {
        self.moves.len()
    }

    pub fn is_empty(&self) -> bool {
        self.moves.is_empty()
    }

    pub fn explored_nodes(&self) -> usize {
        self.explored_nodes
    }

    pub fn apply_to(&self, cube: &mut Cube) {
        cube.apply_moves(&self.moves);
    }
}
