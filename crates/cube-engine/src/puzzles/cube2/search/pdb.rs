use std::collections::VecDeque;
use std::sync::OnceLock;

use crate::puzzles::cube2::{
    cube2_corner_orientation_coordinate, cube2_corner_permutation_coordinate,
    cube2_state_from_corner_orientation_coordinate, cube2_state_from_corner_permutation_coordinate,
    Cube2, CUBE2_CORNER_ORIENTATION_COORDINATE_COUNT, CUBE2_CORNER_PERMUTATION_COORDINATE_COUNT,
    CUBE2_FACE_MOVES,
};

static CUBE2_CORNER_ORIENTATION_PDB: OnceLock<Vec<u8>> = OnceLock::new();
static CUBE2_CORNER_PERMUTATION_PDB: OnceLock<Vec<u8>> = OnceLock::new();
static CUBE2_CORNER_ORIENTATION_MOVE_TABLE: OnceLock<Vec<[usize; CUBE2_MOVE_COUNT]>> =
    OnceLock::new();
static CUBE2_CORNER_PERMUTATION_MOVE_TABLE: OnceLock<Vec<[usize; CUBE2_MOVE_COUNT]>> =
    OnceLock::new();

const CUBE2_MOVE_COUNT: usize = CUBE2_FACE_MOVES.len();

pub fn cube2_corner_orientation_pdb() -> &'static [u8] {
    CUBE2_CORNER_ORIENTATION_PDB
        .get_or_init(generate_corner_orientation_pdb)
        .as_slice()
}

pub fn cube2_corner_permutation_pdb() -> &'static [u8] {
    CUBE2_CORNER_PERMUTATION_PDB
        .get_or_init(generate_corner_permutation_pdb)
        .as_slice()
}

pub fn cube2_pdb_heuristic(cube: &Cube2) -> usize {
    let orientation_coordinate = cube2_corner_orientation_coordinate(cube.state())
        .expect("reachable 2x2 state should have a valid corner-orientation coordinate");
    let permutation_coordinate = cube2_corner_permutation_coordinate(cube.state())
        .expect("reachable 2x2 state should have a valid corner-permutation coordinate");

    usize::from(cube2_corner_orientation_pdb()[orientation_coordinate]).max(usize::from(
        cube2_corner_permutation_pdb()[permutation_coordinate],
    ))
}

pub(super) fn cube2_corner_orientation_move_table() -> &'static [[usize; CUBE2_MOVE_COUNT]] {
    CUBE2_CORNER_ORIENTATION_MOVE_TABLE
        .get_or_init(generate_corner_orientation_move_table)
        .as_slice()
}

pub(super) fn cube2_corner_permutation_move_table() -> &'static [[usize; CUBE2_MOVE_COUNT]] {
    CUBE2_CORNER_PERMUTATION_MOVE_TABLE
        .get_or_init(generate_corner_permutation_move_table)
        .as_slice()
}

fn generate_corner_orientation_pdb() -> Vec<u8> {
    let mut distances = vec![u8::MAX; CUBE2_CORNER_ORIENTATION_COORDINATE_COUNT];
    let move_table = cube2_corner_orientation_move_table();
    let mut queue = VecDeque::new();

    distances[0] = 0;
    queue.push_back(0);

    while let Some(coordinate) = queue.pop_front() {
        let distance = distances[coordinate];
        for next_coordinate in move_table[coordinate] {
            if distances[next_coordinate] != u8::MAX {
                continue;
            }

            distances[next_coordinate] = distance + 1;
            queue.push_back(next_coordinate);
        }
    }

    assert!(
        distances.iter().all(|distance| *distance != u8::MAX),
        "2x2 corner-orientation PDB should cover all coordinates"
    );

    distances
}

fn generate_corner_permutation_pdb() -> Vec<u8> {
    let mut distances = vec![u8::MAX; CUBE2_CORNER_PERMUTATION_COORDINATE_COUNT];
    let move_table = cube2_corner_permutation_move_table();
    let mut queue = VecDeque::new();

    distances[0] = 0;
    queue.push_back(0);

    while let Some(coordinate) = queue.pop_front() {
        let distance = distances[coordinate];
        for next_coordinate in move_table[coordinate] {
            if distances[next_coordinate] != u8::MAX {
                continue;
            }

            distances[next_coordinate] = distance + 1;
            queue.push_back(next_coordinate);
        }
    }

    assert!(
        distances.iter().all(|distance| *distance != u8::MAX),
        "2x2 corner-permutation PDB should cover all coordinates"
    );

    distances
}

fn generate_corner_orientation_move_table() -> Vec<[usize; CUBE2_MOVE_COUNT]> {
    let mut move_table = vec![[0; CUBE2_MOVE_COUNT]; CUBE2_CORNER_ORIENTATION_COORDINATE_COUNT];

    for (coordinate, transitions) in move_table.iter_mut().enumerate() {
        let state = cube2_state_from_corner_orientation_coordinate(coordinate)
            .expect("orientation coordinate should reconstruct");

        for (move_index, move_) in CUBE2_FACE_MOVES.iter().copied().enumerate() {
            let mut cube = Cube2::try_from_state(state.clone())
                .expect("projected orientation state should remain valid");
            cube.apply_move(move_);
            transitions[move_index] = cube2_corner_orientation_coordinate(cube.state())
                .expect("moved orientation state should index");
        }
    }

    move_table
}

