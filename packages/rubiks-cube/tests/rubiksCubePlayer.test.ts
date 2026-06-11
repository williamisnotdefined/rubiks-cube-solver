import './setup';
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { CubeTypes, Movements, Rotations } from '../src/core';
import { RubiksCubePlayer, RubiksCubePlayerAttributes } from '../src/player/rubiksCubePlayer';
import { RubiksCubeElement } from '../src/webComponent/rubiksCubeElement';

const rendererMocks = vi.hoisted(() => ({
  render: vi.fn(),
  setPixelRatio: vi.fn(),
  setSize: vi.fn(),
  dispose: vi.fn(),
}));

const gsapMocks = vi.hoisted(() => ({
  to: vi.fn(
    (
      target: Record<string, number>,
      options: { rotation?: number; onUpdate?: () => void; onComplete?: () => void },
    ) => {
      if (typeof options.rotation === 'number') {
        target.rotation = options.rotation;
      }
      options.onUpdate?.();
      options.onComplete?.();
      return { duration: vi.fn(), progress: vi.fn() };
    },
  ),
}));

vi.mock('gsap', () => ({
  gsap: {
    to: gsapMocks.to,
  },
}));

vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three')>();

  return {
    ...actual,
    WebGLRenderer: class MockWebGLRenderer {
      domElement: HTMLCanvasElement;

      constructor(options: { canvas: HTMLCanvasElement }) {
        this.domElement = options.canvas;
      }

      setSize = rendererMocks.setSize;
      setPixelRatio = rendererMocks.setPixelRatio;
      render = rendererMocks.render;
      dispose = rendererMocks.dispose;
    },
  };
});

vi.mock('three/examples/jsm/Addons.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three/examples/jsm/Addons.js')>();

  return {
    ...actual,
    OrbitControls: class MockOrbitControls {
      enableDamping = true;
      enablePan = true;
      enableZoom = true;
      listeners = new Map<string, Set<() => void>>();

      addEventListener(type: string, listener: () => void) {
        const listeners = this.listeners.get(type) ?? new Set<() => void>();
        listeners.add(listener);
        this.listeners.set(type, listeners);
      }

      removeEventListener(type: string, listener: () => void) {
        this.listeners.get(type)?.delete(listener);
      }

      update = vi.fn(() => false);
      dispose = vi.fn();
    },
  };
});

type ResizeObserverCallback = ConstructorParameters<typeof ResizeObserver>[0];

class MockResizeObserver {
  callback: ResizeObserverCallback;
  disconnect = vi.fn();
  observe = vi.fn();

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
}

const tagName = 'rubiks-cube-player-test';

function createPlayer(attributes: Record<string, string> = {}): RubiksCubePlayer {
  const player = document.createElement(tagName) as RubiksCubePlayer;
  const forwardedAttributes = new Set(RubiksCubeElement.observedAttributes);
  for (const [name, value] of Object.entries(attributes)) {
    if (forwardedAttributes.has(name)) {
      player.setAttribute(name, value);
    }
  }
  document.body.append(player);
  for (const [name, value] of Object.entries(attributes)) {
    if (!forwardedAttributes.has(name)) {
      player.setAttribute(name, value);
    }
  }
  return player;
}

beforeAll(() => {
  RubiksCubeElement.register();
  RubiksCubePlayer.register(tagName);
});

