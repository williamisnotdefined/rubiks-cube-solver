use std::fmt;
use std::str::FromStr;

pub const CORNER_COUNT: usize = 8;
pub const EDGE_COUNT: usize = 12;

#[derive(Clone, Copy, Debug, Eq, Hash, PartialEq)]
pub enum Corner {
    Urf,
    Ufl,
    Ulb,
    Ubr,
    Dfr,
    Dlf,
    Dbl,
    Drb,
}

impl Corner {
    pub const ALL: [Self; CORNER_COUNT] = [
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

#[derive(Clone, Copy, Debug, Eq, Hash, PartialEq)]
pub enum Edge {
    Ur,
    Uf,
    Ul,
    Ub,
    Dr,
    Df,
    Dl,
    Db,
    Fr,
    Fl,
    Bl,
    Br,
}

impl Edge {
    pub const ALL: [Self; EDGE_COUNT] = [
        Self::Ur,
        Self::Uf,
        Self::Ul,
        Self::Ub,
        Self::Dr,
        Self::Df,
        Self::Dl,
        Self::Db,
        Self::Fr,
        Self::Fl,
        Self::Bl,
        Self::Br,
    ];

    pub const fn index(self) -> usize {
        match self {
            Self::Ur => 0,
            Self::Uf => 1,
            Self::Ul => 2,
            Self::Ub => 3,
            Self::Dr => 4,
            Self::Df => 5,
            Self::Dl => 6,
            Self::Db => 7,
            Self::Fr => 8,
            Self::Fl => 9,
            Self::Bl => 10,
            Self::Br => 11,
        }
    }

    pub fn from_index(index: usize) -> Option<Self> {
        Self::ALL.get(index).copied()
    }
}

#[derive(Clone, Debug, Eq, Hash, PartialEq)]
pub struct CubieState {
    pub corner_permutation: [Corner; CORNER_COUNT],
    pub corner_orientation: [u8; CORNER_COUNT],
    pub edge_permutation: [Edge; EDGE_COUNT],
    pub edge_orientation: [u8; EDGE_COUNT],
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum CubeValidationError {
    DuplicateCorner {
        corner: Corner,
    },
    MissingCorner {
        corner: Corner,
    },
    DuplicateEdge {
        edge: Edge,
    },
    MissingEdge {
        edge: Edge,
    },
    InvalidCornerOrientation {
        position: usize,
        orientation: u8,
    },
    InvalidEdgeOrientation {
        position: usize,
        orientation: u8,
    },
    InvalidCornerOrientationSum {
        sum: u16,
    },
    InvalidEdgeOrientationSum {
        sum: u16,
    },
    InvalidPermutationParity {
        corner_parity_odd: bool,
        edge_parity_odd: bool,
    },
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum CubieStateParseError {
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
    InvalidEdgeIndex {
        position: usize,
        index: usize,
    },
    InvalidState {
        error: CubeValidationError,
    },
}

impl CubieState {
    pub const fn solved() -> Self {
        Self {
            corner_permutation: Corner::ALL,
            corner_orientation: [0; CORNER_COUNT],
            edge_permutation: Edge::ALL,
            edge_orientation: [0; EDGE_COUNT],
        }
    }

    pub fn is_solved(&self) -> bool {
        self == &Self::solved()
    }

    pub fn validate(&self) -> Result<(), CubeValidationError> {
        validate_corner_permutation(&self.corner_permutation)?;
        validate_edge_permutation(&self.edge_permutation)?;
        validate_corner_orientation(&self.corner_orientation)?;
        validate_edge_orientation(&self.edge_orientation)?;

        let corner_parity_odd = corner_permutation_parity_odd(&self.corner_permutation);
        let edge_parity_odd = edge_permutation_parity_odd(&self.edge_permutation);

        if corner_parity_odd != edge_parity_odd {
            return Err(CubeValidationError::InvalidPermutationParity {
                corner_parity_odd,
                edge_parity_odd,
            });
        }

        Ok(())
    }

    pub fn is_valid(&self) -> bool {
        self.validate().is_ok()
    }

    pub fn serialize(&self) -> String {
        self.to_string()
    }

    pub fn deserialize(input: &str) -> Result<Self, CubieStateParseError> {
        input.parse()
    }
}

impl fmt::Display for CubieState {
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

        formatter.write_str(";ep=")?;
        for (position, edge) in self.edge_permutation.iter().enumerate() {
            write_separator(formatter, position)?;
            write!(formatter, "{}", edge.index())?;
        }

        formatter.write_str(";eo=")?;
        for (position, orientation) in self.edge_orientation.iter().enumerate() {
            write_separator(formatter, position)?;
            write!(formatter, "{orientation}")?;
        }

        Ok(())
    }
}

impl FromStr for CubieState {
    type Err = CubieStateParseError;

    fn from_str(input: &str) -> Result<Self, Self::Err> {
        let mut corner_permutation = None;
        let mut corner_orientation = None;
        let mut edge_permutation = None;
        let mut edge_orientation = None;

        for section in input.split(';') {
            let (key, value) =
                section
                    .split_once('=')
                    .ok_or_else(|| CubieStateParseError::InvalidSection {
                        section: section.to_owned(),
                    })?;

            match key {
                "cp" => set_section(&mut corner_permutation, "cp", value)?,
                "co" => set_section(&mut corner_orientation, "co", value)?,
                "ep" => set_section(&mut edge_permutation, "ep", value)?,
                "eo" => set_section(&mut edge_orientation, "eo", value)?,
                _ => {
                    return Err(CubieStateParseError::UnknownSection {
                        section: key.to_owned(),
                    });
                }
            }
        }

        let corner_permutation_values = parse_values::<CORNER_COUNT>(
            "cp",
            corner_permutation.ok_or(CubieStateParseError::MissingSection { section: "cp" })?,
        )?;
        let corner_orientation = parse_values::<CORNER_COUNT>(
            "co",
            corner_orientation.ok_or(CubieStateParseError::MissingSection { section: "co" })?,
        )?;
        let edge_permutation_values = parse_values::<EDGE_COUNT>(
            "ep",
            edge_permutation.ok_or(CubieStateParseError::MissingSection { section: "ep" })?,
        )?;
        let edge_orientation = parse_values::<EDGE_COUNT>(
            "eo",
            edge_orientation.ok_or(CubieStateParseError::MissingSection { section: "eo" })?,
        )?;

        let mut corner_permutation = Corner::ALL;
        for (position, index) in corner_permutation_values.iter().copied().enumerate() {
            corner_permutation[position] = Corner::from_index(usize::from(index)).ok_or(
                CubieStateParseError::InvalidCornerIndex {
                    position,
                    index: usize::from(index),
                },
            )?;
        }

        let mut edge_permutation = Edge::ALL;
        for (position, index) in edge_permutation_values.iter().copied().enumerate() {
            edge_permutation[position] = Edge::from_index(usize::from(index)).ok_or(
                CubieStateParseError::InvalidEdgeIndex {
                    position,
                    index: usize::from(index),
                },
            )?;
        }

        let state = Self {
            corner_permutation,
            corner_orientation,
            edge_permutation,
            edge_orientation,
        };

        state
            .validate()
            .map_err(|error| CubieStateParseError::InvalidState { error })?;

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
) -> Result<(), CubieStateParseError> {
    if slot.replace(value).is_some() {
        return Err(CubieStateParseError::DuplicateSection { section });
    }

    Ok(())
}

fn parse_values<const N: usize>(
    section: &'static str,
    value: &str,
) -> Result<[u8; N], CubieStateParseError> {
    let parts = value.split(',').collect::<Vec<_>>();

    if parts.len() != N {
        return Err(CubieStateParseError::WrongValueCount {
            section,
            expected: N,
            actual: parts.len(),
        });
    }

    let mut values = [0_u8; N];
    for (position, part) in parts.iter().copied().enumerate() {
        values[position] = part
            .parse()
            .map_err(|_| CubieStateParseError::InvalidNumber {
                section,
                value: part.to_owned(),
            })?;
    }

    Ok(values)
}

fn validate_corner_permutation(
    permutation: &[Corner; CORNER_COUNT],
) -> Result<(), CubeValidationError> {
    let mut counts = [0_u8; CORNER_COUNT];

    for corner in permutation {
        let index = corner.index();
        counts[index] += 1;

        if counts[index] > 1 {
            return Err(CubeValidationError::DuplicateCorner { corner: *corner });
        }
    }

    for corner in Corner::ALL {
        if counts[corner.index()] == 0 {
            return Err(CubeValidationError::MissingCorner { corner });
        }
    }

    Ok(())
}

fn validate_edge_permutation(permutation: &[Edge; EDGE_COUNT]) -> Result<(), CubeValidationError> {
    let mut counts = [0_u8; EDGE_COUNT];

    for edge in permutation {
        let index = edge.index();
        counts[index] += 1;

        if counts[index] > 1 {
            return Err(CubeValidationError::DuplicateEdge { edge: *edge });
        }
    }

    for edge in Edge::ALL {
        if counts[edge.index()] == 0 {
            return Err(CubeValidationError::MissingEdge { edge });
        }
    }

    Ok(())
}

fn validate_corner_orientation(
    orientations: &[u8; CORNER_COUNT],
) -> Result<(), CubeValidationError> {
    let mut sum = 0_u16;

    for (position, orientation) in orientations.iter().copied().enumerate() {
        if orientation > 2 {
            return Err(CubeValidationError::InvalidCornerOrientation {
                position,
                orientation,
            });
        }

        sum += u16::from(orientation);
    }

    if !sum.is_multiple_of(3) {
        return Err(CubeValidationError::InvalidCornerOrientationSum { sum });
    }

    Ok(())
}

fn validate_edge_orientation(orientations: &[u8; EDGE_COUNT]) -> Result<(), CubeValidationError> {
    let mut sum = 0_u16;

    for (position, orientation) in orientations.iter().copied().enumerate() {
        if orientation > 1 {
            return Err(CubeValidationError::InvalidEdgeOrientation {
                position,
                orientation,
            });
        }

        sum += u16::from(orientation);
    }

    if !sum.is_multiple_of(2) {
        return Err(CubeValidationError::InvalidEdgeOrientationSum { sum });
    }

    Ok(())
}

fn corner_permutation_parity_odd(permutation: &[Corner; CORNER_COUNT]) -> bool {
    let mut inversions = 0;

    for left in 0..CORNER_COUNT {
        for right in (left + 1)..CORNER_COUNT {
            if permutation[left].index() > permutation[right].index() {
                inversions += 1;
            }
        }
    }

    inversions % 2 == 1
}

fn edge_permutation_parity_odd(permutation: &[Edge; EDGE_COUNT]) -> bool {
    let mut inversions = 0;

    for left in 0..EDGE_COUNT {
        for right in (left + 1)..EDGE_COUNT {
            if permutation[left].index() > permutation[right].index() {
                inversions += 1;
            }
        }
    }

    inversions % 2 == 1
}

#[cfg(test)]
mod tests {
    use super::{Corner, CubeValidationError, CubieState, CubieStateParseError, Edge};

    #[test]
    fn solved_state_is_solved() {
        assert!(CubieState::solved().is_solved());
    }

    #[test]
    fn solved_state_is_valid() {
        assert!(CubieState::solved().is_valid());
    }

    #[test]
    fn duplicate_corner_is_invalid() {
        let mut state = CubieState::solved();
        state.corner_permutation[0] = Corner::Ufl;

        assert_eq!(
            state.validate(),
            Err(CubeValidationError::DuplicateCorner {
                corner: Corner::Ufl
            })
        );
    }

    #[test]
    fn duplicate_edge_is_invalid() {
        let mut state = CubieState::solved();
        state.edge_permutation[0] = Edge::Uf;

        assert_eq!(
            state.validate(),
            Err(CubeValidationError::DuplicateEdge { edge: Edge::Uf })
        );
    }

    #[test]
    fn corner_orientation_out_of_range_is_invalid() {
        let mut state = CubieState::solved();
        state.corner_orientation[0] = 3;

        assert_eq!(
            state.validate(),
            Err(CubeValidationError::InvalidCornerOrientation {
                position: 0,
                orientation: 3
            })
        );
    }

    #[test]
    fn edge_orientation_out_of_range_is_invalid() {
        let mut state = CubieState::solved();
        state.edge_orientation[0] = 2;

        assert_eq!(
            state.validate(),
            Err(CubeValidationError::InvalidEdgeOrientation {
                position: 0,
                orientation: 2
            })
        );
    }

    #[test]
    fn invalid_corner_orientation_sum_is_invalid() {
        let mut state = CubieState::solved();
        state.corner_orientation[0] = 1;

        assert_eq!(
            state.validate(),
            Err(CubeValidationError::InvalidCornerOrientationSum { sum: 1 })
        );
    }

    #[test]
    fn invalid_edge_orientation_sum_is_invalid() {
        let mut state = CubieState::solved();
        state.edge_orientation[0] = 1;

        assert_eq!(
            state.validate(),
            Err(CubeValidationError::InvalidEdgeOrientationSum { sum: 1 })
        );
    }

    #[test]
    fn unmatched_permutation_parity_is_invalid() {
        let mut state = CubieState::solved();
        state.corner_permutation.swap(0, 1);

        assert_eq!(
            state.validate(),
            Err(CubeValidationError::InvalidPermutationParity {
                corner_parity_odd: true,
                edge_parity_odd: false
            })
        );
    }

    #[test]
    fn serializes_solved_state_to_stable_text() {
        assert_eq!(
            CubieState::solved().serialize(),
            "cp=0,1,2,3,4,5,6,7;co=0,0,0,0,0,0,0,0;ep=0,1,2,3,4,5,6,7,8,9,10,11;eo=0,0,0,0,0,0,0,0,0,0,0,0"
        );
    }

    #[test]
    fn deserializes_solved_state() {
        let serialized = CubieState::solved().serialize();

        assert_eq!(
            CubieState::deserialize(&serialized).expect("serialized state should parse"),
            CubieState::solved()
        );
    }

    #[test]
    fn rejects_deserialized_invalid_state() {
        let serialized = "cp=0,1,2,3,4,5,6,7;co=1,0,0,0,0,0,0,0;ep=0,1,2,3,4,5,6,7,8,9,10,11;eo=0,0,0,0,0,0,0,0,0,0,0,0";

        assert_eq!(
            CubieState::deserialize(serialized),
            Err(CubieStateParseError::InvalidState {
                error: CubeValidationError::InvalidCornerOrientationSum { sum: 1 }
            })
        );
    }
}
