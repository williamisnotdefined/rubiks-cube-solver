use super::cubies::{CubeValidationError, CubieState, CORNER_COUNT, EDGE_COUNT};
use super::moves::{Face, Move, Turn};

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Cube {
    state: CubieState,
}

impl Cube {
    pub const fn solved() -> Self {
        Self {
            state: CubieState::solved(),
        }
    }

    pub fn try_from_state(state: CubieState) -> Result<Self, CubeValidationError> {
        state.validate()?;

        Ok(Self { state })
    }

    pub fn state(&self) -> &CubieState {
        &self.state
    }

    pub fn is_solved(&self) -> bool {
        self.state.is_solved()
    }

    pub fn apply_move(&mut self, move_: Move) {
        let turn_count = match move_.turn() {
            Turn::Clockwise => 1,
            Turn::Half => 2,
            Turn::CounterClockwise => 3,
        };

        for _ in 0..turn_count {
            self.apply_quarter_turn(move_.face());
        }
    }

    pub fn apply_moves(&mut self, moves: &[Move]) {
        for move_ in moves {
            self.apply_move(*move_);
        }
    }

    fn apply_quarter_turn(&mut self, face: Face) {
        let mut next = self.state.clone();

        for (old_index, old_position) in CORNER_POSITIONS.iter().copied().enumerate() {
            let mut new_position = old_position;
            let mut sticker_directions = corner_sticker_directions(
                old_index,
                self.state.corner_orientation[old_index] as usize,
            );

            if is_in_layer(face, old_position) {
                new_position = rotate_vector(face, old_position);
                sticker_directions =
                    sticker_directions.map(|direction| rotate_face(face, direction));
            }

            let new_index = corner_index(new_position);
            next.corner_permutation[new_index] = self.state.corner_permutation[old_index];
            next.corner_orientation[new_index] = corner_orientation(new_index, sticker_directions);
        }

        for (old_index, old_position) in EDGE_POSITIONS.iter().copied().enumerate() {
            let mut new_position = old_position;
            let mut sticker_directions =
                edge_sticker_directions(old_index, self.state.edge_orientation[old_index] as usize);

            if is_in_layer(face, old_position) {
                new_position = rotate_vector(face, old_position);
                sticker_directions =
                    sticker_directions.map(|direction| rotate_face(face, direction));
            }

            let new_index = edge_index(new_position);
            next.edge_permutation[new_index] = self.state.edge_permutation[old_index];
            next.edge_orientation[new_index] = edge_orientation(new_index, sticker_directions);
        }

        self.state = next;
    }
}

