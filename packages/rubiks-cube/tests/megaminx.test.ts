import './setup';
import { describe, expect, test, vi } from 'vitest';
import {
  DEFAULT_MEGAMINX_ANIMATION_SPEED_MS,
  DEFAULT_MEGAMINX_VISUAL_STYLE,
  defaultMegaminxStickerState,
  invertMegaminxAlgorithm,
  isMegaminxMove,
  isMegaminxStickerState,
  MEGAMINX_STICKER_COUNT,
  MEGAMINX_VISUAL_STATE_KIND,
  Megaminx3D,
  MegaminxFaces,
  MegaminxMoves,
  MegaminxNotationError,
  MegaminxVisualStyles,
  megaminxFaceForMove,
  megaminxMoveToTurn,
  parseMegaminxAlgorithm,
  parseMegaminxStickerState,
  reverseMegaminxMove,
} from '../src/puzzles/megaminx';

const allMegaminxMoves = Object.values(MegaminxMoves);

describe('Megaminx notation', () => {
  test.each(allMegaminxMoves)('accepts %s', (move) => {
    expect(isMegaminxMove(move)).toBe(true);
    expect(megaminxFaceForMove(move)).toEqual(expect.any(String));
  });

  test.each(['U3', 'Rw', 'r', 'BR', 'dR', 'F++', 'R+++', 'Z', 'invalid'])('rejects unsupported token %s', (token) => {
    expect(isMegaminxMove(token)).toBe(false);
    expect(() => parseMegaminxAlgorithm(token)).toThrow(MegaminxNotationError);
  });

  test('parses, displays, and inverts algorithms', () => {
    const moves = parseMegaminxAlgorithm("R++ D-- U'");

    expect(moves).toEqual([MegaminxMoves.RPP, MegaminxMoves.DMM, MegaminxMoves.UP]);
    expect(invertMegaminxAlgorithm(moves)).toEqual([MegaminxMoves.U, MegaminxMoves.DPP, MegaminxMoves.RMM]);
    expect(reverseMegaminxMove(MegaminxMoves.RPP)).toBe(MegaminxMoves.RMM);
    expect(reverseMegaminxMove(MegaminxMoves.D2P)).toBe(MegaminxMoves.D2);
    expect(megaminxFaceForMove(MegaminxMoves.RPP)).toBe(MegaminxFaces.R);
    expect(parseMegaminxAlgorithm('')).toEqual([]);
  });

  test('treats WCA double-plus tokens as wide turns, not face turns', () => {
    expect(megaminxMoveToTurn(MegaminxMoves.R2)).toMatchObject({ amount: 2, face: MegaminxFaces.R, kind: 'face' });
    expect(megaminxMoveToTurn(MegaminxMoves.RPP)).toMatchObject({
      amount: 2,
      axis: MegaminxFaces.R,
      fixedFace: MegaminxFaces.L,
      kind: 'wca-wide',
    });
    expect(megaminxMoveToTurn(MegaminxMoves.DPP)).toMatchObject({
      amount: 2,
      axis: MegaminxFaces.D,
      fixedFace: MegaminxFaces.U,
      kind: 'wca-wide',
    });
  });

  test('throws for impossible typed move values', () => {
    expect(() => megaminxMoveToTurn('bad' as never)).toThrow(MegaminxNotationError);
    expect(() => reverseMegaminxMove('bad' as never)).toThrow(MegaminxNotationError);
  });
});

describe('Megaminx sticker state', () => {
  test('builds and parses visual sticker state', () => {
    const state = defaultMegaminxStickerState();

    expect(MEGAMINX_VISUAL_STATE_KIND).toBe('megaminx-stickers-v1');
    expect(state).toHaveLength(MEGAMINX_STICKER_COUNT);
    expect(isMegaminxStickerState(state)).toBe(true);
    expect(parseMegaminxStickerState(state)).toHaveLength(MEGAMINX_STICKER_COUNT);
  });

  test('rejects invalid sticker states', () => {
    expect(isMegaminxStickerState('short')).toBe(false);
    expect(parseMegaminxStickerState('X'.repeat(MEGAMINX_STICKER_COUNT))).toBeUndefined();
  });
});

