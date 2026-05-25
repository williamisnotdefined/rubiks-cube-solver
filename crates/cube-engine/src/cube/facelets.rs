use std::fmt;
use std::str::FromStr;

use super::cubies::{Corner, CubeValidationError, CubieState, Edge, CORNER_COUNT, EDGE_COUNT};
use super::state::Cube;

pub const FACELET_COUNT: usize = 54;

const FACELET_SYMBOL_COUNT: usize = 6;
const FACELETS_PER_FACE: usize = 9;

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

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct StickerPosition {
    pub position: usize,
    pub facelet: Facelet,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct CornerFaceletMapping {
    pub corner: Corner,
    pub stickers: [StickerPosition; 3],
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct EdgeFaceletMapping {
    pub edge: Edge,
    pub stickers: [StickerPosition; 2],
}

pub const CENTER_FACELET_POSITIONS: [StickerPosition; FACELET_SYMBOL_COUNT] = [
    StickerPosition {
        position: 4,
        facelet: Facelet::U,
    },
    StickerPosition {
        position: 13,
        facelet: Facelet::R,
    },
    StickerPosition {
        position: 22,
        facelet: Facelet::F,
    },
    StickerPosition {
        position: 31,
        facelet: Facelet::D,
    },
    StickerPosition {
        position: 40,
        facelet: Facelet::L,
    },
    StickerPosition {
        position: 49,
        facelet: Facelet::B,
    },
];

pub const CORNER_FACELET_MAPPINGS: [CornerFaceletMapping; CORNER_COUNT] = [
    CornerFaceletMapping {
        corner: Corner::Urf,
        stickers: [
            StickerPosition {
                position: 8,
                facelet: Facelet::U,
            },
            StickerPosition {
                position: 9,
                facelet: Facelet::R,
            },
            StickerPosition {
                position: 20,
                facelet: Facelet::F,
            },
        ],
    },
    CornerFaceletMapping {
        corner: Corner::Ufl,
        stickers: [
            StickerPosition {
                position: 6,
                facelet: Facelet::U,
            },
            StickerPosition {
                position: 18,
                facelet: Facelet::F,
            },
            StickerPosition {
                position: 38,
                facelet: Facelet::L,
            },
        ],
    },
    CornerFaceletMapping {
        corner: Corner::Ulb,
        stickers: [
            StickerPosition {
                position: 0,
                facelet: Facelet::U,
            },
            StickerPosition {
                position: 36,
                facelet: Facelet::L,
            },
            StickerPosition {
                position: 47,
                facelet: Facelet::B,
            },
        ],
    },
    CornerFaceletMapping {
        corner: Corner::Ubr,
        stickers: [
            StickerPosition {
                position: 2,
                facelet: Facelet::U,
            },
            StickerPosition {
                position: 45,
                facelet: Facelet::B,
            },
            StickerPosition {
                position: 11,
                facelet: Facelet::R,
            },
        ],
    },
    CornerFaceletMapping {
        corner: Corner::Dfr,
        stickers: [
            StickerPosition {
                position: 29,
                facelet: Facelet::D,
            },
            StickerPosition {
                position: 26,
                facelet: Facelet::F,
            },
            StickerPosition {
                position: 15,
                facelet: Facelet::R,
            },
        ],
    },
    CornerFaceletMapping {
        corner: Corner::Dlf,
        stickers: [
            StickerPosition {
                position: 27,
                facelet: Facelet::D,
            },
            StickerPosition {
                position: 44,
                facelet: Facelet::L,
            },
            StickerPosition {
                position: 24,
                facelet: Facelet::F,
            },
        ],
    },
    CornerFaceletMapping {
        corner: Corner::Dbl,
        stickers: [
            StickerPosition {
                position: 33,
                facelet: Facelet::D,
            },
            StickerPosition {
                position: 53,
                facelet: Facelet::B,
            },
            StickerPosition {
                position: 42,
                facelet: Facelet::L,
            },
        ],
    },
    CornerFaceletMapping {
        corner: Corner::Drb,
        stickers: [
            StickerPosition {
                position: 35,
                facelet: Facelet::D,
            },
            StickerPosition {
                position: 17,
                facelet: Facelet::R,
            },
            StickerPosition {
                position: 51,
                facelet: Facelet::B,
            },
        ],
    },
];

pub const EDGE_FACELET_MAPPINGS: [EdgeFaceletMapping; EDGE_COUNT] = [
    EdgeFaceletMapping {
        edge: Edge::Ur,
        stickers: [
            StickerPosition {
                position: 5,
                facelet: Facelet::U,
            },
            StickerPosition {
                position: 10,
                facelet: Facelet::R,
            },
        ],
    },
    EdgeFaceletMapping {
        edge: Edge::Uf,
        stickers: [
            StickerPosition {
                position: 7,
                facelet: Facelet::U,
            },
            StickerPosition {
                position: 19,
                facelet: Facelet::F,
            },
        ],
    },
    EdgeFaceletMapping {
        edge: Edge::Ul,
        stickers: [
            StickerPosition {
                position: 3,
                facelet: Facelet::U,
            },
            StickerPosition {
                position: 37,
                facelet: Facelet::L,
            },
        ],
    },
    EdgeFaceletMapping {
        edge: Edge::Ub,
        stickers: [
            StickerPosition {
                position: 1,
                facelet: Facelet::U,
            },
            StickerPosition {
                position: 46,
                facelet: Facelet::B,
            },
        ],
    },
    EdgeFaceletMapping {
        edge: Edge::Dr,
        stickers: [
            StickerPosition {
                position: 32,
                facelet: Facelet::D,
            },
            StickerPosition {
                position: 16,
                facelet: Facelet::R,
            },
        ],
    },
    EdgeFaceletMapping {
        edge: Edge::Df,
        stickers: [
            StickerPosition {
                position: 28,
                facelet: Facelet::D,
            },
            StickerPosition {
                position: 25,
                facelet: Facelet::F,
            },
        ],
    },
    EdgeFaceletMapping {
        edge: Edge::Dl,
        stickers: [
            StickerPosition {
                position: 30,
                facelet: Facelet::D,
            },
            StickerPosition {
                position: 43,
                facelet: Facelet::L,
            },
        ],
    },
    EdgeFaceletMapping {
        edge: Edge::Db,
        stickers: [
            StickerPosition {
                position: 34,
                facelet: Facelet::D,
            },
            StickerPosition {
                position: 52,
                facelet: Facelet::B,
            },
        ],
    },
    EdgeFaceletMapping {
        edge: Edge::Fr,
        stickers: [
            StickerPosition {
                position: 23,
                facelet: Facelet::F,
            },
            StickerPosition {
                position: 12,
                facelet: Facelet::R,
            },
        ],
    },
    EdgeFaceletMapping {
        edge: Edge::Fl,
        stickers: [
            StickerPosition {
                position: 21,
                facelet: Facelet::F,
            },
            StickerPosition {
                position: 41,
                facelet: Facelet::L,
            },
        ],
    },
    EdgeFaceletMapping {
        edge: Edge::Bl,
        stickers: [
            StickerPosition {
                position: 50,
                facelet: Facelet::B,
            },
            StickerPosition {
                position: 39,
                facelet: Facelet::L,
            },
        ],
    },
    EdgeFaceletMapping {
        edge: Edge::Br,
        stickers: [
            StickerPosition {
                position: 48,
                facelet: Facelet::B,
            },
            StickerPosition {
                position: 14,
                facelet: Facelet::R,
            },
        ],
    },
];

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FaceletString {
    facelets: [Facelet; FACELET_COUNT],
}

impl FaceletString {
    pub fn parse(input: &str) -> Result<Self, FaceletParseError> {
        input.parse()
    }

    pub fn from_cube(cube: &Cube) -> Self {
        Self::from_valid_cubie_state(cube.state())
    }

    pub fn from_cubie_state(state: &CubieState) -> Result<Self, CubeValidationError> {
        state.validate()?;

        Ok(Self::from_valid_cubie_state(state))
    }

    pub const fn as_facelets(&self) -> &[Facelet; FACELET_COUNT] {
        &self.facelets
    }

    pub fn to_cubie_state(&self) -> Result<CubieState, FaceletConversionError> {
        for sticker in CENTER_FACELET_POSITIONS {
            self.expect_solved_sticker(sticker)?;
        }

        let (corner_permutation, corner_orientation) = self.decode_corners()?;
        let (edge_permutation, edge_orientation) = self.decode_edges()?;

        let candidate = CubieState {
            corner_permutation,
            corner_orientation,
            edge_permutation,
            edge_orientation,
        };

        candidate
            .validate()
            .map_err(|error| FaceletConversionError::CubieValidation { error })?;

        Ok(candidate)
    }

    pub fn decode_corners(
        &self,
    ) -> Result<([Corner; CORNER_COUNT], [u8; CORNER_COUNT]), FaceletConversionError> {
        let mut corner_permutation = Corner::ALL;
        let mut corner_orientation = [0_u8; CORNER_COUNT];
        let mut seen_corners = [None; CORNER_COUNT];

        for (position_index, target_mapping) in CORNER_FACELET_MAPPINGS.iter().enumerate() {
            let stickers = target_mapping
                .stickers
                .map(|sticker| self.facelets[sticker.position]);
            let (corner, orientation) = decode_corner_stickers(target_mapping.corner, stickers)?;

            if let Some(first_position) = seen_corners[corner.index()] {
                return Err(FaceletConversionError::DuplicateCornerStickers {
                    corner,
                    first_position,
                    duplicate_position: target_mapping.corner,
                });
            }

            seen_corners[corner.index()] = Some(target_mapping.corner);
            corner_permutation[position_index] = corner;
            corner_orientation[position_index] = orientation;
        }

        Ok((corner_permutation, corner_orientation))
    }

    pub fn decode_edges(
        &self,
    ) -> Result<([Edge; EDGE_COUNT], [u8; EDGE_COUNT]), FaceletConversionError> {
        let mut edge_permutation = Edge::ALL;
        let mut edge_orientation = [0_u8; EDGE_COUNT];
        let mut seen_edges = [None; EDGE_COUNT];

        for (position_index, target_mapping) in EDGE_FACELET_MAPPINGS.iter().enumerate() {
            let stickers = target_mapping
                .stickers
                .map(|sticker| self.facelets[sticker.position]);
            let (edge, orientation) = decode_edge_stickers(target_mapping.edge, stickers)?;

            if let Some(first_position) = seen_edges[edge.index()] {
                return Err(FaceletConversionError::DuplicateEdgeStickers {
                    edge,
                    first_position,
                    duplicate_position: target_mapping.edge,
                });
            }

            seen_edges[edge.index()] = Some(target_mapping.edge);
            edge_permutation[position_index] = edge;
            edge_orientation[position_index] = orientation;
        }

        Ok((edge_permutation, edge_orientation))
    }

    fn from_valid_cubie_state(state: &CubieState) -> Self {
        let mut facelets = [Facelet::U; FACELET_COUNT];

        for sticker in CENTER_FACELET_POSITIONS {
            facelets[sticker.position] = sticker.facelet;
        }

        for (position_index, target_mapping) in CORNER_FACELET_MAPPINGS.iter().enumerate() {
            let source_mapping =
                &CORNER_FACELET_MAPPINGS[state.corner_permutation[position_index].index()];
            let orientation = usize::from(state.corner_orientation[position_index]);

            for (source_index, source_sticker) in source_mapping.stickers.iter().enumerate() {
                let target_index = (source_index + orientation) % target_mapping.stickers.len();
                let target_sticker = target_mapping.stickers[target_index];
                facelets[target_sticker.position] = source_sticker.facelet;
            }
        }

        for (position_index, target_mapping) in EDGE_FACELET_MAPPINGS.iter().enumerate() {
            let source_mapping =
                &EDGE_FACELET_MAPPINGS[state.edge_permutation[position_index].index()];
            let orientation = usize::from(state.edge_orientation[position_index]);

            for (source_index, source_sticker) in source_mapping.stickers.iter().enumerate() {
                let target_index = (source_index + orientation) % target_mapping.stickers.len();
                let target_sticker = target_mapping.stickers[target_index];
                facelets[target_sticker.position] = source_sticker.facelet;
            }
        }

        Self { facelets }
    }

    fn expect_solved_sticker(
        &self,
        sticker: StickerPosition,
    ) -> Result<(), FaceletConversionError> {
        let actual = self.facelets[sticker.position];

        if actual != sticker.facelet {
            return Err(FaceletConversionError::InvalidCenterSticker {
                position: sticker.position,
                expected: sticker.facelet,
                actual,
            });
        }

        Ok(())
    }
}

fn decode_corner_stickers(
    position: Corner,
    stickers: [Facelet; 3],
) -> Result<(Corner, u8), FaceletConversionError> {
    for source_mapping in CORNER_FACELET_MAPPINGS {
        let source_stickers = source_mapping
            .stickers
            .map(|source_sticker| source_sticker.facelet);

        if !same_corner_sticker_set(stickers, source_stickers) {
            continue;
        }

        let orientation = (0..source_stickers.len())
            .find(|orientation| {
                source_stickers
                    .iter()
                    .copied()
                    .enumerate()
                    .all(|(source_index, source_sticker)| {
                        let target_index = (source_index + *orientation) % source_stickers.len();
                        stickers[target_index] == source_sticker
                    })
            })
            .ok_or(FaceletConversionError::InvalidCornerOrientation {
                position,
                corner: source_mapping.corner,
                stickers,
            })?;

        return Ok((source_mapping.corner, orientation as u8));
    }

    Err(FaceletConversionError::UnknownCornerStickers { position, stickers })
}

fn decode_edge_stickers(
    position: Edge,
    stickers: [Facelet; 2],
) -> Result<(Edge, u8), FaceletConversionError> {
    for source_mapping in EDGE_FACELET_MAPPINGS {
        let source_stickers = source_mapping
            .stickers
            .map(|source_sticker| source_sticker.facelet);

        if !same_edge_sticker_set(stickers, source_stickers) {
            continue;
        }

        let orientation = u8::from(stickers[0] != source_stickers[0]);

        return Ok((source_mapping.edge, orientation));
    }

    Err(FaceletConversionError::UnknownEdgeStickers { position, stickers })
}

fn same_corner_sticker_set(left: [Facelet; 3], right: [Facelet; 3]) -> bool {
    let mut counts = [0_i8; FACELET_SYMBOL_COUNT];

    for sticker in left {
        counts[sticker.index()] += 1;
    }

    for sticker in right {
        counts[sticker.index()] -= 1;
    }

    counts == [0_i8; FACELET_SYMBOL_COUNT]
}

fn same_edge_sticker_set(left: [Facelet; 2], right: [Facelet; 2]) -> bool {
    let mut counts = [0_i8; FACELET_SYMBOL_COUNT];

    for sticker in left {
        counts[sticker.index()] += 1;
    }

    for sticker in right {
        counts[sticker.index()] -= 1;
    }

    counts == [0_i8; FACELET_SYMBOL_COUNT]
}

impl fmt::Display for FaceletString {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        for facelet in self.facelets {
            write!(formatter, "{}", facelet.symbol())?;
        }

        Ok(())
    }
}

impl FromStr for FaceletString {
    type Err = FaceletParseError;

    fn from_str(input: &str) -> Result<Self, Self::Err> {
        let actual = input.chars().count();
        if actual != FACELET_COUNT {
            return Err(FaceletParseError::InvalidLength {
                expected: FACELET_COUNT,
                actual,
            });
        }

        let mut facelets = [Facelet::U; FACELET_COUNT];
        let mut counts = [0_usize; FACELET_SYMBOL_COUNT];

        for (position, symbol) in input.chars().enumerate() {
            let facelet = Facelet::from_symbol(symbol)
                .ok_or(FaceletParseError::InvalidSymbol { position, symbol })?;

            facelets[position] = facelet;
            counts[facelet.index()] += 1;
        }

        for facelet in Facelet::ALL {
            let actual = counts[facelet.index()];
            if actual != FACELETS_PER_FACE {
                return Err(FaceletParseError::InvalidFaceCount {
                    facelet,
                    expected: FACELETS_PER_FACE,
                    actual,
                });
            }
        }

        Ok(Self { facelets })
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum FaceletParseError {
    InvalidLength {
        expected: usize,
        actual: usize,
    },
    InvalidSymbol {
        position: usize,
        symbol: char,
    },
    InvalidFaceCount {
        facelet: Facelet,
        expected: usize,
        actual: usize,
    },
}

impl fmt::Display for FaceletParseError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidLength { expected, actual } => write!(
                formatter,
                "invalid facelet string length: expected {expected} characters, got {actual}"
            ),
            Self::InvalidSymbol { position, symbol } => write!(
                formatter,
                "invalid facelet symbol at position {position}: expected one of U, R, F, D, L, B, got {symbol:?}"
            ),
            Self::InvalidFaceCount {
                facelet,
                expected,
                actual,
            } => write!(
                formatter,
                "invalid {facelet} facelet count: expected {expected}, got {actual}"
            ),
        }
    }
}

