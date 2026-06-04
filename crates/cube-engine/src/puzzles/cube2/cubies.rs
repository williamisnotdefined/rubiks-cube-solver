use std::fmt;
use std::str::FromStr;

pub const CUBE2_CORNER_COUNT: usize = 8;

#[derive(Clone, Copy, Debug, Eq, Hash, PartialEq)]
pub enum Cube2Corner {
    Urf,
    Ufl,
    Ulb,
    Ubr,
    Dfr,
    Dlf,
    Dbl,
    Drb,
}

impl Cube2Corner {
    pub const ALL: [Self; CUBE2_CORNER_COUNT] = [
        Self::Urf,
        Self::Ufl,
        Self::Ulb,
        Self::Ubr,
        Self::Dfr,
        Self::Dlf,
        Self::Dbl,
        Self::Drb,
    ];

    pub const fn index(self) -> usize {
        match self {
            Self::Urf => 0,
            Self::Ufl => 1,
            Self::Ulb => 2,
            Self::Ubr => 3,
            Self::Dfr => 4,
            Self::Dlf => 5,
            Self::Dbl => 6,
            Self::Drb => 7,
        }
    }

    pub fn from_index(index: usize) -> Option<Self> {
        Self::ALL.get(index).copied()
    }
}

#[derive(Clone, Debug, Eq, Hash, PartialEq)]
pub struct Cube2State {
    pub corner_permutation: [Cube2Corner; CUBE2_CORNER_COUNT],
    pub corner_orientation: [u8; CUBE2_CORNER_COUNT],
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Cube2ValidationError {
    DuplicateCorner { corner: Cube2Corner },
    MissingCorner { corner: Cube2Corner },
    InvalidCornerOrientation { position: usize, orientation: u8 },
    InvalidCornerOrientationSum { sum: u16 },
}

impl fmt::Display for Cube2ValidationError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::DuplicateCorner { corner } => write!(formatter, "duplicate corner: {corner:?}"),
            Self::MissingCorner { corner } => write!(formatter, "missing corner: {corner:?}"),
            Self::InvalidCornerOrientation {
                position,
                orientation,
            } => write!(
                formatter,
                "invalid corner orientation at position {position}: {orientation}"
            ),
            Self::InvalidCornerOrientationSum { sum } => {
                write!(formatter, "invalid corner orientation sum: {sum}")
            }
        }
    }
}

impl std::error::Error for Cube2ValidationError {}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Cube2StateParseError {
    DuplicateSection {
        section: &'static str,
    },
    MissingSection {
        section: &'static str,
    },
    UnknownSection {
        section: String,
    },
    InvalidSection {
        section: String,
    },
    InvalidNumber {
        section: &'static str,
        value: String,
    },
    WrongValueCount {
        section: &'static str,
        expected: usize,
        actual: usize,
    },
    InvalidCornerIndex {
        position: usize,
        index: usize,
    },
    InvalidState {
        error: Cube2ValidationError,
    },
}

impl Cube2State {
    pub const fn solved() -> Self {
        Self {
            corner_permutation: Cube2Corner::ALL,
            corner_orientation: [0; CUBE2_CORNER_COUNT],
        }
    }

    pub fn is_solved(&self) -> bool {
        self == &Self::solved()
    }

    pub fn validate(&self) -> Result<(), Cube2ValidationError> {
        validate_corner_permutation(&self.corner_permutation)?;
        validate_corner_orientation(&self.corner_orientation)?;

        Ok(())
    }

    pub fn is_valid(&self) -> bool {
        self.validate().is_ok()
    }

    pub fn serialize(&self) -> String {
        self.to_string()
    }

    pub fn deserialize(input: &str) -> Result<Self, Cube2StateParseError> {
        input.parse()
    }
}

impl fmt::Display for Cube2State {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str("cp=")?;
        for (position, corner) in self.corner_permutation.iter().enumerate() {
            write_separator(formatter, position)?;
            write!(formatter, "{}", corner.index())?;
        }

        formatter.write_str(";co=")?;
        for (position, orientation) in self.corner_orientation.iter().enumerate() {
            write_separator(formatter, position)?;
            write!(formatter, "{orientation}")?;
        }

        Ok(())
    }
}

impl FromStr for Cube2State {
    type Err = Cube2StateParseError;

    fn from_str(input: &str) -> Result<Self, Self::Err> {
        let mut corner_permutation = None;
        let mut corner_orientation = None;

        for section in input.split(';') {
            let (key, value) =
                section
                    .split_once('=')
                    .ok_or_else(|| Cube2StateParseError::InvalidSection {
                        section: section.to_owned(),
                    })?;

            match key {
                "cp" => set_section(&mut corner_permutation, "cp", value)?,
                "co" => set_section(&mut corner_orientation, "co", value)?,
                _ => {
                    return Err(Cube2StateParseError::UnknownSection {
                        section: key.to_owned(),
                    });
                }
            }
        }

        let corner_permutation_values = parse_values::<CUBE2_CORNER_COUNT>(
            "cp",
            corner_permutation.ok_or(Cube2StateParseError::MissingSection { section: "cp" })?,
        )?;
        let corner_orientation = parse_values::<CUBE2_CORNER_COUNT>(
            "co",
            corner_orientation.ok_or(Cube2StateParseError::MissingSection { section: "co" })?,
        )?;

        let mut corner_permutation = Cube2Corner::ALL;
        for (position, index) in corner_permutation_values.iter().copied().enumerate() {
            corner_permutation[position] = Cube2Corner::from_index(usize::from(index)).ok_or(
                Cube2StateParseError::InvalidCornerIndex {
                    position,
                    index: usize::from(index),
                },
            )?;
        }

        let state = Self {
            corner_permutation,
            corner_orientation,
        };

        state
            .validate()
            .map_err(|error| Cube2StateParseError::InvalidState { error })?;

        Ok(state)
    }
}

