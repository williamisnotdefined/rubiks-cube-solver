import type { ColorRepresentation } from 'three';
import { Vector3 } from 'three';
import type { Square1Face } from '../core/types';
import { Square1Faces } from '../core/types';

export const DEFAULT_SQUARE1_ANIMATION_SPEED_MS = 220;
export const SQUARE1_UNIT_ANGLE_RADIANS = Math.PI / 6;
export const SQUARE1_LAYER_HALF_SIZE = 1;
export const SQUARE1_CUT_OFFSET = Math.tan(Math.PI / 12);
export const SQUARE1_LAYER_HEIGHT = 8 / 11;
export const SQUARE1_MIDDLE_HEIGHT = 6 / 11;
export const SQUARE1_LAYER_GAP = 0;
export const SQUARE1_TOP_Y = SQUARE1_MIDDLE_HEIGHT / 2 + SQUARE1_LAYER_GAP + SQUARE1_LAYER_HEIGHT / 2;
export const SQUARE1_BOTTOM_Y = -SQUARE1_TOP_Y;
export const SQUARE1_MIDDLE_SEAM_OFFSET = SQUARE1_CUT_OFFSET;
export const SQUARE1_SEAM_DIRECTION = new Vector3(-SQUARE1_CUT_OFFSET, 0, 1).normalize();
export const SQUARE1_SLICE_AXIS = new Vector3(1, 0, SQUARE1_CUT_OFFSET).normalize();
export const SQUARE1_SLICE_EPSILON = 1e-8;
export const SQUARE1_STICKER_INSET = 0.018;
export const SQUARE1_STICKER_LIFT = 0.003;
export const SQUARE1_STICKER_VERTICAL_INSET = 0.04;
export const SQUARE1_BEVEL_SIZE = 0;
export const SQUARE1_PIECE_GAP_UNITS = 0;
export const SQUARE1_SHADOW_COLOR = '#111318';

export const Square1FaceColors = {
  [Square1Faces.U]: '#ffd500',
  [Square1Faces.R]: '#2cbf13',
  [Square1Faces.F]: 'red',
  [Square1Faces.D]: '#ffffff',
  [Square1Faces.L]: 'blue',
  [Square1Faces.B]: '#ff6d00',
} satisfies Record<Square1Face, ColorRepresentation>;
