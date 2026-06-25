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

export type Square1LayerPieceId =
  | 'U0'
  | 'U1'
  | 'U2'
  | 'U3'
  | 'U4'
  | 'U5'
  | 'U6'
  | 'U7'
  | 'D0'
  | 'D1'
  | 'D2'
  | 'D3'
  | 'D4'
  | 'D5'
  | 'D6'
  | 'D7';

export type Square1MiddlePieceId = 'M0' | 'M1';
export type Square1PieceId = Square1LayerPieceId | Square1MiddlePieceId;

export type Square1PieceDefinition = {
  face: Square1Face;
  id: Square1PieceId;
  kind: Square1PieceKind;
  layer: Square1LayerName;
  widthUnits: number;
};

export const Square1TopPieceOrder = Object.freeze([
  'U0',
  'U1',
  'U2',
  'U3',
  'U4',
  'U5',
  'U6',
  'U7',
] as const satisfies readonly Square1LayerPieceId[]);

export const Square1BottomPieceOrder = Object.freeze([
  'D0',
  'D1',
  'D2',
  'D3',
  'D4',
  'D5',
  'D6',
  'D7',
] as const satisfies readonly Square1LayerPieceId[]);

export const Square1MiddlePieceOrder = Object.freeze(['M0', 'M1'] as const satisfies readonly Square1MiddlePieceId[]);

const topDefinitions = Square1TopPieceOrder.map(
  (id, index): Square1PieceDefinition => ({
    face: Square1Faces.U,
    id,
    kind: index % 2 === 0 ? 'corner' : 'edge',
    layer: 'top',
    widthUnits: index % 2 === 0 ? 2 : 1,
  }),
);

const bottomDefinitions = Square1BottomPieceOrder.map(
  (id, index): Square1PieceDefinition => ({
    face: Square1Faces.D,
    id,
    kind: index % 2 === 0 ? 'corner' : 'edge',
    layer: 'bottom',
    widthUnits: index % 2 === 0 ? 2 : 1,
  }),
);

const middleDefinitions: Square1PieceDefinition[] = [
  { face: Square1Faces.F, id: 'M0', kind: 'middle', layer: 'middle', widthUnits: 6 },
  { face: Square1Faces.B, id: 'M1', kind: 'middle', layer: 'middle', widthUnits: 6 },
];

export const Square1PieceDefinitions = Object.freeze([
  ...topDefinitions,
  ...bottomDefinitions,
  ...middleDefinitions,
] as const satisfies readonly Square1PieceDefinition[]);

export const SQUARE1_LAYER_UNIT_COUNT = 12;
export const SQUARE1_PIECE_COUNT = 18;
export const SQUARE1_VISUAL_STATE_KIND = 'square1-pieces-v1';

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
  MinusOneOne: '(-1,1)',
  MinusFiveZero: '(-5,0)',
  MinusOneZero: '(-1,0)',
  MinusThreeZero: '(-3,0)',
  OneMinusOne: '(1,-1)',
  OneZero: '(1,0)',
  Slash: '/',
  SixZero: '(6,0)',
  ThreeZero: '(3,0)',
  ZeroFive: '(0,5)',
  ZeroMinusFive: '(0,-5)',
  ZeroMinusOne: '(0,-1)',
  ZeroMinusThree: '(0,-3)',
  ZeroOne: '(0,1)',
  ZeroSix: '(0,6)',
  ZeroThree: '(0,3)',
});

export type Square1MoveToken = ValueOf<typeof Square1MoveTokens>;
