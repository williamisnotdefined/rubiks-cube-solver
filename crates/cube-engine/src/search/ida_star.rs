use crate::cube::Move;

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct IdaStarSolution {
    pub moves: Vec<Move>,
    pub explored_nodes: usize,
}
