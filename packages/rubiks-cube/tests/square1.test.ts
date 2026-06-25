import './setup';
import { Box3, type BufferGeometry, Vector3 } from 'three';
import { describe, expect, test, vi } from 'vitest';
import {
  createSolvedSquare1VisualStateModel,
  DEFAULT_SQUARE1_ANIMATION_SPEED_MS,
  defaultSquare1VisualState,
  invertSquare1Algorithm,
  isSquare1MoveToken,
  isSquare1VisualState,
  parseSquare1Algorithm,
  parseSquare1MoveToken,
  parseSquare1VisualState,
  reverseSquare1Move,
  SQUARE1_PIECE_COUNT,
  SQUARE1_VISUAL_STATE_KIND,
  Square1D,
  Square1IllegalMoveError,
  Square1MoveTokens,
  Square1NotationError,
  serializeSquare1VisualState,
  square1MoveToString,
} from '../src/puzzles/square1';
import {
  SQUARE1_CUT_OFFSET,
  SQUARE1_LAYER_HALF_SIZE,
  SQUARE1_LAYER_HEIGHT,
  SQUARE1_MIDDLE_HEIGHT,
  SQUARE1_MIDDLE_SEAM_OFFSET,
  SQUARE1_UNIT_ANGLE_RADIANS,
} from '../src/puzzles/square1/three/config';

const square1CoordinateTokens = [
  Square1MoveTokens.OneZero,
  Square1MoveTokens.MinusOneZero,
  Square1MoveTokens.OneMinusOne,
  Square1MoveTokens.MinusOneOne,
  Square1MoveTokens.ThreeZero,
  Square1MoveTokens.MinusThreeZero,
  Square1MoveTokens.FiveZero,
  Square1MoveTokens.MinusFiveZero,
  Square1MoveTokens.SixZero,
  Square1MoveTokens.ZeroThree,
  Square1MoveTokens.ZeroMinusThree,
  Square1MoveTokens.ZeroOne,
  Square1MoveTokens.ZeroMinusOne,
  Square1MoveTokens.ZeroFive,
  Square1MoveTokens.ZeroMinusFive,
  Square1MoveTokens.ZeroSix,
] as const;

describe('Square-1 notation', () => {
  test.each([...square1CoordinateTokens, Square1MoveTokens.Slash])('accepts %s', (move) => {
    expect(isSquare1MoveToken(move)).toBe(true);
    expect(parseSquare1MoveToken(move)).toBeDefined();
  });

  test.each([
    'R',
    '(7,0)',
    '(-6,0)',
    '(1.5,0)',
    '(1)',
    '(1,0,0)',
    'invalid',
  ])('rejects unsupported token %s', (token) => {
    expect(isSquare1MoveToken(token)).toBe(false);
    expect(() => parseSquare1Algorithm(token)).toThrow(Square1NotationError);
  });

  test('parses, displays, and inverts algorithms', () => {
    const moves = parseSquare1Algorithm(' (1, -1) / (3,0) ');

    expect(moves.map(square1MoveToString)).toEqual(['(1,-1)', '/', '(3,0)']);
    expect(invertSquare1Algorithm(moves).map(square1MoveToString)).toEqual(['(-3,0)', '/', '(-1,1)']);
    expect(square1MoveToString(reverseSquare1Move({ kind: 'slash' }))).toBe('/');
    expect(parseSquare1Algorithm('')).toEqual([]);
  });
});

