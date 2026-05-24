use std::str::FromStr;

use super::moves::Move;

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct NotationError {
    token: String,
}

impl NotationError {
    pub fn new(token: impl Into<String>) -> Self {
        Self {
            token: token.into(),
        }
    }

    pub fn token(&self) -> &str {
        &self.token
    }
}

impl FromStr for Move {
    type Err = NotationError;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        match value {
            "U" => Ok(Self::U),
            "U2" => Ok(Self::U2),
            "U'" => Ok(Self::UPrime),
            "D" => Ok(Self::D),
            "D2" => Ok(Self::D2),
            "D'" => Ok(Self::DPrime),
            "L" => Ok(Self::L),
            "L2" => Ok(Self::L2),
            "L'" => Ok(Self::LPrime),
            "R" => Ok(Self::R),
            "R2" => Ok(Self::R2),
            "R'" => Ok(Self::RPrime),
            "F" => Ok(Self::F),
            "F2" => Ok(Self::F2),
            "F'" => Ok(Self::FPrime),
            "B" => Ok(Self::B),
            "B2" => Ok(Self::B2),
            "B'" => Ok(Self::BPrime),
            _ => Err(NotationError::new(value)),
        }
    }
}

pub fn parse_algorithm(input: &str) -> Result<Vec<Move>, NotationError> {
    input.split_whitespace().map(str::parse).collect()
}

#[cfg(test)]
mod tests {
    use super::{parse_algorithm, Move};

    #[test]
    fn parses_basic_face_turns() {
        let moves = parse_algorithm("R U R' U'").expect("valid algorithm");

        assert_eq!(moves, vec![Move::R, Move::U, Move::RPrime, Move::UPrime]);
    }
}
