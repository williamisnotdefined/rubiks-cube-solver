use std::fmt;

#[derive(Clone, Copy, Debug, Eq, Hash, PartialEq)]
pub enum Axis {
    X,
    Y,
    Z,
}

#[derive(Clone, Copy, Debug, Eq, Hash, PartialEq)]
pub enum Face {
    U,
    D,
    L,
    R,
    F,
    B,
}

impl Face {
    pub const fn axis(self) -> Axis {
        match self {
            Self::L | Self::R => Axis::X,
            Self::U | Self::D => Axis::Y,
            Self::F | Self::B => Axis::Z,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, Hash, PartialEq)]
pub enum Turn {
    Clockwise,
    Half,
    CounterClockwise,
}

#[derive(Clone, Copy, Debug, Eq, Hash, PartialEq)]
pub enum Move {
    U,
    U2,
    UPrime,
    D,
    D2,
    DPrime,
    L,
    L2,
    LPrime,
    R,
    R2,
    RPrime,
    F,
    F2,
    FPrime,
    B,
    B2,
    BPrime,
}

pub const FACE_MOVES: [Move; 18] = [
    Move::U,
    Move::U2,
    Move::UPrime,
    Move::D,
    Move::D2,
    Move::DPrime,
    Move::L,
    Move::L2,
    Move::LPrime,
    Move::R,
    Move::R2,
    Move::RPrime,
    Move::F,
    Move::F2,
    Move::FPrime,
    Move::B,
    Move::B2,
    Move::BPrime,
];

impl Move {
    pub const fn face(self) -> Face {
        match self {
            Self::U | Self::U2 | Self::UPrime => Face::U,
            Self::D | Self::D2 | Self::DPrime => Face::D,
            Self::L | Self::L2 | Self::LPrime => Face::L,
            Self::R | Self::R2 | Self::RPrime => Face::R,
            Self::F | Self::F2 | Self::FPrime => Face::F,
            Self::B | Self::B2 | Self::BPrime => Face::B,
        }
    }

    pub const fn turn(self) -> Turn {
        match self {
            Self::U | Self::D | Self::L | Self::R | Self::F | Self::B => Turn::Clockwise,
            Self::U2 | Self::D2 | Self::L2 | Self::R2 | Self::F2 | Self::B2 => Turn::Half,
            Self::UPrime
            | Self::DPrime
            | Self::LPrime
            | Self::RPrime
            | Self::FPrime
            | Self::BPrime => Turn::CounterClockwise,
        }
    }

    pub const fn axis(self) -> Axis {
        self.face().axis()
    }

    pub const fn inverse(self) -> Self {
        match self {
            Self::U => Self::UPrime,
            Self::U2 => Self::U2,
            Self::UPrime => Self::U,
            Self::D => Self::DPrime,
            Self::D2 => Self::D2,
            Self::DPrime => Self::D,
            Self::L => Self::LPrime,
            Self::L2 => Self::L2,
            Self::LPrime => Self::L,
            Self::R => Self::RPrime,
            Self::R2 => Self::R2,
            Self::RPrime => Self::R,
            Self::F => Self::FPrime,
            Self::F2 => Self::F2,
            Self::FPrime => Self::F,
            Self::B => Self::BPrime,
            Self::B2 => Self::B2,
            Self::BPrime => Self::B,
        }
    }

    pub const fn notation(self) -> &'static str {
        match self {
            Self::U => "U",
            Self::U2 => "U2",
            Self::UPrime => "U'",
            Self::D => "D",
            Self::D2 => "D2",
            Self::DPrime => "D'",
            Self::L => "L",
            Self::L2 => "L2",
            Self::LPrime => "L'",
            Self::R => "R",
            Self::R2 => "R2",
            Self::RPrime => "R'",
            Self::F => "F",
            Self::F2 => "F2",
            Self::FPrime => "F'",
            Self::B => "B",
            Self::B2 => "B2",
            Self::BPrime => "B'",
        }
    }
}

impl fmt::Display for Move {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.notation())
    }
}
