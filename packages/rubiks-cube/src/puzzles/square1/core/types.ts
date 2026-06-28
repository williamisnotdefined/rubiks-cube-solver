type ValueOf<T> = T[keyof T];

export const Square1Faces = Object.freeze({
  U: 'U',
  R: 'R',
  F: 'F',
  D: 'D',
  L: 'L',
  B: 'B',
});

export type Square1Face = ValueOf<typeof Square1Faces>;

export const Square1FaceOrder = Object.freeze([
  Square1Faces.U,
  Square1Faces.R,
  Square1Faces.F,
  Square1Faces.D,
  Square1Faces.L,
  Square1Faces.B,
] as const);

export type Square1PieceKind = 'corner' | 'edge' | 'middle';
export type Square1LayerName = 'top' | 'bottom' | 'middle';
export type Square1ExternalLayerName = Extract<Square1LayerName, 'top' | 'bottom'>;
export type Square1StickerLocalSurface = 'cap' | 'sideA' | 'sideB' | 'sideC';

export type Square1CornerPieceId = 'UFR' | 'URB' | 'UBL' | 'ULF' | 'DFR' | 'DRB' | 'DBL' | 'DLF';
export type Square1EdgePieceId = 'UF' | 'UR' | 'UB' | 'UL' | 'DF' | 'DR' | 'DB' | 'DL';
export type Square1LayerPieceId = Square1CornerPieceId | Square1EdgePieceId;
export type Square1MiddlePieceId = 'M_MOVING' | 'M_FIXED';
export type Square1PieceId = Square1LayerPieceId | Square1MiddlePieceId;

export type Square1PieceDefinition = {
  id: Square1PieceId;
  pieceIndex: number;
  kind: Square1PieceKind;
  sourceLayer: Square1LayerName;
  widthUnits: 1 | 2 | 6;
  solvedStartUnit: number;
  stickerFaces: readonly Square1Face[];
  stickers: readonly Square1StickerDefinition[];
};

export type Square1StickerDefinition = {
  face: Square1Face;
  localSurface: Square1StickerLocalSurface;
};

// csTimer-aligned 24-slot reference orientation used by the state golden tests:
// top slots start at UFR and advance through R, B, L, F; bottom slots start at DF
// and advance through F, R, B, L. Semantic IDs name solved stickers, not position.
export const Square1TopPieceOrder = Object.freeze([
  'UFR',
  'UR',
  'URB',
  'UB',
  'UBL',
  'UL',
  'ULF',
  'UF',
] as const satisfies readonly Square1LayerPieceId[]);

export const Square1BottomPieceOrder = Object.freeze([
  'DF',
  'DFR',
  'DR',
  'DRB',
  'DB',
  'DBL',
  'DL',
  'DLF',
] as const satisfies readonly Square1LayerPieceId[]);

export const Square1MiddlePieceOrder = Object.freeze([
  'M_MOVING',
  'M_FIXED',
] as const satisfies readonly Square1MiddlePieceId[]);

export const Square1SolvedTopSlots = Object.freeze([
  'UFR',
  'UFR',
  'UR',
  'URB',
  'URB',
  'UB',
  'UBL',
  'UBL',
  'UL',
  'ULF',
  'ULF',
  'UF',
] as const satisfies readonly Square1LayerPieceId[]);

export const Square1SolvedBottomSlots = Object.freeze([
  'DF',
  'DFR',
  'DFR',
  'DR',
  'DRB',
  'DRB',
  'DB',
  'DBL',
  'DBL',
  'DL',
  'DLF',
  'DLF',
] as const satisfies readonly Square1LayerPieceId[]);

export const Square1ExternalPieceOrder = Object.freeze([
  ...Square1TopPieceOrder,
  ...Square1BottomPieceOrder,
] as const satisfies readonly Square1LayerPieceId[]);

