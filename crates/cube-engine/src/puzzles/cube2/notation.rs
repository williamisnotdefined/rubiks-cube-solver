use std::{fmt, str::FromStr};

use super::moves::Cube2Move;

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Cube2NotationError {
    token: String,
}

impl Cube2NotationError {
    pub fn new(token: impl Into<String>) -> Self {
        Self {
            token: token.into(),
        }
    }

    pub fn token(&self) -> &str {
        &self.token
    }
}

impl fmt::Display for Cube2NotationError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            formatter,
            "invalid 2x2 move notation token: {:?}",
            self.token
        )
    }
}

impl std::error::Error for Cube2NotationError {}

impl FromStr for Cube2Move {
    type Err = Cube2NotationError;

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
            _ => Err(Cube2NotationError::new(value)),
        }
    }
}

pub fn parse_cube2_algorithm(input: &str) -> Result<Vec<Cube2Move>, Cube2NotationError> {
    input.split_whitespace().map(str::parse).collect()
}

#[cfg(test)]
mod tests {
    use super::{parse_cube2_algorithm, Cube2Move};

    #[test]
    fn parses_all_basic_face_turns() {
        let moves = parse_cube2_algorithm("U U2 U' D D2 D' L L2 L' R R2 R' F F2 F' B B2 B'")
            .expect("legal 2x2 tokens should parse");

        assert_eq!(
            moves,
            vec![
                Cube2Move::U,
                Cube2Move::U2,
                Cube2Move::UPrime,
                Cube2Move::D,
                Cube2Move::D2,
                Cube2Move::DPrime,
                Cube2Move::L,
                Cube2Move::L2,
                Cube2Move::LPrime,
                Cube2Move::R,
                Cube2Move::R2,
                Cube2Move::RPrime,
                Cube2Move::F,
                Cube2Move::F2,
                Cube2Move::FPrime,
                Cube2Move::B,
                Cube2Move::B2,
                Cube2Move::BPrime,
            ]
        );
    }

    #[test]
    fn rejects_wide_slice_rotation_and_invalid_tokens() {
        for token in ["Rw", "M", "E", "S", "x", "y", "z", "3Uw", "invalid"] {
            let error = token
                .parse::<Cube2Move>()
                .expect_err("invalid token should be rejected");

            assert_eq!(error.token(), token);
        }
    }
}
