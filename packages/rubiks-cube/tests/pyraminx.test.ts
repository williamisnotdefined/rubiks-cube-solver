import './setup';
import { describe, expect, test } from 'vitest';
import {
  DEFAULT_PYRAMINX_ANIMATION_SPEED_MS,
  defaultPyraminxStickerState,
  invertPyraminxAlgorithm,
  isPyraminxMove,
  isPyraminxStickerState,
  PYRAMINX_STICKER_COUNT,
  PYRAMINX_VISUAL_STATE_KIND,
  Pyraminx3D,
  PyraminxFaces,
  PyraminxMoves,
  PyraminxNotationError,
  parsePyraminxAlgorithm,
  parsePyraminxStickerState,
  pyraminxMoveToTurn,
  pyraminxVertexForMove,
  reversePyraminxMove,
} from '../src/puzzles/pyraminx';

const allPyraminxMoves = Object.values(PyraminxMoves);

describe('Pyraminx notation', () => {
  test.each(allPyraminxMoves)('accepts %s', (move) => {
    expect(isPyraminxMove(move)).toBe(true);
    expect(pyraminxMoveToTurn(move).vertex).toEqual(expect.any(String));
  });

  test.each(['U2', 'D', 'F', 'R2', 'x', 'Rw', 'invalid'])('rejects cube token %s', (token) => {
    expect(isPyraminxMove(token)).toBe(false);
    expect(() => parsePyraminxAlgorithm(token)).toThrow(PyraminxNotationError);
  });

  test('parses, displays, and inverts algorithms', () => {
    const moves = parsePyraminxAlgorithm("U L' r b'");

    expect(moves).toEqual([PyraminxMoves.U, PyraminxMoves.LP, PyraminxMoves.r, PyraminxMoves.bP]);
    expect(invertPyraminxAlgorithm(moves)).toEqual([
      PyraminxMoves.b,
      PyraminxMoves.rP,
      PyraminxMoves.L,
      PyraminxMoves.UP,
    ]);
    expect(reversePyraminxMove(PyraminxMoves.U)).toBe(PyraminxMoves.UP);
    expect(reversePyraminxMove(PyraminxMoves.uP)).toBe(PyraminxMoves.u);
    expect(pyraminxVertexForMove(PyraminxMoves.B)).toBe(PyraminxFaces.B);
    expect(parsePyraminxAlgorithm('')).toEqual([]);
  });

  test('throws for impossible typed move values', () => {
    expect(() => pyraminxMoveToTurn('bad' as never)).toThrow(PyraminxNotationError);
    expect(() => reversePyraminxMove('bad' as never)).toThrow(PyraminxNotationError);
  });
});

describe('Pyraminx sticker state', () => {
  test('builds and parses visual sticker state', () => {
    const state = defaultPyraminxStickerState();

    expect(PYRAMINX_VISUAL_STATE_KIND).toBe('pyraminx-stickers-v1');
    expect(state).toHaveLength(PYRAMINX_STICKER_COUNT);
    expect(isPyraminxStickerState(state)).toBe(true);
    expect(parsePyraminxStickerState(state)).toHaveLength(PYRAMINX_STICKER_COUNT);
  });

  test('rejects invalid sticker states', () => {
    expect(isPyraminxStickerState('short')).toBe(false);
    expect(parsePyraminxStickerState('X'.repeat(PYRAMINX_STICKER_COUNT))).toBeUndefined();
  });
});