describe('Square-1 visual state', () => {
  test('builds and parses versioned visual state', () => {
    const state = defaultSquare1VisualState();
    const parsed = parseSquare1VisualState(state);

    expect(state.startsWith(`${SQUARE1_VISUAL_STATE_KIND}:`)).toBe(true);
    expect(isSquare1VisualState(state)).toBe(true);
    expect(parsed?.topOffset).toBe(0);
    expect(parsed?.bottomOffset).toBe(0);
    expect(parsed?.middleFlipped).toBe(false);
  });

  test('rejects invalid visual states', () => {
    const duplicatePieceState = `${SQUARE1_VISUAL_STATE_KIND}:${JSON.stringify({
      bottom: ['U0'],
      bottomOffset: 0,
      middleFlipped: false,
      top: ['U0'],
      topOffset: 0,
      version: 1,
    })}`;

    expect(isSquare1VisualState('short')).toBe(false);
    expect(parseSquare1VisualState(`${SQUARE1_VISUAL_STATE_KIND}:not-json`)).toBeUndefined();
    expect(parseSquare1VisualState(`${SQUARE1_VISUAL_STATE_KIND}:null`)).toBeUndefined();
    expect(
      parseSquare1VisualState(
        `${SQUARE1_VISUAL_STATE_KIND}:${JSON.stringify({
          bottom: createSolvedSquare1VisualStateModel().bottom,
          bottomOffset: 0,
          middleFlipped: false,
          top: 'not-array',
          topOffset: 0,
          version: 1,
        })}`,
      ),
    ).toBeUndefined();
    expect(
      parseSquare1VisualState(
        `${SQUARE1_VISUAL_STATE_KIND}:${JSON.stringify({
          bottom: undefined,
          bottomOffset: 0,
          middleFlipped: false,
          top: createSolvedSquare1VisualStateModel().top,
          topOffset: 0,
          version: 1,
        })}`,
      ),
    ).toBeUndefined();
    expect(
      parseSquare1VisualState(
        `${SQUARE1_VISUAL_STATE_KIND}:${JSON.stringify({
          bottom: createSolvedSquare1VisualStateModel().bottom,
          bottomOffset: 0,
          middleFlipped: false,
          top: ['bad-piece'],
          topOffset: 0,
          version: 1,
        })}`,
      ),
    ).toBeUndefined();
    expect(parseSquare1VisualState(duplicatePieceState)).toBeUndefined();
  });
});

