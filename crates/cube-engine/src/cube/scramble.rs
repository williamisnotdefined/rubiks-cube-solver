use super::moves::Move;
use super::notation::{parse_algorithm, NotationError};

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Scramble {
    moves: Vec<Move>,
}

impl Scramble {
    pub fn parse(input: &str) -> Result<Self, NotationError> {
        Ok(Self {
            moves: parse_algorithm(input)?,
        })
    }

    pub fn moves(&self) -> &[Move] {
        &self.moves
    }

    pub fn inverse(&self) -> Vec<Move> {
        self.moves.iter().rev().map(|move_| move_.inverse()).collect()
    }
}
