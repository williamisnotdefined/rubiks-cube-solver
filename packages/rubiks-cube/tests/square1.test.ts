import './setup';
import { Box3, type BufferGeometry, Matrix4, Quaternion, Vector3 } from 'three';
import { describe, expect, test, vi } from 'vitest';
import {
  applySquare1Move,
  createSolvedSquare1State,
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
  type Square1LayerPieceId,
  type Square1Move,
  Square1MoveTokens,
  Square1NotationError,
  square1MoveToString,
} from '../src/puzzles/square1';
import {
  SQUARE1_CUT_OFFSET,
  SQUARE1_LAYER_HALF_SIZE,
  SQUARE1_LAYER_HEIGHT,
  SQUARE1_MIDDLE_HEIGHT,
  SQUARE1_MIDDLE_SEAM_OFFSET,
  SQUARE1_SEAM_DIRECTION,
  SQUARE1_SLICE_AXIS,
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

const referenceIdToSemanticId = {
  0: 'UFR',
  1: 'UR',
  2: 'URB',
  3: 'UB',
  4: 'UBL',
  5: 'UL',
  6: 'ULF',
  7: 'UF',
  8: 'DF',
  9: 'DFR',
  10: 'DR',
  11: 'DRB',
  12: 'DB',
  13: 'DBL',
  14: 'DL',
  15: 'DLF',
} as const satisfies Record<number, Square1LayerPieceId>;

type ReferenceGoldenCase = {
  expectedBottom: readonly number[];
  expectedMiddleOrientation: 0 | 3;
  expectedTop: readonly number[];
  moves: Square1Move[];
  name: string;
};

const referenceGoldenCases: ReferenceGoldenCase[] = [
  {
    expectedBottom: [4, 4, 5, 6, 6, 7, 12, 13, 13, 14, 15, 15],
    expectedMiddleOrientation: 3,
    expectedTop: [0, 0, 1, 2, 2, 3, 8, 9, 9, 10, 11, 11],
    moves: [{ kind: 'slash' }],
    name: '/',
  },
  {
    expectedBottom: [8, 9, 9, 10, 11, 11, 12, 13, 13, 14, 15, 15],
    expectedMiddleOrientation: 0,
    expectedTop: [7, 0, 0, 1, 2, 2, 3, 4, 4, 5, 6, 6],
    moves: [{ bottom: 0, kind: 'coordinate', top: 1 }],
    name: '(1,0)',
  },
  {
    expectedBottom: [8, 9, 9, 10, 11, 11, 12, 13, 13, 14, 15, 15],
    expectedMiddleOrientation: 0,
    expectedTop: [0, 1, 2, 2, 3, 4, 4, 5, 6, 6, 7, 0],
    moves: [{ bottom: 0, kind: 'coordinate', top: -1 }],
    name: '(-1,0)',
  },
  {
    expectedBottom: [15, 8, 9, 9, 10, 11, 11, 12, 13, 13, 14, 15],
    expectedMiddleOrientation: 0,
    expectedTop: [0, 0, 1, 2, 2, 3, 4, 4, 5, 6, 6, 7],
    moves: [{ bottom: 1, kind: 'coordinate', top: 0 }],
    name: '(0,1)',
  },
  {
    expectedBottom: [9, 9, 10, 11, 11, 12, 13, 13, 14, 15, 15, 8],
    expectedMiddleOrientation: 0,
    expectedTop: [0, 0, 1, 2, 2, 3, 4, 4, 5, 6, 6, 7],
    moves: [{ bottom: -1, kind: 'coordinate', top: 0 }],
    name: '(0,-1)',
  },
  {
    expectedBottom: [3, 4, 4, 5, 6, 6, 13, 13, 14, 15, 15, 8],
    expectedMiddleOrientation: 3,
    expectedTop: [7, 0, 0, 1, 2, 2, 9, 9, 10, 11, 11, 12],
    moves: [{ bottom: -1, kind: 'coordinate', top: 1 }, { kind: 'slash' }],
    name: '(1,-1) /',
  },
  {
    expectedBottom: [2, 2, 3, 4, 4, 5, 12, 13, 13, 14, 15, 15],
    expectedMiddleOrientation: 3,
    expectedTop: [6, 6, 7, 0, 0, 1, 8, 9, 9, 10, 11, 11],
    moves: [{ bottom: 0, kind: 'coordinate', top: 3 }, { kind: 'slash' }],
    name: '(3,0) /',
  },
  {
    expectedBottom: [4, 4, 5, 6, 6, 7, 10, 11, 11, 12, 13, 13],
    expectedMiddleOrientation: 3,
    expectedTop: [0, 0, 1, 2, 2, 3, 14, 15, 15, 8, 9, 9],
    moves: [{ bottom: 3, kind: 'coordinate', top: 0 }, { kind: 'slash' }],
    name: '(0,3) /',
  },
  {
    expectedBottom: [8, 9, 9, 10, 11, 11, 12, 13, 13, 14, 15, 15],
    expectedMiddleOrientation: 0,
    expectedTop: [0, 0, 1, 2, 2, 3, 4, 4, 5, 6, 6, 7],
    moves: [{ kind: 'slash' }, { kind: 'slash' }],
    name: '/ /',
  },
];

describe('Square-1 notation', () => {
  test.each([...square1CoordinateTokens, Square1MoveTokens.Slash, '(0,0)'])('accepts %s', (move) => {
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

describe('Square-1 pure state', () => {
  test('builds the solved 24-slot state', () => {
    const solved = createSolvedSquare1State();

    expect(solved.version).toBe(2);
    expect(solved.topSlots).toEqual(mapReferenceSlots([0, 0, 1, 2, 2, 3, 4, 4, 5, 6, 6, 7]));
    expect(solved.bottomSlots).toEqual(mapReferenceSlots([8, 9, 9, 10, 11, 11, 12, 13, 13, 14, 15, 15]));
    expect(solved.middleOrientation).toBe(0);
  });

  test.each(referenceGoldenCases)('matches independent golden state for $name', (golden) => {
    const actual = golden.moves.reduce(applySquare1Move, createSolvedSquare1State());

    expect(actual.topSlots).toEqual(mapReferenceSlots(golden.expectedTop));
    expect(actual.bottomSlots).toEqual(mapReferenceSlots(golden.expectedBottom));
    expect(actual.middleOrientation).toBe(golden.expectedMiddleOrientation);
  });

  test.each(square1CoordinateTokens)('applies coordinate inverse for %s', (move) => {
    const parsed = parseSquare1MoveToken(move);
    if (!parsed) {
      throw new Error(`Expected parsed move: ${move}`);
    }
    const solved = createSolvedSquare1State();

    expect(applySquare1Move(applySquare1Move(solved, parsed), reverseSquare1Move(parsed))).toEqual(solved);
  });

  test('rejects blocked slash states', () => {
    const blocked = applySquare1Move(createSolvedSquare1State(), { bottom: 1, kind: 'coordinate', top: -1 });

    expect(() => applySquare1Move(blocked, { kind: 'slash' })).toThrow(Square1IllegalMoveError);
  });
});

describe('Square-1 visual state', () => {
  test('builds and parses versioned v2 visual state', () => {
    const state = defaultSquare1VisualState();
    const parsed = parseSquare1VisualState(state);

    expect(state.startsWith(`${SQUARE1_VISUAL_STATE_KIND}:`)).toBe(true);
    expect(state.startsWith('square1-pieces-v2:')).toBe(true);
    expect(isSquare1VisualState(state)).toBe(true);
    expect(parsed?.topSlots).toEqual(createSolvedSquare1VisualStateModel().topSlots);
    expect(parsed?.bottomSlots).toEqual(createSolvedSquare1VisualStateModel().bottomSlots);
    expect(parsed?.middleOrientation).toBe(0);
  });

  test('rejects v1 and invalid visual states', () => {
    const solved = createSolvedSquare1VisualStateModel();

    expect(parseSquare1VisualState('square1-pieces-v1:{"version":1}')).toBeUndefined();
    expect(isSquare1VisualState('short')).toBe(false);
    expect(parseSquare1VisualState(`${SQUARE1_VISUAL_STATE_KIND}:not-json`)).toBeUndefined();
    expect(parseSquare1VisualState(`${SQUARE1_VISUAL_STATE_KIND}:null`)).toBeUndefined();
    expect(parseSquare1VisualState(payload({ ...solved, version: 1 as never }))).toBeUndefined();
    expect(parseSquare1VisualState(payload({ ...solved, topSlots: solved.topSlots.slice(1) }))).toBeUndefined();
    expect(
      parseSquare1VisualState(payload({ ...solved, topSlots: ['bad-piece' as never, ...solved.topSlots.slice(1)] })),
    ).toBeUndefined();
    expect(
      parseSquare1VisualState(payload({ ...solved, topSlots: replaceAt(solved.topSlots, 2, 'UF') })),
    ).toBeUndefined();
    expect(
      parseSquare1VisualState(
        payload({ ...solved, topSlots: replaceAt(replaceAt(solved.topSlots, 1, 'UR'), 2, 'UFR') }),
      ),
    ).toBeUndefined();
    expect(parseSquare1VisualState(payload({ ...solved, middleOrientation: 1 as never }))).toBeUndefined();
  });
});

describe('Square1D', () => {
  test('starts solved and exposes composite move plans', () => {
    const square1 = new Square1D({ animationSpeedMs: 0 });
    const slashPlan = square1.movePlan(Square1MoveTokens.Slash);
    const doublePlan = square1.movePlan('(3,-1)');

    expect(square1.animationSpeedMs).toBe(0);
    expect(new Square1D().animationSpeedMs).toBe(DEFAULT_SQUARE1_ANIMATION_SPEED_MS);
    expect(square1.animationStyle).toBe('linear');
    expect(square1.getState()).toBe(defaultSquare1VisualState());
    expect(square1.pieceCount()).toBe(SQUARE1_PIECE_COUNT);
    expect(square1._pieces.filter((piece) => piece.pieceType === 'corner')).toHaveLength(8);
    expect(square1._pieces.filter((piece) => piece.pieceType === 'edge')).toHaveLength(8);
    expect(square1._pieces.filter((piece) => piece.pieceType === 'middle')).toHaveLength(2);
    expect(square1.movePlan('(0,0)').rotations).toHaveLength(0);
    expect(square1.movePlan(Square1MoveTokens.ThreeZero).rotations).toHaveLength(1);
    expect(square1.movePlan(Square1MoveTokens.ZeroMinusOne).rotations).toHaveLength(1);
    expect(doublePlan.rotations).toHaveLength(2);
    expect(doublePlan.rotations[0].angleRadians).toBeCloseTo(-Math.PI / 2);
    expect(doublePlan.rotations[1].angleRadians).toBeCloseTo(-SQUARE1_UNIT_ANGLE_RADIANS);
    expect(new Set(doublePlan.rotations.flatMap((rotation) => rotation.pieceIds)).size).toBe(16);
    expect(slashPlan.rotations).toHaveLength(1);
    expect(slashPlan.rotations[0].angleRadians).toBeCloseTo(Math.PI);
    expect(slashPlan.rotations[0].axis.x).toBeCloseTo(SQUARE1_SLICE_AXIS.x);
    expect(slashPlan.rotations[0].axis.z).toBeCloseTo(SQUARE1_SLICE_AXIS.z);
    expect(slashPlan.rotations[0].axis).not.toEqual({ x: 0, y: 0, z: 1 });
    expect(slashPlan.rotations[0].pieceIds).toContain('M_MOVING');
    expect(slashPlan.rotations[0].pieceIds).not.toContain('M_FIXED');
  });

  test('renders the initial solved state with stickers facing their named faces', () => {
    const square1 = new Square1D({ animationSpeedMs: 0 });

    for (const piece of square1._pieces) {
      for (const sticker of piece.stickers) {
        const actual = worldStickerNormal(piece, sticker);
        const expected = faceNormal(sticker.square1Face);
        expect(
          actual.dot(expected),
          `${piece.pieceId} ${sticker.square1Face} ${sticker.square1Surface}`,
        ).toBeGreaterThan(0.9);
      }
    }
  });

  test('applies moves, rejects blocked slash, and rejects v1 state', () => {
    const square1 = new Square1D({ animationSpeedMs: 0 });
    const solved = square1.getState();

    square1.applyMove(Square1MoveTokens.Slash);
    expect(square1.getState()).not.toBe(solved);
    square1.applyMove(Square1MoveTokens.Slash);
    expect(square1.getState()).toBe(solved);

    square1.applyMove(Square1MoveTokens.OneMinusOne);
    expect(() => square1.applyMove(Square1MoveTokens.Slash)).not.toThrow();
    expect(parseSquare1VisualState(square1.getState())?.middleOrientation).toBe(3);

    square1.reset();
    square1.applyMove(Square1MoveTokens.MinusOneOne);
    expect(() => square1.movePlan(Square1MoveTokens.Slash)).toThrow(Square1IllegalMoveError);
    expect(() => square1.applyMove(Square1MoveTokens.Slash)).toThrow(Square1IllegalMoveError);

    expect(square1.setState(defaultSquare1VisualState())).toBe(true);
    expect(square1.setState('square1-pieces-v1:{"version":1}')).toBe(false);
  });

  test('supports reverse coordinate moves and reports invalid queued moves', async () => {
    const square1 = new Square1D({ animationSpeedMs: 0 });
    const solved = square1.getState();

    square1.applyMove(Square1MoveTokens.ThreeZero, { reverse: true });
    expect(square1.getState()).not.toBe(solved);
    square1.applyMove(Square1MoveTokens.ThreeZero);
    expect(square1.getState()).toBe(solved);
    await expect(square1.move('bad')).rejects.toThrow(Square1NotationError);
  });

  test('throws if a persistent physical piece is missing internally', () => {
    const square1 = new Square1D({ animationSpeedMs: 0 });

    square1._piecesById.delete('UFR');

    expect(() => square1.reset()).toThrow('Missing Square-1 piece: UFR');
  });

  test('keeps physical objects, geometry, stickers, and materials stable', () => {
    const square1 = new Square1D({ animationSpeedMs: 0 });
    const before = requiredPiece(square1, 'UFR');
    const beforeSticker = before.stickers[0];
    const beforeSignature = geometrySignature(before.surface.geometry);

    square1.applyMove(Square1MoveTokens.OneMinusOne);
    square1.applyMove(Square1MoveTokens.Slash);
    square1.applyMove(Square1MoveTokens.Slash);
    square1.applyMove(Square1MoveTokens.ThreeZero);
    square1.reset();

    const after = requiredPiece(square1, 'UFR');
    expect(after).toBe(before);
    expect(after.surface.geometry).toBe(before.surface.geometry);
    expect(after.stickers[0]).toBe(beforeSticker);
    expect(after.stickers[0].material).toBe(beforeSticker.material);
    expect(geometrySignature(after.surface.geometry)).toBe(beforeSignature);
  });

  test('keeps stickers attached to pieces through slash transfer', () => {
    const square1 = new Square1D({ animationSpeedMs: 0 });
    const topTransfer = requiredPiece(square1, 'UBL');
    const bottomTransfer = requiredPiece(square1, 'DFR');
    const topCap = requiredCapSticker(topTransfer);
    const bottomCap = requiredCapSticker(bottomTransfer);
    const topMaterial = topCap.material;
    const bottomMaterial = bottomCap.material;

    square1.applyMove(Square1MoveTokens.Slash);

    expect(topTransfer.stickers.map((sticker) => sticker.square1Face)).toContain('U');
    expect(bottomTransfer.stickers.map((sticker) => sticker.square1Face)).toContain('D');
    expect(requiredCapSticker(topTransfer).material).toBe(topMaterial);
    expect(requiredCapSticker(bottomTransfer).material).toBe(bottomMaterial);
    expect(worldNormalY(topTransfer, topCap)).toBeLessThan(-0.9);
    expect(worldNormalY(bottomTransfer, bottomCap)).toBeGreaterThan(0.9);
  });

  test('keeps frame zero matrices stable for animated slash', () => {
    const square1 = new Square1D({ animationSpeedMs: 1000 });
    const before = captureWorldMatrices(square1);
    const progress = vi.fn();
    square1._currentAnimation = { progress } as never;
    square1.reset();

    expect(progress).toHaveBeenCalledWith(1);
    expect(square1.getState()).toBe(defaultSquare1VisualState());
    expect(captureWorldMatrices(square1)).toEqual(before);
  });

  test('uses exact cube-like proportions with a substantial aligned middle layer', () => {
    const square1 = new Square1D({ animationSpeedMs: 0 });
    square1.updateMatrixWorld(true);
    const fullBox = new Box3().setFromObject(square1);
    const fullSize = fullBox.getSize(new Vector3());
    const middlePieces = square1._pieces.filter((piece) => piece.pieceType === 'middle');
    const middleBox = middlePieces.reduce((box, piece) => box.expandByObject(piece), new Box3());
    const middleSize = middleBox.getSize(new Vector3());

    expect(fullSize.x).toBeGreaterThan(2 * SQUARE1_LAYER_HALF_SIZE - 0.05);
    expect(fullSize.z).toBeGreaterThan(2 * SQUARE1_LAYER_HALF_SIZE - 0.05);
    expect(fullSize.y).toBeGreaterThan(2 * SQUARE1_LAYER_HALF_SIZE - 0.05);
    expect(fullSize.y).toBeLessThan(2 * SQUARE1_LAYER_HALF_SIZE + 0.05);
    expect(middleSize.y / fullSize.y).toBeCloseTo(SQUARE1_MIDDLE_HEIGHT / (2 * SQUARE1_LAYER_HALF_SIZE), 1);
  });

  test('uses exact Square-1 canonical polygons and diagonal middle split', () => {
    const square1 = new Square1D({ animationSpeedMs: 0 });
    const corner = requiredPiece(square1, 'UFR');
    const edge = requiredPiece(square1, 'UR');
    const middleMoving = requiredPiece(square1, 'M_MOVING');

    expect(uniqueGeometryXZCount(corner.surface.geometry)).toBe(4);
    expect(uniqueGeometryXZCount(edge.surface.geometry)).toBe(3);
    expect(externalSegmentLengthAtX(edge.surface.geometry, SQUARE1_LAYER_HALF_SIZE)).toBeCloseTo(
      2 * SQUARE1_CUT_OFFSET,
      3,
    );
    expect(SQUARE1_LAYER_HEIGHT / SQUARE1_LAYER_HALF_SIZE).toBeCloseTo(8 / 11, 6);
    expect(minGeometryZAtX(middleMoving.surface.geometry, -SQUARE1_LAYER_HALF_SIZE)).toBeCloseTo(
      -SQUARE1_MIDDLE_SEAM_OFFSET,
      3,
    );
    expect(minGeometryZAtX(middleMoving.surface.geometry, SQUARE1_LAYER_HALF_SIZE)).toBeCloseTo(
      SQUARE1_MIDDLE_SEAM_OFFSET,
      3,
    );
  });
});

describe('Square-1 slash axis', () => {
  test('is normalized and perpendicular to the seam', () => {
    expect(Math.abs(SQUARE1_SEAM_DIRECTION.dot(SQUARE1_SLICE_AXIS))).toBeLessThan(1e-10);
    expect(SQUARE1_SLICE_AXIS.length()).toBeCloseTo(1);
  });
});

function mapReferenceSlots(slots: readonly number[]): Square1LayerPieceId[] {
  return slots.map((id) => referenceIdToSemanticId[id]);
}

function payload(value: unknown): string {
  return `${SQUARE1_VISUAL_STATE_KIND}:${JSON.stringify(value)}`;
}

function replaceAt<T>(values: readonly T[], index: number, value: T): T[] {
  const next = [...values];
  next[index] = value;
  return next;
}

function requiredPiece(square1: Square1D, id: Parameters<Square1D['pieceById']>[0]) {
  const piece = square1.pieceById(id);
  if (!piece) {
    throw new Error(`Expected Square-1 piece ${id}`);
  }
  return piece;
}

function requiredCapSticker(piece: ReturnType<typeof requiredPiece>) {
  const sticker = piece.stickers.find((candidate) => candidate.square1Surface === 'cap');
  if (!sticker) {
    throw new Error(`Expected cap sticker for ${piece.pieceId}`);
  }
  return sticker;
}

function worldNormalY(piece: ReturnType<typeof requiredPiece>, sticker: ReturnType<typeof requiredCapSticker>): number {
  return worldStickerNormal(piece, sticker).y;
}

function worldStickerNormal(
  piece: ReturnType<typeof requiredPiece>,
  sticker: ReturnType<typeof requiredCapSticker>,
): Vector3 {
  piece.updateMatrixWorld(true);
  sticker.updateMatrixWorld(true);
  return localStickerNormal(piece.pieceId, sticker.square1Surface).applyQuaternion(
    sticker.getWorldQuaternion(new Quaternion()),
  );
}

function localStickerNormal(
  pieceId: ReturnType<typeof requiredPiece>['pieceId'],
  surface: ReturnType<typeof requiredCapSticker>['square1Surface'],
): Vector3 {
  if (surface === 'cap') {
    return new Vector3(0, 1, 0);
  }
  if (pieceId === 'M_MOVING') {
    return surface === 'sideA'
      ? new Vector3(-1, 0, 0)
      : surface === 'sideB'
        ? new Vector3(0, 0, 1)
        : new Vector3(1, 0, 0);
  }
  if (pieceId === 'M_FIXED') {
    return surface === 'sideA'
      ? new Vector3(0, 0, -1)
      : surface === 'sideB'
        ? new Vector3(1, 0, 0)
        : new Vector3(-1, 0, 0);
  }
  if (surface === 'sideA') {
    return new Vector3(1, 0, 0);
  }
  if (surface === 'sideB') {
    return new Vector3(0, 0, 1);
  }

  return new Vector3(0, 0, -1);
}

function faceNormal(face: ReturnType<typeof requiredCapSticker>['square1Face']): Vector3 {
  switch (face) {
    case 'U':
      return new Vector3(0, 1, 0);
    case 'D':
      return new Vector3(0, -1, 0);
    case 'R':
      return new Vector3(1, 0, 0);
    case 'L':
      return new Vector3(-1, 0, 0);
    case 'F':
      return new Vector3(0, 0, 1);
    case 'B':
      return new Vector3(0, 0, -1);
  }
}

function captureWorldMatrices(square1: Square1D): string[] {
  square1.updateMatrixWorld(true);
  return square1._pieces.map((piece) => matrixSignature(piece.matrixWorld));
}

function matrixSignature(matrix: Matrix4): string {
  return matrix.elements.map((value) => value.toFixed(6)).join(',');
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
    Math.abs(Math.max(Math.abs(x), Math.abs(z)) - SQUARE1_LAYER_HALF_SIZE) < 0.0001 ||
    Math.abs(Math.abs(x) - SQUARE1_CUT_OFFSET) < 0.0001 ||
    Math.abs(Math.abs(z) - SQUARE1_CUT_OFFSET) < 0.0001
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
