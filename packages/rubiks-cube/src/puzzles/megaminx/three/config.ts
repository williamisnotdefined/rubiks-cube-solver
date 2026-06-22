import type { ColorRepresentation } from 'three';
import { Vector3 } from 'three';
import type { MegaminxFace } from '../core/types';
import { MegaminxFaces } from '../core/types';

export const DODECAHEDRON_FACE_DISTANCE = 1.18;
export const BACKING_SCALE = 1.16;
export const BACKING_OFFSET = 0.018;
export const STICKER_OFFSET = 0.04;
export const STICKER_RADIUS = 0.095;
export const CENTER_STICKER_RADIUS = 0.11;
export const CORNER_STICKER_SCALE = 0.74;
export const EDGE_STICKER_SCALE = 0.72;
export const TURN_ANGLE_RADIANS = (2 * Math.PI) / 5;
export const DEFAULT_MEGAMINX_ANIMATION_SPEED_MS = 240;
export const MEGAMINX_FACE_TURN_STICKER_COUNT = 26;

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
  [MegaminxFaces.U]: 'white',
  [MegaminxFaces.R]: 'red',
  [MegaminxFaces.D]: '#ffd500',
  [MegaminxFaces.F]: '#00a651',
  [MegaminxFaces.L]: '#ff8c00',
  [MegaminxFaces.B]: '#0046ad',
  [MegaminxFaces.A]: '#7b2cbf',
  [MegaminxFaces.C]: '#00a3a3',
  [MegaminxFaces.E]: '#f72585',
  [MegaminxFaces.G]: '#8b5a2b',
  [MegaminxFaces.H]: '#9acd32',
  [MegaminxFaces.I]: '#c0c0c0',
} satisfies Record<MegaminxFace, ColorRepresentation>;
