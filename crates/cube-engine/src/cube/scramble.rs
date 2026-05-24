use std::fmt;

use super::algorithm::Algorithm;
use super::moves::{Move, FACE_MOVES};
use super::notation::{parse_algorithm, NotationError};
use super::state::Cube;

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Scramble {
    moves: Vec<Move>,
}

impl Scramble {
    pub fn new(moves: Vec<Move>) -> Self {
        Self { moves }
    }

    pub fn parse(input: &str) -> Result<Self, NotationError> {
        Ok(Self::new(parse_algorithm(input)?))
    }

    pub fn generate(length: usize, seed: u64) -> Self {
        let mut rng = ScrambleRng::new(seed);
        let mut moves = Vec::with_capacity(length);
        let mut previous_move = None;

        while moves.len() < length {
            let candidate = FACE_MOVES[rng.next_index(FACE_MOVES.len())];

            if previous_move.is_some_and(|move_: Move| move_.axis() == candidate.axis()) {
                continue;
            }

            moves.push(candidate);
            previous_move = Some(candidate);
        }

        Self::new(moves)
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

    pub fn inverse(&self) -> Vec<Move> {
        self.moves
            .iter()
            .rev()
            .map(|move_| move_.inverse())
            .collect()
    }

    pub fn inverse_algorithm(&self) -> Algorithm {
        Algorithm::new(self.inverse())
    }

    pub fn apply_to(&self, cube: &mut Cube) {
        cube.apply_moves(&self.moves);
    }

    pub fn algorithm(&self) -> Algorithm {
        Algorithm::new(self.moves.clone())
    }
}

impl fmt::Display for Scramble {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        self.algorithm().fmt(formatter)
    }
}

#[derive(Clone, Copy, Debug)]
struct ScrambleRng {
    state: u64,
}

impl ScrambleRng {
    const fn new(seed: u64) -> Self {
        Self { state: seed }
    }

    fn next_index(&mut self, upper_bound: usize) -> usize {
        debug_assert!(upper_bound > 0);

        self.state = self
            .state
            .wrapping_mul(6_364_136_223_846_793_005)
            .wrapping_add(1_442_695_040_888_963_407);

        (self.state % upper_bound as u64) as usize
    }
}

#[cfg(test)]
mod tests {
    use super::Scramble;
    use crate::cube::Cube;

    #[test]
    fn generated_scramble_has_requested_length() {
        let scramble = Scramble::generate(25, 7);

        assert_eq!(scramble.len(), 25);
    }

    #[test]
    fn generated_scramble_is_deterministic_for_seed() {
        assert_eq!(Scramble::generate(25, 7), Scramble::generate(25, 7));
    }

    #[test]
    fn generated_scramble_varies_by_seed() {
        assert_ne!(Scramble::generate(25, 7), Scramble::generate(25, 8));
    }

    #[test]
    fn generated_scramble_avoids_consecutive_same_axis_moves() {
        let scramble = Scramble::generate(100, 7);

        for pair in scramble.moves().windows(2) {
            assert_ne!(pair[0].axis(), pair[1].axis());
        }
    }

    #[test]
    fn generated_scramble_keeps_state_valid() {
        let scramble = Scramble::generate(25, 7);
        let mut cube = Cube::solved();

        scramble.apply_to(&mut cube);

        assert!(cube.state().is_valid());
    }

    #[test]
    fn generated_scramble_inverse_solves_cube() {
        let scramble = Scramble::generate(25, 7);
        let mut cube = Cube::solved();

        scramble.apply_to(&mut cube);
        assert!(!cube.is_solved());

        scramble.inverse_algorithm().apply_to(&mut cube);
        assert!(cube.is_solved());
    }

    #[test]
    fn parsed_scramble_displays_as_notation() {
        let scramble = Scramble::parse("R U R' U'").expect("scramble should parse");

        assert_eq!(scramble.to_string(), "R U R' U'");
    }
}