describe('Pyraminx3D', () => {
  test('starts solved and exposes disjoint main/tip turn plans', () => {
    const defaultPyraminx = new Pyraminx3D();
    expect(defaultPyraminx.animationSpeedMs).toBe(DEFAULT_PYRAMINX_ANIMATION_SPEED_MS);
    expect(defaultPyraminx.animationStyle).toBe('linear');

    const pyraminx = new Pyraminx3D({ animationSpeedMs: 0 });

    expect(pyraminx.stickerCount()).toBe(PYRAMINX_STICKER_COUNT);
    expect(pyraminx.getState()).toBe(defaultPyraminxStickerState());

    const mainPlan = pyraminx.turnPlan(PyraminxMoves.U);
    const tipPlan = pyraminx.turnPlan(PyraminxMoves.u);
    const reversePlan = pyraminx.turnPlan(PyraminxMoves.U, { reverse: true });

    expect(mainPlan.angleRadians).toBeCloseTo((2 * Math.PI) / 3);
    expect(reversePlan.angleRadians).toBeCloseTo((-2 * Math.PI) / 3);
    expect(tipPlan.pieceIds.length).toBeGreaterThan(0);
    expect(mainPlan.pieceIds.length).toBeGreaterThan(tipPlan.pieceIds.length);
    expect(mainPlan.pieceIds.some((id) => tipPlan.pieceIds.includes(id))).toBe(false);
  });

  test('applies move inverses and order-three turns', () => {
    for (const move of allPyraminxMoves) {
      const pyraminx = new Pyraminx3D({ animationSpeedMs: 0 });
      const solved = pyraminx.getState();

      pyraminx.applyMove(move);
      expect(pyraminx.getState()).not.toBe(solved);

      pyraminx.applyMove(reversePyraminxMove(move));
      expect(pyraminx.getState()).toBe(solved);
      pyraminx.applyMove(move, { reverse: true });
      expect(pyraminx.getState()).not.toBe(solved);
      pyraminx.applyMove(move);
      expect(pyraminx.getState()).toBe(solved);

      pyraminx.applyMove(move);
      pyraminx.applyMove(move);
      pyraminx.applyMove(move);
      expect(pyraminx.getState()).toBe(solved);
    }
  });

  test('runs algorithms, reset, setState, and async zero-speed moves', async () => {
    const pyraminx = new Pyraminx3D({ animationSpeedMs: 0 });
    const solved = pyraminx.getState();
    const customState = [
      PyraminxFaces.B.repeat(9),
      PyraminxFaces.R.repeat(9),
      PyraminxFaces.L.repeat(9),
      PyraminxFaces.U.repeat(9),
    ].join('');

    await pyraminx.do("U L r'");
    expect(pyraminx.getState()).not.toBe(solved);
    await pyraminx.do(invertPyraminxAlgorithm(parsePyraminxAlgorithm("U L r'")));
    expect(pyraminx.getState()).toBe(solved);

    await expect(pyraminx.move(PyraminxMoves.B)).resolves.toHaveLength(PYRAMINX_STICKER_COUNT);
    await expect(pyraminx.move(PyraminxMoves.B, { animationSpeedMs: 0, reverse: true })).resolves.toHaveLength(
      PYRAMINX_STICKER_COUNT,
    );
    expect(pyraminx.reset()).toBe(solved);
    expect(pyraminx.setState(customState)).toBe(true);
    expect(pyraminx.getState()).toBe(customState);
    expect(pyraminx.setState('invalid')).toBe(false);
  });

  test('snaps stickers back to canonical slots after long sequences', () => {
    const pyraminx = new Pyraminx3D({ animationSpeedMs: 0 });
    const moves = parsePyraminxAlgorithm("U L R B u l r b U' L' R' B' u' l' r' b'");

    for (let repeat = 0; repeat < 12; repeat++) {
      for (const move of moves) {
        pyraminx.applyMove(move);
      }
    }

    expect(pyraminx._animationGroup.children).toHaveLength(0);
    expect(pyraminx.getState()).toHaveLength(PYRAMINX_STICKER_COUNT);
    for (let index = 0; index < pyraminx._stickers.length; index++) {
      expect(
        pyraminx._stickers[index].backing.position.distanceTo(pyraminx._slots[index].backingPosition),
      ).toBeLessThan(1e-9);
      expect(
        pyraminx._stickers[index].backing.quaternion.angleTo(pyraminx._slots[index].backingQuaternion),
      ).toBeLessThan(1e-9);
      expect(pyraminx._stickers[index].position.distanceTo(pyraminx._slots[index].position)).toBeLessThan(1e-9);
      expect(pyraminx._stickers[index].quaternion.angleTo(pyraminx._slots[index].quaternion)).toBeLessThan(1e-9);
    }
  });

  test('throws if internal sticker slots cannot be mapped', () => {
    const pyraminx = new Pyraminx3D({ animationSpeedMs: 0 });
    pyraminx._stickers = [];

    expect(() => pyraminx.getState()).toThrow('did not map to a sticker');
  });
});
