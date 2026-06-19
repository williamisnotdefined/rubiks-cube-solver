import './setup';
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { CubeTypes, Movements, Rotations } from '../src/core';
import { AttributeNames, PeekActions, PeekStates, RubiksCubeElement } from '../src/webComponent';

const rendererMocks = vi.hoisted(() => ({
  render: vi.fn(),
  setPixelRatio: vi.fn(),
  setSize: vi.fn(),
  dispose: vi.fn(),
}));

const gsapMocks = vi.hoisted(() => ({
  duration: vi.fn(),
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
      return { duration: gsapMocks.duration, progress: gsapMocks.progress };
    },
  ),
}));

const controlsMocks = vi.hoisted(() => ({
  dispose: vi.fn(),
  removeEventListener: vi.fn(),
  update: vi.fn(() => false),
  instances: [] as Array<{
    dispatch: (type: string) => void;
    enableDamping: boolean;
    enablePan: boolean;
    enableZoom: boolean;
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

      setSize = rendererMocks.setSize;
      setPixelRatio = rendererMocks.setPixelRatio;
      render = rendererMocks.render;
      dispose = rendererMocks.dispose;
    },
  };
});

vi.mock('three/examples/jsm/controls/OrbitControls.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three/examples/jsm/controls/OrbitControls.js')>();

  return {
    ...actual,
    OrbitControls: class MockOrbitControls {
      enableDamping = true;
      enablePan = true;
      enableZoom = true;
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

const tagName = 'rubiks-cube-element-test';

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

let rafCallbacks: FrameRequestCallback[] = [];

function flushAnimationFrames() {
  const [callback] = rafCallbacks.splice(0, 1);
  callback?.(performance.now());
}

function createElement(): RubiksCubeElement {
  return document.createElement(tagName) as RubiksCubeElement;
}

beforeAll(() => {
  RubiksCubeElement.register(tagName);
});

beforeEach(() => {
  vi.useFakeTimers();
  document.body.replaceChildren();
  MockResizeObserver.instances = [];
  controlsMocks.instances = [];
  controlsMocks.dispose.mockClear();
  controlsMocks.removeEventListener.mockClear();
  controlsMocks.update.mockClear();
  gsapMocks.to.mockClear();
  gsapMocks.duration.mockClear();
  gsapMocks.progress.mockClear();
  rendererMocks.render.mockClear();
  rendererMocks.setPixelRatio.mockClear();
  rendererMocks.setSize.mockClear();
  rendererMocks.dispose.mockClear();
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
  vi.stubGlobal('crypto', { randomUUID: () => 'peek-event-id' });
  Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: 3 });
});

afterEach(() => {
  document.body.replaceChildren();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('RubiksCubeElement', () => {
  test('rejects public methods before the element is connected', async () => {
    const element = createElement();

    await expect(element.move(Movements.Single.R)).rejects.toThrow('not initialised');
    await expect(element.rotate(Rotations.x)).rejects.toThrow('not initialised');
    await expect(element.peek(PeekActions.Right)).rejects.toThrow('not initialised');
    expect(() => element.reset()).toThrow('not initialised');
    expect(() => element.setState('invalid')).toThrow('not initialised');
    expect(() => element.getState()).toThrow('not initialised');
  });

  test('initializes rendering, responds to attributes, and cleans up', async () => {
    const element = createElement();
    element.setAttribute(AttributeNames.cubeType, CubeTypes.Three);
    element.setAttribute(AttributeNames.pieceGap, '1.05');
    element.setAttribute(AttributeNames.animationSpeed, '0');
    element.setAttribute(AttributeNames.animationStyle, 'linear');
    element.setAttribute(AttributeNames.cameraSpeed, '0');
    element.setAttribute(AttributeNames.cameraRadius, '7');
    element.setAttribute(AttributeNames.cameraFieldOfView, '60');
    element.setAttribute(AttributeNames.cameraPeekAngleHorizontal, '0.4');
    element.setAttribute(AttributeNames.cameraPeekAngleVertical, '0.5');
    element.setAttribute(AttributeNames.maxDevicePixelRatio, '2');
    element.setAttribute(AttributeNames.antialias, 'true');
    element.setAttribute(AttributeNames.logo, 'logo.png');
    element.setAttribute('render-events', '');

    const renderListener = vi.fn();
    element.addEventListener('rubiks-cube-render', renderListener);
    document.body.append(element);

    expect(rendererMocks.setSize).toHaveBeenCalled();
    expect(rendererMocks.setPixelRatio).toHaveBeenCalledWith(2);
    flushAnimationFrames();
    expect(rendererMocks.render).toHaveBeenCalled();
    expect(renderListener).toHaveBeenCalledTimes(1);

    MockResizeObserver.instances[0].resize(240, 120);
    vi.advanceTimersByTime(30);
    expect(rendererMocks.setSize).toHaveBeenCalledWith(240, 120);

    element.setAttribute(AttributeNames.cameraRadius, '8');
    element.setAttribute(AttributeNames.cameraFieldOfView, '62');
    element.setAttribute(AttributeNames.cameraPeekAngleHorizontal, '0.45');
    element.setAttribute(AttributeNames.cameraPeekAngleVertical, '0.55');
    element.setAttribute(AttributeNames.maxDevicePixelRatio, '4');
    element.setAttribute(AttributeNames.antialias, 'false');
    expect(rendererMocks.setPixelRatio).toHaveBeenCalledWith(3);

    controlsMocks.instances.at(-1)?.dispatch('start');
    controlsMocks.instances.at(-1)?.dispatch('end');
    flushAnimationFrames();
    expect(controlsMocks.update).toHaveBeenCalled();

    document.body.removeChild(element);
    expect(MockResizeObserver.instances.at(-1)?.disconnect).toHaveBeenCalled();
    expect(controlsMocks.dispose).toHaveBeenCalled();
    expect(rendererMocks.dispose).toHaveBeenCalled();
  });

  test('performs cube actions and camera peek after connection', async () => {
    const element = createElement();
    element.setAttribute(AttributeNames.animationSpeed, '0');
    element.setAttribute(AttributeNames.cameraSpeed, '0');
    document.body.append(element);

    await expect(element.move(Movements.Single.R)).resolves.toEqual(expect.any(String));
    await expect(element.rotate(Rotations.x)).resolves.toEqual(expect.any(String));
    const state = element.getState();
    expect(element.setState(state)).toBe(true);
    expect(element.reset()).toEqual(expect.any(String));
    expect(element.setType(CubeTypes.Two)).toEqual(expect.any(String));
    await expect(element.peek(PeekActions.LeftDown, { cameraSpeedMs: 0 })).resolves.toBe(PeekStates.LeftDown);
    await expect(element.peek('invalid' as PeekActions)).rejects.toThrow('Invalid peek action');

    expect(gsapMocks.to).toHaveBeenCalled();
  });
});
