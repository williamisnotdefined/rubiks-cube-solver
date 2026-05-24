use crate::cube::cubies::{Corner, Edge};
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

#[derive(Clone, Copy, Debug, Default)]
pub struct MisplacedCubiesHeuristic;

impl Heuristic for MisplacedCubiesHeuristic {
    fn estimate(&self, cube: &Cube) -> usize {
        let state = cube.state();
        let misplaced_corners = state
            .corner_permutation
            .iter()
            .zip(Corner::ALL)
            .filter(|(actual, expected)| **actual != *expected)
            .count();
        let misplaced_edges = state
            .edge_permutation
            .iter()
            .zip(Edge::ALL)
            .filter(|(actual, expected)| **actual != *expected)
            .count();

        ceil_div_4(misplaced_corners).max(ceil_div_4(misplaced_edges))
    }
}

#[derive(Clone, Copy, Debug, Default)]
pub struct CornerOrientationHeuristic;

impl Heuristic for CornerOrientationHeuristic {
    fn estimate(&self, cube: &Cube) -> usize {
        let misoriented_corners = cube
            .state()
            .corner_orientation
            .iter()
            .filter(|orientation| **orientation != 0)
            .count();

        ceil_div_4(misoriented_corners)
    }
}

#[derive(Clone, Copy, Debug, Default)]
pub struct EdgeOrientationHeuristic;

impl Heuristic for EdgeOrientationHeuristic {
    fn estimate(&self, cube: &Cube) -> usize {
        let misoriented_edges = cube
            .state()
            .edge_orientation
            .iter()
            .filter(|orientation| **orientation != 0)
            .count();

        ceil_div_4(misoriented_edges)
    }
}

#[derive(Clone, Copy, Debug, Default)]
pub struct MaxHeuristic<H1, H2> {
    left: H1,
    right: H2,
}

impl<H1, H2> MaxHeuristic<H1, H2> {
    pub fn new(left: H1, right: H2) -> Self {
        Self { left, right }
    }
}

impl<H1, H2> Heuristic for MaxHeuristic<H1, H2>
where
    H1: Heuristic,
    H2: Heuristic,
{
    fn estimate(&self, cube: &Cube) -> usize {
        self.left.estimate(cube).max(self.right.estimate(cube))
    }
}

const fn ceil_div_4(value: usize) -> usize {
    value.div_ceil(4)
}

#[cfg(test)]
mod tests {
    use super::{
        CornerOrientationHeuristic, EdgeOrientationHeuristic, Heuristic, MaxHeuristic,
        MisplacedCubiesHeuristic, ZeroHeuristic,
    };
    use crate::cube::{Cube, Move};

    #[test]
    fn zero_heuristic_always_returns_zero() {
        let cube = scrambled(&[Move::R, Move::U, Move::F]);

        assert_eq!(ZeroHeuristic.estimate(&Cube::solved()), 0);
        assert_eq!(ZeroHeuristic.estimate(&cube), 0);
    }

    #[test]
    fn solved_cube_estimates_zero_for_all_simple_heuristics() {
        let cube = Cube::solved();

        assert_eq!(MisplacedCubiesHeuristic.estimate(&cube), 0);
        assert_eq!(CornerOrientationHeuristic.estimate(&cube), 0);
        assert_eq!(EdgeOrientationHeuristic.estimate(&cube), 0);
    }

    #[test]
    fn simple_heuristics_do_not_overestimate_known_depths() {
        for moves in [
            &[Move::R][..],
            &[Move::R, Move::U],
            &[Move::R, Move::U, Move::F],
        ] {
            let cube = scrambled(moves);
            let depth = moves.len();

            assert!(MisplacedCubiesHeuristic.estimate(&cube) <= depth);
            assert!(CornerOrientationHeuristic.estimate(&cube) <= depth);
            assert!(EdgeOrientationHeuristic.estimate(&cube) <= depth);
        }
    }

    #[test]
    fn max_heuristic_returns_largest_child_estimate() {
        let cube = scrambled(&[Move::F]);
        let heuristic = MaxHeuristic::new(MisplacedCubiesHeuristic, CornerOrientationHeuristic);

        assert_eq!(
            heuristic.estimate(&cube),
            MisplacedCubiesHeuristic
                .estimate(&cube)
                .max(CornerOrientationHeuristic.estimate(&cube))
        );
    }

    #[test]
    fn heuristics_do_not_mutate_cube_state() {
        let cube = scrambled(&[Move::R, Move::U, Move::F]);
        let before = cube.state().clone();

        let _ = MisplacedCubiesHeuristic.estimate(&cube);
        let _ = CornerOrientationHeuristic.estimate(&cube);
        let _ = EdgeOrientationHeuristic.estimate(&cube);

        assert_eq!(cube.state(), &before);
    }

    fn scrambled(moves: &[Move]) -> Cube {
        let mut cube = Cube::solved();
        cube.apply_moves(moves);
        cube
    }
}