const topDefinitions: Square1PieceDefinition[] = [
  {
    id: 'UFR',
    kind: 'corner',
    pieceIndex: 0,
    solvedStartUnit: 0,
    sourceLayer: 'top',
    ...defineStickers(
      { face: Square1Faces.U, localSurface: 'cap' },
      { face: Square1Faces.R, localSurface: 'sideA' },
      { face: Square1Faces.F, localSurface: 'sideB' },
    ),
    widthUnits: 2,
  },
  {
    id: 'UR',
    kind: 'edge',
    pieceIndex: 1,
    solvedStartUnit: 2,
    sourceLayer: 'top',
    ...defineStickers({ face: Square1Faces.U, localSurface: 'cap' }, { face: Square1Faces.R, localSurface: 'sideA' }),
    widthUnits: 1,
  },
  {
    id: 'URB',
    kind: 'corner',
    pieceIndex: 2,
    solvedStartUnit: 3,
    sourceLayer: 'top',
    ...defineStickers(
      { face: Square1Faces.U, localSurface: 'cap' },
      { face: Square1Faces.B, localSurface: 'sideA' },
      { face: Square1Faces.R, localSurface: 'sideB' },
    ),
    widthUnits: 2,
  },
  {
    id: 'UB',
    kind: 'edge',
    pieceIndex: 3,
    solvedStartUnit: 5,
    sourceLayer: 'top',
    ...defineStickers({ face: Square1Faces.U, localSurface: 'cap' }, { face: Square1Faces.B, localSurface: 'sideA' }),
    widthUnits: 1,
  },
  {
    id: 'UBL',
    kind: 'corner',
    pieceIndex: 4,
    solvedStartUnit: 6,
    sourceLayer: 'top',
    ...defineStickers(
      { face: Square1Faces.U, localSurface: 'cap' },
      { face: Square1Faces.L, localSurface: 'sideA' },
      { face: Square1Faces.B, localSurface: 'sideB' },
    ),
    widthUnits: 2,
  },
  {
    id: 'UL',
    kind: 'edge',
    pieceIndex: 5,
    solvedStartUnit: 8,
    sourceLayer: 'top',
    ...defineStickers({ face: Square1Faces.U, localSurface: 'cap' }, { face: Square1Faces.L, localSurface: 'sideA' }),
    widthUnits: 1,
  },
  {
    id: 'ULF',
    kind: 'corner',
    pieceIndex: 6,
    solvedStartUnit: 9,
    sourceLayer: 'top',
    ...defineStickers(
      { face: Square1Faces.U, localSurface: 'cap' },
      { face: Square1Faces.F, localSurface: 'sideA' },
      { face: Square1Faces.L, localSurface: 'sideB' },
    ),
    widthUnits: 2,
  },
  {
    id: 'UF',
    kind: 'edge',
    pieceIndex: 7,
    solvedStartUnit: 11,
    sourceLayer: 'top',
    ...defineStickers({ face: Square1Faces.U, localSurface: 'cap' }, { face: Square1Faces.F, localSurface: 'sideA' }),
    widthUnits: 1,
  },
];

const bottomDefinitions: Square1PieceDefinition[] = [
  {
    id: 'DF',
    kind: 'edge',
    pieceIndex: 8,
    solvedStartUnit: 0,
    sourceLayer: 'bottom',
    ...defineStickers({ face: Square1Faces.D, localSurface: 'cap' }, { face: Square1Faces.F, localSurface: 'sideA' }),
    widthUnits: 1,
  },
  {
    id: 'DFR',
    kind: 'corner',
    pieceIndex: 9,
    solvedStartUnit: 1,
    sourceLayer: 'bottom',
    ...defineStickers(
      { face: Square1Faces.D, localSurface: 'cap' },
      { face: Square1Faces.F, localSurface: 'sideA' },
      { face: Square1Faces.R, localSurface: 'sideB' },
    ),
    widthUnits: 2,
  },
  {
    id: 'DR',
    kind: 'edge',
    pieceIndex: 10,
    solvedStartUnit: 3,
    sourceLayer: 'bottom',
    ...defineStickers({ face: Square1Faces.D, localSurface: 'cap' }, { face: Square1Faces.R, localSurface: 'sideA' }),
    widthUnits: 1,
  },
  {
    id: 'DRB',
    kind: 'corner',
    pieceIndex: 11,
    solvedStartUnit: 4,
    sourceLayer: 'bottom',
    ...defineStickers(
      { face: Square1Faces.D, localSurface: 'cap' },
      { face: Square1Faces.R, localSurface: 'sideA' },
      { face: Square1Faces.B, localSurface: 'sideB' },
    ),
    widthUnits: 2,
  },
  {
    id: 'DB',
    kind: 'edge',
    pieceIndex: 12,
    solvedStartUnit: 6,
    sourceLayer: 'bottom',
    ...defineStickers({ face: Square1Faces.D, localSurface: 'cap' }, { face: Square1Faces.B, localSurface: 'sideA' }),
    widthUnits: 1,
  },
  {
    id: 'DBL',
    kind: 'corner',
    pieceIndex: 13,
    solvedStartUnit: 7,
    sourceLayer: 'bottom',
    ...defineStickers(
      { face: Square1Faces.D, localSurface: 'cap' },
      { face: Square1Faces.B, localSurface: 'sideA' },
      { face: Square1Faces.L, localSurface: 'sideB' },
    ),
    widthUnits: 2,
  },
  {
    id: 'DL',
    kind: 'edge',
    pieceIndex: 14,
    solvedStartUnit: 9,
    sourceLayer: 'bottom',
    ...defineStickers({ face: Square1Faces.D, localSurface: 'cap' }, { face: Square1Faces.L, localSurface: 'sideA' }),
    widthUnits: 1,
  },
  {
    id: 'DLF',
    kind: 'corner',
    pieceIndex: 15,
    solvedStartUnit: 10,
    sourceLayer: 'bottom',
    ...defineStickers(
      { face: Square1Faces.D, localSurface: 'cap' },
      { face: Square1Faces.L, localSurface: 'sideA' },
      { face: Square1Faces.F, localSurface: 'sideB' },
    ),
    widthUnits: 2,
  },
];