describe('Megaminx3D', () => {
  test('starts solved and exposes face turn plans', () => {
    const defaultMegaminx = new Megaminx3D();
    expect(defaultMegaminx.animationSpeedMs).toBe(DEFAULT_MEGAMINX_ANIMATION_SPEED_MS);
    expect(defaultMegaminx.animationStyle).toBe('linear');
    expect(defaultMegaminx.visualStyle).toBe(DEFAULT_MEGAMINX_VISUAL_STYLE);
    expect(defaultMegaminx.pieceCount()).toBe(62);
    expect(defaultMegaminx._pieces.filter((piece) => piece.pieceType === 'center')).toHaveLength(12);
    expect(defaultMegaminx._pieces.filter((piece) => piece.pieceType === 'edge')).toHaveLength(30);
    expect(defaultMegaminx._pieces.filter((piece) => piece.pieceType === 'corner')).toHaveLength(20);
    expect(defaultMegaminx._pieces.filter((piece) => piece.stickers.length === 1)).toHaveLength(12);
    expect(defaultMegaminx._pieces.filter((piece) => piece.stickers.length === 2)).toHaveLength(30);
    expect(defaultMegaminx._pieces.filter((piece) => piece.stickers.length === 3)).toHaveLength(20);

    const megaminx = new Megaminx3D({ animationSpeedMs: 0 });

    expect(megaminx.stickerCount()).toBe(MEGAMINX_STICKER_COUNT);
    expect(megaminx.getState()).toBe(defaultMegaminxStickerState());

    const facePlan = megaminx.turnPlan(MegaminxMoves.R2);
    const widePlan = megaminx.turnPlan(MegaminxMoves.RPP);
    const reversePlan = megaminx.turnPlan(MegaminxMoves.RPP, { reverse: true });

    expect(facePlan.angleRadians).toBeCloseTo((4 * Math.PI) / 5);
    expect(reversePlan.angleRadians).toBeCloseTo((-4 * Math.PI) / 5);
    expect(facePlan.pieceIds).toHaveLength(11);
    expect(new Set(facePlan.pieceIds).size).toBe(facePlan.pieceIds.length);
    expect(widePlan.pieceIds).toHaveLength(51);
    expect(new Set(widePlan.pieceIds).size).toBe(widePlan.pieceIds.length);
  });

  test('switches visual style without changing state', () => {
    const megaminx = new Megaminx3D({ animationSpeedMs: 0, visualStyle: MegaminxVisualStyles.Stickered });
    const solved = megaminx.getState();
    const firstSticker = megaminx._stickers[0];

    expect(firstSticker.material.roughness).toBe(0.5);
    megaminx.setVisualStyle(MegaminxVisualStyles.Stickerless);

    expect(megaminx.visualStyle).toBe(MegaminxVisualStyles.Stickerless);
    expect(firstSticker.visualStyle).toBe(MegaminxVisualStyles.Stickerless);
    expect(firstSticker.material.roughness).toBe(0.24);
    expect(megaminx.getState()).toBe(solved);

    megaminx.applyMove(MegaminxMoves.RPP);
    expect(megaminx.getState()).not.toBe(solved);
    megaminx.applyMove(MegaminxMoves.RMM);
    expect(megaminx.getState()).toBe(solved);

    megaminx.setVisualStyle(MegaminxVisualStyles.Stickered);
    expect(firstSticker.material.roughness).toBe(0.5);
    expect(megaminx.getState()).toBe(solved);
  });

  test('can start in stickerless visual style', () => {
    const megaminx = new Megaminx3D({ animationSpeedMs: 0, visualStyle: MegaminxVisualStyles.Stickerless });

    expect(megaminx.visualStyle).toBe(MegaminxVisualStyles.Stickerless);
    expect(megaminx._stickers[0].visible).toBe(true);
    expect(megaminx._stickers[0].material.roughness).toBe(0.24);
    expect(megaminx.getState()).toBe(defaultMegaminxStickerState());
  });

  test('applies move inverses and order-five turns', () => {
    for (const move of allMegaminxMoves) {
      const megaminx = new Megaminx3D({ animationSpeedMs: 0 });
      const solved = megaminx.getState();

      megaminx.applyMove(move);
      expect(megaminx.getState()).not.toBe(solved);

      megaminx.applyMove(reverseMegaminxMove(move));
      expect(megaminx.getState()).toBe(solved);
      megaminx.applyMove(move, { reverse: true });
      expect(megaminx.getState()).not.toBe(solved);
      megaminx.applyMove(move);
      expect(megaminx.getState()).toBe(solved);

      for (let repeat = 0; repeat < 5; repeat++) {
        megaminx.applyMove(move);
      }
      expect(megaminx.getState()).toBe(solved);
    }
  });

  test('runs algorithms, reset, setState, and async zero-speed moves', async () => {
    const megaminx = new Megaminx3D({ animationSpeedMs: 0 });
    const solved = megaminx.getState();
    const customState = [
      MegaminxFaces.I.repeat(11),
      MegaminxFaces.H.repeat(11),
      MegaminxFaces.G.repeat(11),
      MegaminxFaces.E.repeat(11),
      MegaminxFaces.C.repeat(11),
      MegaminxFaces.A.repeat(11),
      MegaminxFaces.B.repeat(11),
      MegaminxFaces.L.repeat(11),
      MegaminxFaces.F.repeat(11),
      MegaminxFaces.D.repeat(11),
      MegaminxFaces.R.repeat(11),
      MegaminxFaces.U.repeat(11),
    ].join('');

    await megaminx.do('R++ D-- U');
    expect(megaminx.getState()).not.toBe(solved);
    await megaminx.do(invertMegaminxAlgorithm(parseMegaminxAlgorithm('R++ D-- U')));
    expect(megaminx.getState()).toBe(solved);

    await expect(megaminx.move(MegaminxMoves.DPP)).resolves.toHaveLength(MEGAMINX_STICKER_COUNT);
    await expect(megaminx.move(MegaminxMoves.DPP, { animationSpeedMs: 0, reverse: true })).resolves.toHaveLength(
      MEGAMINX_STICKER_COUNT,
    );
    expect(megaminx.reset()).toBe(solved);
    expect(megaminx.setState(customState)).toBe(true);
    expect(megaminx.getState()).toBe(customState);
    expect(megaminx.setState('invalid')).toBe(false);
  });

  test('applies WCA Megaminx scramble without leaving mostly solved faces', async () => {
    const megaminx = new Megaminx3D({ animationSpeedMs: 0 });
    const scramble = `R-- D++ R++ D-- R++ D-- R++ D++ R++ D++ U
R-- D++ R++ D-- R++ D++ R++ D++ R-- D++ U
R++ D-- R++ D-- R-- D-- R++ D-- R-- D-- U'
R++ D++ R-- D-- R++ D-- R-- D-- R-- D-- U'
R-- D++ R-- D-- R++ D-- R++ D++ R++ D++ U
R-- D++ R++ D++ R++ D-- R-- D++ R-- D-- U'
R++ D-- R-- D-- R-- D++ R-- D++ R-- D++ U`;

    await megaminx.do(scramble, { animationSpeedMs: 0 });
    const state = megaminx.getState();
    const faceMaxCounts = Array.from({ length: 12 }, (_, faceIndex) => {
      const faceState = state.slice(faceIndex * 11, faceIndex * 11 + 11);
      const counts = new Map<string, number>();
      for (const face of faceState) {
        counts.set(face, (counts.get(face) ?? 0) + 1);
      }

      return Math.max(...counts.values());
    });

    expect(state).not.toBe(defaultMegaminxStickerState());
    expect(Math.max(...faceMaxCounts)).toBeLessThanOrEqual(8);
  });

  test('recovers queued moves after rejection and finishes pending animations', async () => {
    const megaminx = new Megaminx3D({ animationSpeedMs: 0 });
    const progress = vi.fn();

    await expect(megaminx.move('bad' as never)).rejects.toThrow(MegaminxNotationError);
    await expect(megaminx.move(MegaminxMoves.U, { animationSpeedMs: 0 })).resolves.toHaveLength(MEGAMINX_STICKER_COUNT);
    megaminx._currentAnimation = { progress } as never;
    megaminx.reset();

    expect(progress).toHaveBeenCalledWith(1);
  });

  test('snaps stickers back to canonical slots after long sequences', () => {
    const megaminx = new Megaminx3D({ animationSpeedMs: 0 });
    const moves = parseMegaminxAlgorithm("R++ D-- U R-- D++ U'");

    for (let repeat = 0; repeat < 12; repeat++) {
      for (const move of moves) {
        megaminx.applyMove(move);
      }
    }

    expect(megaminx._animationGroup.children).toHaveLength(0);
    expect(megaminx.getState()).toHaveLength(MEGAMINX_STICKER_COUNT);
    for (const piece of megaminx._pieces) {
      expect(piece.position.length()).toBeLessThan(1e-9);
      expect(piece.quaternion.angleTo(piece.quaternion.clone().identity())).toBeLessThan(1e-9);
    }
    for (let index = 0; index < megaminx._stickers.length; index++) {
      expect(megaminx._stickers[index].position.distanceTo(megaminx._slots[index].position)).toBeLessThan(1e-9);
    }
  });

  test('throws if internal sticker slots cannot be mapped', () => {
    const megaminx = new Megaminx3D({ animationSpeedMs: 0 });
    megaminx._stickers = [];

    expect(() => megaminx.getState()).toThrow('did not map to a sticker');
  });

  test('throws if physical turn groups cannot be resolved', () => {
    const megaminx = new Megaminx3D({ animationSpeedMs: 0 });
    megaminx._pieces = [];

    expect(() => megaminx.turnPlan(MegaminxMoves.R2)).toThrow('Megaminx R resolved 0 physical pieces');
    expect(() => megaminx.turnPlan(MegaminxMoves.RPP)).toThrow('Megaminx R wide resolved 0 physical pieces');
  });
});
