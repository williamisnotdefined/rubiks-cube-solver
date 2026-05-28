use std::fmt;

use super::FACELET_SYMBOL_COUNT;

#[derive(Clone, Copy, Debug, Eq, Hash, PartialEq)]
pub enum Facelet {
    U,
    R,
    F,
    D,
    L,
    B,
}

impl Facelet {
    pub const ALL: [Self; FACELET_SYMBOL_COUNT] =
        [Self::U, Self::R, Self::F, Self::D, Self::L, Self::B];

    pub const fn symbol(self) -> char {
        match self {
            Self::U => 'U',
            Self::R => 'R',
            Self::F => 'F',
            Self::D => 'D',
            Self::L => 'L',
            Self::B => 'B',
        }
    }

    pub const fn index(self) -> usize {
        match self {
            Self::U => 0,
            Self::R => 1,
            Self::F => 2,
            Self::D => 3,
            Self::L => 4,
            Self::B => 5,
        }
    }

    pub const fn from_symbol(symbol: char) -> Option<Self> {
        match symbol {
            'U' => Some(Self::U),
            'R' => Some(Self::R),
            'F' => Some(Self::F),
            'D' => Some(Self::D),
            'L' => Some(Self::L),
            'B' => Some(Self::B),
            _ => None,
        }
    }
}

impl fmt::Display for Facelet {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "{}", self.symbol())
    }
}
