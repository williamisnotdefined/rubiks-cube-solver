import './setup';
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  DEFAULT_SQUARE1_ANIMATION_SPEED_MS,
  defaultSquare1VisualState,
  Square1AttributeNames,
  Square1D,
  Square1MoveTokens,
  Square1PuzzleElement,
} from '../src/puzzles/square1';

const rendererMocks = vi.hoisted(() => ({
  dispose: vi.fn(),
  render: vi.fn(),
  setPixelRatio: vi.fn(),
  setSize: vi.fn(),
}));

const gsapMocks = vi.hoisted(() => ({
  progress: vi.fn(),
  to: vi.fn(
    (
      target: Record<string, number>,
      options: { progress?: number; onUpdate?: () => void; onComplete?: () => void },
    ) => {
      if (typeof options.progress === 'number') {
        target.progress = options.progress;
      }
      options.onUpdate?.();
      options.onComplete?.();
      return { progress: gsapMocks.progress };
    },
  ),
}));

const controlsMocks = vi.hoisted(() => ({
  dispose: vi.fn(),
  removeEventListener: vi.fn(),
  targetSet: vi.fn(),
  update: vi.fn(() => false),
  instances: [] as Array<{
    dispatch: (type: string) => void;
  }>,
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

      dispose = rendererMocks.dispose;
      render = rendererMocks.render;
      setPixelRatio = rendererMocks.setPixelRatio;
      setSize = rendererMocks.setSize;
    },
  };
});

vi.mock('../src/shared/puzzleControls', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/shared/puzzleControls')>();

  return {
    ...actual,
    PointerOrbitControls: class MockPointerOrbitControls {
      target = { set: controlsMocks.targetSet };
      listeners = new Map<string, Set<() => void>>();

      constructor() {
        controlsMocks.instances.push(this);
      }

      addEventListener(type: string, listener: () => void) {
        const listeners = this.listeners.get(type) ?? new Set<() => void>();
        listeners.add(listener);
        this.listeners.set(type, listeners);
      }

      removeEventListener(type: string, listener: () => void) {
        controlsMocks.removeEventListener(type, listener);
        this.listeners.get(type)?.delete(listener);
      }

      dispatch(type: string) {
        for (const listener of this.listeners.get(type) ?? []) {
          listener();
        }
      }

      update = controlsMocks.update;
      dispose = controlsMocks.dispose;
    },
  };
});

type ResizeObserverCallback = ConstructorParameters<typeof ResizeObserver>[0];

class MockResizeObserver {
  static instances: MockResizeObserver[] = [];
  callback: ResizeObserverCallback;
  disconnect = vi.fn();
  observe = vi.fn();

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    MockResizeObserver.instances.push(this);
  }

  resize(width = 320, height = 240) {
    this.callback([{ contentRect: { width, height } } as ResizeObserverEntry], this as unknown as ResizeObserver);
  }
}

const tagName = 'square1-puzzle-test';
let rafCallbacks: FrameRequestCallback[] = [];

function flushAnimationFrames() {
  const [callback] = rafCallbacks.splice(0, 1);
  callback?.(performance.now());
}

function createElement(): Square1PuzzleElement {
  return document.createElement(tagName) as Square1PuzzleElement;
}

beforeAll(() => {
  Square1PuzzleElement.register(tagName);
});

beforeEach(() => {
  document.body.replaceChildren();
  MockResizeObserver.instances = [];
  controlsMocks.instances = [];
  controlsMocks.dispose.mockClear();
  controlsMocks.removeEventListener.mockClear();
  controlsMocks.targetSet.mockClear();
  controlsMocks.update.mockClear();
  gsapMocks.to.mockClear();
  gsapMocks.progress.mockClear();
  rendererMocks.dispose.mockClear();
  rendererMocks.render.mockClear();
  rendererMocks.setPixelRatio.mockClear();
  rendererMocks.setSize.mockClear();
  rafCallbacks = [];
  vi.stubGlobal('ResizeObserver', MockResizeObserver);
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback: FrameRequestCallback) => {
      rafCallbacks.push(callback);
      return rafCallbacks.length;
    }),
  );
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: 3 });
});

afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

