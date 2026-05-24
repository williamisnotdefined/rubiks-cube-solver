use std::fmt;
use std::str::FromStr;

use super::moves::Move;
use super::notation::{parse_algorithm, NotationError};
use super::state::Cube;

#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct Algorithm {
    moves: Vec<Move>,
}

impl Algorithm {
    pub fn new(moves: Vec<Move>) -> Self {
        Self { moves }
    }

    pub fn parse(input: &str) -> Result<Self, NotationError> {
        input.parse()
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

    pub fn inverse(&self) -> Self {
        Self::new(
            self.moves
                .iter()
                .rev()
                .map(|move_| move_.inverse())
                .collect(),
        )
    }

    pub fn apply_to(&self, cube: &mut Cube) {
        cube.apply_moves(&self.moves);
    }
}

impl From<Vec<Move>> for Algorithm {
    fn from(moves: Vec<Move>) -> Self {
        Self::new(moves)
    }
}

impl FromStr for Algorithm {
    type Err = NotationError;

    fn from_str(input: &str) -> Result<Self, Self::Err> {
        Ok(Self::new(parse_algorithm(input)?))
    }
}

impl fmt::Display for Algorithm {
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
    use super::Algorithm;
    use crate::cube::{Cube, Move};

    #[test]
    fn parses_algorithm() {
        let algorithm = Algorithm::parse("R U R' U'").expect("algorithm should parse");

        assert_eq!(
            algorithm.moves(),
            &[Move::R, Move::U, Move::RPrime, Move::UPrime]
        );
    }

    #[test]
    fn displays_algorithm_as_notation() {
        let algorithm = Algorithm::new(vec![Move::R, Move::U, Move::RPrime, Move::UPrime]);

        assert_eq!(algorithm.to_string(), "R U R' U'");
    }

    #[test]
    fn algorithm_inverse_solves_applied_algorithm() {
        let algorithm = Algorithm::parse("R U R' U'").expect("algorithm should parse");
        let mut cube = Cube::solved();

        algorithm.apply_to(&mut cube);
        assert!(!cube.is_solved());

        algorithm.inverse().apply_to(&mut cube);
        assert!(cube.is_solved());
    }

    #[test]
    fn parse_display_round_trip_preserves_algorithm() {
        let algorithm = Algorithm::parse("F2 D' L B2").expect("algorithm should parse");
        let parsed =
            Algorithm::parse(&algorithm.to_string()).expect("displayed algorithm should parse");

        assert_eq!(parsed, algorithm);
    }
}
