use std::collections::VecDeque;
use std::sync::OnceLock;

use crate::cube::coordinates::{
    corner_orientation_coordinate, cubie_state_from_corner_orientation_coordinate,
    cubie_state_from_edge_orientation_coordinate, edge_orientation_coordinate,
    CORNER_ORIENTATION_COORDINATE_COUNT, EDGE_ORIENTATION_COORDINATE_COUNT,
};
use crate::cube::cubies::{Corner, Edge};
use crate::cube::moves::FACE_MOVES;
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
pub struct CornerOrientationPatternDatabaseHeuristic;

impl Heuristic for CornerOrientationPatternDatabaseHeuristic {
    fn estimate(&self, cube: &Cube) -> usize {
        let Ok(coordinate) = corner_orientation_coordinate(cube.state()) else {
            return 0;
        };

        usize::from(corner_orientation_pattern_database()[coordinate])
    }
}

#[derive(Clone, Copy, Debug, Default)]
pub struct EdgeOrientationPatternDatabaseHeuristic;

impl Heuristic for EdgeOrientationPatternDatabaseHeuristic {
    fn estimate(&self, cube: &Cube) -> usize {
        let Ok(coordinate) = edge_orientation_coordinate(cube.state()) else {
            return 0;
        };

        usize::from(edge_orientation_pattern_database()[coordinate])
    }
}

#[derive(Clone, Copy, Debug, Default)]
pub struct OrientationPatternDatabaseHeuristic;

impl Heuristic for OrientationPatternDatabaseHeuristic {
    fn estimate(&self, cube: &Cube) -> usize {
        CornerOrientationPatternDatabaseHeuristic
            .estimate(cube)
            .max(EdgeOrientationPatternDatabaseHeuristic.estimate(cube))
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

fn corner_orientation_pattern_database() -> &'static [u8; CORNER_ORIENTATION_COORDINATE_COUNT] {
    static TABLE: OnceLock<[u8; CORNER_ORIENTATION_COORDINATE_COUNT]> = OnceLock::new();

    TABLE.get_or_init(generate_corner_orientation_pattern_database)
}

fn edge_orientation_pattern_database() -> &'static [u8; EDGE_ORIENTATION_COORDINATE_COUNT] {
    static TABLE: OnceLock<[u8; EDGE_ORIENTATION_COORDINATE_COUNT]> = OnceLock::new();

    TABLE.get_or_init(generate_edge_orientation_pattern_database)
}

fn generate_corner_orientation_pattern_database() -> [u8; CORNER_ORIENTATION_COORDINATE_COUNT] {
    let mut distances = [u8::MAX; CORNER_ORIENTATION_COORDINATE_COUNT];
    let mut queue = VecDeque::new();

    distances[0] = 0;
    queue.push_back(0_usize);

    while let Some(coordinate) = queue.pop_front() {
        let distance = distances[coordinate];
        let state = cubie_state_from_corner_orientation_coordinate(coordinate)
            .expect("corner orientation coordinate should reconstruct");
        let cube = Cube::try_from_state(state).expect("corner orientation representative is valid");

        for move_ in FACE_MOVES {
            let mut next_cube = cube.clone();
            next_cube.apply_move(move_);
            let next_coordinate = corner_orientation_coordinate(next_cube.state())
                .expect("moved corner orientation should index");
            if distances[next_coordinate] == u8::MAX {
                distances[next_coordinate] = distance + 1;
                queue.push_back(next_coordinate);
            }
        }
    }

    distances
}

fn generate_edge_orientation_pattern_database() -> [u8; EDGE_ORIENTATION_COORDINATE_COUNT] {
    let mut distances = [u8::MAX; EDGE_ORIENTATION_COORDINATE_COUNT];
    let mut queue = VecDeque::new();

    distances[0] = 0;
    queue.push_back(0_usize);

    while let Some(coordinate) = queue.pop_front() {
        let distance = distances[coordinate];
        let state = cubie_state_from_edge_orientation_coordinate(coordinate)
            .expect("edge orientation coordinate should reconstruct");
        let cube = Cube::try_from_state(state).expect("edge orientation representative is valid");

        for move_ in FACE_MOVES {
            let mut next_cube = cube.clone();
            next_cube.apply_move(move_);
            let next_coordinate = edge_orientation_coordinate(next_cube.state())
                .expect("moved edge orientation should index");
            if distances[next_coordinate] == u8::MAX {
                distances[next_coordinate] = distance + 1;
                queue.push_back(next_coordinate);
            }
        }
    }

    distances
}

#[cfg(test)]
mod tests {
    use super::{
        CornerOrientationHeuristic, CornerOrientationPatternDatabaseHeuristic,
        EdgeOrientationHeuristic, EdgeOrientationPatternDatabaseHeuristic, Heuristic, MaxHeuristic,
        MisplacedCubiesHeuristic, OrientationPatternDatabaseHeuristic, ZeroHeuristic,
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
        assert_eq!(CornerOrientationPatternDatabaseHeuristic.estimate(&cube), 0);
        assert_eq!(EdgeOrientationPatternDatabaseHeuristic.estimate(&cube), 0);
        assert_eq!(OrientationPatternDatabaseHeuristic.estimate(&cube), 0);
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
            assert!(CornerOrientationPatternDatabaseHeuristic.estimate(&cube) <= depth);
            assert!(EdgeOrientationPatternDatabaseHeuristic.estimate(&cube) <= depth);
            assert!(OrientationPatternDatabaseHeuristic.estimate(&cube) <= depth);
        }
    }

    #[test]
    fn orientation_pattern_database_detects_one_move_orientation_changes() {
        let front = scrambled(&[Move::F]);
        let right = scrambled(&[Move::R]);

        assert_eq!(EdgeOrientationPatternDatabaseHeuristic.estimate(&front), 1);
        assert_eq!(
            CornerOrientationPatternDatabaseHeuristic.estimate(&right),
            1
        );
        assert_eq!(OrientationPatternDatabaseHeuristic.estimate(&front), 1);
        assert_eq!(OrientationPatternDatabaseHeuristic.estimate(&right), 1);
    }

    #[test]
    fn orientation_pattern_database_is_at_least_simple_orientation_heuristics() {
        let cube = scrambled(&[Move::F, Move::R, Move::UPrime, Move::B2]);

        assert!(
            CornerOrientationPatternDatabaseHeuristic.estimate(&cube)
                >= CornerOrientationHeuristic.estimate(&cube)
        );
        assert!(
            EdgeOrientationPatternDatabaseHeuristic.estimate(&cube)
                >= EdgeOrientationHeuristic.estimate(&cube)
        );
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
