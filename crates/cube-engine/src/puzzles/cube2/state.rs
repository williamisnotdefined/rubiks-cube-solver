use super::cubies::{Cube2Corner, Cube2State, Cube2ValidationError, CUBE2_CORNER_COUNT};
use super::moves::{Cube2Face, Cube2Move, Cube2Turn};

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Cube2 {
    state: Cube2State,
}

impl Cube2 {
    pub const fn solved() -> Self {
        Self {
            state: Cube2State::solved(),
        }
    }

    pub fn try_from_state(state: Cube2State) -> Result<Self, Cube2ValidationError> {
        state.validate()?;

        Ok(Self { state })
    }

    pub fn state(&self) -> &Cube2State {
        &self.state
    }

    pub fn is_solved(&self) -> bool {
        self.state.is_solved()
    }

    pub fn inverse(&self) -> Self {
        let mut inverse = Cube2State::solved();

        for (position_index, corner) in self.state.corner_permutation.iter().copied().enumerate() {
            let inverse_position = corner.index();
            inverse.corner_permutation[inverse_position] = Cube2Corner::from_index(position_index)
                .expect("corner position index must map to a 2x2 corner");
            inverse.corner_orientation[inverse_position] =
                (3 - self.state.corner_orientation[position_index]) % 3;
        }

        Self { state: inverse }
    }

    pub fn apply_move(&mut self, move_: Cube2Move) {
        let turn_count = match move_.turn() {
            Cube2Turn::Clockwise => 1,
            Cube2Turn::Half => 2,
            Cube2Turn::CounterClockwise => 3,
        };

        for _ in 0..turn_count {
            self.apply_quarter_turn(move_.face());
        }
    }

    pub fn apply_moves(&mut self, moves: &[Cube2Move]) {
        for move_ in moves {
            self.apply_move(*move_);
        }
    }

    fn apply_quarter_turn(&mut self, face: Cube2Face) {
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

        self.state = next;
    }
}

impl Default for Cube2 {
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

const CORNER_POSITIONS: [Vec3; CUBE2_CORNER_COUNT] = [
    Vec3::new(1, 1, 1),
    Vec3::new(-1, 1, 1),
    Vec3::new(-1, 1, -1),
    Vec3::new(1, 1, -1),
    Vec3::new(1, -1, 1),
    Vec3::new(-1, -1, 1),
    Vec3::new(-1, -1, -1),
    Vec3::new(1, -1, -1),
];

const CORNER_POSITION_FACES: [[Cube2Face; 3]; CUBE2_CORNER_COUNT] = [
    [Cube2Face::U, Cube2Face::R, Cube2Face::F],
    [Cube2Face::U, Cube2Face::F, Cube2Face::L],
    [Cube2Face::U, Cube2Face::L, Cube2Face::B],
    [Cube2Face::U, Cube2Face::B, Cube2Face::R],
    [Cube2Face::D, Cube2Face::F, Cube2Face::R],
    [Cube2Face::D, Cube2Face::L, Cube2Face::F],
    [Cube2Face::D, Cube2Face::B, Cube2Face::L],
    [Cube2Face::D, Cube2Face::R, Cube2Face::B],
];

fn corner_sticker_directions(position_index: usize, orientation: usize) -> [Cube2Face; 3] {
    let faces = CORNER_POSITION_FACES[position_index];

    [
        faces[orientation % 3],
        faces[(orientation + 1) % 3],
        faces[(orientation + 2) % 3],
    ]
}

fn corner_orientation(position_index: usize, sticker_directions: [Cube2Face; 3]) -> u8 {
    (0..3)
        .find(|orientation| {
            corner_sticker_directions(position_index, *orientation) == sticker_directions
        })
        .expect("2x2 corner orientation must remain valid after a face turn") as u8
}

fn corner_index(position: Vec3) -> usize {
    CORNER_POSITIONS
        .iter()
        .position(|candidate| *candidate == position)
        .expect("rotated 2x2 corner position must be valid")
}

fn is_in_layer(face: Cube2Face, position: Vec3) -> bool {
    match face {
        Cube2Face::U => position.y == 1,
        Cube2Face::D => position.y == -1,
        Cube2Face::L => position.x == -1,
        Cube2Face::R => position.x == 1,
        Cube2Face::F => position.z == 1,
        Cube2Face::B => position.z == -1,
    }
}

fn rotate_face(face_turn: Cube2Face, sticker_face: Cube2Face) -> Cube2Face {
    vector_face(rotate_vector(face_turn, face_vector(sticker_face)))
}

fn face_vector(face: Cube2Face) -> Vec3 {
    match face {
        Cube2Face::U => Vec3::new(0, 1, 0),
        Cube2Face::D => Vec3::new(0, -1, 0),
        Cube2Face::L => Vec3::new(-1, 0, 0),
        Cube2Face::R => Vec3::new(1, 0, 0),
        Cube2Face::F => Vec3::new(0, 0, 1),
        Cube2Face::B => Vec3::new(0, 0, -1),
    }
}

fn vector_face(vector: Vec3) -> Cube2Face {
    match vector {
        Vec3 { x: 0, y: 1, z: 0 } => Cube2Face::U,
        Vec3 { x: 0, y: -1, z: 0 } => Cube2Face::D,
        Vec3 { x: -1, y: 0, z: 0 } => Cube2Face::L,
        Vec3 { x: 1, y: 0, z: 0 } => Cube2Face::R,
        Vec3 { x: 0, y: 0, z: 1 } => Cube2Face::F,
        Vec3 { x: 0, y: 0, z: -1 } => Cube2Face::B,
        _ => panic!("vector must map to a 2x2 face normal: {vector:?}"),
    }
}

fn rotate_vector(face: Cube2Face, vector: Vec3) -> Vec3 {
    match face {
        Cube2Face::U => Vec3::new(-vector.z, vector.y, vector.x),
        Cube2Face::D => Vec3::new(vector.z, vector.y, -vector.x),
        Cube2Face::L => Vec3::new(vector.x, -vector.z, vector.y),
        Cube2Face::R => Vec3::new(vector.x, vector.z, -vector.y),
        Cube2Face::F => Vec3::new(vector.y, -vector.x, vector.z),
        Cube2Face::B => Vec3::new(-vector.y, vector.x, vector.z),
    }
}

#[cfg(test)]
mod tests {
    use super::Cube2;
    use crate::puzzles::cube2::{Cube2Move, Cube2State, CUBE2_FACE_MOVES};

