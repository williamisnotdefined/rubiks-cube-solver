use crate::cube::cubies::{Corner, Edge};

use super::Facelet;

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
