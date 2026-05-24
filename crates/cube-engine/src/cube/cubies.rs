pub const CORNER_COUNT: usize = 8;
pub const EDGE_COUNT: usize = 12;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
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
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
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
}

#[derive(Clone, Debug, Eq, PartialEq)]
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
    use super::{Corner, CubeValidationError, CubieState, Edge};

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
}