describe('Square1D', () => {
  test('starts solved and exposes turn plans', () => {
    const defaultSquare1 = new Square1D();
    expect(defaultSquare1.animationSpeedMs).toBe(DEFAULT_SQUARE1_ANIMATION_SPEED_MS);
    expect(defaultSquare1.animationStyle).toBe('linear');
    expect(defaultSquare1.pieceCount()).toBe(SQUARE1_PIECE_COUNT);
    expect(defaultSquare1._pieces.filter((piece) => piece.pieceType === 'corner')).toHaveLength(8);
    expect(defaultSquare1._pieces.filter((piece) => piece.pieceType === 'edge')).toHaveLength(8);
    expect(defaultSquare1._pieces.filter((piece) => piece.pieceType === 'middle')).toHaveLength(2);
    expect(
      defaultSquare1._pieces
        .filter((piece) => piece.pieceType === 'corner')
        .every((piece) => piece.stickers.length === 3),
    ).toBe(true);
    expect(
      defaultSquare1._pieces
        .filter((piece) => piece.pieceType === 'edge')
        .every((piece) => piece.stickers.length === 2),
    ).toBe(true);
    expect(
      defaultSquare1._pieces
        .filter((piece) => piece.pieceType === 'middle')
        .every((piece) => piece.stickers.length === 3),
    ).toBe(true);

    const square1 = new Square1D({ animationSpeedMs: 0 });
    const topPlan = square1.turnPlan(Square1MoveTokens.ThreeZero);
    const bottomPlan = square1.turnPlan(Square1MoveTokens.ZeroThree);
    const slashPlan = square1.turnPlan(Square1MoveTokens.Slash);

    expect(square1.getState()).toBe(defaultSquare1VisualState());
    expect(topPlan.angleRadians).toBeCloseTo(-Math.PI / 2);
    expect(topPlan.pieceIds).toHaveLength(8);
    expect(bottomPlan.angleRadians).toBeCloseTo(Math.PI / 2);
    expect(bottomPlan.pieceIds).toHaveLength(8);
    expect(slashPlan.angleRadians).toBeCloseTo(Math.PI);
    expect(slashPlan.axis).toEqual({ x: 0, y: 0, z: 1 });
    expect(slashPlan.pieceIds).toHaveLength(9);
  });

  test.each(square1CoordinateTokens)('applies coordinate inverse for %s', (move) => {
    const square1 = new Square1D({ animationSpeedMs: 0 });
    const solved = square1.getState();

    square1.applyMove(move);
    expect(square1.getState()).not.toBe(solved);
    square1.applyMove(reverseSquare1Move(parseSquare1MoveToken(move) ?? { kind: 'slash' }));
    expect(square1.getState()).toBe(solved);
    square1.applyMove(move, { reverse: true });
    expect(square1.getState()).not.toBe(solved);
    square1.applyMove(move);
    expect(square1.getState()).toBe(solved);
  });

  test('applies slash, rejects blocked slash, and preserves explicit state', () => {
    const square1 = new Square1D({ animationSpeedMs: 0 });
    const solved = square1.getState();

    square1.applyMove(Square1MoveTokens.Slash);
    expect(square1.getState()).not.toBe(solved);
    square1.applyMove(Square1MoveTokens.Slash);
    expect(square1.getState()).toBe(solved);

    square1.applyMove(Square1MoveTokens.OneMinusOne);
    expect(() => square1.applyMove(Square1MoveTokens.Slash)).not.toThrow();
    expect(parseSquare1VisualState(square1.getState())?.middleFlipped).toBe(true);

    square1.reset();
    square1.applyMove(Square1MoveTokens.MinusOneOne);
    expect(() => square1.turnPlan(Square1MoveTokens.Slash)).toThrow(Square1IllegalMoveError);
    expect(() => square1.applyMove(Square1MoveTokens.Slash)).toThrow(Square1IllegalMoveError);

    const customModel = createSolvedSquare1VisualStateModel();
    customModel.topOffset = 3;
    const customState = serializeSquare1VisualState(customModel);
    expect(square1.setState(customState)).toBe(true);
    expect(square1.getState()).toBe(customState);
    expect(square1.setState('invalid')).toBe(false);
  });

  test('rotates coordinate moves as rigid layers instead of remeshing pieces', () => {
    const square1 = new Square1D({ animationSpeedMs: 0 });
    const initialTopCorner = square1._pieces.find((piece) => piece.pieceId === 'U0');
    if (!initialTopCorner) {
      throw new Error('Expected U0 top corner');
    }
    const initialSignature = geometrySignature(initialTopCorner.surface.geometry);

    square1.applyMove({ bottom: 0, kind: 'coordinate', top: 1 });
    const movedTopCorner = square1._pieces.find((piece) => piece.pieceId === 'U0');
    if (!movedTopCorner) {
      throw new Error('Expected moved U0 top corner');
    }

    expect(geometrySignature(movedTopCorner.surface.geometry)).toBe(initialSignature);
    expect(square1._topLayerGroup.rotation.y).toBeCloseTo(-SQUARE1_UNIT_ANGLE_RADIANS);
    expect(square1._bottomLayerGroup.rotation.y).toBeCloseTo(0);
  });

  test.each([
    Square1MoveTokens.ThreeZero,
    Square1MoveTokens.MinusThreeZero,
    Square1MoveTokens.ZeroThree,
    Square1MoveTokens.ZeroMinusThree,
    Square1MoveTokens.SixZero,
    Square1MoveTokens.ZeroSix,
  ])('keeps the cubeshape bounding box for shape-safe action %s', (move) => {
    const square1 = new Square1D({ animationSpeedMs: 0 });
    const solvedBox = square1BoxSize(square1);

    square1.applyMove(move);
    const movedBox = square1BoxSize(square1);

    expect(movedBox.x).toBeCloseTo(solvedBox.x, 3);
    expect(movedBox.y).toBeCloseTo(solvedBox.y, 3);
    expect(movedBox.z).toBeCloseTo(solvedBox.z, 3);
  });

  test('runs algorithms, rejects bad queued moves, and finishes pending animations', async () => {
    const square1 = new Square1D({ animationSpeedMs: 0 });
    const solved = square1.getState();
    const progress = vi.fn();

    await square1.do('(3,0) (0,-3)');
    expect(square1.getState()).not.toBe(solved);
    await square1.do(invertSquare1Algorithm(parseSquare1Algorithm('(3,0) (0,-3)')));
    expect(square1.getState()).toBe(solved);

    await expect(square1.move('bad')).rejects.toThrow(Square1NotationError);
    await expect(square1.move(Square1MoveTokens.ThreeZero, { animationSpeedMs: 0 })).resolves.toContain(
      SQUARE1_VISUAL_STATE_KIND,
    );
    square1._currentAnimation = { progress } as never;
    square1.reset();

    expect(progress).toHaveBeenCalledWith(1);
  });

  test('throws if an internal piece definition cannot be resolved', () => {
    const square1 = new Square1D({ animationSpeedMs: 0 });
    square1._model.top = ['missing' as never];

    expect(() => square1.turnPlan(Square1MoveTokens.Slash)).toThrow('Unknown Square-1 piece id');
  });

  test('uses exact cube-like proportions with a substantial aligned middle layer', () => {
    const square1 = new Square1D({ animationSpeedMs: 0 });
    square1.updateMatrixWorld(true);
    const fullBox = new Box3().setFromObject(square1);
    const fullSize = fullBox.getSize(new Vector3());
    const middlePieces = square1._pieces.filter((piece) => piece.displayLayer === 'middle');
    const middleBox = middlePieces.reduce((box, piece) => box.expandByObject(piece), new Box3());
    const middleSize = middleBox.getSize(new Vector3());

    expect(fullSize.x).toBeGreaterThan(2 * SQUARE1_LAYER_HALF_SIZE - 0.01);
    expect(fullSize.x).toBeLessThan(2 * SQUARE1_LAYER_HALF_SIZE + 0.02);
    expect(fullSize.z).toBeGreaterThan(2 * SQUARE1_LAYER_HALF_SIZE - 0.01);
    expect(fullSize.z).toBeLessThan(2 * SQUARE1_LAYER_HALF_SIZE + 0.02);
    expect(fullSize.y).toBeGreaterThan(2 * SQUARE1_LAYER_HALF_SIZE - 0.01);
    expect(fullSize.y).toBeLessThan(2 * SQUARE1_LAYER_HALF_SIZE + 0.02);
    expect(middleSize.y / fullSize.y).toBeCloseTo(SQUARE1_MIDDLE_HEIGHT / (2 * SQUARE1_LAYER_HALF_SIZE), 2);
    expect(middleSize.x).toBeCloseTo(fullSize.x, 3);
    expect(middleSize.z).toBeCloseTo(fullSize.z, 3);
    expect(middleBox.min.x).toBeCloseTo(fullBox.min.x, 3);
    expect(middleBox.max.x).toBeCloseTo(fullBox.max.x, 3);
    expect(middleBox.min.z).toBeCloseTo(fullBox.min.z, 3);
    expect(middleBox.max.z).toBeCloseTo(fullBox.max.z, 3);
  });

  test('uses exact Square-1 top polygons and side proportions', () => {
    const square1 = new Square1D({ animationSpeedMs: 0 });
    const topPieces = square1._pieces.filter((piece) => piece.displayLayer === 'top');
    const topCorners = topPieces.filter((piece) => piece.pieceType === 'corner');
    const topEdges = topPieces.filter((piece) => piece.pieceType === 'edge');
    const eastSideLengths = topPieces
      .map((piece) => externalSegmentLengthAtX(piece.surface.geometry, SQUARE1_LAYER_HALF_SIZE))
      .filter((length) => length > 0)
      .sort((a, b) => a - b);

    expect(topCorners.every((piece) => uniqueGeometryXZCount(piece.surface.geometry) === 4)).toBe(true);
    expect(topEdges.every((piece) => uniqueGeometryXZCount(piece.surface.geometry) === 3)).toBe(true);
    expect(eastSideLengths).toHaveLength(3);
    expect(eastSideLengths[0]).toBeCloseTo(2 * SQUARE1_CUT_OFFSET, 3);
    expect(eastSideLengths[1]).toBeCloseTo(SQUARE1_LAYER_HALF_SIZE - SQUARE1_CUT_OFFSET, 3);
    expect(eastSideLengths[2]).toBeCloseTo(SQUARE1_LAYER_HALF_SIZE - SQUARE1_CUT_OFFSET, 3);
    expect(SQUARE1_LAYER_HEIGHT / SQUARE1_LAYER_HALF_SIZE).toBeCloseTo(8 / 11, 6);
  });

  test('keeps the middle-layer split diagonal instead of straight', () => {
    const square1 = new Square1D({ animationSpeedMs: 0 });
    const middleLeft = square1._pieces.find((piece) => piece.pieceId === 'M0');
    if (!middleLeft) {
      throw new Error('Expected M0 middle piece');
    }

    const leftCutZ = minGeometryZAtX(middleLeft.surface.geometry, -SQUARE1_LAYER_HALF_SIZE);
    const rightCutZ = minGeometryZAtX(middleLeft.surface.geometry, SQUARE1_LAYER_HALF_SIZE);

    expect(leftCutZ).toBeCloseTo(-SQUARE1_MIDDLE_SEAM_OFFSET, 3);
    expect(rightCutZ).toBeCloseTo(SQUARE1_MIDDLE_SEAM_OFFSET, 3);
  });
});

