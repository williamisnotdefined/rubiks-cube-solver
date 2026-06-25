import type { ColorRepresentation } from 'three';
import { Vector3 } from 'three';
import type { MegaminxFace } from '../core/types';
import { MegaminxFaces } from '../core/types';

export const DODECAHEDRON_FACE_DISTANCE = 1.18;
export const CORNER_CUT_RATIO = 0.3;
export const FACE_INSET_RATIO = 0.94;
export const SURFACE_DEPTH = 0.18;
export const SURFACE_OFFSET = 0.035;
export const TURN_ANGLE_RADIANS = (2 * Math.PI) / 5;
export const DEFAULT_MEGAMINX_ANIMATION_SPEED_MS = 240;
export const MEGAMINX_FACE_TURN_PIECE_COUNT = 11;
export const MEGAMINX_WCA_WIDE_TURN_PIECE_COUNT = 51;

export const MegaminxVisualStyles = Object.freeze({
  Stickered: 'stickered',
  Stickerless: 'stickerless',
});

export type MegaminxVisualStyle = (typeof MegaminxVisualStyles)[keyof typeof MegaminxVisualStyles];
export const DEFAULT_MEGAMINX_VISUAL_STYLE: MegaminxVisualStyle = MegaminxVisualStyles.Stickerless;

const phi = (1 + Math.sqrt(5)) / 2;

const rawFaceNormals = {
  [MegaminxFaces.U]: [0, 1, phi],
  [MegaminxFaces.R]: [phi, 0, 1],
  [MegaminxFaces.D]: [0, -1, phi],
  [MegaminxFaces.F]: [1, phi, 0],
  [MegaminxFaces.L]: [-phi, 0, 1],
  [MegaminxFaces.B]: [0, 1, -phi],
  [MegaminxFaces.A]: [-1, phi, 0],
  [MegaminxFaces.C]: [1, -phi, 0],
  [MegaminxFaces.E]: [0, -1, -phi],
  [MegaminxFaces.G]: [-1, -phi, 0],
  [MegaminxFaces.H]: [phi, 0, -1],
  [MegaminxFaces.I]: [-phi, 0, -1],
} satisfies Record<MegaminxFace, readonly [number, number, number]>;

export const faceNormals = Object.fromEntries(
  Object.entries(rawFaceNormals).map(([face, normal]) => [face, new Vector3(...normal).normalize()]),
) as Record<MegaminxFace, Vector3>;

export const MegaminxFaceColors = {
  [MegaminxFaces.U]: '#ffffff',
  [MegaminxFaces.R]: '#7b2cbf',
  [MegaminxFaces.D]: '#ffd500',
  [MegaminxFaces.F]: '#006b3f',
  [MegaminxFaces.L]: '#0046ad',
  [MegaminxFaces.B]: '#d8b56d',
  [MegaminxFaces.A]: '#c1121f',
  [MegaminxFaces.C]: '#ff8c00',
  [MegaminxFaces.E]: '#3f3f46',
  [MegaminxFaces.G]: '#9acd32',
  [MegaminxFaces.H]: '#5dade2',
  [MegaminxFaces.I]: '#f72585',
} satisfies Record<MegaminxFace, ColorRepresentation>;
