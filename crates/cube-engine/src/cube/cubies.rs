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

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CubieState {
    pub corner_permutation: [Corner; CORNER_COUNT],
    pub corner_orientation: [u8; CORNER_COUNT],
    pub edge_permutation: [Edge; EDGE_COUNT],
    pub edge_orientation: [u8; EDGE_COUNT],
}

impl CubieState {
    pub const fn solved() -> Self {
        Self {
            corner_permutation: [
                Corner::Urf,
                Corner::Ufl,
                Corner::Ulb,
                Corner::Ubr,
                Corner::Dfr,
                Corner::Dlf,
                Corner::Dbl,
                Corner::Drb,
            ],
            corner_orientation: [0; CORNER_COUNT],
            edge_permutation: [
                Edge::Ur,
                Edge::Uf,
                Edge::Ul,
                Edge::Ub,
                Edge::Dr,
                Edge::Df,
                Edge::Dl,
                Edge::Db,
                Edge::Fr,
                Edge::Fl,
                Edge::Bl,
                Edge::Br,
            ],
            edge_orientation: [0; EDGE_COUNT],
        }
    }

    pub fn is_solved(&self) -> bool {
        self == &Self::solved()
    }
}

#[cfg(test)]
mod tests {
    use super::CubieState;

    #[test]
    fn solved_state_is_solved() {
        assert!(CubieState::solved().is_solved());
    }
}
