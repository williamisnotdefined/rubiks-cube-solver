import { square1MoveToString } from './notation';
import type { Square1CoordinateMove, Square1LayerPieceId, Square1Move } from './types';
import {
  SQUARE1_BOTTOM_SLASH_SLOT_INDICES,
  SQUARE1_LAYER_UNIT_COUNT,
  SQUARE1_TOP_SLASH_SLOT_INDICES,
  Square1SolvedBottomSlots,
  Square1SolvedTopSlots,
} from './types';

export type Square1MiddleOrientation = 0 | 3;

export type Square1State = {
  bottomSlots: Square1LayerPieceId[];
  middleOrientation: Square1MiddleOrientation;
  topSlots: Square1LayerPieceId[];
  version: 2;
};

export class Square1IllegalMoveError extends Error {
  constructor(move: Square1Move) {
    super(`Illegal Square-1 move for current shape: ${square1MoveToString(move)}`);
    this.name = 'Square1IllegalMoveError';
  }
}

export function createSolvedSquare1State(): Square1State {
  return {
    bottomSlots: [...Square1SolvedBottomSlots],
    middleOrientation: 0,
    topSlots: [...Square1SolvedTopSlots],
    version: 2,
  };
}

export function cloneSquare1State(state: Square1State): Square1State {
  return {
    bottomSlots: [...state.bottomSlots],
    middleOrientation: state.middleOrientation,
    topSlots: [...state.topSlots],
    version: 2,
  };
}

// Shift is the independent 12-slot reference shift: next[i] = previous[(shift + i) % 12].
export function rotateSlots(slots: readonly Square1LayerPieceId[], shift: number): Square1LayerPieceId[] {
  const normalized = modLayerUnit(shift);
  return Array.from({ length: SQUARE1_LAYER_UNIT_COUNT }, (_, index) => slots[(normalized + index) % slots.length]);
}

export function applySquare1Move(state: Square1State, move: Square1Move): Square1State {
  return move.kind === 'slash' ? applySquare1Slash(state, move) : applySquare1CoordinateMove(state, move);
}

export function applySquare1CoordinateMove(state: Square1State, move: Square1CoordinateMove): Square1State {
  return {
    bottomSlots: rotateSlots(state.bottomSlots, -move.bottom),
    middleOrientation: state.middleOrientation,
    topSlots: rotateSlots(state.topSlots, move.top),
    version: 2,
  };
}

export function applySquare1Slash(state: Square1State, move: Square1Move = { kind: 'slash' }): Square1State {
  if (!isSquare1SlashLegal(state)) {
    throw new Square1IllegalMoveError(move);
  }

  const topSlots = [...state.topSlots];
  const bottomSlots = [...state.bottomSlots];

  assignSlashTargets(bottomSlots, state.topSlots, SQUARE1_TOP_SLASH_SLOT_INDICES, 'top', 'bottom');
  assignSlashTargets(topSlots, state.bottomSlots, SQUARE1_BOTTOM_SLASH_SLOT_INDICES, 'bottom', 'top');

  return {
    bottomSlots,
    middleOrientation: state.middleOrientation === 0 ? 3 : 0,
    topSlots,
    version: 2,
  };
}

export function isSquare1SlashLegal(state: Square1State): boolean {
  return (
    state.topSlots[10] !== state.topSlots[11] &&
    state.topSlots[4] !== state.topSlots[5] &&
    state.bottomSlots[11] !== state.bottomSlots[0] &&
    state.bottomSlots[5] !== state.bottomSlots[6]
  );
}

export function uniqueSquare1LayerPieceIds(slots: readonly Square1LayerPieceId[]): Square1LayerPieceId[] {
  return Array.from(new Set(slots));
}

function assignSlashTargets(
  targetSlots: Square1LayerPieceId[],
  sourceSlots: readonly Square1LayerPieceId[],
  sourceIndices: readonly number[],
  sourceLayer: 'top' | 'bottom',
  targetLayer: 'top' | 'bottom',
): void {
  const sourcePieceIds = uniqueSquare1LayerPieceIds(sourceIndices.map((index) => sourceSlots[index]));

  for (const pieceId of sourcePieceIds) {
    const widthUnits = square1PieceWidthUnits(pieceId);
    const sourceStartSlot = firstOccupiedSlot(sourceSlots, pieceId);
    const sourceRotationUnits = square1PieceRotationUnits(sourceStartSlot, widthUnits, sourceLayer);
    const targetRotationUnits = modLayerUnit(11 - sourceRotationUnits);

    for (const targetSlot of square1SlotsForRotationUnits(targetRotationUnits, widthUnits, targetLayer)) {
      targetSlots[targetSlot] = pieceId;
    }
  }
}

function square1PieceWidthUnits(pieceId: Square1LayerPieceId): 1 | 2 {
  return pieceId.length === 3 ? 2 : 1;
}

function square1PieceRotationUnits(slot: number, widthUnits: 1 | 2, layer: 'top' | 'bottom'): number {
  if (layer === 'top') {
    return widthUnits === 1 ? slot - 2 : slot;
  }

  return widthUnits === 1 ? slot - 3 : slot - 4;
}

function square1SlotsForRotationUnits(rotationUnits: number, widthUnits: 1 | 2, layer: 'top' | 'bottom'): number[] {
  const normalized = modLayerUnit(rotationUnits);
  if (layer === 'top') {
    return widthUnits === 1 ? [modLayerUnit(normalized + 2)] : [normalized, modLayerUnit(normalized + 1)];
  }

  return widthUnits === 1
    ? [modLayerUnit(normalized + 3)]
    : [modLayerUnit(normalized + 4), modLayerUnit(normalized + 5)];
}

function firstOccupiedSlot(slots: readonly Square1LayerPieceId[], id: Square1LayerPieceId): number {
  const positions = slots.flatMap((slotId, index) => (slotId === id ? [index] : []));
  if (positions.length === 1) {
    return positions[0];
  }

  const [first, second] = positions;
  return (first + 1) % SQUARE1_LAYER_UNIT_COUNT === second ? first : second;
}

export function modLayerUnit(value: number): number {
  return ((value % SQUARE1_LAYER_UNIT_COUNT) + SQUARE1_LAYER_UNIT_COUNT) % SQUARE1_LAYER_UNIT_COUNT;
}
