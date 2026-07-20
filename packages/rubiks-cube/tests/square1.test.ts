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
  isSquare1SlashLegal,
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
  type Square1PieceId,
  type Square1State,
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
  Square1FaceColors,
} from '../src/puzzles/square1/three/config';

const square1CoordinateTokens = [
  Square1MoveTokens.OneZero,
  Square1MoveTokens.MinusOneZero,
  Square1MoveTokens.OneMinusOne,
  Square1MoveTokens.MinusOneOne,
  Square1MoveTokens.TwoZero,
  Square1MoveTokens.MinusTwoZero,
  Square1MoveTokens.ThreeZero,
  Square1MoveTokens.MinusThreeZero,
  Square1MoveTokens.FourZero,
  Square1MoveTokens.MinusFourZero,
  Square1MoveTokens.FiveZero,
  Square1MoveTokens.MinusFiveZero,
  Square1MoveTokens.SixZero,
  Square1MoveTokens.ZeroTwo,
  Square1MoveTokens.ZeroMinusTwo,
  Square1MoveTokens.ZeroThree,
  Square1MoveTokens.ZeroMinusThree,
  Square1MoveTokens.ZeroFour,
  Square1MoveTokens.ZeroMinusFour,
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
    expectedBottom: [2, 2, 1, 0, 0, 7, 12, 13, 13, 14, 15, 15],
    expectedMiddleOrientation: 3,
    expectedTop: [11, 10, 9, 9, 8, 3, 4, 4, 5, 6, 6, 11],
    moves: [{ kind: 'slash' }],
    name: '/',
  },
  {
    expectedBottom: [8, 9, 9, 10, 11, 11, 12, 13, 13, 14, 15, 15],
    expectedMiddleOrientation: 0,
    expectedTop: [0, 1, 2, 2, 3, 4, 4, 5, 6, 6, 7, 0],
    moves: [{ bottom: 0, kind: 'coordinate', top: 1 }],
    name: '(1,0)',
  },
  {
    expectedBottom: [8, 9, 9, 10, 11, 11, 12, 13, 13, 14, 15, 15],
    expectedMiddleOrientation: 0,
    expectedTop: [7, 0, 0, 1, 2, 2, 3, 4, 4, 5, 6, 6],
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
    expectedBottom: [3, 2, 2, 1, 0, 0, 13, 13, 14, 15, 15, 8],
    expectedMiddleOrientation: 3,
    expectedTop: [11, 11, 10, 9, 9, 4, 4, 5, 6, 6, 7, 12],
    moves: [{ bottom: -1, kind: 'coordinate', top: 1 }, { kind: 'slash' }],
    name: '(1,-1) /',
  },
  {
    expectedBottom: [4, 4, 3, 2, 2, 1, 12, 13, 13, 14, 15, 15],
    expectedMiddleOrientation: 3,
    expectedTop: [11, 10, 9, 9, 8, 5, 6, 6, 7, 0, 0, 11],
    moves: [{ bottom: 0, kind: 'coordinate', top: 3 }, { kind: 'slash' }],
    name: '(3,0) /',
  },
  {
    expectedBottom: [2, 2, 1, 0, 0, 7, 10, 11, 11, 12, 13, 13],
    expectedMiddleOrientation: 3,
    expectedTop: [9, 8, 15, 15, 14, 3, 4, 4, 5, 6, 6, 9],
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

const reportedSquare1Scramble =
  '(4,0) / (-3,6) / (-1,-4) / (3,0) / (6,0) / (-2,-2) / (0,-1) / (-3,-3) / (1,0) / (4,0) / (-1,-2) / (6,-1) /';

const reportedCsTimerExpectedState: Square1State = {
  bottomSlots: ['DL', 'DLF', 'DLF', 'UR', 'UF', 'UL', 'UB', 'ULF', 'ULF', 'DFR', 'DFR', 'DF'],
  middleOrientation: 0,
  topSlots: ['DR', 'DRB', 'DRB', 'URB', 'URB', 'UBL', 'UBL', 'DBL', 'DBL', 'UFR', 'UFR', 'DB'],
  version: 2,
};

const referenceAlgorithms = [
  { algorithm: '/', name: '/' },
  { algorithm: '(1,0)', name: '(1,0)' },
  { algorithm: '(-1,0)', name: '(-1,0)' },
  { algorithm: '(0,1)', name: '(0,1)' },
  { algorithm: '(0,-1)', name: '(0,-1)' },
  { algorithm: '(1,-1) /', name: '(1,-1) /' },
  { algorithm: '(3,0) /', name: '(3,0) /' },
  { algorithm: '(0,3) /', name: '(0,3) /' },
  { algorithm: '/ /', name: '/ /' },
  { algorithm: reportedSquare1Scramble, name: 'reported scramble' },
] as const;

const square1StressScrambleCount = 1_000;
const square1StressPairCount = 12;

describe('Square-1 notation', () => {
  test.each([...square1CoordinateTokens, Square1MoveTokens.Slash, '(0,0)'])('accepts %s', (move) => {
    expect(isSquare1MoveToken(move)).toBe(true);
    expect(parseSquare1MoveToken(move)).toBeDefined();
  });

  test.each(['R', '(7,0)', '(-6,0)', '(1.5,0)', '(1)', '(1,0,0)', 'invalid'])(
    'rejects unsupported token %s',
    (token) => {
      expect(isSquare1MoveToken(token)).toBe(false);
      expect(() => parseSquare1Algorithm(token)).toThrow(Square1NotationError);
    },
  );

  test('reports complete invalid coordinate tokens with internal whitespace', () => {
    try {
      parseSquare1Algorithm('(7, 0)');
      throw new Error('Expected Square-1 notation to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(Square1NotationError);
      expect((error as Square1NotationError).token).toBe('(7, 0)');
    }
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

  test('matches csTimer state for the reported scramble', () => {
    const moves = parseSquare1Algorithm(reportedSquare1Scramble);
    const actual = moves.reduce(applySquare1Move, createSolvedSquare1State());

    expect(actual).toEqual(reportedCsTimerExpectedState);
    expect(applyGeometricSquare1Oracle(moves)).toEqual(reportedCsTimerExpectedState);
  });

  test.each(referenceAlgorithms)('matches independent reference model for $name', ({ algorithm }) => {
    const moves = parseSquare1Algorithm(algorithm);
    const actual = moves.reduce(applySquare1Move, createSolvedSquare1State());

    expect(actual).toEqual(applyReferenceSquare1Moves(moves));
  });

  test.each(square1CoordinateTokens)('applies coordinate inverse for %s', (move) => {
    const parsed = parseSquare1MoveToken(move);
    if (!parsed) {
      throw new Error(`Expected parsed move: ${move}`);
    }
    const states = [
      createSolvedSquare1State(),
      parseSquare1Algorithm('/').reduce(applySquare1Move, createSolvedSquare1State()),
    ];

    for (const state of states) {
      expect(applySquare1Move(applySquare1Move(state, parsed), reverseSquare1Move(parsed))).toEqual(state);
    }
  });

  test.each(['/', '(1,-1) /', '(3,0) /', '(0,3) /'])('keeps slash involutive for %s', (algorithm) => {
    const state = parseSquare1Algorithm(algorithm).reduce(applySquare1Move, createSolvedSquare1State());

    expect(applySquare1Move(applySquare1Move(state, { kind: 'slash' }), { kind: 'slash' })).toEqual(state);
  });

  test.each(referenceAlgorithms)('preserves external pieces for $name', ({ algorithm }) => {
    const actual = parseSquare1Algorithm(algorithm).reduce(applySquare1Move, createSolvedSquare1State());

    expectSquare1PieceConservation(actual);
  });

  test('rejects blocked slash states', () => {
    const blocked = applySquare1Move(createSolvedSquare1State(), { bottom: 1, kind: 'coordinate', top: -1 });

    expect(() => applySquare1Move(blocked, { kind: 'slash' })).toThrow(Square1IllegalMoveError);
  });

  test.each([
    { layer: 'top', left: 10, name: 'top 10|11', right: 11 },
    { layer: 'top', left: 4, name: 'top 4|5', right: 5 },
    { layer: 'bottom', left: 11, name: 'bottom 11|0', right: 0 },
    { layer: 'bottom', left: 5, name: 'bottom 5|6', right: 6 },
  ] as const)('rejects a slash when a corner crosses $name', ({ layer, left, right }) => {
    const state = createSolvedSquare1State();
    const slots = layer === 'top' ? [...state.topSlots] : [...state.bottomSlots];
    slots[right] = slots[left];
    const blocked = layer === 'top' ? { ...state, topSlots: slots } : { ...state, bottomSlots: slots };

    expect(isSquare1SlashLegal(blocked)).toBe(false);
    expect(() => applySquare1Move(blocked, { kind: 'slash' })).toThrow(Square1IllegalMoveError);
  });

  test('validates 1,000 deterministic legal scrambles through core and renderer', () => {
    const random = createSeededRandom(0x5_01_000);
    const solved = createSolvedSquare1State();
    const solvedVisualState = defaultSquare1VisualState();
    const square1 = new Square1D({ animationSpeedMs: 0 });

    for (let index = 0; index < square1StressScrambleCount; index++) {
      const scramble = createLegalSquare1Scramble(random, square1StressPairCount);
      const algorithm = scramble.map(square1MoveToString).join(' ');
      const finalState = scramble.reduce(applySquare1Move, solved);
      const oracleState = applyGeometricSquare1Oracle(scramble);
      const inverse = invertSquare1Algorithm(scramble);

      expect(parseSquare1Algorithm(algorithm), `scramble #${index}: ${algorithm}`).toEqual(scramble);
      expect(finalState, `scramble #${index}: geometric oracle ${algorithm}`).toEqual(oracleState);
      expectSquare1PieceConservation(finalState);
      expect(parseSquare1VisualState(payload(finalState)), `scramble #${index}: visual validation`).toEqual(finalState);
      expect(inverse.reduce(applySquare1Move, finalState), `scramble #${index}: inverse replay`).toEqual(solved);

      square1.reset();
      for (const move of scramble) {
        square1.applyMove(move);
      }
      expect(parseSquare1VisualState(square1.getState()), `scramble #${index}: renderer state`).toEqual(finalState);

      for (const move of inverse) {
        square1.applyMove(move);
      }
      expect(square1.getState(), `scramble #${index}: renderer inverse replay`).toBe(solvedVisualState);
    }
  }, 15_000);
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
    expect(new Set(slashPlan.rotations[0].pieceIds)).toEqual(
      new Set(['UF', 'UFR', 'UR', 'URB', 'DF', 'DFR', 'DR', 'DRB', 'M_MOVING']),
    );
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

  test('keeps WCA middle-layer slash colors split across red and orange in the solved state', () => {
    const square1 = new Square1D({ animationSpeedMs: 0 });
    const movingFaces = new Set(requiredPiece(square1, 'M_MOVING').stickers.map((sticker) => sticker.square1Face));
    const fixedFaces = new Set(requiredPiece(square1, 'M_FIXED').stickers.map((sticker) => sticker.square1Face));
    const splitFaces = Array.from(movingFaces)
      .filter((face) => fixedFaces.has(face))
      .sort();

    expect(splitFaces).toEqual(['B', 'F']);
    expect(Square1FaceColors.F).toBe('red');
    expect(Square1FaceColors.B).toBe('#ff6d00');
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

  test('rejects invalid object moves without mutating state', async () => {
    const square1 = new Square1D({ animationSpeedMs: 0 });
    const solved = square1.getState();
    const invalidMove = { bottom: 0, kind: 'coordinate', top: 0.5 } as never;

    expect(() => square1.movePlan(invalidMove)).toThrow(Square1NotationError);
    expect(() => square1.applyMove(invalidMove)).toThrow(Square1NotationError);
    await expect(square1.move(invalidMove)).rejects.toThrow(Square1NotationError);

    expect(square1.getState()).toBe(solved);
    expect(parseSquare1VisualState(square1.getState())).toEqual(createSolvedSquare1State());
  });

  test('snapshots queued object moves, action arrays, and options', async () => {
    const objectMoveSquare1 = new Square1D({ animationSpeedMs: 0 });
    const move = { bottom: 0, kind: 'coordinate', top: 3 } satisfies Square1Move;
    const options = { reverse: true };
    const objectMovePromise = objectMoveSquare1.move(move, options);
    move.top = 0;
    options.reverse = false;

    const expectedObjectMove = new Square1D({ animationSpeedMs: 0 });
    expectedObjectMove.applyMove(Square1MoveTokens.ThreeZero, { reverse: true });
    await expect(objectMovePromise).resolves.toBe(expectedObjectMove.getState());

    const arraySquare1 = new Square1D({ animationSpeedMs: 0 });
    const actions: string[] = [Square1MoveTokens.ThreeZero];
    const arrayPromise = arraySquare1.do(actions);
    actions[0] = Square1MoveTokens.ZeroThree;

    const expectedArrayMove = new Square1D({ animationSpeedMs: 0 });
    expectedArrayMove.applyMove(Square1MoveTokens.ThreeZero);
    await expect(arrayPromise).resolves.toBe(expectedArrayMove.getState());
  });

  test('runs concurrent algorithms atomically in queue order', async () => {
    const square1 = new Square1D({ animationSpeedMs: 0 });
    const firstAlgorithm = '(1,-1) /';
    const secondAlgorithm = '(3,0) /';

    const first = square1.do(firstAlgorithm);
    const second = square1.do(secondAlgorithm);
    await Promise.all([first, second]);

    const expected = parseSquare1Algorithm(`${firstAlgorithm} ${secondAlgorithm}`).reduce(
      applySquare1Move,
      createSolvedSquare1State(),
    );
    expect(parseSquare1VisualState(square1.getState())).toEqual(expected);
  });

  test('does not replay queued moves after reset interrupts the queue', async () => {
    const square1 = new Square1D({ animationSpeedMs: 0 });
    const first = square1.move(Square1MoveTokens.ThreeZero);
    const second = square1.move(Square1MoveTokens.ZeroThree);

    const resetState = square1.reset();
    await expect(first).resolves.toBe(resetState);
    await expect(second).resolves.toBe(resetState);

    expect(square1.getState()).toBe(resetState);
  });

  test('does not continue an active algorithm after reset interrupts it', async () => {
    const square1 = new Square1D({ animationSpeedMs: 1000 });
    const algorithm = square1.do([Square1MoveTokens.ThreeZero, Square1MoveTokens.ZeroThree]);

    await Promise.resolve();
    const resetState = square1.reset();
    await expect(algorithm).resolves.toBe(resetState);

    expect(square1.getState()).toBe(resetState);
  });

  test('interrupt finishes the active move and clears queued moves', async () => {
    const square1 = new Square1D({ animationSpeedMs: 1000 });
    const first = square1.move(Square1MoveTokens.ThreeZero);
    const second = square1.move(Square1MoveTokens.ZeroThree);

    await Promise.resolve();
    const interruptedState = square1.interrupt();
    await expect(first).resolves.toBe(interruptedState);
    await expect(second).resolves.toBe(interruptedState);

    const expected = applySquare1Move(createSolvedSquare1State(), { bottom: 0, kind: 'coordinate', top: 3 });
    expect(parseSquare1VisualState(interruptedState)).toEqual(expected);
    expect(square1.getState()).toBe(interruptedState);
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

  test('disposes Square-1 geometry and materials', () => {
    const square1 = new Square1D({ animationSpeedMs: 0 });
    const piece = requiredPiece(square1, 'UFR');
    const sticker = requiredCapSticker(piece);
    const surfaceGeometryDispose = vi.spyOn(piece.surface.geometry, 'dispose');
    const surfaceMaterialDispose = vi.spyOn(piece.surface.material, 'dispose');
    const stickerGeometryDispose = vi.spyOn(sticker.geometry, 'dispose');
    const stickerMaterialDispose = vi.spyOn(sticker.material, 'dispose');

    square1.dispose();

    expect(surfaceGeometryDispose).toHaveBeenCalledTimes(1);
    expect(surfaceMaterialDispose).toHaveBeenCalledTimes(1);
    expect(stickerGeometryDispose).toHaveBeenCalledTimes(1);
    expect(stickerMaterialDispose).toHaveBeenCalledTimes(1);
    expect(square1.pieceCount()).toBe(0);
  });

  test('keeps stickers attached to pieces through slash transfer', () => {
    const square1 = new Square1D({ animationSpeedMs: 0 });
    const topTransfer = requiredPiece(square1, 'UFR');
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

  test.each([
    Square1MoveTokens.OneZero,
    Square1MoveTokens.MinusOneZero,
    Square1MoveTokens.ZeroOne,
    Square1MoveTokens.ZeroMinusOne,
    '(3,-1)',
    Square1MoveTokens.Slash,
  ])('ends animation at the static pose for %s', (move) => {
    const preview = new Square1D({ animationSpeedMs: 0 });
    previewMoveAtEnd(preview, move);

    const expected = new Square1D({ animationSpeedMs: 0 });
    expected.applyMove(move);

    expect(captureWorldMatrices(preview)).toEqual(captureWorldMatrices(expected));
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
    expect(minGeometryXAtZ(middleMoving.surface.geometry, SQUARE1_LAYER_HALF_SIZE)).toBeCloseTo(
      -SQUARE1_MIDDLE_SEAM_OFFSET,
      3,
    );
    expect(minGeometryXAtZ(middleMoving.surface.geometry, -SQUARE1_LAYER_HALF_SIZE)).toBeCloseTo(
      SQUARE1_MIDDLE_SEAM_OFFSET,
      3,
    );
  });
});

describe('Square-1 slash axis', () => {
  test('is normalized, perpendicular to the seam, and matches csTimer slash axis', () => {
    expect(Math.abs(SQUARE1_SEAM_DIRECTION.dot(SQUARE1_SLICE_AXIS))).toBeLessThan(1e-10);
    expect(SQUARE1_SLICE_AXIS.x).toBeCloseTo(Math.cos(Math.PI / 12));
    expect(SQUARE1_SLICE_AXIS.z).toBeCloseTo(Math.sin(Math.PI / 12));
    expect(SQUARE1_SLICE_AXIS.length()).toBeCloseTo(1);
  });
});

function mapReferenceSlots(slots: readonly number[]): Square1LayerPieceId[] {
  return slots.map((id) => referenceIdToSemanticId[id]);
}

function applyReferenceSquare1Moves(moves: readonly Square1Move[]): Square1State {
  return moves.reduce(applyReferenceSquare1Move, {
    bottomSlots: mapReferenceSlots([8, 9, 9, 10, 11, 11, 12, 13, 13, 14, 15, 15]),
    middleOrientation: 0,
    topSlots: mapReferenceSlots([0, 0, 1, 2, 2, 3, 4, 4, 5, 6, 6, 7]),
    version: 2,
  });
}

function applyReferenceSquare1Move(state: Square1State, move: Square1Move): Square1State {
  if (move.kind !== 'slash') {
    return {
      bottomSlots: rotateReferenceSlots(state.bottomSlots, -move.bottom),
      middleOrientation: state.middleOrientation,
      topSlots: rotateReferenceSlots(state.topSlots, move.top),
      version: 2,
    };
  }

  const topSlots = [...state.topSlots];
  const bottomSlots = [...state.bottomSlots];

  assignReferenceSlashTargets(bottomSlots, state.topSlots, [11, 0, 1, 2, 3, 4], 'top', 'bottom');
  assignReferenceSlashTargets(topSlots, state.bottomSlots, [0, 1, 2, 3, 4, 5], 'bottom', 'top');

  return {
    bottomSlots,
    middleOrientation: state.middleOrientation === 0 ? 3 : 0,
    topSlots,
    version: 2,
  };
}

function rotateReferenceSlots(slots: readonly Square1LayerPieceId[], shift: number): Square1LayerPieceId[] {
  const normalized = ((shift % 12) + 12) % 12;
  return Array.from({ length: 12 }, (_, index) => slots[(normalized + index) % 12]);
}

function assignReferenceSlashTargets(
  targetSlots: Square1LayerPieceId[],
  sourceSlots: readonly Square1LayerPieceId[],
  sourceIndices: readonly number[],
  sourceLayer: 'top' | 'bottom',
  targetLayer: 'top' | 'bottom',
): void {
  for (const pieceId of new Set(sourceIndices.map((index) => sourceSlots[index]))) {
    const widthUnits = pieceId.length === 3 ? 2 : 1;
    const sourceStartSlot = referenceFirstOccupiedSlot(sourceSlots, pieceId);
    const sourceRotationUnits = referencePieceRotationUnits(sourceStartSlot, widthUnits, sourceLayer);
    const targetRotationUnits = ((11 - sourceRotationUnits) % 12) + 12;

    for (const targetSlot of referenceSlotsForRotationUnits(targetRotationUnits, widthUnits, targetLayer)) {
      targetSlots[targetSlot] = pieceId;
    }
  }
}

function referencePieceRotationUnits(slot: number, widthUnits: 1 | 2, layer: 'top' | 'bottom'): number {
  if (layer === 'top') {
    return widthUnits === 1 ? slot - 2 : slot;
  }

  return widthUnits === 1 ? slot - 3 : slot - 4;
}

function referenceSlotsForRotationUnits(rotationUnits: number, widthUnits: 1 | 2, layer: 'top' | 'bottom'): number[] {
  const normalized = rotationUnits % 12;
  if (layer === 'top') {
    return widthUnits === 1 ? [(normalized + 2) % 12] : [normalized, (normalized + 1) % 12];
  }

  return widthUnits === 1 ? [(normalized + 3) % 12] : [(normalized + 4) % 12, (normalized + 5) % 12];
}

function referenceFirstOccupiedSlot(slots: readonly Square1LayerPieceId[], id: Square1LayerPieceId): number {
  const positions = slots.flatMap((slotId, index) => (slotId === id ? [index] : []));
  if (positions.length === 1) {
    return positions[0];
  }

  const [first, second] = positions;
  return (first + 1) % 12 === second ? first : second;
}

function expectSquare1PieceConservation(state: Square1State): void {
  const topIds = new Set(state.topSlots);
  const bottomIds = new Set(state.bottomSlots);
  const counts = countSquare1Pieces([...state.topSlots, ...state.bottomSlots]);
  const ids = Object.values(referenceIdToSemanticId) as Square1LayerPieceId[];

  expect(ids.filter((id) => id.length === 3)).toHaveLength(8);
  expect(ids.filter((id) => id.length === 2)).toHaveLength(8);
  for (const id of ids) {
    expect(topIds.has(id) && bottomIds.has(id), `${id} appears on both layers`).toBe(false);
    expect(counts.get(id), `${id} multiplicity`).toBe(id.length === 3 ? 2 : 1);
  }
  expectCornersAdjacent(state.topSlots);
  expectCornersAdjacent(state.bottomSlots);
}

function countSquare1Pieces(ids: readonly Square1LayerPieceId[]): Map<Square1LayerPieceId, number> {
  const counts = new Map<Square1LayerPieceId, number>();
  for (const id of ids) {
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

function expectCornersAdjacent(slots: readonly Square1LayerPieceId[]): void {
  for (const id of new Set(slots)) {
    if (id.length !== 3) {
      continue;
    }

    const positions = slots.flatMap((slotId, index) => (slotId === id ? [index] : []));
    expect(positions, `${id} corner slots`).toHaveLength(2);
    expect(
      (positions[0] + 1) % 12 === positions[1] || (positions[1] + 1) % 12 === positions[0],
      `${id} corner adjacency`,
    ).toBe(true);
  }
}

function previewMoveAtEnd(square1: Square1D, move: string | Square1Move): void {
  const plan = square1.movePlan(move);
  const startPoses = new Map(
    square1._pieces.map((piece) => [
      piece.pieceId,
      {
        position: piece.position.clone(),
        quaternion: piece.quaternion.clone(),
      },
    ]),
  );
  (
    square1 as unknown as {
      previewMove: (
        plan: ReturnType<Square1D['movePlan']>,
        startPoses: Map<Square1PieceId, { position: Vector3; quaternion: Quaternion }>,
        progress: number,
      ) => void;
    }
  ).previewMove(plan, startPoses, 1);
}

type OracleSquare1Layer = 'top' | 'bottom';

type OracleSquare1Piece = {
  id: Square1LayerPieceId;
  localCentroid: Vector3;
  position: Vector3;
  quaternion: Quaternion;
  widthUnits: 1 | 2;
};

function applyGeometricSquare1Oracle(moves: readonly Square1Move[]): Square1State {
  const pieces = createSolvedOraclePieces();
  let middleQuaternion = new Quaternion();

  for (const move of moves) {
    if (move.kind === 'slash') {
      const rotation = oracleRotation(oracleSlashAxis(), Math.PI);
      for (const piece of pieces) {
        if (oracleWorldCentroid(piece).dot(oracleSlashAxis()) > 1e-8) {
          applyOracleRotation(piece, rotation);
        }
      }
      middleQuaternion = rotation.clone().multiply(middleQuaternion).normalize();
      continue;
    }

    if (move.top !== 0) {
      const rotation = oracleRotation(oracleYAxis(), -move.top * oracleUnitAngleRadians());
      for (const piece of pieces.filter((candidate) => candidate.position.y > 0)) {
        applyOracleRotation(piece, rotation);
      }
    }
    if (move.bottom !== 0) {
      const rotation = oracleRotation(oracleYAxis(), move.bottom * oracleUnitAngleRadians());
      for (const piece of pieces.filter((candidate) => candidate.position.y < 0)) {
        applyOracleRotation(piece, rotation);
      }
    }
  }

  return oracleStateFromPieces(pieces, middleQuaternion);
}

function createSolvedOraclePieces(): OracleSquare1Piece[] {
  return [
    ...createSolvedOracleLayerPieces('top', [0, 0, 1, 2, 2, 3, 4, 4, 5, 6, 6, 7]),
    ...createSolvedOracleLayerPieces('bottom', [8, 9, 9, 10, 11, 11, 12, 13, 13, 14, 15, 15]),
  ];
}

function createSolvedOracleLayerPieces(layer: OracleSquare1Layer, slots: readonly number[]): OracleSquare1Piece[] {
  const ids = Array.from(new Set(mapReferenceSlots(slots)));
  return ids.map((id) => {
    const widthUnits = oraclePieceWidthUnits(id);
    const slot = oracleFirstOccupiedSlot(mapReferenceSlots(slots), id);
    const rotationUnits = oraclePieceRotationUnits(slot, widthUnits, layer);
    return {
      id,
      localCentroid: oracleLocalCentroid(widthUnits),
      position: new Vector3(0, layer === 'top' ? 1 : -1, 0),
      quaternion: oracleStaticQuaternion(layer, rotationUnits),
      widthUnits,
    };
  });
}

function oracleStateFromPieces(pieces: readonly OracleSquare1Piece[], middleQuaternion: Quaternion): Square1State {
  const topSlots = Array<Square1LayerPieceId | undefined>(12).fill(undefined);
  const bottomSlots = Array<Square1LayerPieceId | undefined>(12).fill(undefined);

  for (const piece of pieces) {
    const layer = piece.position.y > 0 ? 'top' : 'bottom';
    const rotationUnits = oracleRotationUnitsForQuaternion(piece.quaternion, layer);
    const targetSlots = layer === 'top' ? topSlots : bottomSlots;
    for (const slot of oracleSlotsForRotationUnits(rotationUnits, piece.widthUnits, layer)) {
      if (targetSlots[slot] && targetSlots[slot] !== piece.id) {
        throw new Error(`Oracle slot collision on ${layer} slot ${slot}`);
      }
      targetSlots[slot] = piece.id;
    }
  }

  if (topSlots.some((slot) => !slot) || bottomSlots.some((slot) => !slot)) {
    throw new Error('Oracle produced an incomplete Square-1 state');
  }

  return {
    bottomSlots: bottomSlots as Square1LayerPieceId[],
    middleOrientation: oracleMiddleOrientation(middleQuaternion),
    topSlots: topSlots as Square1LayerPieceId[],
    version: 2,
  };
}

function applyOracleRotation(piece: OracleSquare1Piece, rotation: Quaternion): void {
  piece.position.applyQuaternion(rotation);
  piece.quaternion.premultiply(rotation).normalize();
}

function oracleWorldCentroid(piece: OracleSquare1Piece): Vector3 {
  return piece.localCentroid.clone().applyQuaternion(piece.quaternion).add(piece.position);
}

function oracleRotation(axis: Vector3, angle: number): Quaternion {
  return new Quaternion().setFromAxisAngle(axis, angle).normalize();
}

function oracleStaticQuaternion(layer: OracleSquare1Layer, rotationUnits: number): Quaternion {
  const yRotation = oracleRotation(oracleYAxis(), rotationUnits * oracleUnitAngleRadians());
  return layer === 'top' ? yRotation : yRotation.multiply(oracleRotation(oracleXAxis(), Math.PI)).normalize();
}

function oracleRotationUnitsForQuaternion(quaternion: Quaternion, layer: OracleSquare1Layer): number {
  let bestUnits = 0;
  let bestScore = Number.POSITIVE_INFINITY;
  for (let units = 0; units < 12; units++) {
    const score = 1 - Math.abs(quaternion.dot(oracleStaticQuaternion(layer, units)));
    if (score < bestScore) {
      bestScore = score;
      bestUnits = units;
    }
  }

  if (bestScore > 1e-8) {
    throw new Error(`Oracle could not map quaternion to ${layer} rotation units`);
  }

  return bestUnits;
}

function oracleMiddleOrientation(middleQuaternion: Quaternion): 0 | 3 {
  const solvedScore = Math.abs(middleQuaternion.dot(new Quaternion()));
  const slashScore = Math.abs(middleQuaternion.dot(oracleRotation(oracleSlashAxis(), Math.PI)));
  return solvedScore >= slashScore ? 0 : 3;
}

function oraclePieceWidthUnits(pieceId: Square1LayerPieceId): 1 | 2 {
  return pieceId.length === 3 ? 2 : 1;
}

function oracleLocalCentroid(widthUnits: 1 | 2): Vector3 {
  if (widthUnits === 1) {
    return new Vector3(2 / 3, 0, 0);
  }

  const cornerCentroid = (2 + Math.tan(Math.PI / 12)) / 4;
  return new Vector3(cornerCentroid, 0, cornerCentroid);
}

function oraclePieceRotationUnits(slot: number, widthUnits: 1 | 2, layer: OracleSquare1Layer): number {
  if (layer === 'top') {
    return widthUnits === 1 ? slot - 2 : slot;
  }

  return widthUnits === 1 ? slot - 3 : slot - 4;
}

function oracleSlotsForRotationUnits(rotationUnits: number, widthUnits: 1 | 2, layer: OracleSquare1Layer): number[] {
  const normalized = oracleModLayerUnit(rotationUnits);
  if (layer === 'top') {
    return widthUnits === 1 ? [oracleModLayerUnit(normalized + 2)] : [normalized, oracleModLayerUnit(normalized + 1)];
  }

  return widthUnits === 1
    ? [oracleModLayerUnit(normalized + 3)]
    : [oracleModLayerUnit(normalized + 4), oracleModLayerUnit(normalized + 5)];
}

function oracleFirstOccupiedSlot(slots: readonly Square1LayerPieceId[], id: Square1LayerPieceId): number {
  const positions = slots.flatMap((slotId, index) => (slotId === id ? [index] : []));
  if (positions.length === 1) {
    return positions[0];
  }

  const [first, second] = positions;
  return (first + 1) % 12 === second ? first : second;
}

function oracleModLayerUnit(value: number): number {
  return ((value % 12) + 12) % 12;
}

function oracleUnitAngleRadians(): number {
  return Math.PI / 6;
}

function oracleSlashAxis(): Vector3 {
  return new Vector3(Math.cos(Math.PI / 12), 0, Math.sin(Math.PI / 12)).normalize();
}

function oracleYAxis(): Vector3 {
  return new Vector3(0, 1, 0);
}

function oracleXAxis(): Vector3 {
  return new Vector3(1, 0, 0);
}

function createLegalSquare1Scramble(random: () => number, pairCount: number): Square1Move[] {
  let state = createSolvedSquare1State();
  const moves: Square1Move[] = [];

  for (let pairIndex = 0; pairIndex < pairCount; pairIndex++) {
    let accepted = false;

    for (let attempt = 0; attempt < 500 && !accepted; attempt++) {
      const coordinateMove = randomSquare1CoordinateMove(random);
      if (coordinateMove.top === 0 && coordinateMove.bottom === 0) {
        continue;
      }

      const afterCoordinate = applySquare1Move(state, coordinateMove);
      if (!isSquare1SlashLegal(afterCoordinate)) {
        continue;
      }

      moves.push(coordinateMove, { kind: 'slash' });
      state = applySquare1Move(afterCoordinate, { kind: 'slash' });
      accepted = true;
    }

    if (!accepted) {
      throw new Error(`Failed to generate legal Square-1 pair at index ${pairIndex}`);
    }
  }

  return moves;
}

function randomSquare1CoordinateMove(random: () => number): Extract<Square1Move, { kind: 'coordinate' }> {
  return {
    bottom: randomSquare1Turn(random),
    kind: 'coordinate',
    top: randomSquare1Turn(random),
  };
}

function randomSquare1Turn(random: () => number): number {
  return Math.floor(random() * 12) - 5;
}

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
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
      ? new Vector3(0, 0, 1)
      : surface === 'sideB'
        ? new Vector3(1, 0, 0)
        : new Vector3(0, 0, -1);
  }
  if (pieceId === 'M_FIXED') {
    return surface === 'sideA'
      ? new Vector3(-1, 0, 0)
      : surface === 'sideB'
        ? new Vector3(0, 0, -1)
        : new Vector3(0, 0, 1);
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
  return matrix.elements
    .map((value) => (Object.is(value, -0) || Math.abs(value) < 0.0000005 ? 0 : value).toFixed(6))
    .join(',');
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

function minGeometryXAtZ(geometry: BufferGeometry, z: number): number {
  const position = geometry.getAttribute('position');
  let minX = Infinity;
  for (let index = 0; index < position.count; index++) {
    if (Math.abs(position.getZ(index) - z) < 0.0001) {
      minX = Math.min(minX, position.getX(index));
    }
  }

  return minX;
}