impl std::error::Error for FaceletParseError {}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum FaceletConversionError {
    InvalidCenterSticker {
        position: usize,
        expected: Facelet,
        actual: Facelet,
    },
    UnknownCornerStickers {
        position: Corner,
        stickers: [Facelet; 3],
    },
    DuplicateCornerStickers {
        corner: Corner,
        first_position: Corner,
        duplicate_position: Corner,
    },
    UnknownEdgeStickers {
        position: Edge,
        stickers: [Facelet; 2],
    },
    DuplicateEdgeStickers {
        edge: Edge,
        first_position: Edge,
        duplicate_position: Edge,
    },
    InvalidCornerOrientation {
        position: Corner,
        corner: Corner,
        stickers: [Facelet; 3],
    },
    CubieValidation {
        error: CubeValidationError,
    },
}

impl fmt::Display for FaceletConversionError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidCenterSticker {
                position,
                expected,
                actual,
            } => write!(
                formatter,
                "invalid center sticker at position {position}: expected {expected}, got {actual}"
            ),
            Self::UnknownCornerStickers { position, stickers } => write!(
                formatter,
                "unknown corner stickers at position {position:?}: {}{}{}",
                stickers[0], stickers[1], stickers[2]
            ),
            Self::DuplicateCornerStickers {
                corner,
                first_position,
                duplicate_position,
            } => write!(
                formatter,
                "duplicate corner stickers for {corner:?}: first at {first_position:?}, duplicate at {duplicate_position:?}"
            ),
            Self::UnknownEdgeStickers { position, stickers } => write!(
                formatter,
                "unknown edge stickers at position {position:?}: {}{}",
                stickers[0], stickers[1]
            ),
            Self::DuplicateEdgeStickers {
                edge,
                first_position,
                duplicate_position,
            } => write!(
                formatter,
                "duplicate edge stickers for {edge:?}: first at {first_position:?}, duplicate at {duplicate_position:?}"
            ),
            Self::InvalidCornerOrientation {
                position,
                corner,
                stickers,
            } => write!(
                formatter,
                "invalid corner sticker order for {corner:?} at position {position:?}: {}{}{}",
                stickers[0], stickers[1], stickers[2]
            ),
            Self::CubieValidation { error } => write!(formatter, "cubie validation failed: {error}"),
        }
    }
}