describe('Square1PuzzleElement', () => {
  test('register is idempotent and methods reject before connection', async () => {
    Square1PuzzleElement.register(tagName);
    const element = createElement();

    await expect(element.move(Square1MoveTokens.ThreeZero)).rejects.toThrow('not initialised');
    await expect(element.do('(3,0)')).rejects.toThrow('not initialised');
    expect(() => element.reset()).toThrow('not initialised');
    expect(() => element.setState(defaultSquare1VisualState())).toThrow('not initialised');
    expect(() => element.getState()).toThrow('not initialised');
  });

  test('initializes, responds to attributes, renders, and cleans up', () => {
    const element = createElement();
    element.setAttribute(Square1AttributeNames.animationSpeed, '0');
    element.setAttribute(Square1AttributeNames.animationStyle, 'linear');
    element.setAttribute(Square1AttributeNames.cameraSpeed, '80');
    element.setAttribute(Square1AttributeNames.cameraRadius, '5.5');
    element.setAttribute(Square1AttributeNames.cameraFieldOfView, '68');
    element.setAttribute(Square1AttributeNames.cameraPeekAngleHorizontal, '0.4');
    element.setAttribute(Square1AttributeNames.cameraPeekAngleVertical, '0.5');
    element.setAttribute(Square1AttributeNames.maxDevicePixelRatio, '2');
    element.setAttribute(Square1AttributeNames.antialias, 'true');
    element.setAttribute('render-events', '');
    const renderListener = vi.fn();
    element.addEventListener('square1-render', renderListener);

    document.body.append(element);
    flushAnimationFrames();

    expect(rendererMocks.setSize).toHaveBeenCalled();
    expect(rendererMocks.setPixelRatio).toHaveBeenCalledWith(2);
    expect(rendererMocks.render).toHaveBeenCalled();
    expect(renderListener).toHaveBeenCalledTimes(1);
    expect(element.cameraSpeedMs).toBe(80);
    expect(element.cameraPeekAngleHorizontal).toBe(0.4);
    expect(element.cameraPeekAngleVertical).toBe(0.5);
    expect(controlsMocks.targetSet).toHaveBeenCalledWith(0, 0, 0);

    MockResizeObserver.instances[0].resize(240, 120);
    controlsMocks.instances.at(-1)?.dispatch('change');
    element.setAttribute(Square1AttributeNames.maxDevicePixelRatio, '4');
    expect(rendererMocks.setPixelRatio).toHaveBeenCalledWith(3);

    element.setAttribute(Square1AttributeNames.cameraSpeed, '60');
    element.setAttribute(Square1AttributeNames.cameraRadius, '6');
    element.setAttribute(Square1AttributeNames.cameraFieldOfView, '72');
    element.setAttribute(Square1AttributeNames.cameraPeekAngleHorizontal, '0.7');
    element.setAttribute(Square1AttributeNames.cameraPeekAngleVertical, '0.8');
    expect(element.cameraSpeedMs).toBe(60);
    expect(controlsMocks.update).toHaveBeenCalled();
    element.setAttribute(Square1AttributeNames.antialias, 'false');

    document.body.removeChild(element);
    expect(MockResizeObserver.instances.at(-1)?.disconnect).toHaveBeenCalled();
    expect(controlsMocks.dispose).toHaveBeenCalled();
    expect(rendererMocks.dispose).toHaveBeenCalled();
  });

  test('moves, applies algorithms, resets, and sets visual state', async () => {
    const element = createElement();
    element.setAttribute(Square1AttributeNames.animationSpeed, '0');
    document.body.append(element);
    const solved = element.getState();

    await expect(element.move(Square1MoveTokens.ThreeZero)).resolves.toContain('square1-pieces-v1');
    expect(element.getState()).not.toBe(solved);
    await expect(element.move('(-3,0)')).resolves.toBe(solved);
    await expect(element.do('(1,-1) /')).resolves.toContain('square1-pieces-v1');
    expect(element.reset()).toBe(solved);

    const custom = new Square1D({ animationSpeedMs: 0 });
    custom.applyMove(Square1MoveTokens.ThreeZero);
    const customState = custom.getState();
    expect(element.setState(customState)).toBe(true);
    expect(element.getState()).toBe(customState);
    expect(element.setState('invalid')).toBe(false);
  });

  test('uses animated path, stops render loop, and preserves defaults on removed attributes', async () => {
    const element = createElement();
    document.body.append(element);

    expect(element.animationSpeedMs).toBe(DEFAULT_SQUARE1_ANIMATION_SPEED_MS);
    expect(element.animationStyle).toBe('linear');
    expect(element.cameraRadius).toBe(5);
    expect(element.cameraFieldOfView).toBe(70);
    expect(element.cameraSpeedMs).toBe(100);
    expect(element.cameraPeekAngleHorizontal).toBe(0.55);
    expect(element.cameraPeekAngleVertical).toBe(0.45);

    await expect(element.move(Square1MoveTokens.ThreeZero)).resolves.toHaveLength(defaultSquare1VisualState().length);
    expect(gsapMocks.to).toHaveBeenCalled();

    element.removeAttribute(Square1AttributeNames.maxDevicePixelRatio);
    element.removeAttribute(Square1AttributeNames.antialias);
    element.removeAttribute(Square1AttributeNames.cameraRadius);
    element.removeAttribute(Square1AttributeNames.cameraFieldOfView);
    element.attributeChangedCallback(Square1AttributeNames.maxDevicePixelRatio, '4', '');
    element.attributeChangedCallback(Square1AttributeNames.antialias, 'false', null);
    element.attributeChangedCallback(Square1AttributeNames.cameraRadius, '6', null);
    element.attributeChangedCallback(Square1AttributeNames.cameraFieldOfView, '72', null);
    element.attributeChangedCallback(Square1AttributeNames.cameraRadius, '5', '5');
    element.attributeChangedCallback(Square1AttributeNames.cameraFieldOfView, '70', '70');
    element.attributeChangedCallback(Square1AttributeNames.antialias, 'true', 'true');

    expect(element.maxDevicePixelRatio).toBe(2);
    expect(element.antialias).toBe(true);
    expect(element.cameraRadius).toBe(5);
    expect(element.cameraFieldOfView).toBe(70);
    await expect(element.move(Square1MoveTokens.Slash)).resolves.toContain('square1-pieces-v1');
  });

  test('renders active animation loops and cancels them on disconnect', async () => {
    const element = createElement();
    document.body.append(element);
    let completeMove: (() => void) | undefined;
    gsapMocks.to.mockImplementationOnce(
      (
        target: Record<string, number>,
        options: { progress?: number; onUpdate?: () => void; onComplete?: () => void },
      ) => {
        if (typeof options.progress === 'number') {
          target.progress = options.progress;
        }
        options.onUpdate?.();
        completeMove = options.onComplete;
        return { progress: gsapMocks.progress };
      },
    );

    const movePromise = element.move(Square1MoveTokens.ThreeZero);
    await Promise.resolve();
    flushAnimationFrames();

    const stopRendering = (element as unknown as { _startRenderLoop: () => () => void })._startRenderLoop();
    stopRendering();
    stopRendering();
    document.body.removeChild(element);
    expect(completeMove).toBeTypeOf('function');
    completeMove?.();

    await expect(movePromise).resolves.toContain('square1-pieces-v1');
    expect(cancelAnimationFrame).toHaveBeenCalled();
  });

  test('warns for invalid attributes', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const element = createElement();

    element.attributeChangedCallback(Square1AttributeNames.animationSpeed, null, '-1');
    element.attributeChangedCallback(Square1AttributeNames.animationStyle, null, 'bad');
    element.attributeChangedCallback(Square1AttributeNames.cameraSpeed, null, '-1');
    element.attributeChangedCallback(Square1AttributeNames.cameraRadius, null, '1');
    element.attributeChangedCallback(Square1AttributeNames.cameraFieldOfView, null, '1000');
    element.attributeChangedCallback(Square1AttributeNames.cameraPeekAngleHorizontal, null, '2');
    element.attributeChangedCallback(Square1AttributeNames.cameraPeekAngleVertical, null, '2');
    element.attributeChangedCallback(Square1AttributeNames.maxDevicePixelRatio, null, '9');
    element.attributeChangedCallback(Square1AttributeNames.antialias, null, 'maybe');

    expect(warn).toHaveBeenCalledTimes(9);
    warn.mockRestore();
  });
});
