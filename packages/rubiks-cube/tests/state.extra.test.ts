import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { CubeTypes, Faces, Movements, Rotations } from '../src/core';
import type { RubiksCubeViewInterface } from '../src/rubiksCube';
import { RubiksCubeController } from '../src/rubiksCube';
import { RubiksCubeState } from '../src/state';
import { Axi, GetMovementSlice, GetRotationSlice } from '../src/state/slice';
import {
  defaultStickerState,
  fromKociemba,
  getEmptyStickerState,
  getStickerFaceIndex,
  toKociemba,
} from '../src/state/stickerState';

describe('slice helpers', () => {
  let error: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    error.mockRestore();
  });

  test.each([
    [Movements.Single.R, Axi.x, [2], -1],
    [Movements.Single.L, Axi.x, [0], 1],
    [Movements.Single.U, Axi.y, [2], -1],
    [Movements.Single.D, Axi.y, [0], 1],
    [Movements.Single.F, Axi.z, [2], -1],
    [Movements.Single.B, Axi.z, [0], 1],
    [Movements.Wide.r, Axi.x, [1, 2], -1],
    [Movements.Wide.l, Axi.x, [0, 1], 1],
    [Movements.Wide.u, Axi.y, [1, 2], -1],
    [Movements.Wide.d, Axi.y, [0, 1], 1],
    [Movements.Wide.f, Axi.z, [1, 2], -1],
    [Movements.Wide.b, Axi.z, [0, 1], 1],
    [Movements.Single.M, Axi.x, [1], 1],
    [Movements.Single.E, Axi.y, [1], 1],
    [Movements.Single.S, Axi.z, [1], -1],
  ])('builds movement slice for %s', (movement, axis, layerIds, direction) => {
    expect(GetMovementSlice(movement, 3)).toEqual({ axis, layerIds, direction });
  });

  test('builds range and lowercase slice moves', () => {
    expect(GetMovementSlice('2-4Rw' as never, 5)).toEqual({ axis: Axi.x, layerIds: [1, 2, 3], direction: -1 });
    expect(GetMovementSlice('2-4R' as never, 5)).toEqual({ axis: Axi.x, layerIds: [1, 2, 3], direction: -1 });
    expect(GetMovementSlice('2-4L' as never, 5)).toEqual({ axis: Axi.x, layerIds: [1, 2, 3], direction: 1 });
    expect(GetMovementSlice('2-4M' as never, 5)).toEqual({ axis: Axi.x, layerIds: [1, 2, 3], direction: 1 });
    expect(GetMovementSlice('2-4S' as never, 5)).toEqual({ axis: Axi.z, layerIds: [1, 2, 3], direction: -1 });
    expect(GetMovementSlice('2-4s' as never, 5)).toEqual({ axis: Axi.z, layerIds: [1, 2, 3], direction: -1 });
    expect(GetMovementSlice('2-4m' as never, 5)).toEqual({ axis: Axi.x, layerIds: [1, 2, 3], direction: 1 });
    expect(GetMovementSlice('2M' as never, 5)).toEqual({ axis: Axi.x, layerIds: [1, 2, 3], direction: 1 });
    expect(GetMovementSlice('2m' as never, 5)).toEqual({ axis: Axi.x, layerIds: [2], direction: 1 });
    expect(GetMovementSlice('2S' as never, 5)).toEqual({ axis: Axi.z, layerIds: [1, 2, 3], direction: -1 });
    expect(GetMovementSlice('2s' as never, 5)).toEqual({ axis: Axi.z, layerIds: [2], direction: -1 });
    expect(GetMovementSlice('m' as never, 5)).toEqual({ axis: Axi.x, layerIds: [1, 2, 3], direction: 1 });
    expect(GetMovementSlice('e' as never, 5)).toEqual({ axis: Axi.y, layerIds: [1, 2, 3], direction: 1 });
    expect(GetMovementSlice('s' as never, 5)).toEqual({ axis: Axi.z, layerIds: [1, 2, 3], direction: -1 });
  });

  test('rejects invalid movement and rotation strings', () => {
    expect(GetMovementSlice('bad' as never, 3)).toBeUndefined();
    expect(GetMovementSlice('4R' as never, 3)).toBeUndefined();
    expect(GetMovementSlice('3-2R' as never, 3)).toBeUndefined();
    expect(GetMovementSlice('2-4R' as never, 3)).toBeUndefined();
    expect(GetMovementSlice('4-5R' as never, 4)).toBeUndefined();
    expect(GetRotationSlice('bad' as never, 3)).toBeUndefined();
    expect(error).toHaveBeenCalled();
  });

  test.each([
    [Rotations.x, Axi.x, -1],
    [Rotations.xP, Axi.x, 1],
    [Rotations.y2, Axi.y, -2],
    [Rotations.z, Axi.z, -1],
  ])('builds rotation slice for %s', (rotation, axis, direction) => {
    expect(GetRotationSlice(rotation, 3)).toEqual({ axis, layerIds: [0, 1, 2], direction });
  });
});

