use std::fmt;
use std::str::FromStr;

use super::moves::Cube2Move;
use super::notation::{parse_cube2_algorithm, Cube2NotationError};
use super::state::Cube2;

#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct Cube2Algorithm {
    moves: Vec<Cube2Move>,
}

impl Cube2Algorithm {
    pub fn new(moves: Vec<Cube2Move>) -> Self {
        Self { moves }
    }

    pub fn parse(input: &str) -> Result<Self, Cube2NotationError> {
        input.parse()
    }

    pub fn moves(&self) -> &[Cube2Move] {
        &self.moves
    }

    pub fn len(&self) -> usize {
        self.moves.len()
    }

    pub fn is_empty(&self) -> bool {
        self.moves.is_empty()
    }

    pub fn inverse(&self) -> Self {
        Self::new(
            self.moves
                .iter()
                .rev()
                .map(|move_| move_.inverse())
                .collect(),
        )
    }

    pub fn apply_to(&self, cube: &mut Cube2) {
        cube.apply_moves(&self.moves);
    }
}

impl From<Vec<Cube2Move>> for Cube2Algorithm {
    fn from(moves: Vec<Cube2Move>) -> Self {
        Self::new(moves)
    }
}

impl FromStr for Cube2Algorithm {
    type Err = Cube2NotationError;

    fn from_str(input: &str) -> Result<Self, Self::Err> {
        Ok(Self::new(parse_cube2_algorithm(input)?))
    }
}

impl fmt::Display for Cube2Algorithm {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        for (position, move_) in self.moves.iter().enumerate() {
            if position > 0 {
                formatter.write_str(" ")?;
            }

            write!(formatter, "{move_}")?;
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::Cube2Algorithm;
    use crate::puzzles::cube2::{Cube2, Cube2Move};

    #[test]
    fn parses_algorithm() {
        let algorithm = Cube2Algorithm::parse("R U R' U'").expect("algorithm should parse");

        assert_eq!(
            algorithm.moves(),
            &[
                Cube2Move::R,
                Cube2Move::U,
                Cube2Move::RPrime,
                Cube2Move::UPrime
            ]
        );
    }

    #[test]
    fn displays_algorithm_as_notation() {
        let algorithm = Cube2Algorithm::new(vec![
            Cube2Move::R,
            Cube2Move::U,
            Cube2Move::RPrime,
            Cube2Move::UPrime,
        ]);

        assert_eq!(algorithm.to_string(), "R U R' U'");
    }

    #[test]
    fn algorithm_inverse_solves_applied_algorithm() {
        let algorithm = Cube2Algorithm::parse("R U R' U'").expect("algorithm should parse");
        let mut cube = Cube2::solved();

        algorithm.apply_to(&mut cube);
        assert!(!cube.is_solved());

        algorithm.inverse().apply_to(&mut cube);
        assert!(cube.is_solved());
    }

    #[test]
    fn parse_display_round_trip_preserves_algorithm() {
        let algorithm = Cube2Algorithm::parse("F2 D' L B2").expect("algorithm should parse");
        let parsed = Cube2Algorithm::parse(&algorithm.to_string())
            .expect("displayed algorithm should parse");

        assert_eq!(parsed, algorithm);
    }
}
