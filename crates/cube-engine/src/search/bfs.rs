use crate::cube::Move;

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SearchSolution {
    pub moves: Vec<Move>,
}
