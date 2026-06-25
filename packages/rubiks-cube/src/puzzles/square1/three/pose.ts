import { Quaternion, Vector3 } from 'three';
import type { Square1State } from '../core/state';
import type {
  Square1ExternalLayerName,
  Square1LayerPieceId,
  Square1PieceDefinition,
  Square1PieceId,
} from '../core/types';
import { SQUARE1_LAYER_UNIT_COUNT } from '../core/types';
import { SQUARE1_BOTTOM_Y, SQUARE1_SLICE_AXIS, SQUARE1_TOP_Y, SQUARE1_UNIT_ANGLE_RADIANS } from './config';
import type { Square1Piece } from './sticker';

export type Square1PiecePose = {
  position: Vector3;
  quaternion: Quaternion;
};

type PieceLocation = {
  layer: Square1ExternalLayerName;
  slot: number;
};

const yAxis = new Vector3(0, 1, 0);
const xAxis = new Vector3(1, 0, 0);

export function poseForPiece(state: Square1State, definition: Square1PieceDefinition): Square1PiecePose {
  if (definition.kind === 'middle') {
    return middlePoseForPiece(state, definition.id);
  }

  const location = locateExternalPiece(state, definition.id as Square1LayerPieceId);
  const rotationUnits = pieceRotationUnits(location.slot, definition.widthUnits, location.layer);
  const y = location.layer === 'top' ? SQUARE1_TOP_Y : SQUARE1_BOTTOM_Y;
  const layerQuaternion =
    location.layer === 'top'
      ? new Quaternion().setFromAxisAngle(yAxis, rotationUnits * SQUARE1_UNIT_ANGLE_RADIANS)
      : new Quaternion()
          .setFromAxisAngle(yAxis, rotationUnits * SQUARE1_UNIT_ANGLE_RADIANS)
          .multiply(new Quaternion().setFromAxisAngle(xAxis, Math.PI));

  return {
    position: new Vector3(0, y, 0),
    quaternion: layerQuaternion.normalize(),
  };
}

export function applySquare1PiecePose(piece: Square1Piece, pose: Square1PiecePose): void {
  piece.position.copy(pose.position);
  piece.quaternion.copy(pose.quaternion);
  piece.updateMatrixWorld(true);
}

export function locateExternalPiece(state: Square1State, id: Square1LayerPieceId): PieceLocation {
  if (state.topSlots.includes(id)) {
    return { layer: 'top', slot: firstOccupiedSlot(state.topSlots, id) };
  }
  if (state.bottomSlots.includes(id)) {
    return { layer: 'bottom', slot: firstOccupiedSlot(state.bottomSlots, id) };
  }

  throw new Error(`Square-1 piece is missing from state: ${id}`);
}

export function pieceRotationUnits(slot: number, widthUnits: number, layer: Square1ExternalLayerName): number {
  if (layer === 'top') {
    return widthUnits === 1 ? slot - 2 : slot;
  }

  return widthUnits === 1 ? slot - 3 : slot - 4;
}

function middlePoseForPiece(state: Square1State, id: Square1PieceId): Square1PiecePose {
  const quaternion =
    id === 'M_MOVING' && state.middleOrientation === 3
      ? new Quaternion().setFromAxisAngle(SQUARE1_SLICE_AXIS, Math.PI)
      : new Quaternion();

  return {
    position: new Vector3(0, 0, 0),
    quaternion: quaternion.normalize(),
  };
}

function firstOccupiedSlot(slots: readonly Square1LayerPieceId[], id: Square1LayerPieceId): number {
  const positions = slots.flatMap((slotId, index) => (slotId === id ? [index] : []));
  if (positions.length === 1) {
    return positions[0];
  }

  const [first, second] = positions;
  return (first + 1) % SQUARE1_LAYER_UNIT_COUNT === second ? first : second;
}
