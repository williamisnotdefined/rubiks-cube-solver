type ValueOf<T> = T[keyof T];

export const PyraminxFaces = Object.freeze({
  U: 'U',
  L: 'L',
  R: 'R',
  B: 'B',
});

export type PyraminxFace = ValueOf<typeof PyraminxFaces>;

export const PyraminxFaceOrder = Object.freeze([
  PyraminxFaces.U,
  PyraminxFaces.L,
  PyraminxFaces.R,
  PyraminxFaces.B,
] as const);

export const PyraminxMoves = Object.freeze({
  U: 'U',
  UP: "U'",
  L: 'L',
  LP: "L'",
  R: 'R',
  RP: "R'",
  B: 'B',
  BP: "B'",
  u: 'u',
  uP: "u'",
  l: 'l',
  lP: "l'",
  r: 'r',
  rP: "r'",
  b: 'b',
  bP: "b'",
});

export type PyraminxMove = ValueOf<typeof PyraminxMoves>;

export type PyraminxTurn = {
  vertex: PyraminxFace;
  tip: boolean;
  prime: boolean;
};

export const PYRAMINX_FACE_STICKER_COUNT = 9;
export const PYRAMINX_STICKER_COUNT = PyraminxFaceOrder.length * PYRAMINX_FACE_STICKER_COUNT;
export const PYRAMINX_VISUAL_STATE_KIND = 'pyraminx-stickers-v1';