const middleDefinitions: Square1PieceDefinition[] = [
  {
    id: 'M_MOVING',
    kind: 'middle',
    pieceIndex: 16,
    solvedStartUnit: 0,
    sourceLayer: 'middle',
    ...defineStickers(
      { face: Square1Faces.F, localSurface: 'sideA' },
      { face: Square1Faces.R, localSurface: 'sideB' },
      { face: Square1Faces.B, localSurface: 'sideC' },
    ),
    widthUnits: 6,
  },
  {
    id: 'M_FIXED',
    kind: 'middle',
    pieceIndex: 17,
    solvedStartUnit: 0,
    sourceLayer: 'middle',
    ...defineStickers(
      { face: Square1Faces.L, localSurface: 'sideA' },
      { face: Square1Faces.B, localSurface: 'sideB' },
      { face: Square1Faces.F, localSurface: 'sideC' },
    ),
    widthUnits: 6,
  },
];

function defineStickers(...stickers: Square1StickerDefinition[]) {
  return {
    stickerFaces: stickers.map((sticker) => sticker.face),
    stickers,
  };
}

export const Square1PieceDefinitions = Object.freeze([
  ...topDefinitions,
  ...bottomDefinitions,
  ...middleDefinitions,
] as const satisfies readonly Square1PieceDefinition[]);

export const SQUARE1_LAYER_UNIT_COUNT = 12;
export const SQUARE1_PIECE_COUNT = 18;
export const SQUARE1_TOP_SLASH_SLOT_INDICES = [11, 0, 1, 2, 3, 4] as const;
export const SQUARE1_BOTTOM_SLASH_SLOT_INDICES = [0, 1, 2, 3, 4, 5] as const;
export const SQUARE1_VISUAL_STATE_KIND = 'square1-pieces-v2';

export type Square1CoordinateMove = {
  bottom: number;
  kind: 'coordinate';
  top: number;
};

export type Square1SlashMove = {
  kind: 'slash';
};

export type Square1Move = Square1CoordinateMove | Square1SlashMove;

export const Square1MoveTokens = Object.freeze({
  FiveZero: '(5,0)',
  FourZero: '(4,0)',
  MinusOneOne: '(-1,1)',
  MinusFourZero: '(-4,0)',
  MinusFiveZero: '(-5,0)',
  MinusOneZero: '(-1,0)',
  MinusThreeZero: '(-3,0)',
  MinusTwoZero: '(-2,0)',
  OneMinusOne: '(1,-1)',
  OneZero: '(1,0)',
  Slash: '/',
  SixZero: '(6,0)',
  ThreeZero: '(3,0)',
  TwoZero: '(2,0)',
  ZeroFive: '(0,5)',
  ZeroFour: '(0,4)',
  ZeroMinusFive: '(0,-5)',
  ZeroMinusFour: '(0,-4)',
  ZeroMinusOne: '(0,-1)',
  ZeroMinusThree: '(0,-3)',
  ZeroMinusTwo: '(0,-2)',
  ZeroOne: '(0,1)',
  ZeroSix: '(0,6)',
  ZeroThree: '(0,3)',
  ZeroTwo: '(0,2)',
});

export type Square1MoveToken = ValueOf<typeof Square1MoveTokens>;