impl Default for Cube {
    fn default() -> Self {
        Self::solved()
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
struct Vec3 {
    x: i8,
    y: i8,
    z: i8,
}

impl Vec3 {
    const fn new(x: i8, y: i8, z: i8) -> Self {
        Self { x, y, z }
    }
}

const CORNER_POSITIONS: [Vec3; CORNER_COUNT] = [
    Vec3::new(1, 1, 1),
    Vec3::new(-1, 1, 1),
    Vec3::new(-1, 1, -1),
    Vec3::new(1, 1, -1),
    Vec3::new(1, -1, 1),
    Vec3::new(-1, -1, 1),
    Vec3::new(-1, -1, -1),
    Vec3::new(1, -1, -1),
];

const EDGE_POSITIONS: [Vec3; EDGE_COUNT] = [
    Vec3::new(1, 1, 0),
    Vec3::new(0, 1, 1),
    Vec3::new(-1, 1, 0),
    Vec3::new(0, 1, -1),
    Vec3::new(1, -1, 0),
    Vec3::new(0, -1, 1),
    Vec3::new(-1, -1, 0),
    Vec3::new(0, -1, -1),
    Vec3::new(1, 0, 1),
    Vec3::new(-1, 0, 1),
    Vec3::new(-1, 0, -1),
    Vec3::new(1, 0, -1),
];

const CORNER_POSITION_FACES: [[Face; 3]; CORNER_COUNT] = [
    [Face::U, Face::R, Face::F],
    [Face::U, Face::F, Face::L],
    [Face::U, Face::L, Face::B],
    [Face::U, Face::B, Face::R],
    [Face::D, Face::F, Face::R],
    [Face::D, Face::L, Face::F],
    [Face::D, Face::B, Face::L],
    [Face::D, Face::R, Face::B],
];

const EDGE_POSITION_FACES: [[Face; 2]; EDGE_COUNT] = [
    [Face::U, Face::R],
    [Face::U, Face::F],
    [Face::U, Face::L],
    [Face::U, Face::B],
    [Face::D, Face::R],
    [Face::D, Face::F],
    [Face::D, Face::L],
    [Face::D, Face::B],
    [Face::F, Face::R],
    [Face::F, Face::L],
    [Face::B, Face::L],
    [Face::B, Face::R],
];

fn corner_sticker_directions(position_index: usize, orientation: usize) -> [Face; 3] {
    let faces = CORNER_POSITION_FACES[position_index];

    [
        faces[orientation % 3],
        faces[(orientation + 1) % 3],
        faces[(orientation + 2) % 3],
    ]
}

fn edge_sticker_directions(position_index: usize, orientation: usize) -> [Face; 2] {
    let faces = EDGE_POSITION_FACES[position_index];

    [faces[orientation % 2], faces[(orientation + 1) % 2]]
}

fn corner_orientation(position_index: usize, sticker_directions: [Face; 3]) -> u8 {
    (0..3)
        .find(|orientation| {
            corner_sticker_directions(position_index, *orientation) == sticker_directions
        })
        .expect("corner orientation must remain valid after a face turn") as u8
}

fn edge_orientation(position_index: usize, sticker_directions: [Face; 2]) -> u8 {
    (0..2)
        .find(|orientation| {
            edge_sticker_directions(position_index, *orientation) == sticker_directions
        })
        .expect("edge orientation must remain valid after a face turn") as u8
}

fn corner_index(position: Vec3) -> usize {
    CORNER_POSITIONS
        .iter()
        .position(|candidate| *candidate == position)
        .expect("rotated corner position must be valid")
}

fn edge_index(position: Vec3) -> usize {
    EDGE_POSITIONS
        .iter()
        .position(|candidate| *candidate == position)
        .expect("rotated edge position must be valid")
}

fn is_in_layer(face: Face, position: Vec3) -> bool {
    match face {
        Face::U => position.y == 1,
        Face::D => position.y == -1,
        Face::L => position.x == -1,
        Face::R => position.x == 1,
        Face::F => position.z == 1,
        Face::B => position.z == -1,
    }
}

fn rotate_face(face_turn: Face, sticker_face: Face) -> Face {
    vector_face(rotate_vector(face_turn, face_vector(sticker_face)))
}

fn face_vector(face: Face) -> Vec3 {
    match face {
        Face::U => Vec3::new(0, 1, 0),
        Face::D => Vec3::new(0, -1, 0),
        Face::L => Vec3::new(-1, 0, 0),
        Face::R => Vec3::new(1, 0, 0),
        Face::F => Vec3::new(0, 0, 1),
        Face::B => Vec3::new(0, 0, -1),
    }
}

fn vector_face(vector: Vec3) -> Face {
    match vector {
        Vec3 { x: 0, y: 1, z: 0 } => Face::U,
        Vec3 { x: 0, y: -1, z: 0 } => Face::D,
        Vec3 { x: -1, y: 0, z: 0 } => Face::L,
        Vec3 { x: 1, y: 0, z: 0 } => Face::R,
        Vec3 { x: 0, y: 0, z: 1 } => Face::F,
        Vec3 { x: 0, y: 0, z: -1 } => Face::B,
        _ => panic!("vector must map to a face normal: {vector:?}"),
    }
}

fn rotate_vector(face: Face, vector: Vec3) -> Vec3 {
    match face {
        Face::U => Vec3::new(-vector.z, vector.y, vector.x),
        Face::D => Vec3::new(vector.z, vector.y, -vector.x),
        Face::L => Vec3::new(vector.x, -vector.z, vector.y),
        Face::R => Vec3::new(vector.x, vector.z, -vector.y),
        Face::F => Vec3::new(vector.y, -vector.x, vector.z),
        Face::B => Vec3::new(-vector.y, vector.x, vector.z),
    }
}

#[cfg(test)]
mod tests {
    use super::{Cube, Move};
    use crate::cube::cubies::{Corner, Edge};
    use crate::cube::moves::FACE_MOVES;

    #[test]
    fn solved_cube_is_solved() {
        assert!(Cube::solved().is_solved());
    }

    #[test]
    fn cube_accepts_valid_state() {
        let cube =
            Cube::try_from_state(Cube::solved().state().clone()).expect("solved state is valid");

        assert!(cube.is_solved());
    }

    #[test]
    fn cube_rejects_invalid_state() {
        let mut state = Cube::solved().state().clone();
        state.edge_orientation[0] = 1;

        assert!(Cube::try_from_state(state).is_err());
    }

    #[test]
    fn every_move_changes_solved_cube_and_inverse_restores_it() {
        for move_ in FACE_MOVES {
            let mut cube = Cube::solved();

            cube.apply_move(move_);
            assert!(!cube.is_solved(), "{move_:?} should change the solved cube");

            cube.apply_move(move_.inverse());
            assert!(
                cube.is_solved(),
                "{move_:?} followed by its inverse should solve the cube"
            );
        }
    }

    #[test]
    fn every_move_keeps_state_valid() {
        for move_ in FACE_MOVES {
            let mut cube = Cube::solved();

            cube.apply_move(move_);

            assert!(
                cube.state().is_valid(),
                "{move_:?} should preserve cube-state validity"
            );
        }
    }

    #[test]
    fn short_algorithm_keeps_state_valid() {
        let mut cube = Cube::solved();

        cube.apply_moves(&[Move::R, Move::U, Move::RPrime, Move::UPrime]);

        assert!(cube.state().is_valid());
    }

    #[test]
    fn applying_any_move_four_times_restores_solved_cube() {
        for move_ in FACE_MOVES {
            let mut cube = Cube::solved();

            for _ in 0..4 {
                cube.apply_move(move_);
            }

            assert!(
                cube.is_solved(),
                "applying {move_:?} four times should solve the cube"
            );
        }
    }

    #[test]
    fn u_and_d_turns_preserve_orientation() {
        for move_ in [Move::U, Move::D] {
            let mut cube = Cube::solved();

            cube.apply_move(move_);

            assert_eq!(cube.state().corner_orientation, [0; 8]);
            assert_eq!(cube.state().edge_orientation, [0; 12]);
        }
    }

    #[test]
    fn front_turn_updates_piece_orientation() {
        let mut cube = Cube::solved();

        cube.apply_move(Move::F);

        assert_ne!(cube.state().corner_orientation, [0; 8]);
        assert_ne!(cube.state().edge_orientation, [0; 12]);
    }

    #[test]
    fn front_turn_has_expected_permutation_from_solved_state() {
        let mut cube = Cube::solved();

        cube.apply_move(Move::F);

        assert_eq!(
            cube.state().corner_permutation,
            [
                Corner::Ufl,
                Corner::Dlf,
                Corner::Ulb,
                Corner::Ubr,
                Corner::Urf,
                Corner::Dfr,
                Corner::Dbl,
                Corner::Drb,
            ]
        );
        assert_eq!(
            cube.state().edge_permutation,
            [
                Edge::Ur,
                Edge::Fl,
                Edge::Ul,
                Edge::Ub,
                Edge::Dr,
                Edge::Fr,
                Edge::Dl,
                Edge::Db,
                Edge::Uf,
                Edge::Df,
                Edge::Bl,
                Edge::Br,
            ]
        );
    }
}
