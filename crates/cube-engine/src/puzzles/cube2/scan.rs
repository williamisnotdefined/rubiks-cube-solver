use std::fmt;

use crate::cube::cubies::Corner;
use crate::cube::CORNER_FACELET_MAPPINGS;
use crate::cube::{FaceletConversionError, FaceletParseError, FaceletString};

use super::{Cube2, Cube2Corner, Cube2Face, Cube2State, Cube2ValidationError};

const CUBE2_SCAN_STICKERS_PER_FACE: usize = 4;
const CUBE3_FACELET_COUNT: usize = 54;

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Cube2ScanError {
    DuplicateFace {
        face: Cube2Face,
    },
    MissingFace {
        face: Cube2Face,
    },
    InvalidFaceLength {
        face: Cube2Face,
        expected: usize,
        actual: usize,
    },
    InvalidFacelets {
        error: FaceletParseError,
    },
    InvalidCubeState {
        error: FaceletConversionError,
    },
    InvalidCube2State {
        error: Cube2ValidationError,
    },
}

impl fmt::Display for Cube2ScanError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::DuplicateFace { face } => write!(formatter, "duplicate 2x2 scan face: {face:?}"),
            Self::MissingFace { face } => write!(formatter, "missing 2x2 scan face: {face:?}"),
            Self::InvalidFaceLength {
                face,
                expected,
                actual,
            } => write!(
                formatter,
                "2x2 scan face {face:?} has {actual} stickers; expected {expected}"
            ),
            Self::InvalidFacelets { error } => {
                write!(formatter, "invalid 2x2 scan facelets: {error}")
            }
            Self::InvalidCubeState { error } => {
                write!(formatter, "invalid 2x2 scan cube state: {error}")
            }
            Self::InvalidCube2State { error } => {
                write!(formatter, "invalid 2x2 cubie state: {error}")
            }
        }
    }
}

impl std::error::Error for Cube2ScanError {}

pub fn cube2_from_scan_faces(faces: &[(Cube2Face, String)]) -> Result<Cube2, Cube2ScanError> {
    let facelet_string = cube2_scan_faces_to_embedded_facelet_string(faces)?;
    let facelets = FaceletString::parse(&facelet_string)
        .map_err(|error| Cube2ScanError::InvalidFacelets { error })?;
    let (corner_permutation, corner_orientation) = facelets
        .decode_corners()
        .map_err(|error| Cube2ScanError::InvalidCubeState { error })?;
    let state = Cube2State {
        corner_permutation: corner_permutation.map(cube2_corner_from_corner),
        corner_orientation,
    };

    Cube2::try_from_state(state).map_err(|error| Cube2ScanError::InvalidCube2State { error })
}

pub fn cube2_visual_state(cube: &Cube2) -> String {
    let embedded = cube2_embedded_facelet_string(cube);
    Cube2Face::ALL
        .into_iter()
        .flat_map(|face| {
            let chars = embedded.chars().collect::<Vec<_>>();
            (0..CUBE2_SCAN_STICKERS_PER_FACE).map(move |sticker_index| {
                chars[cube2_to_cube3_corner_position(face, sticker_index)]
            })
        })
        .collect()
}

fn cube2_embedded_facelet_string(cube: &Cube2) -> String {
    let mut facelets = solved_facelets();

    for (position_index, target_mapping) in CORNER_FACELET_MAPPINGS.iter().enumerate() {
        let source_corner =
            corner_from_cube2_corner(cube.state().corner_permutation[position_index]);
        let source_mapping = &CORNER_FACELET_MAPPINGS[source_corner.index()];
        let orientation = usize::from(cube.state().corner_orientation[position_index]);

        for (source_index, source_sticker) in source_mapping.stickers.iter().enumerate() {
            let target_index = (source_index + orientation) % target_mapping.stickers.len();
            let target_sticker = target_mapping.stickers[target_index];
            facelets[target_sticker.position] = source_sticker.facelet.symbol();
        }
    }

    facelets.into_iter().collect()
}

fn cube2_scan_faces_to_embedded_facelet_string(
    faces: &[(Cube2Face, String)],
) -> Result<String, Cube2ScanError> {
    let mut face_strings: [Option<&str>; 6] = [None; 6];

    for (face, stickers) in faces {
        let slot = &mut face_strings[cube2_face_index(*face)];
        if slot.is_some() {
            return Err(Cube2ScanError::DuplicateFace { face: *face });
        }
        let actual = stickers.chars().count();
        if actual != CUBE2_SCAN_STICKERS_PER_FACE {
            return Err(Cube2ScanError::InvalidFaceLength {
                face: *face,
                expected: CUBE2_SCAN_STICKERS_PER_FACE,
                actual,
            });
        }
        *slot = Some(stickers.as_str());
    }

    for face in Cube2Face::ALL {
        if face_strings[cube2_face_index(face)].is_none() {
            return Err(Cube2ScanError::MissingFace { face });
        }
    }

    let mut embedded = solved_facelets();
    for face in Cube2Face::ALL {
        let stickers = face_strings[cube2_face_index(face)].expect("face presence checked above");
        for (sticker_index, symbol) in stickers.chars().enumerate() {
            embedded[cube2_to_cube3_corner_position(face, sticker_index)] = symbol;
        }
    }

    Ok(embedded.into_iter().collect())
}

fn solved_facelets() -> [char; CUBE3_FACELET_COUNT] {
    let mut facelets = ['U'; CUBE3_FACELET_COUNT];
    for position in 9..18 {
        facelets[position] = 'R';
    }
    for position in 18..27 {
        facelets[position] = 'F';
    }
    for position in 27..36 {
        facelets[position] = 'D';
    }
    for position in 36..45 {
        facelets[position] = 'L';
    }
    for position in 45..54 {
        facelets[position] = 'B';
    }
    facelets
}

