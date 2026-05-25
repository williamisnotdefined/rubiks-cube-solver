use crate::cube::{Cube, Move};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct SearchBudget {
    pub max_depth: usize,
    pub max_nodes: Option<usize>,
}

impl SearchBudget {
    pub const fn new(max_depth: usize) -> Self {
        Self {
            max_depth,
            max_nodes: None,
        }
    }

    pub const fn with_limits(max_depth: usize, max_nodes: Option<usize>) -> Self {
        Self {
            max_depth,
            max_nodes,
        }
    }
}

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

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum SearchOutcome {
    Found(SearchSolution),
    NotFoundWithinLimits { explored_nodes: usize },
}

impl SearchOutcome {
    pub fn explored_nodes(&self) -> usize {
        match self {
            Self::Found(solution) => solution.explored_nodes(),
            Self::NotFoundWithinLimits { explored_nodes } => *explored_nodes,
        }
    }
}