fn write_separator(formatter: &mut fmt::Formatter<'_>, position: usize) -> fmt::Result {
    if position > 0 {
        formatter.write_str(",")?;
    }

    Ok(())
}

fn set_section<'a>(
    slot: &mut Option<&'a str>,
    section: &'static str,
    value: &'a str,
) -> Result<(), Cube2StateParseError> {
    if slot.replace(value).is_some() {
        return Err(Cube2StateParseError::DuplicateSection { section });
    }

    Ok(())
}

fn parse_values<const N: usize>(
    section: &'static str,
    value: &str,
) -> Result<[u8; N], Cube2StateParseError> {
    let parts = value.split(',').collect::<Vec<_>>();

    if parts.len() != N {
        return Err(Cube2StateParseError::WrongValueCount {
            section,
            expected: N,
            actual: parts.len(),
        });
    }

    let mut values = [0_u8; N];
    for (position, part) in parts.iter().copied().enumerate() {
        values[position] = part
            .parse()
            .map_err(|_| Cube2StateParseError::InvalidNumber {
                section,
                value: part.to_owned(),
            })?;
    }

    Ok(values)
}

fn validate_corner_permutation(
    permutation: &[Cube2Corner; CUBE2_CORNER_COUNT],
) -> Result<(), Cube2ValidationError> {
    let mut counts = [0_u8; CUBE2_CORNER_COUNT];

    for corner in permutation {
        let index = corner.index();
        counts[index] += 1;

        if counts[index] > 1 {
            return Err(Cube2ValidationError::DuplicateCorner { corner: *corner });
        }
    }

    for corner in Cube2Corner::ALL {
        if counts[corner.index()] == 0 {
            return Err(Cube2ValidationError::MissingCorner { corner });
        }
    }

    Ok(())
}

fn validate_corner_orientation(
    orientations: &[u8; CUBE2_CORNER_COUNT],
) -> Result<(), Cube2ValidationError> {
    let mut sum = 0_u16;

    for (position, orientation) in orientations.iter().copied().enumerate() {
        if orientation > 2 {
            return Err(Cube2ValidationError::InvalidCornerOrientation {
                position,
                orientation,
            });
        }

        sum += u16::from(orientation);
    }

    if !sum.is_multiple_of(3) {
        return Err(Cube2ValidationError::InvalidCornerOrientationSum { sum });
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{Cube2Corner, Cube2State, Cube2StateParseError, Cube2ValidationError};

    #[test]
    fn solved_state_is_solved_and_valid() {
        let state = Cube2State::solved();

        assert!(state.is_solved());
        assert!(state.is_valid());
    }

    #[test]
    fn duplicate_corner_is_invalid() {
        let mut state = Cube2State::solved();
        state.corner_permutation[1] = Cube2Corner::Urf;

        assert_eq!(
            state.validate(),
            Err(Cube2ValidationError::DuplicateCorner {
                corner: Cube2Corner::Urf
            })
        );
    }

    #[test]
    fn missing_corner_is_invalid() {
        let mut state = Cube2State::solved();
        state.corner_permutation[Cube2Corner::Dfr.index()] = Cube2Corner::Urf;

        assert_eq!(
            state.validate(),
            Err(Cube2ValidationError::DuplicateCorner {
                corner: Cube2Corner::Urf
            })
        );

        let parsed = Cube2State::deserialize("cp=0,1,2,3,0,5,6,7;co=0,0,0,0,0,0,0,0");
        assert!(matches!(
            parsed,
            Err(Cube2StateParseError::InvalidState { .. })
        ));
    }

    #[test]
    fn invalid_corner_orientation_value_is_invalid() {
        let mut state = Cube2State::solved();
        state.corner_orientation[0] = 3;

        assert_eq!(
            state.validate(),
            Err(Cube2ValidationError::InvalidCornerOrientation {
                position: 0,
                orientation: 3
            })
        );
    }

    #[test]
    fn invalid_corner_orientation_sum_is_invalid() {
        let mut state = Cube2State::solved();
        state.corner_orientation[0] = 1;

        assert_eq!(
            state.validate(),
            Err(Cube2ValidationError::InvalidCornerOrientationSum { sum: 1 })
        );
    }

    #[test]
    fn serializes_solved_state_to_stable_text() {
        assert_eq!(
            Cube2State::solved().serialize(),
            "cp=0,1,2,3,4,5,6,7;co=0,0,0,0,0,0,0,0"
        );
    }

    #[test]
    fn deserializes_solved_state() {
        let parsed = Cube2State::deserialize("cp=0,1,2,3,4,5,6,7;co=0,0,0,0,0,0,0,0")
            .expect("solved state should parse");

        assert_eq!(parsed, Cube2State::solved());
    }

    #[test]
    fn rejects_deserialized_invalid_state() {
        let parsed = Cube2State::deserialize("cp=0,1,2,3,4,5,6,7;co=1,0,0,0,0,0,0,0");

        assert!(matches!(
            parsed,
            Err(Cube2StateParseError::InvalidState {
                error: Cube2ValidationError::InvalidCornerOrientationSum { sum: 1 }
            })
        ));
    }
}
