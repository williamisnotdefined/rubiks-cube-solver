import type { Square1LayerPieceId, Square1PieceDefinition, Square1PieceId } from '../core/types';
import {
  SQUARE1_LAYER_UNIT_COUNT,
  SQUARE1_VISUAL_STATE_KIND,
  Square1BottomPieceOrder,
  Square1PieceDefinitions,
  Square1TopPieceOrder,
} from '../core/types';

export type Square1VisualStateModel = {
  bottom: Square1LayerPieceId[];
  bottomOffset: number;
  middleFlipped: boolean;
  top: Square1LayerPieceId[];
  topOffset: number;
  version: 1;
};

const statePrefix = `${SQUARE1_VISUAL_STATE_KIND}:`;
const layerPieceDefinitions = new Map<Square1PieceId, Square1PieceDefinition>(
  Square1PieceDefinitions.map((piece) => [piece.id, piece]),
);
const expectedLayerPieceIds = new Set<Square1LayerPieceId>([...Square1TopPieceOrder, ...Square1BottomPieceOrder]);

export function defaultSquare1VisualState(): string {
  return serializeSquare1VisualState(createSolvedSquare1VisualStateModel());
}

export function createSolvedSquare1VisualStateModel(): Square1VisualStateModel {
  return {
    bottom: [...Square1BottomPieceOrder],
    bottomOffset: 0,
    middleFlipped: false,
    top: [...Square1TopPieceOrder],
    topOffset: 0,
    version: 1,
  };
}

export function cloneSquare1VisualStateModel(model: Square1VisualStateModel): Square1VisualStateModel {
  return {
    bottom: [...model.bottom],
    bottomOffset: model.bottomOffset,
    middleFlipped: model.middleFlipped,
    top: [...model.top],
    topOffset: model.topOffset,
    version: 1,
  };
}

export function serializeSquare1VisualState(model: Square1VisualStateModel): string {
  return `${statePrefix}${JSON.stringify({
    bottom: model.bottom,
    bottomOffset: model.bottomOffset,
    middleFlipped: model.middleFlipped,
    top: model.top,
    topOffset: model.topOffset,
    version: 1,
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
  return (
    candidate.version === 1 &&
    isValidOffset(candidate.topOffset) &&
    isValidOffset(candidate.bottomOffset) &&
    typeof candidate.middleFlipped === 'boolean' &&
    isValidLayer(candidate.top) &&
    isValidLayer(candidate.bottom) &&
    containsEveryLayerPiece(candidate.top, candidate.bottom)
  );
}

function isValidOffset(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < SQUARE1_LAYER_UNIT_COUNT;
}

function isValidLayer(value: unknown): value is Square1LayerPieceId[] {
  if (!Array.isArray(value)) {
    return false;
  }

  const totalWidth = value.reduce((sum, id) => {
    if (!isSquare1LayerPieceId(id)) {
      return Number.NaN;
    }
    return sum + (layerPieceDefinitions.get(id)?.widthUnits ?? Number.NaN);
  }, 0);

  return totalWidth === SQUARE1_LAYER_UNIT_COUNT;
}

function containsEveryLayerPiece(
  top: Square1LayerPieceId[] | undefined,
  bottom: Square1LayerPieceId[] | undefined,
): boolean {
  if (!top || !bottom) {
    return false;
  }

  const ids = new Set([...top, ...bottom]);
  return ids.size === expectedLayerPieceIds.size && Array.from(expectedLayerPieceIds).every((id) => ids.has(id));
}

function isSquare1LayerPieceId(value: unknown): value is Square1LayerPieceId {
  return typeof value === 'string' && expectedLayerPieceIds.has(value as Square1LayerPieceId);
}
