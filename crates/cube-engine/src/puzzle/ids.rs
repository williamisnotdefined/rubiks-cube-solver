use std::fmt;
use std::str::FromStr;

#[derive(Clone, Copy, Debug, Eq, Hash, PartialEq)]
pub enum PuzzleId {
    Cube3x3x3,
    Cube2x2x2,
    Pyraminx,
    Clock,
    Skewb,
    CubeNxN,
    Square1,
    Megaminx,
}

impl PuzzleId {
    pub const ALL: [Self; 8] = [
        Self::Cube3x3x3,
        Self::Cube2x2x2,
        Self::Pyraminx,
        Self::Clock,
        Self::Skewb,
        Self::CubeNxN,
        Self::Square1,
        Self::Megaminx,
    ];

    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Cube3x3x3 => "cube/3x3x3",
            Self::Cube2x2x2 => "cube/2x2x2",
            Self::Pyraminx => "pyraminx",
            Self::Clock => "clock",
            Self::Skewb => "skewb",
            Self::CubeNxN => "cube/nxn",
            Self::Square1 => "square1",
            Self::Megaminx => "megaminx",
        }
    }

    pub const fn slug(self) -> &'static str {
        match self {
            Self::Cube3x3x3 => "cube-3x3x3",
            Self::Cube2x2x2 => "cube-2x2x2",
            Self::Pyraminx => "pyraminx",
            Self::Clock => "clock",
            Self::Skewb => "skewb",
            Self::CubeNxN => "cube-nxn",
            Self::Square1 => "square1",
            Self::Megaminx => "megaminx",
        }
    }

    pub fn from_slug(slug: &str) -> Option<Self> {
        match slug {
            "cube-3x3x3" => Some(Self::Cube3x3x3),
            "cube-2x2x2" => Some(Self::Cube2x2x2),
            "pyraminx" => Some(Self::Pyraminx),
            "clock" => Some(Self::Clock),
            "skewb" => Some(Self::Skewb),
            "cube-nxn" => Some(Self::CubeNxN),
            "square1" => Some(Self::Square1),
            "megaminx" => Some(Self::Megaminx),
            _ => None,
        }
    }
}

impl fmt::Display for PuzzleId {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.as_str())
    }
}

impl FromStr for PuzzleId {
    type Err = String;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        match value {
            "cube/3x3x3" => Ok(Self::Cube3x3x3),
            "cube/2x2x2" => Ok(Self::Cube2x2x2),
            "pyraminx" => Ok(Self::Pyraminx),
            "clock" => Ok(Self::Clock),
            "skewb" => Ok(Self::Skewb),
            "cube/nxn" => Ok(Self::CubeNxN),
            "square1" => Ok(Self::Square1),
            "megaminx" => Ok(Self::Megaminx),
            _ => Err(format!("unknown puzzle id: {value}")),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::PuzzleId;

    #[test]
    fn puzzle_id_round_trips_through_internal_id() {
        for puzzle_id in PuzzleId::ALL {
            let parsed = puzzle_id
                .as_str()
                .parse::<PuzzleId>()
                .expect("puzzle id should parse");

            assert_eq!(parsed, puzzle_id);
        }
    }

    #[test]
    fn puzzle_id_round_trips_through_api_slug() {
        for puzzle_id in PuzzleId::ALL {
            assert_eq!(PuzzleId::from_slug(puzzle_id.slug()), Some(puzzle_id));
        }
    }

    #[test]
    fn rejects_unknown_puzzle_id_and_slug() {
        assert!("cube/2x3x3".parse::<PuzzleId>().is_err());
        assert_eq!(PuzzleId::from_slug("cube-2x3x3"), None);
    }
}
