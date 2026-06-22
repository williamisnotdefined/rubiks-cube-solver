type ValueOf<T> = T[keyof T];

export const MegaminxFaces = Object.freeze({
  U: 'U',
  R: 'R',
  D: 'D',
  F: 'F',
  L: 'L',
  B: 'B',
  A: 'A',
  C: 'C',
  E: 'E',
  G: 'G',
  H: 'H',
  I: 'I',
});

export type MegaminxFace = ValueOf<typeof MegaminxFaces>;

export const MegaminxFaceOrder = Object.freeze([
  MegaminxFaces.U,
  MegaminxFaces.R,
  MegaminxFaces.D,
  MegaminxFaces.F,
  MegaminxFaces.L,
  MegaminxFaces.B,
  MegaminxFaces.A,
  MegaminxFaces.C,
  MegaminxFaces.E,
  MegaminxFaces.G,
  MegaminxFaces.H,
  MegaminxFaces.I,
] as const);

export type MegaminxMoveSuffix = '' | "'" | '2' | "2'" | '++' | '--';
export type MegaminxMove = `${MegaminxFace}${MegaminxMoveSuffix}`;

export const MegaminxMoves = Object.freeze({
  U: 'U',
  UP: "U'",
  U2: 'U2',
  U2P: "U2'",
  R: 'R',
  RP: "R'",
  R2: 'R2',
  R2P: "R2'",
  RPP: 'R++',
  RMM: 'R--',
  D: 'D',
  DP: "D'",
  D2: 'D2',
  D2P: "D2'",
  DPP: 'D++',
  DMM: 'D--',
  F: 'F',
  FP: "F'",
  L: 'L',
  LP: "L'",
  B: 'B',
  BP: "B'",
});

export type MegaminxTurn = {
  amount: -2 | -1 | 1 | 2;
  face: MegaminxFace;
};

export const MEGAMINX_FACE_STICKER_COUNT = 11;
export const MEGAMINX_STICKER_COUNT = MegaminxFaceOrder.length * MEGAMINX_FACE_STICKER_COUNT;
export const MEGAMINX_VISUAL_STATE_KIND = 'megaminx-stickers-v1';