beforeEach(() => {
  document.body.replaceChildren();
  gsapMocks.to.mockClear();
  vi.stubGlobal('ResizeObserver', MockResizeObserver);
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn(() => 1),
  );
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

describe('RubiksCubePlayer', () => {
  test('register is idempotent and observed attributes include lowercase cube type', () => {
    RubiksCubePlayer.register(tagName);

    expect(RubiksCubePlayer.observedAttributes).toContain('cubetype');
  });

  test('reads player attributes that exist before connection', () => {
    const setState = vi.spyOn(RubiksCubeElement.prototype, 'setState').mockReturnValue(true);
    const setType = vi.spyOn(RubiksCubeElement.prototype, 'setType').mockReturnValue('state');
    const player = document.createElement(tagName) as RubiksCubePlayer;
    player.setAttribute(RubiksCubePlayerAttributes.Setup, 'R');
    player.setAttribute(RubiksCubePlayerAttributes.Alg, 'U');
    player.setAttribute(RubiksCubePlayerAttributes.CubeType, CubeTypes.Two);

    document.body.append(player);

    expect(player.setup).toBe('R');
    expect(player.alg).toBe('U');
    expect(player.cubeType).toBe(CubeTypes.Two);
    expect(setState).toHaveBeenCalled();
    expect(setType).toHaveBeenCalledWith(CubeTypes.Two);
    setState.mockRestore();
    setType.mockRestore();
  });

  test('unknown attribute changes only reinitialize playback', () => {
    const player = createPlayer({ [RubiksCubePlayerAttributes.Alg]: 'R' });
    const previousCubeType = player.cubeType;

    player.attributeChangedCallback('unknown', null, 'value');

    expect(player.cubeType).toBe(previousCubeType);
    expect(player.currentMoveIndex).toBe(0);
  });

  test('initializes with default values when attributes are removed', () => {
    const player = createPlayer({
      [RubiksCubePlayerAttributes.CubeType]: CubeTypes.Four,
      [RubiksCubePlayerAttributes.Setup]: 'R',
      [RubiksCubePlayerAttributes.Alg]: 'U',
    });

    player.removeAttribute(RubiksCubePlayerAttributes.CubeType);
    player.removeAttribute(RubiksCubePlayerAttributes.Setup);
    player.removeAttribute(RubiksCubePlayerAttributes.Alg);

    expect(player.cubeType).toBe(CubeTypes.Three);
    expect(player.setup).toBe('');
    expect(player.alg).toBe('');
    expect(player.algMoves).toEqual([]);
  });

  test('cleans setup and algorithm scrambles', () => {
    const player = createPlayer();

    expect(player.cleanScramble(" R   U // comment\n x bad R' ")).toEqual(['R', 'U', 'x', 'bad', "R'"]);
    expect(player.cleanScramble('')).toEqual([]);
  });

  test('initializes from attributes and filters unsupported actions', () => {
    const player = createPlayer({
      [RubiksCubePlayerAttributes.CubeType]: CubeTypes.Four,
      [RubiksCubePlayerAttributes.Setup]: 'R U x invalid',
      [RubiksCubePlayerAttributes.Alg]: `R ${Rotations.x} nope U`,
      'camera-radius': '8',
    });

    expect(player.cubeType).toBe(CubeTypes.Four);
    expect(player.setup).toBe('R U x invalid');
    expect(player.alg).toBe(`R ${Rotations.x} nope U`);
    expect(player.algMoves).toEqual([Movements.Single.R, Rotations.x, Movements.Single.U]);
    expect(player.setupState).toEqual(expect.any(String));
    expect(player.rubiksCubeElement.getAttribute('camera-radius')).toBe('8');
  });

  test('steps, jumps, and plays through the algorithm', async () => {
    const player = createPlayer({
      [RubiksCubePlayerAttributes.Setup]: 'R',
      [RubiksCubePlayerAttributes.Alg]: `R ${Rotations.x} U`,
    });
    const move = vi.spyOn(player.rubiksCubeElement, 'move').mockResolvedValue('state');
    const rotate = vi.spyOn(player.rubiksCubeElement, 'rotate').mockResolvedValue('state');
    const setState = vi.spyOn(player.rubiksCubeElement, 'setState');

    await player.stepForward();
    expect(player.currentMoveIndex).toBe(1);
    expect(move).toHaveBeenLastCalledWith(Movements.Single.R);

    await player.stepForward();
    expect(player.currentMoveIndex).toBe(2);
    expect(rotate).toHaveBeenLastCalledWith('x');

    await player.stepBackward();
    expect(player.currentMoveIndex).toBe(1);
    expect(rotate).toHaveBeenLastCalledWith("x'");

    player.jumpToStart();
    expect(player.currentMoveIndex).toBe(0);
    expect(setState).toHaveBeenCalledWith(player.setupState);

    await player.playForward();
    expect(player.currentMoveIndex).toBe(player.algMoves.length);
    expect(player.playState).toBe('idle');

    await player.playBackward();
    expect(player.currentMoveIndex).toBe(0);
    expect(player.playState).toBe('idle');

    player.jumpToEnd();
    expect(player.currentMoveIndex).toBe(player.algMoves.length);
    expect(setState).toHaveBeenCalled();
  });

  test('handles playback boundary states and button events', async () => {
    const player = createPlayer({ [RubiksCubePlayerAttributes.Alg]: 'R' });
    vi.spyOn(player.rubiksCubeElement, 'move').mockResolvedValue('state');

    await player.stepBackward();
    expect(player.currentMoveIndex).toBe(0);

    player.playState = 'forward';
    await player.playForward();
    expect(player.playState).toBe('forward');

    player.playState = 'backward';
    await player.playBackward();
    expect(player.playState).toBe('backward');

    player.stopButton.click();
    expect(player.playState).toBe('idle');
    player.forwardsStepbutton.click();
    await vi.dynamicImportSettled();
    expect(player.currentMoveIndex).toBe(1);
    player.backwardsStepButton.click();
    await vi.dynamicImportSettled();
    expect(player.currentMoveIndex).toBe(0);
    player.forwardbutton.click();
    await vi.dynamicImportSettled();
    expect(player.currentMoveIndex).toBe(1);
    player.backwardsButton.click();
    await vi.dynamicImportSettled();
    expect(player.currentMoveIndex).toBe(0);
    player.endButton.click();
    expect(player.currentMoveIndex).toBe(player.algMoves.length);
    player.startButton.click();
    expect(player.currentMoveIndex).toBe(0);

    await player.stepForward();
    expect(player.currentMoveIndex).toBe(1);
    await player.stepForward();
    expect(player.currentMoveIndex).toBe(1);
  });

  test('handles playback completion when it was stopped mid-loop', async () => {
    const player = createPlayer({ [RubiksCubePlayerAttributes.Alg]: 'R U' });
    vi.spyOn(player.rubiksCubeElement, 'move').mockImplementation(async () => {
      player.stop();
      return 'state';
    });

    await player.playForward();
    expect(player.playState).toBe('idle');
    expect(player.currentMoveIndex).toBe(1);

    player.currentMoveIndex = 1;
    vi.spyOn(player.rubiksCubeElement, 'move').mockImplementation(async () => {
      player.stop();
      return 'state';
    });

    await player.playBackward();
    expect(player.playState).toBe('idle');
    expect(player.currentMoveIndex).toBe(0);
  });

  test('jump operations tolerate missing setup state', () => {
    const player = createPlayer({ [RubiksCubePlayerAttributes.Alg]: 'R' });
    const setState = vi.spyOn(player.rubiksCubeElement, 'setState');
    player.setupState = null;

    player.jumpToStart();
    player.jumpToEnd();

    expect(setState).toHaveBeenCalledTimes(1);
    expect(player.currentMoveIndex).toBe(1);
  });
});
