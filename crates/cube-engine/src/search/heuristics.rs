use crate::cube::Cube;

pub trait Heuristic {
    fn estimate(&self, cube: &Cube) -> usize;
}

#[derive(Clone, Copy, Debug, Default)]
pub struct ZeroHeuristic;

impl Heuristic for ZeroHeuristic {
    fn estimate(&self, _cube: &Cube) -> usize {
        0
    }
}
