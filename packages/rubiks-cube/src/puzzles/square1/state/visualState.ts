import type { Square1State } from '../core/state';
import { cloneSquare1State, createSolvedSquare1State } from '../core/state';
import type { Square1LayerPieceId, Square1PieceDefinition, Square1PieceId } from '../core/types';
import {
  SQUARE1_LAYER_UNIT_COUNT,
  SQUARE1_VISUAL_STATE_KIND,
  Square1ExternalPieceOrder,
  Square1PieceDefinitions,
} from '../core/types';

export type Square1VisualStateModel = Square1State;

const statePrefix = `${SQUARE1_VISUAL_STATE_KIND}:`;
const layerPieceDefinitions = new Map<Square1PieceId, Square1PieceDefinition>(
  Square1PieceDefinitions.map((piece) => [piece.id, piece]),
);
const expectedLayerPieceIds = new Set<Square1LayerPieceId>(Square1ExternalPieceOrder);

export function defaultSquare1VisualState(): string {
  return serializeSquare1VisualState(createSolvedSquare1VisualStateModel());
}

export function createSolvedSquare1VisualStateModel(): Square1VisualStateModel {
  return createSolvedSquare1State();
}

export function cloneSquare1VisualStateModel(model: Square1VisualStateModel): Square1VisualStateModel {
  return cloneSquare1State(model);
}

export function serializeSquare1VisualState(model: Square1VisualStateModel): string {
  return `${statePrefix}${JSON.stringify({
    bottomSlots: model.bottomSlots,
    middleOrientation: model.middleOrientation,
    topSlots: model.topSlots,
    version: 2,
  })}`;
}

export function isSquare1VisualState(value: string): value is string {
  return parseSquare1VisualState(value) != null;
}

export function parseSquare1VisualState(value: string): Square1VisualStateModel | undefined {
  if (!value.startsWith(statePrefix)) {
    return undefined;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value.slice(statePrefix.length));
  } catch {
    return undefined;
  }

  if (!isSquare1VisualStatePayload(parsed)) {
    return undefined;
  }

  return cloneSquare1VisualStateModel(parsed);
}

export function square1PieceDefinitionById(id: Square1PieceId): Square1PieceDefinition | undefined {
  return layerPieceDefinitions.get(id);
}

function isSquare1VisualStatePayload(value: unknown): value is Square1VisualStateModel {
  if (typeof value !== 'object' || value == null) {
    return false;
  }

  const candidate = value as Partial<Square1VisualStateModel>;
  if (
    candidate.version !== 2 ||
    !isValidLayer(candidate.topSlots) ||
    !isValidLayer(candidate.bottomSlots) ||
    !isValidMiddleOrientation(candidate.middleOrientation)
  ) {
    return false;
  }

  return (
    containsEveryLayerPiece(candidate.topSlots, candidate.bottomSlots) &&
    hasValidPieceMultiplicity(candidate.topSlots, candidate.bottomSlots) &&
    hasNoSplitPieces(candidate.topSlots, candidate.bottomSlots) &&
    hasValidCornerAdjacency(candidate.topSlots) &&
    hasValidCornerAdjacency(candidate.bottomSlots)
  );
}

function isValidLayer(value: unknown): value is Square1LayerPieceId[] {
  return (
    Array.isArray(value) &&
    value.length === SQUARE1_LAYER_UNIT_COUNT &&
    value.every((id) => typeof id === 'string' && expectedLayerPieceIds.has(id as Square1LayerPieceId))
  );
}

function isValidMiddleOrientation(value: unknown): value is 0 | 3 {
  return value === 0 || value === 3;
}

function containsEveryLayerPiece(topSlots: Square1LayerPieceId[], bottomSlots: Square1LayerPieceId[]) {
  const ids = new Set([...topSlots, ...bottomSlots]);
  return ids.size === expectedLayerPieceIds.size && Array.from(expectedLayerPieceIds).every((id) => ids.has(id));
}

function hasValidPieceMultiplicity(topSlots: Square1LayerPieceId[], bottomSlots: Square1LayerPieceId[]): boolean {
  const counts = countPieces([...topSlots, ...bottomSlots]);
  for (const id of expectedLayerPieceIds) {
    const definition = layerPieceDefinitions.get(id) as Square1PieceDefinition;
    const expected = definition.kind === 'corner' ? 2 : 1;
    if (counts.get(id) !== expected) {
      return false;
    }
  }

  return true;
}

function hasNoSplitPieces(topSlots: Square1LayerPieceId[], bottomSlots: Square1LayerPieceId[]): boolean {
  const topIds = new Set(topSlots);
  const bottomIds = new Set(bottomSlots);
  return Array.from(expectedLayerPieceIds).every((id) => !topIds.has(id) || !bottomIds.has(id));
}

function hasValidCornerAdjacency(slots: Square1LayerPieceId[]): boolean {
  for (const id of new Set(slots)) {
    const definition = layerPieceDefinitions.get(id) as Square1PieceDefinition;
    if (definition.kind !== 'corner') {
      continue;
    }

    const positions = slots.flatMap((slotId, index) => (slotId === id ? [index] : []));
    if (positions.length !== 2) {
      return false;
    }
    if (
      (positions[0] + 1) % SQUARE1_LAYER_UNIT_COUNT !== positions[1] &&
      (positions[1] + 1) % SQUARE1_LAYER_UNIT_COUNT !== positions[0]
    ) {
      return false;
    }
  }

  return true;
}

function countPieces(ids: readonly Square1LayerPieceId[]): Map<Square1LayerPieceId, number> {
  const counts = new Map<Square1LayerPieceId, number>();
  for (const id of ids) {
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}
