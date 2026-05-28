use crate::cube::cubies::{
    Corner, CubeValidationError, CubieState, Edge, CORNER_COUNT, EDGE_COUNT,
};
use crate::cube::state::Cube;

use super::{
    Facelet, FaceletConversionError, FaceletString, StickerPosition, CENTER_FACELET_POSITIONS,
    CORNER_FACELET_MAPPINGS, EDGE_FACELET_MAPPINGS, FACELET_COUNT, FACELET_SYMBOL_COUNT,
};

impl FaceletString {
    pub fn from_cube(cube: &Cube) -> Self {
        Self::from_valid_cubie_state(cube.state())
    }

    pub fn from_cubie_state(state: &CubieState) -> Result<Self, CubeValidationError> {
        state.validate()?;

        Ok(Self::from_valid_cubie_state(state))
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