fn generate_corner_permutation_move_table() -> Vec<[usize; CUBE2_MOVE_COUNT]> {
    let mut move_table = vec![[0; CUBE2_MOVE_COUNT]; CUBE2_CORNER_PERMUTATION_COORDINATE_COUNT];

    for (coordinate, transitions) in move_table.iter_mut().enumerate() {
        let state = cube2_state_from_corner_permutation_coordinate(coordinate)
            .expect("permutation coordinate should reconstruct");

        for (move_index, move_) in CUBE2_FACE_MOVES.iter().copied().enumerate() {
            let mut cube = Cube2::try_from_state(state.clone())
                .expect("projected permutation state should remain valid");
            cube.apply_move(move_);
            transitions[move_index] = cube2_corner_permutation_coordinate(cube.state())
                .expect("moved permutation state should index");
        }
    }

    move_table
}

#[cfg(test)]
mod tests {
    use super::{
        cube2_corner_orientation_move_table, cube2_corner_orientation_pdb,
        cube2_corner_permutation_move_table, cube2_corner_permutation_pdb, cube2_pdb_heuristic,
    };
    use crate::puzzles::cube2::{
        cube2_corner_orientation_coordinate, cube2_corner_permutation_coordinate, Cube2,
        Cube2Algorithm, CUBE2_CORNER_ORIENTATION_COORDINATE_COUNT,
        CUBE2_CORNER_PERMUTATION_COORDINATE_COUNT,
    };

    #[test]
    fn pdbs_have_expected_sizes_and_solved_distance() {
        let orientation_pdb = cube2_corner_orientation_pdb();
        let permutation_pdb = cube2_corner_permutation_pdb();

        assert_eq!(
            orientation_pdb.len(),
            CUBE2_CORNER_ORIENTATION_COORDINATE_COUNT
        );
        assert_eq!(
            permutation_pdb.len(),
            CUBE2_CORNER_PERMUTATION_COORDINATE_COUNT
        );
        assert_eq!(orientation_pdb[0], 0);
        assert_eq!(permutation_pdb[0], 0);
    }

    #[test]
    fn pdbs_fill_every_coordinate() {
        assert!(cube2_corner_orientation_pdb()
            .iter()
            .all(|distance| *distance != u8::MAX));
        assert!(cube2_corner_permutation_pdb()
            .iter()
            .all(|distance| *distance != u8::MAX));
    }

    #[test]
    fn move_tables_have_expected_sizes_and_solved_transitions() {
        assert_eq!(
            cube2_corner_orientation_move_table().len(),
            CUBE2_CORNER_ORIENTATION_COORDINATE_COUNT
        );
        assert_eq!(
            cube2_corner_permutation_move_table().len(),
            CUBE2_CORNER_PERMUTATION_COORDINATE_COUNT
        );
        assert!(cube2_corner_orientation_move_table()[0]
            .iter()
            .all(|coordinate| *coordinate < CUBE2_CORNER_ORIENTATION_COORDINATE_COUNT));
        assert!(cube2_corner_permutation_move_table()[0]
            .iter()
            .all(|coordinate| *coordinate < CUBE2_CORNER_PERMUTATION_COORDINATE_COUNT));
    }

    #[test]
    fn one_move_projections_have_distance_at_most_one() {
        let cube = scrambled_cube("F");
        let orientation_coordinate =
            cube2_corner_orientation_coordinate(cube.state()).expect("orientation should index");
        let permutation_coordinate =
            cube2_corner_permutation_coordinate(cube.state()).expect("permutation should index");

        assert!(cube2_corner_orientation_pdb()[orientation_coordinate] <= 1);
        assert!(cube2_corner_permutation_pdb()[permutation_coordinate] <= 1);
    }

    #[test]
    fn heuristic_is_zero_for_solved_state() {
        assert_eq!(cube2_pdb_heuristic(&Cube2::solved()), 0);
    }

    #[test]
    fn heuristic_does_not_overestimate_shallow_known_scrambles() {
        for (algorithm, upper_bound) in [("F", 1), ("R U", 2), ("R U F", 3), ("L F U R", 4)] {
            let cube = scrambled_cube(algorithm);

            assert!(
                cube2_pdb_heuristic(&cube) <= upper_bound,
                "heuristic should not exceed known solution length for {algorithm}"
            );
        }
    }

    fn scrambled_cube(algorithm: &str) -> Cube2 {
        let algorithm = Cube2Algorithm::parse(algorithm).expect("2x2 algorithm should parse");
        let mut cube = Cube2::solved();
        algorithm.apply_to(&mut cube);

        cube
    }
}
