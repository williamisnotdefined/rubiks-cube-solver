import type { Square1State } from '../core/state';
import { isSquare1SlashLegal, Square1IllegalMoveError, uniqueSquare1LayerPieceIds } from '../core/state';
import type { Square1Move, Square1PieceId } from '../core/types';
import { SQUARE1_SLICE_AXIS, SQUARE1_UNIT_ANGLE_RADIANS } from './config';

export type Square1RotationPlan = {
  axis: {
    x: number;
    y: number;
    z: number;
  };
  angleRadians: number;
  pieceIds: Square1PieceId[];
};

export type Square1MovePlan = {
  rotations: Square1RotationPlan[];
};

export function createSquare1MovePlan(state: Square1State, move: Square1Move): Square1MovePlan {
  if (move.kind === 'slash') {
    if (!isSquare1SlashLegal(state)) {
      throw new Square1IllegalMoveError(move);
    }

    return {
      rotations: [
        {
          angleRadians: Math.PI,
          axis: { x: SQUARE1_SLICE_AXIS.x, y: SQUARE1_SLICE_AXIS.y, z: SQUARE1_SLICE_AXIS.z },
          pieceIds: [
            ...uniqueSquare1LayerPieceIds(state.topSlots.slice(6, 12)),
            ...uniqueSquare1LayerPieceIds(state.bottomSlots.slice(0, 6)),
            'M_MOVING',
          ],
        },
      ],
    };
  }

  const rotations: Square1RotationPlan[] = [];
  if (move.top !== 0) {
    rotations.push({
      angleRadians: -move.top * SQUARE1_UNIT_ANGLE_RADIANS,
      axis: { x: 0, y: 1, z: 0 },
      pieceIds: uniqueSquare1LayerPieceIds(state.topSlots),
    });
  }
  if (move.bottom !== 0) {
    rotations.push({
      angleRadians: move.bottom * SQUARE1_UNIT_ANGLE_RADIANS,
      axis: { x: 0, y: 1, z: 0 },
      pieceIds: uniqueSquare1LayerPieceIds(state.bottomSlots),
    });
  }

  return { rotations };
}