fn cube2_to_cube3_corner_position(face: Cube2Face, sticker_index: usize) -> usize {
    match face {
        Cube2Face::U => [0, 2, 6, 8][sticker_index],
        Cube2Face::R => [9, 11, 15, 17][sticker_index],
        Cube2Face::F => [18, 20, 24, 26][sticker_index],
        Cube2Face::D => [27, 29, 33, 35][sticker_index],
        Cube2Face::L => [36, 38, 42, 44][sticker_index],
        Cube2Face::B => [45, 47, 51, 53][sticker_index],
    }
}

fn cube2_face_index(face: Cube2Face) -> usize {
    match face {
        Cube2Face::U => 0,
        Cube2Face::R => 1,
        Cube2Face::F => 2,
        Cube2Face::D => 3,
        Cube2Face::L => 4,
        Cube2Face::B => 5,
    }
}

fn corner_from_cube2_corner(corner: Cube2Corner) -> Corner {
    match corner {
        Cube2Corner::Urf => Corner::Urf,
        Cube2Corner::Ufl => Corner::Ufl,
        Cube2Corner::Ulb => Corner::Ulb,
        Cube2Corner::Ubr => Corner::Ubr,
        Cube2Corner::Dfr => Corner::Dfr,
        Cube2Corner::Dlf => Corner::Dlf,
        Cube2Corner::Dbl => Corner::Dbl,
        Cube2Corner::Drb => Corner::Drb,
    }
}

fn cube2_corner_from_corner(corner: Corner) -> Cube2Corner {
    match corner {
        Corner::Urf => Cube2Corner::Urf,
        Corner::Ufl => Cube2Corner::Ufl,
        Corner::Ulb => Cube2Corner::Ulb,
        Corner::Ubr => Cube2Corner::Ubr,
        Corner::Dfr => Cube2Corner::Dfr,
        Corner::Dlf => Cube2Corner::Dlf,
        Corner::Dbl => Cube2Corner::Dbl,
        Corner::Drb => Cube2Corner::Drb,
    }
}

#[cfg(test)]
mod tests {
    use super::{cube2_embedded_facelet_string, cube2_from_scan_faces, cube2_visual_state};
    use crate::puzzles::cube2::{Cube2, Cube2Algorithm, Cube2Face};

    #[test]
    fn solved_scan_faces_build_solved_cube() {
        let cube = cube2_from_scan_faces(&solved_scan_faces()).expect("scan should parse");

        assert!(cube.is_solved());
    }

    #[test]
    fn visual_state_returns_2x2_facelet_string() {
        let visual_state = cube2_visual_state(&Cube2::solved());

        assert_eq!(visual_state, "UUUURRRRFFFFDDDDLLLLBBBB");
        assert_eq!(visual_state.len(), 24);
    }

    #[test]
    fn scrambled_visual_state_preserves_2x2_color_counts() {
        let algorithm: Cube2Algorithm = "R U F".parse().expect("algorithm should parse");
        let mut cube = Cube2::solved();
        algorithm.apply_to(&mut cube);
        let visual_state = cube2_visual_state(&cube);

        assert_eq!(visual_state.len(), 24);
        for symbol in ['U', 'R', 'F', 'D', 'L', 'B'] {
            assert_eq!(
                visual_state
                    .chars()
                    .filter(|actual| *actual == symbol)
                    .count(),
                4
            );
        }
    }

    #[test]
    fn scan_faces_round_trip_scrambled_corners() {
        let algorithm: Cube2Algorithm = "R U F".parse().expect("algorithm should parse");
        let mut expected = Cube2::solved();
        algorithm.apply_to(&mut expected);
        let visual_state = cube2_embedded_facelet_string(&expected);
        let scan_faces = scan_faces_from_embedded_visual_state(&visual_state);

        let actual = cube2_from_scan_faces(&scan_faces).expect("scan should parse");

        assert_eq!(actual.state(), expected.state());
    }

    #[test]
    fn invalid_color_counts_are_rejected() {
        let mut faces = solved_scan_faces();
        faces[0].1 = "RRRR".to_owned();

        assert!(cube2_from_scan_faces(&faces).is_err());
    }

    fn solved_scan_faces() -> Vec<(Cube2Face, String)> {
        vec![
            (Cube2Face::U, "UUUU".to_owned()),
            (Cube2Face::R, "RRRR".to_owned()),
            (Cube2Face::F, "FFFF".to_owned()),
            (Cube2Face::D, "DDDD".to_owned()),
            (Cube2Face::L, "LLLL".to_owned()),
            (Cube2Face::B, "BBBB".to_owned()),
        ]
    }

    fn scan_faces_from_embedded_visual_state(visual_state: &str) -> Vec<(Cube2Face, String)> {
        let chars = visual_state.chars().collect::<Vec<_>>();
        vec![
            (
                Cube2Face::U,
                [0, 2, 6, 8].iter().map(|index| chars[*index]).collect(),
            ),
            (
                Cube2Face::R,
                [9, 11, 15, 17].iter().map(|index| chars[*index]).collect(),
            ),
            (
                Cube2Face::F,
                [18, 20, 24, 26].iter().map(|index| chars[*index]).collect(),
            ),
            (
                Cube2Face::D,
                [27, 29, 33, 35].iter().map(|index| chars[*index]).collect(),
            ),
            (
                Cube2Face::L,
                [36, 38, 42, 44].iter().map(|index| chars[*index]).collect(),
            ),
            (
                Cube2Face::B,
                [45, 47, 51, 53].iter().map(|index| chars[*index]).collect(),
            ),
        ]
    }
}
