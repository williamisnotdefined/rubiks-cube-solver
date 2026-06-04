use std::fmt;

#[derive(Clone, Copy, Debug, Eq, Hash, PartialEq)]
pub enum Cube2Axis {
    X,
    Y,
    Z,
}

#[derive(Clone, Copy, Debug, Eq, Hash, PartialEq)]
pub enum Cube2Face {
    U,
    D,
    L,
    R,
    F,
    B,
}

impl Cube2Face {
    pub const fn axis(self) -> Cube2Axis {
        match self {
            Self::L | Self::R => Cube2Axis::X,
            Self::U | Self::D => Cube2Axis::Y,
            Self::F | Self::B => Cube2Axis::Z,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, Hash, PartialEq)]
pub enum Cube2Turn {
    Clockwise,
    Half,
    CounterClockwise,
}

#[derive(Clone, Copy, Debug, Eq, Hash, PartialEq)]
pub enum Cube2Move {
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

pub const CUBE2_FACE_MOVES: [Cube2Move; 18] = [
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
];

impl Cube2Move {
    pub const fn face(self) -> Cube2Face {
        match self {
            Self::U | Self::U2 | Self::UPrime => Cube2Face::U,
            Self::D | Self::D2 | Self::DPrime => Cube2Face::D,
            Self::L | Self::L2 | Self::LPrime => Cube2Face::L,
            Self::R | Self::R2 | Self::RPrime => Cube2Face::R,
            Self::F | Self::F2 | Self::FPrime => Cube2Face::F,
            Self::B | Self::B2 | Self::BPrime => Cube2Face::B,
        }
    }

    pub const fn turn(self) -> Cube2Turn {
        match self {
            Self::U | Self::D | Self::L | Self::R | Self::F | Self::B => Cube2Turn::Clockwise,
            Self::U2 | Self::D2 | Self::L2 | Self::R2 | Self::F2 | Self::B2 => Cube2Turn::Half,
            Self::UPrime
            | Self::DPrime
            | Self::LPrime
            | Self::RPrime
            | Self::FPrime
            | Self::BPrime => Cube2Turn::CounterClockwise,
        }
    }

    pub const fn axis(self) -> Cube2Axis {
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

impl fmt::Display for Cube2Move {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.notation())
    }
}