function square1BoxSize(square1: Square1D): Vector3 {
  square1.updateMatrixWorld(true);
  return new Box3().setFromObject(square1).getSize(new Vector3());
}

function geometrySignature(geometry: BufferGeometry): string {
  const position = geometry.getAttribute('position');
  const values: string[] = [];
  for (let index = 0; index < position.count; index++) {
    values.push(
      `${position.getX(index).toFixed(6)},${position.getY(index).toFixed(6)},${position.getZ(index).toFixed(6)}`,
    );
  }

  return values.join('|');
}

function uniqueGeometryXZCount(geometry: BufferGeometry): number {
  const position = geometry.getAttribute('position');
  const points = new Set<string>();
  for (let index = 0; index < position.count; index++) {
    const x = position.getX(index);
    const z = position.getZ(index);
    if (isSquare1PolygonVertex(x, z)) {
      points.add(`${x.toFixed(6)},${z.toFixed(6)}`);
    }
  }

  return points.size;
}

function isSquare1PolygonVertex(x: number, z: number): boolean {
  return (
    (Math.abs(x) < 0.0001 && Math.abs(z) < 0.0001) ||
    Math.abs(Math.max(Math.abs(x), Math.abs(z)) - SQUARE1_LAYER_HALF_SIZE) < 0.0001
  );
}

function externalSegmentLengthAtX(geometry: BufferGeometry, x: number): number {
  const position = geometry.getAttribute('position');
  const zValues: number[] = [];
  for (let index = 0; index < position.count; index++) {
    if (Math.abs(position.getX(index) - x) < 0.0001) {
      zValues.push(position.getZ(index));
    }
  }

  return zValues.length > 0 ? Math.max(...zValues) - Math.min(...zValues) : 0;
}

function minGeometryZAtX(geometry: BufferGeometry, x: number): number {
  const position = geometry.getAttribute('position');
  let minZ = Infinity;
  for (let index = 0; index < position.count; index++) {
    if (Math.abs(position.getX(index) - x) < 0.0001) {
      minZ = Math.min(minZ, position.getZ(index));
    }
  }

  return minZ;
}