    #[test]
    fn solved_cube_is_solved() {
        assert!(Cube2::solved().is_solved());
    }

    #[test]
    fn cube_accepts_valid_state() {
        let cube = Cube2::try_from_state(Cube2::solved().state().clone())
            .expect("solved 2x2 state is valid");

        assert!(cube.is_solved());
    }

    #[test]
    fn cube_rejects_invalid_state() {
        let mut state = Cube2::solved().state().clone();
        state.corner_orientation[0] = 1;

        assert!(Cube2::try_from_state(state).is_err());
    }

    #[test]
    fn every_move_changes_solved_cube_and_inverse_restores_it() {
        for move_ in CUBE2_FACE_MOVES {
            let mut cube = Cube2::solved();

            cube.apply_move(move_);
            assert!(!cube.is_solved(), "{move_:?} should change the solved 2x2");

            cube.apply_move(move_.inverse());
            assert!(
                cube.is_solved(),
                "{move_:?} followed by its inverse should solve the 2x2"
            );
        }
    }

    #[test]
    fn every_move_keeps_state_valid() {
        for move_ in CUBE2_FACE_MOVES {
            let mut cube = Cube2::solved();

            cube.apply_move(move_);

            assert!(
                cube.state().is_valid(),
                "{move_:?} should preserve 2x2 state validity"
            );
        }
    }

    #[test]
    fn applying_any_move_four_times_restores_solved_cube() {
        for move_ in CUBE2_FACE_MOVES {
            let mut cube = Cube2::solved();

            for _ in 0..4 {
                cube.apply_move(move_);
            }

            assert!(
                cube.is_solved(),
                "applying {move_:?} four times should solve the 2x2"
            );
        }
    }

    #[test]
    fn half_turn_matches_two_quarter_turns() {
        let cases = [
            (Cube2Move::U2, Cube2Move::U),
            (Cube2Move::D2, Cube2Move::D),
            (Cube2Move::L2, Cube2Move::L),
            (Cube2Move::R2, Cube2Move::R),
            (Cube2Move::F2, Cube2Move::F),
            (Cube2Move::B2, Cube2Move::B),
        ];

        for (half_turn, quarter_turn) in cases {
            let mut actual = Cube2::solved();
            actual.apply_move(half_turn);

            let mut expected = Cube2::solved();
            expected.apply_move(quarter_turn);
            expected.apply_move(quarter_turn);

            assert_eq!(
                actual, expected,
                "{half_turn:?} should be two quarter turns"
            );
        }
    }

    #[test]
    fn prime_turn_matches_three_quarter_turns() {
        let cases = [
            (Cube2Move::UPrime, Cube2Move::U),
            (Cube2Move::DPrime, Cube2Move::D),
            (Cube2Move::LPrime, Cube2Move::L),
            (Cube2Move::RPrime, Cube2Move::R),
            (Cube2Move::FPrime, Cube2Move::F),
            (Cube2Move::BPrime, Cube2Move::B),
        ];

        for (prime_turn, quarter_turn) in cases {
            let mut actual = Cube2::solved();
            actual.apply_move(prime_turn);

            let mut expected = Cube2::solved();
            for _ in 0..3 {
                expected.apply_move(quarter_turn);
            }

            assert_eq!(
                actual, expected,
                "{prime_turn:?} should be three quarter turns"
            );
        }
    }

    #[test]
    fn short_algorithm_keeps_state_valid() {
        let mut cube = Cube2::solved();

        cube.apply_moves(&[
            Cube2Move::R,
            Cube2Move::U,
            Cube2Move::RPrime,
            Cube2Move::UPrime,
        ]);

        assert!(cube.state().is_valid());
    }

    #[test]
    fn inverse_cube_matches_inverse_algorithm() {
        let moves = [
            Cube2Move::R,
            Cube2Move::U,
            Cube2Move::F2,
            Cube2Move::LPrime,
            Cube2Move::D,
        ];
        let mut cube = Cube2::solved();
        cube.apply_moves(&moves);

        let mut expected_inverse = Cube2::solved();
        let inverse_moves = moves
            .iter()
            .rev()
            .map(|move_| move_.inverse())
            .collect::<Vec<_>>();
        expected_inverse.apply_moves(&inverse_moves);

        assert_eq!(cube.inverse(), expected_inverse);
        assert_eq!(cube.inverse().inverse(), cube);
    }

    #[test]
    fn scrambled_state_serialization_round_trip_preserves_state() {
        let mut cube = Cube2::solved();
        cube.apply_moves(&[
            Cube2Move::R,
            Cube2Move::U,
            Cube2Move::RPrime,
            Cube2Move::UPrime,
        ]);
        let serialized = cube.state().serialize();

        let parsed = Cube2State::deserialize(&serialized)
            .expect("serialized scrambled 2x2 state should parse");

        assert_eq!(&parsed, cube.state());
    }
}
