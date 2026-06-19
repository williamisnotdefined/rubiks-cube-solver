import type { ColorRepresentation } from 'three';
import { Vector3 } from 'three';
import type { PyraminxFace } from '../core/types';
import { PyraminxFaces } from '../core/types';

export const PYRAMINX_FACE_SIZE = 3;
export const TETRA_RADIUS = 1.55;
export const BACKING_SCALE = 1;
export const BACKING_OFFSET = 0.018;
export const STICKER_SCALE = 0.82;
export const STICKER_OFFSET = 0.04;
export const LAYER_EPSILON = 0.04;
export const TURN_ANGLE_RADIANS = (2 * Math.PI) / 3;
export const DEFAULT_PYRAMINX_ANIMATION_SPEED_MS = 220;
export const MAIN_LAYER_PROJECTION = TETRA_RADIUS / 9;
export const TIP_LAYER_PROJECTION = (5 * TETRA_RADIUS) / 9;

const BASE_Y = -TETRA_RADIUS / 3;
const BASE_RADIUS = (2 * Math.sqrt(2) * TETRA_RADIUS) / 3;

export const vertexPositions: Record<PyraminxFace, Vector3> = {
  [PyraminxFaces.U]: new Vector3(0, TETRA_RADIUS, 0),
  [PyraminxFaces.L]: new Vector3((-Math.sqrt(3) * BASE_RADIUS) / 2, BASE_Y, BASE_RADIUS / 2),
  [PyraminxFaces.R]: new Vector3((Math.sqrt(3) * BASE_RADIUS) / 2, BASE_Y, BASE_RADIUS / 2),
  [PyraminxFaces.B]: new Vector3(0, BASE_Y, -BASE_RADIUS),
};

export const faceVertices: Record<PyraminxFace, readonly [PyraminxFace, PyraminxFace, PyraminxFace]> = {
  [PyraminxFaces.U]: [PyraminxFaces.L, PyraminxFaces.B, PyraminxFaces.R],
  [PyraminxFaces.L]: [PyraminxFaces.U, PyraminxFaces.R, PyraminxFaces.B],
  [PyraminxFaces.R]: [PyraminxFaces.U, PyraminxFaces.B, PyraminxFaces.L],
  [PyraminxFaces.B]: [PyraminxFaces.U, PyraminxFaces.L, PyraminxFaces.R],
};

export const PyraminxFaceColors = {
  [PyraminxFaces.U]: 'white',
  [PyraminxFaces.L]: '#2cbf13',
  [PyraminxFaces.R]: 'red',
  [PyraminxFaces.B]: 'blue',
} satisfies Record<PyraminxFace, ColorRepresentation>;