describe('sticker state helpers', () => {
  test.each([
    [
      { x: 1, y: 0, z: 0 },
      { face: Faces.R, i: 1, j: 1 },
    ],
    [
      { x: -1, y: 0, z: 0 },
      { face: Faces.L, i: 1, j: 1 },
    ],
    [
      { x: 0, y: 1, z: 0 },
      { face: Faces.U, i: 1, j: 1 },
    ],
    [
      { x: 0, y: -1, z: 0 },
      { face: Faces.D, i: 1, j: 1 },
    ],
    [
      { x: 0, y: 0, z: 1 },
      { face: Faces.F, i: 1, j: 1 },
    ],
    [
      { x: 0, y: 0, z: -1 },
      { face: Faces.B, i: 1, j: 1 },
    ],
  ])('maps sticker direction %#', (direction, expected) => {
    expect(getStickerFaceIndex(direction, { x: 0, y: 0, z: 0 }, [-1, 0, 1])).toEqual(expected);
  });

  test('throws for invalid sticker direction or layer position', () => {
    expect(() => getStickerFaceIndex({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, [-1, 0, 1])).toThrow(
      'StickerDirection',
    );
    expect(() => getStickerFaceIndex({ x: 1, y: 0, z: 0 }, { x: 0, y: 2, z: 0 }, [-1, 0, 1])).toThrow('not found');
  });

  test('roundtrips kociemba strings for every cube size', () => {
    for (const cubeType of Object.values(CubeTypes)) {
      const state = defaultStickerState(cubeType);
      const kociemba = toKociemba(state);
      expect(fromKociemba(kociemba)).toEqual(state);
      expect(getEmptyStickerState(cubeType)[Faces.U]).toHaveLength(Math.round(kociemba.length ** 0.5 / Math.sqrt(6)));
    }
  });

  test('rejects invalid kociemba strings and cube types', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(fromKociemba('short')).toBeUndefined();
    expect(fromKociemba('x'.repeat(54))).toBeUndefined();
    expect(() => defaultStickerState('bad' as never)).toThrow('Invalid CubeType');
    expect(() => getEmptyStickerState('bad' as never)).toThrow('Invalid CubeType');
    error.mockRestore();
  });
});

describe('RubiksCubeController', () => {
  function view(): RubiksCubeViewInterface {
    return {
      reset: vi.fn(),
      setState: vi.fn(),
      setType: vi.fn(),
      slice: vi.fn(() => Promise.resolve()),
    };
  }

  test('updates view for valid actions and state changes', async () => {
    const cubeView = view();
    const controller = new RubiksCubeController(CubeTypes.Three, cubeView);

    await expect(controller.movement(Movements.Single.R, { animationSpeedMs: 0 })).resolves.toEqual(expect.any(String));
    await expect(controller.rotation(Rotations.x, { animationSpeedMs: 0 })).resolves.toEqual(expect.any(String));
    expect(cubeView.slice).toHaveBeenCalledTimes(2);
    expect(controller.do([Movements.Single.U, Rotations.y])).toEqual(expect.any(String));
    expect(cubeView.setState).toHaveBeenCalled();
    expect(controller.setState(controller.getState())).toBe(true);
    expect(controller.reset()).toEqual(expect.any(String));
    expect(controller.setType(CubeTypes.Two)).toEqual(expect.any(String));
  });

  test('rejects invalid controller operations', async () => {
    const controller = new RubiksCubeController(CubeTypes.Three, view());

    await expect(controller.movement('bad' as never)).rejects.toThrow('Invalid movement');
    await expect(controller.rotation('bad' as never)).rejects.toThrow('Invalid rotation');
    expect(controller.setState('bad')).toBe(false);
    expect(() => controller.setType('bad' as never)).toThrow('Invalid cube type');
  });

  test('applies reverse and translate options through state', () => {
    const cube = new RubiksCubeState(CubeTypes.Six);
    const slice = cube.move(Movements.Wide.u, { translate: true, reverse: true });

    expect(slice).toMatchObject({ axis: Axi.y });
  });

  test('handles invalid kociemba, invalid axis, reverse rotations, and invalid do actions', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const cube = new RubiksCubeState(CubeTypes.Three);

    expect(cube.setKociemba('bad')).toBe(false);
    cube.slice({ axis: 'bad' as never, layerIds: [0], direction: 1 });
    expect(cube.rotate(Rotations.x, { reverse: true })).toMatchObject({ axis: Axi.x, direction: 1 });
    cube.do(['bad' as never]);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});
