import './setup';
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  DEFAULT_MEGAMINX_ANIMATION_SPEED_MS,
  defaultMegaminxStickerState,
  Megaminx3D,
  MegaminxAttributeNames,
  MegaminxFaces,
  MegaminxMoves,
  MegaminxPuzzleElement,
  MegaminxVisualStyles,
} from '../src/puzzles/megaminx';

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
      options: { rotation?: number; onUpdate?: () => void; onComplete?: () => void },
    ) => {
      if (typeof options.rotation === 'number') {
        target.rotation = options.rotation;
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

const tagName = 'megaminx-puzzle-test';
let rafCallbacks: FrameRequestCallback[] = [];

function flushAnimationFrames() {
  const [callback] = rafCallbacks.splice(0, 1);
  callback?.(performance.now());
}

function createElement(): MegaminxPuzzleElement {
  return document.createElement(tagName) as MegaminxPuzzleElement;
}

beforeAll(() => {
  MegaminxPuzzleElement.register(tagName);
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

describe('MegaminxPuzzleElement', () => {
  test('register is idempotent and methods reject before connection', async () => {
    MegaminxPuzzleElement.register(tagName);
    const element = createElement();

    await expect(element.move(MegaminxMoves.RPP)).rejects.toThrow('not initialised');
    await expect(element.do('R++')).rejects.toThrow('not initialised');
    expect(() => element.reset()).toThrow('not initialised');
    expect(() => element.setState(defaultMegaminxStickerState())).toThrow('not initialised');
    expect(() => element.getState()).toThrow('not initialised');
  });

  test('initializes, responds to attributes, renders, and cleans up', () => {
    const element = createElement();
    element.setAttribute(MegaminxAttributeNames.animationSpeed, '0');
    element.setAttribute(MegaminxAttributeNames.animationStyle, 'linear');
    element.setAttribute(MegaminxAttributeNames.cameraSpeed, '80');
    element.setAttribute(MegaminxAttributeNames.cameraRadius, '6');
    element.setAttribute(MegaminxAttributeNames.cameraFieldOfView, '70');
    element.setAttribute(MegaminxAttributeNames.cameraPeekAngleHorizontal, '0.4');
    element.setAttribute(MegaminxAttributeNames.cameraPeekAngleVertical, '0.5');
    element.setAttribute(MegaminxAttributeNames.maxDevicePixelRatio, '2');
    element.setAttribute(MegaminxAttributeNames.antialias, 'true');
    element.setAttribute(MegaminxAttributeNames.visualStyle, MegaminxVisualStyles.Stickerless);
    element.setAttribute('render-events', '');
    const renderListener = vi.fn();
    element.addEventListener('megaminx-render', renderListener);

    document.body.append(element);
    flushAnimationFrames();

    expect(rendererMocks.setSize).toHaveBeenCalled();
    expect(rendererMocks.setPixelRatio).toHaveBeenCalledWith(2);
    expect(rendererMocks.render).toHaveBeenCalled();
    expect(renderListener).toHaveBeenCalledTimes(1);
    expect(element.cameraSpeedMs).toBe(80);
    expect(element.cameraPeekAngleHorizontal).toBe(0.4);
    expect(element.cameraPeekAngleVertical).toBe(0.5);
    expect(element.visualStyle).toBe(MegaminxVisualStyles.Stickerless);
    expect(controlsMocks.targetSet).toHaveBeenCalledWith(0, 0, 0);

    MockResizeObserver.instances[0].resize(240, 120);
    controlsMocks.instances.at(-1)?.dispatch('change');
    element.setAttribute(MegaminxAttributeNames.maxDevicePixelRatio, '4');
    expect(rendererMocks.setPixelRatio).toHaveBeenCalledWith(3);
    element.setAttribute(MegaminxAttributeNames.visualStyle, MegaminxVisualStyles.Stickered);
    expect((element as unknown as { _megaminx: Megaminx3D })._megaminx.visualStyle).toBe(
      MegaminxVisualStyles.Stickered,
    );

    gsapMocks.to.mockClear();
    element.setAttribute(MegaminxAttributeNames.cameraSpeed, '60');
    element.setAttribute(MegaminxAttributeNames.cameraRadius, '6.5');
    element.setAttribute(MegaminxAttributeNames.cameraFieldOfView, '72');
    element.setAttribute(MegaminxAttributeNames.cameraPeekAngleHorizontal, '0.7');
    element.setAttribute(MegaminxAttributeNames.cameraPeekAngleVertical, '0.8');
    expect(element.cameraSpeedMs).toBe(60);
    expect(gsapMocks.to).toHaveBeenCalled();
    element.setAttribute(MegaminxAttributeNames.antialias, 'false');

    document.body.removeChild(element);
    expect(MockResizeObserver.instances.at(-1)?.disconnect).toHaveBeenCalled();
    expect(controlsMocks.dispose).toHaveBeenCalled();
    expect(rendererMocks.dispose).toHaveBeenCalled();
  });

  test('moves, applies algorithms, resets, and sets visual state', async () => {
    const element = createElement();
    element.setAttribute(MegaminxAttributeNames.animationSpeed, '0');
    document.body.append(element);
    const solved = element.getState();

    await expect(element.move(MegaminxMoves.RPP)).resolves.toHaveLength(solved.length);
    expect(element.getState()).not.toBe(solved);
    await expect(element.move(MegaminxMoves.RMM)).resolves.toBe(solved);
    await expect(element.do("R++ D-- U'")).resolves.toHaveLength(solved.length);
    expect(element.reset()).toBe(solved);

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
    expect(element.setState(customState)).toBe(true);
    expect(element.getState()).toBe(customState);
    expect(element.setState('invalid')).toBe(false);
  });

  test('uses animated path and preserves defaults on removed attributes', async () => {
    const element = createElement();
    document.body.append(element);

    expect(element.animationSpeedMs).toBe(DEFAULT_MEGAMINX_ANIMATION_SPEED_MS);
    expect(element.animationStyle).toBe('linear');
    expect(element.cameraRadius).toBe(5.8);
    expect(element.cameraFieldOfView).toBe(75);
    expect(element.cameraSpeedMs).toBe(100);
    expect(element.cameraPeekAngleHorizontal).toBe(0.55);
    expect(element.cameraPeekAngleVertical).toBe(0.55);
    expect(element.visualStyle).toBe(MegaminxVisualStyles.Stickerless);

    await expect(element.move(MegaminxMoves.DPP)).resolves.toHaveLength(defaultMegaminxStickerState().length);
    expect(gsapMocks.to).toHaveBeenCalled();

    element.removeAttribute(MegaminxAttributeNames.maxDevicePixelRatio);
    element.removeAttribute(MegaminxAttributeNames.antialias);
    element.removeAttribute(MegaminxAttributeNames.visualStyle);
    element.attributeChangedCallback(MegaminxAttributeNames.maxDevicePixelRatio, '4', '');
    element.attributeChangedCallback(MegaminxAttributeNames.antialias, 'false', null);
    element.attributeChangedCallback(MegaminxAttributeNames.visualStyle, MegaminxVisualStyles.Stickerless, '');
    element.attributeChangedCallback(MegaminxAttributeNames.cameraRadius, '5.8', '5.8');
    element.attributeChangedCallback(MegaminxAttributeNames.cameraFieldOfView, '70', '70');
    element.attributeChangedCallback(MegaminxAttributeNames.antialias, 'true', 'true');

    expect(element.maxDevicePixelRatio).toBe(2);
    expect(element.antialias).toBe(true);
    expect(element.visualStyle).toBe(MegaminxVisualStyles.Stickerless);
  });

  test('renders active animation loops and cancels them on disconnect', async () => {
    const element = createElement();
    document.body.append(element);
    let completeMove: (() => void) | undefined;
    gsapMocks.to.mockImplementationOnce(
      (
        target: Record<string, number>,
        options: { rotation?: number; onUpdate?: () => void; onComplete?: () => void },
      ) => {
        if (typeof options.rotation === 'number') {
          target.rotation = options.rotation;
        }
        options.onUpdate?.();
        completeMove = options.onComplete;
        return { progress: gsapMocks.progress };
      },
    );

    const movePromise = element.move(MegaminxMoves.RPP);
    await Promise.resolve();
    const megaminx = (element as unknown as { _megaminx: Megaminx3D })._megaminx;
    expect(megaminx._animationGroup.children.length).toBeGreaterThan(0);
    flushAnimationFrames();
    expect(rendererMocks.render).toHaveBeenCalled();
    completeMove?.();
    await movePromise;
    expect(megaminx._animationGroup.children).toHaveLength(0);

    let completePendingMove: (() => void) | undefined;
    gsapMocks.to.mockImplementationOnce(
      (
        target: Record<string, number>,
        options: { rotation?: number; onUpdate?: () => void; onComplete?: () => void },
      ) => {
        if (typeof options.rotation === 'number') {
          target.rotation = options.rotation;
        }
        options.onUpdate?.();
        completePendingMove = options.onComplete;
        return { progress: gsapMocks.progress };
      },
    );

    const pendingMove = element.move(MegaminxMoves.DPP);
    await Promise.resolve();
    flushAnimationFrames();
    document.body.removeChild(element);
    expect(cancelAnimationFrame).toHaveBeenCalled();
    completePendingMove?.();
    await pendingMove;
  });

  test('serializes overlapping moves before starting the next turn', async () => {
    const element = createElement();
    document.body.append(element);
    let completeFirstMove: (() => void) | undefined;
    gsapMocks.to.mockImplementationOnce(
      (
        target: Record<string, number>,
        options: { rotation?: number; onUpdate?: () => void; onComplete?: () => void },
      ) => {
        if (typeof options.rotation === 'number') {
          target.rotation = options.rotation;
        }
        options.onUpdate?.();
        completeFirstMove = options.onComplete;
        return { progress: gsapMocks.progress };
      },
    );

    const firstMove = element.move(MegaminxMoves.RPP);
    const secondMove = element.move(MegaminxMoves.DPP);

    await Promise.resolve();
    expect(gsapMocks.to).toHaveBeenCalledTimes(1);
    completeFirstMove?.();
    await firstMove;
    await Promise.resolve();
    await secondMove;

    expect(gsapMocks.to).toHaveBeenCalledTimes(2);
    expect(element.getState()).toHaveLength(defaultMegaminxStickerState().length);
  });

  test('renders during pointer orbit drag and stops after release', () => {
    const element = createElement();
    document.body.append(element);
    flushAnimationFrames();

    const controls = controlsMocks.instances.at(-1);

    controls?.dispatch('start');
    flushAnimationFrames();
    expect(controlsMocks.update).toHaveBeenCalled();

    controls?.dispatch('end');
    flushAnimationFrames();
    flushAnimationFrames();
    flushAnimationFrames();

    expect(cancelAnimationFrame).toHaveBeenCalled();
  });

  test('warns on invalid attributes without replacing defaults', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const element = createElement();

    element.attributeChangedCallback(MegaminxAttributeNames.antialias, 'true', 'false');
    document.body.append(element);

    element.setAttribute(MegaminxAttributeNames.animationSpeed, '-1');
    element.setAttribute(MegaminxAttributeNames.animationStyle, 'sine');
    element.setAttribute(MegaminxAttributeNames.cameraSpeed, '-1');
    element.setAttribute(MegaminxAttributeNames.cameraRadius, '1');
    element.setAttribute(MegaminxAttributeNames.cameraFieldOfView, '200');
    element.setAttribute(MegaminxAttributeNames.cameraPeekAngleHorizontal, '2');
    element.setAttribute(MegaminxAttributeNames.cameraPeekAngleVertical, '-1');
    element.setAttribute(MegaminxAttributeNames.maxDevicePixelRatio, '10');
    element.setAttribute(MegaminxAttributeNames.antialias, 'maybe');
    element.setAttribute(MegaminxAttributeNames.visualStyle, 'transparent');

    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
