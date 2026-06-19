import './setup';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { CubeTypes } from '../src/puzzles/cube/core';
import { AnimationStyles, PeekActions, PeekStates } from '../src/puzzles/cube/element/constants';
import Settings from '../src/puzzles/cube/element/settings';
import { CameraState } from '../src/shared/cameraState';
import { debounce } from '../src/shared/debouncer';

describe('CameraState', () => {
  test.each([
    [true, true, PeekStates.RightUp],
    [false, true, PeekStates.RightDown],
    [true, false, PeekStates.LeftUp],
    [false, false, PeekStates.LeftDown],
  ])('reports peek state for up=%s right=%s', (up, right, state) => {
    expect(new CameraState(up, right).toPeekState()).toBe(state);
  });

  test('applies absolute and toggle peek actions', () => {
    const cameraState = new CameraState();

    cameraState.peekCamera(PeekActions.Horizontal);
    expect(cameraState.toPeekState()).toBe(PeekStates.LeftUp);
    cameraState.peekCamera(PeekActions.Vertical);
    expect(cameraState.toPeekState()).toBe(PeekStates.LeftDown);
    cameraState.peekCamera(PeekActions.Right);
    expect(cameraState.toPeekState()).toBe(PeekStates.RightDown);
    cameraState.peekCamera(PeekActions.Up);
    expect(cameraState.toPeekState()).toBe(PeekStates.RightUp);
    cameraState.peekCamera(PeekActions.Left);
    expect(cameraState.toPeekState()).toBe(PeekStates.LeftUp);
    cameraState.peekCamera(PeekActions.Down);
    expect(cameraState.toPeekState()).toBe(PeekStates.LeftDown);

    cameraState.peekCamera(PeekActions.RightUp);
    expect(cameraState.toPeekState()).toBe(PeekStates.RightUp);
    cameraState.peekCamera(PeekActions.RightDown);
    expect(cameraState.toPeekState()).toBe(PeekStates.RightDown);
    cameraState.peekCamera(PeekActions.LeftUp);
    expect(cameraState.toPeekState()).toBe(PeekStates.LeftUp);
    cameraState.peekCamera(PeekActions.LeftDown);
    expect(cameraState.toPeekState()).toBe(PeekStates.LeftDown);
  });
});

describe('Settings', () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warn.mockRestore();
  });

  test('uses defaults and accepts valid values', () => {
    const settings = new Settings();

    expect(settings.rubiksCube3DSettings.cubeType).toBe(CubeTypes.Three);
    expect(settings.rubiksCube3DSettings.pieceGap).toBe(1.04);
    expect(settings.rubiksCube3DSettings.animationSpeedMs).toBe(100);
    expect(settings.rubiksCube3DSettings.animationStyle).toBe(AnimationStyles.Linear);
    expect(settings.cameraSpeedMs).toBe(100);
    expect(settings.cameraRadius).toBe(5);
    expect(settings.cameraFieldOfView).toBe(75);
    expect(settings.cameraPeekAngleHorizontal).toBe(0.6);
    expect(settings.cameraPeekAngleVertical).toBe(0.6);
    expect(settings.maxDevicePixelRatio).toBe(2);
    expect(settings.antialias).toBe(true);

    settings.setCubeType(CubeTypes.Four);
    settings.setPieceGap('1.08');
    settings.setAnimationSpeed('240');
    settings.setAnimationStyle(AnimationStyles.Fixed);
    settings.setCameraSpeed('180');
    settings.setCameraRadius('9');
    settings.setCameraPeekAngleHorizontal('0.25');
    settings.setCameraPeekAngleVertical('0.75');
    settings.setCameraFieldOfView('88');
    settings.setMaxDevicePixelRatio('3');
    settings.setAntialias('false');
    settings.setLogo('/logo.png');

    expect(settings.rubiksCube3DSettings.cubeType).toBe(CubeTypes.Four);
    expect(settings.rubiksCube3DSettings.pieceGap).toBe(1.08);
    expect(settings.rubiksCube3DSettings.animationSpeedMs).toBe(240);
    expect(settings.rubiksCube3DSettings.animationStyle).toBe(AnimationStyles.Fixed);
    expect(settings.cameraSpeedMs).toBe(180);
    expect(settings.cameraRadius).toBe(9);
    expect(settings.cameraPeekAngleHorizontal).toBe(0.25);
    expect(settings.cameraPeekAngleVertical).toBe(0.75);
    expect(settings.cameraFieldOfView).toBe(88);
    expect(settings.maxDevicePixelRatio).toBe(3);
    expect(settings.antialias).toBe(false);
    expect(settings.rubiksCube3DSettings.logo).toBe('/logo.png');
    expect(warn).not.toHaveBeenCalled();
  });

  test('rejects invalid values and resets optional defaults', () => {
    const settings = new Settings();

    settings.setCubeType('bad');
    settings.setPieceGap('0.9');
    settings.setPieceGap('1.2');
    settings.setAnimationSpeed(null);
    settings.setAnimationStyle('bad');
    settings.setCameraSpeed(null);
    settings.setCameraRadius('3');
    settings.setCameraPeekAngleHorizontal('-1');
    settings.setCameraPeekAngleVertical('2');
    settings.setCameraFieldOfView('29');
    settings.setCameraFieldOfView('101');
    settings.setCameraFieldOfView(null);
    settings.setMaxDevicePixelRatio('0.1');
    settings.setMaxDevicePixelRatio('5');
    settings.setAntialias('maybe');

    expect(settings.rubiksCube3DSettings.cubeType).toBe(CubeTypes.Three);
    expect(settings.rubiksCube3DSettings.pieceGap).toBe(1.04);
    expect(settings.rubiksCube3DSettings.animationSpeedMs).toBe(100);
    expect(settings.cameraSpeedMs).toBe(100);
    expect(settings.cameraRadius).toBe(5);
    expect(settings.cameraPeekAngleHorizontal).toBe(0.6);
    expect(settings.cameraPeekAngleVertical).toBe(0.6);
    expect(settings.maxDevicePixelRatio).toBe(2);
    expect(settings.antialias).toBe(true);

    settings.setMaxDevicePixelRatio('');
    settings.setAntialias(null);
    settings.setAntialias('');
    expect(settings.maxDevicePixelRatio).toBe(2);
    expect(settings.antialias).toBe(true);
    expect(warn).toHaveBeenCalled();
  });
});

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.setTimeout = setTimeout as typeof window.setTimeout;
    window.clearTimeout = clearTimeout as typeof window.clearTimeout;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('runs the last scheduled call with the original this context', () => {
    const calls: unknown[][] = [];
    const target = { value: 1 };
    const debounced = debounce(function (this: typeof target, value: string) {
      calls.push([this.value, value]);
    }, 50);

    debounced.call(target, 'first');
    debounced.call(target, 'second');
    vi.advanceTimersByTime(49);
    expect(calls).toEqual([]);
    vi.advanceTimersByTime(1);

    expect(calls).toEqual([[1, 'second']]);
  });
});