impl std::error::Error for FaceletConversionError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::CubieValidation { error } => Some(error),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{
        Facelet, FaceletConversionError, FaceletParseError, FaceletString,
        CENTER_FACELET_POSITIONS, CORNER_FACELET_MAPPINGS, EDGE_FACELET_MAPPINGS, FACELET_COUNT,
    };
    use crate::cube::cubies::{
        Corner, CubeValidationError, CubieState, Edge, CORNER_COUNT, EDGE_COUNT,
    };
    use crate::cube::moves::FACE_MOVES;
    use crate::{Cube, Move};

    const SOLVED_FACELET_STRING: &str = "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB";
    const FRONT_TURN_FACELET_STRING: &str =
        "UUUUUULLLURRURRURRFFFFFFFFFRRRDDDDDDLLDLLDLLDBBBBBBBBB";

    #[test]
    fn canonical_solved_facelet_string_parses_successfully() {
        let parsed =
            FaceletString::parse(SOLVED_FACELET_STRING).expect("solved facelets should parse");

        assert_eq!(parsed.as_facelets().len(), FACELET_COUNT);
        assert!(parsed.as_facelets()[0..9]
            .iter()
            .all(|facelet| *facelet == Facelet::U));
        assert!(parsed.as_facelets()[9..18]
            .iter()
            .all(|facelet| *facelet == Facelet::R));
        assert!(parsed.as_facelets()[18..27]
            .iter()
            .all(|facelet| *facelet == Facelet::F));
        assert!(parsed.as_facelets()[27..36]
            .iter()
            .all(|facelet| *facelet == Facelet::D));
        assert!(parsed.as_facelets()[36..45]
            .iter()
            .all(|facelet| *facelet == Facelet::L));
        assert!(parsed.as_facelets()[45..54]
            .iter()
            .all(|facelet| *facelet == Facelet::B));
    }

    #[test]
    fn solved_cubie_state_renders_to_canonical_solved_facelet_string() {
        let rendered = FaceletString::from_cubie_state(&CubieState::solved())
            .expect("solved cubie state should render");

        assert_eq!(rendered.to_string(), SOLVED_FACELET_STRING);
    }

    #[test]
    fn solved_cube_renders_to_canonical_solved_facelet_string() {
        let rendered = FaceletString::from_cube(&Cube::solved());

        assert_eq!(rendered.to_string(), SOLVED_FACELET_STRING);
    }

    #[test]
    fn front_turn_renders_expected_facelet_string() {
        let mut cube = Cube::solved();
        cube.apply_move(Move::F);

        let rendered = FaceletString::from_cube(&cube);

        assert_eq!(rendered.to_string(), FRONT_TURN_FACELET_STRING);
    }

    #[test]
    fn moved_cubes_render_and_parse_as_facelet_strings() {
        for move_ in FACE_MOVES {
            let mut cube = Cube::solved();
            cube.apply_move(move_);

            let rendered_from_cube = FaceletString::from_cube(&cube);
            let rendered_from_state = FaceletString::from_cubie_state(cube.state())
                .expect("moved cubie state should render");
            assert_eq!(rendered_from_state, rendered_from_cube);

            let rendered = rendered_from_cube.to_string();

            FaceletString::parse(&rendered).expect("rendered moved state should parse");
        }
    }

    #[test]
    fn invalid_cubie_state_does_not_render() {
        let mut state = CubieState::solved();
        state.corner_orientation[0] = 3;

        assert_eq!(
            FaceletString::from_cubie_state(&state),
            Err(CubeValidationError::InvalidCornerOrientation {
                position: 0,
                orientation: 3
            })
        );
    }

    #[test]
    fn invalid_length_returns_useful_error() {
        let error = FaceletString::parse("U").expect_err("short input should fail");

        assert_eq!(
            error,
            FaceletParseError::InvalidLength {
                expected: FACELET_COUNT,
                actual: 1
            }
        );
        assert_eq!(
            error.to_string(),
            "invalid facelet string length: expected 54 characters, got 1"
        );
    }

    #[test]
    fn invalid_symbol_returns_useful_error() {
        let input = "UUUUUUUUURXRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB";
        let error = FaceletString::parse(input).expect_err("invalid symbol should fail");

        assert_eq!(
            error,
            FaceletParseError::InvalidSymbol {
                position: 10,
                symbol: 'X'
            }
        );
        assert_eq!(
            error.to_string(),
            "invalid facelet symbol at position 10: expected one of U, R, F, D, L, B, got 'X'"
        );
    }

    #[test]
    fn invalid_face_counts_return_useful_error() {
        let input = "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBU";
        let error = FaceletString::parse(input).expect_err("invalid counts should fail");

        assert_eq!(
            error,
            FaceletParseError::InvalidFaceCount {
                facelet: Facelet::U,
                expected: 9,
                actual: 10
            }
        );
        assert_eq!(
            error.to_string(),
            "invalid U facelet count: expected 9, got 10"
        );
    }

    #[test]
    fn parsed_facelets_are_exported_as_adapter_type() {
        let parsed: crate::FaceletString = SOLVED_FACELET_STRING
            .parse()
            .expect("solved facelets should parse through root export");

        assert_eq!(parsed.as_facelets()[0], Facelet::U);
    }

    #[test]
    fn canonical_solved_facelet_string_converts_to_solved_cubie_state() {
        let parsed = FaceletString::parse(SOLVED_FACELET_STRING).expect("solved facelets parse");

        assert_eq!(
            parsed
                .to_cubie_state()
                .expect("solved facelets should convert"),
            CubieState::solved()
        );
    }

    #[test]
    fn one_move_facelet_states_convert_to_matching_cubie_states() {
        for move_ in FACE_MOVES {
            let mut cube = Cube::solved();
            cube.apply_move(move_);
            let rendered = FaceletString::from_cube(&cube).to_string();
            let parsed = FaceletString::parse(&rendered).expect("rendered move should parse");

            let converted = parsed
                .to_cubie_state()
                .expect("rendered move should convert");

            assert_eq!(&converted, cube.state(), "{move_:?}");
        }
    }

    #[test]
    fn two_move_facelet_state_converts_to_matching_cubie_state() {
        let mut cube = Cube::solved();
        cube.apply_moves(&[Move::R, Move::U]);
        let rendered = FaceletString::from_cube(&cube).to_string();
        let parsed = FaceletString::parse(&rendered).expect("rendered algorithm should parse");

        let converted = parsed
            .to_cubie_state()
            .expect("rendered algorithm should convert");

        assert_eq!(&converted, cube.state());
    }

    #[test]
    fn solved_facelets_decode_to_solved_corner_data() {
        let parsed = FaceletString::parse(SOLVED_FACELET_STRING).expect("solved facelets parse");

        let (corner_permutation, corner_orientation) = parsed
            .decode_corners()
            .expect("solved corner stickers should decode");

        assert_eq!(corner_permutation, Corner::ALL);
        assert_eq!(corner_orientation, [0; CORNER_COUNT]);
    }

    #[test]
    fn one_move_facelets_decode_to_moved_corner_data() {
        for move_ in FACE_MOVES {
            let mut cube = Cube::solved();
            cube.apply_move(move_);
            let rendered = FaceletString::from_cube(&cube);

            let (corner_permutation, corner_orientation) = rendered
                .decode_corners()
                .expect("rendered corner stickers should decode");

            assert_eq!(
                corner_permutation,
                cube.state().corner_permutation,
                "{move_:?}"
            );
            assert_eq!(
                corner_orientation,
                cube.state().corner_orientation,
                "{move_:?}"
            );
        }
    }

    #[test]
    fn solved_facelets_decode_to_solved_edge_data() {
        let parsed = FaceletString::parse(SOLVED_FACELET_STRING).expect("solved facelets parse");

        let (edge_permutation, edge_orientation) = parsed
            .decode_edges()
            .expect("solved edge stickers should decode");

        assert_eq!(edge_permutation, Edge::ALL);
        assert_eq!(edge_orientation, [0; EDGE_COUNT]);
    }

    #[test]
    fn one_move_facelets_decode_to_moved_edge_data() {
        for move_ in FACE_MOVES {
            let mut cube = Cube::solved();
            cube.apply_move(move_);
            let rendered = FaceletString::from_cube(&cube);

            let (edge_permutation, edge_orientation) = rendered
                .decode_edges()
                .expect("rendered edge stickers should decode");

            assert_eq!(edge_permutation, cube.state().edge_permutation, "{move_:?}");
            assert_eq!(edge_orientation, cube.state().edge_orientation, "{move_:?}");
        }
    }

    #[test]
    fn edge_decoding_identifies_cubies_independent_of_sticker_order() {
        let mut parsed =
            FaceletString::parse(SOLVED_FACELET_STRING).expect("solved facelets parse");
        let mapping = EDGE_FACELET_MAPPINGS[Edge::Ur.index()];

        parsed.facelets[mapping.stickers[0].position] = Facelet::R;
        parsed.facelets[mapping.stickers[1].position] = Facelet::U;

        let (edge_permutation, edge_orientation) = parsed
            .decode_edges()
            .expect("flipped edge stickers should decode");

        assert_eq!(edge_permutation[Edge::Ur.index()], Edge::Ur);
        assert_eq!(edge_orientation[Edge::Ur.index()], 1);
    }

    #[test]
    fn unknown_edge_sticker_combination_returns_structured_error() {
        let parsed = parse_with_sticker_changes(&[(10, 'D'), (32, 'R')]);
        let error = parsed
            .decode_edges()
            .expect_err("unknown edge sticker pair should fail");

        assert_eq!(
            error,
            FaceletConversionError::UnknownEdgeStickers {
                position: Edge::Ur,
                stickers: [Facelet::U, Facelet::D]
            }
        );
        assert_eq!(
            error.to_string(),
            "unknown edge stickers at position Ur: UD"
        );
    }

    #[test]
    fn unknown_edge_sticker_combination_fails_cubie_conversion() {
        let parsed = parse_with_sticker_changes(&[(10, 'D'), (32, 'R')]);

        assert_eq!(
            parsed.to_cubie_state(),
            Err(FaceletConversionError::UnknownEdgeStickers {
                position: Edge::Ur,
                stickers: [Facelet::U, Facelet::D]
            })
        );
    }

    #[test]
    fn duplicate_edge_sticker_combination_returns_structured_error() {
        let parsed = parse_with_sticker_changes(&[(19, 'R'), (12, 'F')]);
        let error = parsed
            .decode_edges()
            .expect_err("duplicate edge sticker pair should fail");

        assert_eq!(
            error,
            FaceletConversionError::DuplicateEdgeStickers {
                edge: Edge::Ur,
                first_position: Edge::Ur,
                duplicate_position: Edge::Uf,
            }
        );
        assert_eq!(
            error.to_string(),
            "duplicate edge stickers for Ur: first at Ur, duplicate at Uf"
        );
    }

    #[test]
    fn duplicate_edge_sticker_combination_fails_cubie_conversion_with_structured_error() {
        let parsed = parse_with_sticker_changes(&[(19, 'R'), (12, 'F')]);

        assert_eq!(
            parsed.to_cubie_state(),
            Err(FaceletConversionError::DuplicateEdgeStickers {
                edge: Edge::Ur,
                first_position: Edge::Ur,
                duplicate_position: Edge::Uf,
            })
        );
    }

    #[test]
    fn flipped_edge_fails_cubie_conversion_through_validation() {
        let parsed = parse_with_flipped_edge(Edge::Ur);
        let error = parsed
            .to_cubie_state()
            .expect_err("single flipped edge should fail cubie validation");

        assert_eq!(
            error,
            FaceletConversionError::CubieValidation {
                error: CubeValidationError::InvalidEdgeOrientationSum { sum: 1 }
            }
        );
        assert_eq!(
            error.to_string(),
            "cubie validation failed: invalid edge orientation sum: 1"
        );
    }

    #[test]
    fn corner_decoding_identifies_cubies_independent_of_sticker_order() {
        let mut parsed =
            FaceletString::parse(SOLVED_FACELET_STRING).expect("solved facelets parse");
        let mapping = CORNER_FACELET_MAPPINGS[Corner::Urf.index()];

        parsed.facelets[mapping.stickers[0].position] = Facelet::F;
        parsed.facelets[mapping.stickers[1].position] = Facelet::U;
        parsed.facelets[mapping.stickers[2].position] = Facelet::R;

        let (corner_permutation, corner_orientation) = parsed
            .decode_corners()
            .expect("rotated corner stickers should decode");

        assert_eq!(corner_permutation[Corner::Urf.index()], Corner::Urf);
        assert_eq!(corner_orientation[Corner::Urf.index()], 1);
    }

    #[test]
    fn mirrored_corner_sticker_order_returns_structured_error() {
        let mut parsed =
            FaceletString::parse(SOLVED_FACELET_STRING).expect("solved facelets parse");
        let mapping = CORNER_FACELET_MAPPINGS[Corner::Urf.index()];

        parsed.facelets[mapping.stickers[0].position] = Facelet::U;
        parsed.facelets[mapping.stickers[1].position] = Facelet::F;
        parsed.facelets[mapping.stickers[2].position] = Facelet::R;

        assert_eq!(
            parsed.decode_corners(),
            Err(FaceletConversionError::InvalidCornerOrientation {
                position: Corner::Urf,
                corner: Corner::Urf,
                stickers: [Facelet::U, Facelet::F, Facelet::R]
            })
        );
    }

    #[test]
    fn unknown_corner_sticker_combination_returns_structured_error() {
        let parsed = parse_with_swapped_stickers(8, 46);

        assert_eq!(
            parsed.decode_corners(),
            Err(FaceletConversionError::UnknownCornerStickers {
                position: Corner::Urf,
                stickers: [Facelet::B, Facelet::R, Facelet::F]
            })
        );
    }

    #[test]
    fn unknown_corner_sticker_combination_fails_cubie_conversion() {
        let parsed = parse_with_swapped_stickers(8, 46);

        assert_eq!(
            parsed.to_cubie_state(),
            Err(FaceletConversionError::UnknownCornerStickers {
                position: Corner::Urf,
                stickers: [Facelet::B, Facelet::R, Facelet::F]
            })
        );
    }

    #[test]
    fn duplicate_corner_sticker_combination_returns_structured_error() {
        let parsed = parse_with_sticker_changes(&[(18, 'R'), (38, 'F'), (10, 'L')]);

        assert_eq!(
            parsed.decode_corners(),
            Err(FaceletConversionError::DuplicateCornerStickers {
                corner: Corner::Urf,
                first_position: Corner::Urf,
                duplicate_position: Corner::Ufl,
            })
        );
    }

    #[test]
    fn duplicate_corner_sticker_combination_fails_cubie_conversion_with_structured_error() {
        let parsed = parse_with_sticker_changes(&[(18, 'R'), (38, 'F'), (10, 'L')]);

        assert_eq!(
            parsed.to_cubie_state(),
            Err(FaceletConversionError::DuplicateCornerStickers {
                corner: Corner::Urf,
                first_position: Corner::Urf,
                duplicate_position: Corner::Ufl,
            })
        );
    }

    #[test]
    fn rotated_corner_fails_cubie_conversion_through_validation() {
        let parsed = parse_with_rotated_corner(Corner::Urf);
        let error = parsed
            .to_cubie_state()
            .expect_err("single rotated corner should fail cubie validation");

        assert_eq!(
            error,
            FaceletConversionError::CubieValidation {
                error: CubeValidationError::InvalidCornerOrientationSum { sum: 1 }
            }
        );
        assert_eq!(
            error.to_string(),
            "cubie validation failed: invalid corner orientation sum: 1"
        );
    }

    #[test]
    fn swapped_corner_pieces_fail_cubie_conversion_through_parity_validation() {
        let parsed = parse_with_swapped_corner_pieces(Corner::Urf, Corner::Ufl);

        assert_eq!(
            parsed.to_cubie_state(),
            Err(FaceletConversionError::CubieValidation {
                error: CubeValidationError::InvalidPermutationParity {
                    corner_parity_odd: true,
                    edge_parity_odd: false,
                }
            })
        );
    }

    #[test]
    fn converted_solved_facelet_state_is_accepted_by_cube() {
        let parsed = FaceletString::parse(SOLVED_FACELET_STRING).expect("solved facelets parse");
        let state = parsed
            .to_cubie_state()
            .expect("solved facelets should convert");

        let cube = Cube::try_from_state(state).expect("converted solved state should be valid");

        assert!(cube.is_solved());
    }

    #[test]
    fn converted_moved_facelet_states_are_accepted_by_cube() {
        for move_ in FACE_MOVES {
            let mut expected = Cube::solved();
            expected.apply_move(move_);
            let rendered = FaceletString::from_cube(&expected).to_string();
            let parsed = FaceletString::parse(&rendered).expect("rendered move should parse");
            let state = parsed
                .to_cubie_state()
                .expect("rendered move should convert");

            let cube = Cube::try_from_state(state).expect("converted moved state should be valid");

            assert_eq!(cube.state(), expected.state(), "{move_:?}");
        }
    }

    #[test]
    fn non_canonical_center_sticker_returns_structured_conversion_error() {
        let parsed = parse_with_swapped_stickers(4, 13);

        let error = parsed
            .to_cubie_state()
            .expect_err("swapped center stickers should fail");

        assert_eq!(
            error,
            FaceletConversionError::InvalidCenterSticker {
                position: 4,
                expected: Facelet::U,
                actual: Facelet::R,
            }
        );
        assert_eq!(
            error.to_string(),
            "invalid center sticker at position 4: expected U, got R"
        );
    }

    #[test]
    fn facelet_mapping_tables_cover_all_sticker_positions_once() {
        assert_eq!(CORNER_FACELET_MAPPINGS.len(), CORNER_COUNT);
        assert_eq!(EDGE_FACELET_MAPPINGS.len(), EDGE_COUNT);

        let mut used_positions = [false; FACELET_COUNT];
        let mut corner_sticker_count = 0;
        let mut edge_sticker_count = 0;

        for (index, mapping) in CORNER_FACELET_MAPPINGS.iter().enumerate() {
            assert_eq!(mapping.corner, Corner::ALL[index]);
            corner_sticker_count += mapping.stickers.len();

            for sticker in mapping.stickers {
                mark_position(&mut used_positions, sticker.position);
            }
        }

        for (index, mapping) in EDGE_FACELET_MAPPINGS.iter().enumerate() {
            assert_eq!(mapping.edge, Edge::ALL[index]);
            edge_sticker_count += mapping.stickers.len();

            for sticker in mapping.stickers {
                mark_position(&mut used_positions, sticker.position);
            }
        }

        for sticker in CENTER_FACELET_POSITIONS {
            mark_position(&mut used_positions, sticker.position);
        }

        assert_eq!(corner_sticker_count, CORNER_COUNT * 3);
        assert_eq!(edge_sticker_count, EDGE_COUNT * 2);
        assert!(used_positions.into_iter().all(|used| used));
    }

    fn parse_with_swapped_stickers(left: usize, right: usize) -> FaceletString {
        let mut facelets = SOLVED_FACELET_STRING.chars().collect::<Vec<_>>();
        facelets.swap(left, right);
        parse_facelets(facelets)
    }

    fn parse_with_rotated_corner(corner: Corner) -> FaceletString {
        let mut facelets = SOLVED_FACELET_STRING.chars().collect::<Vec<_>>();
        let mapping = CORNER_FACELET_MAPPINGS[corner.index()];
        let stickers = mapping.stickers.map(|sticker| facelets[sticker.position]);

        facelets[mapping.stickers[0].position] = stickers[2];
        facelets[mapping.stickers[1].position] = stickers[0];
        facelets[mapping.stickers[2].position] = stickers[1];

        parse_facelets(facelets)
    }

    fn parse_with_flipped_edge(edge: Edge) -> FaceletString {
        let mut facelets = SOLVED_FACELET_STRING.chars().collect::<Vec<_>>();
        let mapping = EDGE_FACELET_MAPPINGS[edge.index()];

        facelets.swap(mapping.stickers[0].position, mapping.stickers[1].position);

        parse_facelets(facelets)
    }

    fn parse_with_swapped_corner_pieces(left: Corner, right: Corner) -> FaceletString {
        let mut facelets = SOLVED_FACELET_STRING.chars().collect::<Vec<_>>();
        let left_mapping = CORNER_FACELET_MAPPINGS[left.index()];
        let right_mapping = CORNER_FACELET_MAPPINGS[right.index()];

        for sticker_index in 0..3 {
            facelets.swap(
                left_mapping.stickers[sticker_index].position,
                right_mapping.stickers[sticker_index].position,
            );
        }

        parse_facelets(facelets)
    }

    fn parse_with_sticker_changes(changes: &[(usize, char)]) -> FaceletString {
        let mut facelets = SOLVED_FACELET_STRING.chars().collect::<Vec<_>>();

        for (position, symbol) in changes {
            facelets[*position] = *symbol;
        }

        parse_facelets(facelets)
    }

    fn parse_facelets(facelets: Vec<char>) -> FaceletString {
        let input = facelets.into_iter().collect::<String>();
        FaceletString::parse(&input).expect("test facelets should parse")
    }

    fn mark_position(used_positions: &mut [bool; FACELET_COUNT], position: usize) {
        assert!(position < FACELET_COUNT);
        assert!(
            !used_positions[position],
            "duplicate facelet position {position}"
        );
        used_positions[position] = true;
    }
}
