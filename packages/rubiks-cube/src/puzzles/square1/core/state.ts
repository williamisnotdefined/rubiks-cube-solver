import { square1MoveToString } from './notation';
import type { Square1CoordinateMove, Square1LayerPieceId, Square1Move } from './types';
import { SQUARE1_LAYER_UNIT_COUNT, Square1SolvedBottomSlots, Square1SolvedTopSlots } from './types';

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
    topSlots: rotateSlots(state.topSlots, -move.top),
    version: 2,
  };
}

export function applySquare1Slash(state: Square1State, move: Square1Move = { kind: 'slash' }): Square1State {
  if (!isSquare1SlashLegal(state)) {
    throw new Square1IllegalMoveError(move);
  }

  const topSlots = [...state.topSlots];
  const bottomSlots = [...state.bottomSlots];

  // TNoodle-aligned slash convention: top slots 6..11 exchange with bottom slots 0..5.
  // The visual flip is handled by piece pose quaternions, not by reversing slot order.
  for (let index = 0; index < SQUARE1_LAYER_UNIT_COUNT / 2; index++) {
    topSlots[6 + index] = state.bottomSlots[index];
    bottomSlots[index] = state.topSlots[6 + index];
  }

  return {
    bottomSlots,
    middleOrientation: state.middleOrientation === 0 ? 3 : 0,
    topSlots,
    version: 2,
  };
}

export function isSquare1SlashLegal(state: Square1State): boolean {
  return isLayerSlashLegal(state.topSlots) && isLayerSlashLegal(state.bottomSlots);
}

export function isLayerSlashLegal(slots: readonly Square1LayerPieceId[]): boolean {
  return slots[5] !== slots[6] && slots[11] !== slots[0];
}

export function uniqueSquare1LayerPieceIds(slots: readonly Square1LayerPieceId[]): Square1LayerPieceId[] {
  return Array.from(new Set(slots));
}

export function modLayerUnit(value: number): number {
  return ((value % SQUARE1_LAYER_UNIT_COUNT) + SQUARE1_LAYER_UNIT_COUNT) % SQUARE1_LAYER_UNIT_COUNT;
}
