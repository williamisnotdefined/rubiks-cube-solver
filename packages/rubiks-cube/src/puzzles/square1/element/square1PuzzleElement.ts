import { AmbientLight, DirectionalLight, PerspectiveCamera, Scene, Spherical, WebGLRenderer } from 'three';
import type { AnimationStyle } from '../../../shared/animation';
import { debounce } from '../../../shared/debouncer';
import { PointerOrbitControls } from '../../../shared/puzzleControls';
import type { Square1AnimationOptions, Square1MoveInput } from '../three/square1D';
import { Square1D } from '../three/square1D';
import {
  maxAzimuthAngle,
  maxPolarAngle,
  notInitialisedMessage,
  polarAngleOffset,
  renderEventName,
  Square1AttributeNames,
} from './constants';
import {
  createDefaultSquare1ElementSettings,
  setSquare1AnimationSpeed,
  setSquare1AnimationStyle,
  setSquare1Antialias,
  setSquare1CameraFieldOfView,
  setSquare1CameraPeekAngleHorizontal,
  setSquare1CameraPeekAngleVertical,
  setSquare1CameraRadius,
  setSquare1CameraSpeed,
  setSquare1MaxDevicePixelRatio,
} from './settings';

type RenderLoopStarter = () => () => void;

export class Square1PuzzleElement extends HTMLElement {
  canvas: HTMLCanvasElement;
  animationSpeedMs: number;
  animationStyle: AnimationStyle;
  antialias: boolean;
  cameraFieldOfView: number;
  cameraPeekAngleHorizontal: number;
  cameraPeekAngleVertical: number;
  cameraRadius: number;
  cameraSpeedMs: number;
  maxDevicePixelRatio: number;
  private _cleanup: (() => void) | null;
  private _renderOnce: (() => void) | null;
  private _square1: Square1D | null;
  private _startRenderLoop: RenderLoopStarter | null;
  private _updateCamera: (() => void) | null;
  private _updatePixelRatio: (() => void) | null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    const root = this.shadowRoot as ShadowRoot;
    root.innerHTML = `<canvas id="square1-canvas" style="display:block;"></canvas>`;
    this.canvas = root.getElementById('square1-canvas') as HTMLCanvasElement;
    const settings = createDefaultSquare1ElementSettings();
    this.animationSpeedMs = settings.animationSpeedMs;
    this.animationStyle = settings.animationStyle;
    this.antialias = settings.antialias;
    this.cameraFieldOfView = settings.cameraFieldOfView;
    this.cameraPeekAngleHorizontal = settings.cameraPeekAngleHorizontal;
    this.cameraPeekAngleVertical = settings.cameraPeekAngleVertical;
    this.cameraRadius = settings.cameraRadius;
    this.cameraSpeedMs = settings.cameraSpeedMs;
    this.maxDevicePixelRatio = settings.maxDevicePixelRatio;
    this._cleanup = null;
    this._renderOnce = null;
    this._square1 = null;
    this._startRenderLoop = null;
    this._updateCamera = null;
    this._updatePixelRatio = null;
  }

  static register(tagName = 'square1-puzzle'): void {
    if (!customElements.get(tagName)) {
      customElements.define(tagName, Square1PuzzleElement);
    }
  }

  static get observedAttributes(): string[] {
    return Object.values(Square1AttributeNames);
  }

  connectedCallback(): void {
    for (const attr of Square1PuzzleElement.observedAttributes) {
      if (this.hasAttribute(attr)) {
        this.attributeChangedCallback(attr, null, this.getAttribute(attr));
      }
    }
    this.init();
  }

  attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null): void {
    switch (name) {
      case Square1AttributeNames.animationSpeed:
        setSquare1AnimationSpeed(this, newVal);
        if (this._square1) {
          this._square1.animationSpeedMs = this.animationSpeedMs;
        }
        break;
      case Square1AttributeNames.animationStyle:
        setSquare1AnimationStyle(this, newVal);
        if (this._square1) {
          this._square1.animationStyle = this.animationStyle;
        }
        break;
      case Square1AttributeNames.cameraRadius:
        setSquare1CameraRadius(this, newVal);
        this._updateCamera?.();
        break;
      case Square1AttributeNames.cameraFieldOfView:
        setSquare1CameraFieldOfView(this, newVal);
        this._updateCamera?.();
        break;
      case Square1AttributeNames.cameraPeekAngleHorizontal:
        setSquare1CameraPeekAngleHorizontal(this, newVal);
        this._updateCamera?.();
        break;
      case Square1AttributeNames.cameraPeekAngleVertical:
        setSquare1CameraPeekAngleVertical(this, newVal);
        this._updateCamera?.();
        break;
      case Square1AttributeNames.cameraSpeed:
        setSquare1CameraSpeed(this, newVal);
        break;
      case Square1AttributeNames.maxDevicePixelRatio:
        setSquare1MaxDevicePixelRatio(this, newVal);
        this._updatePixelRatio?.();
        this._renderOnce?.();
        break;
      case Square1AttributeNames.antialias:
        setSquare1Antialias(this, newVal);
        if (oldVal !== newVal && oldVal !== null) {
          this.rebuildPreservingState();
        }
    }
  }

  move(move: Square1MoveInput, options: Square1AnimationOptions = {}): Promise<string> {
    if (this._square1 == null) {
      return Promise.reject(new Error(notInitialisedMessage));
    }

    const stopRendering = this._startRenderLoop?.();
    return this._square1.move(move, options).finally(() => {
      stopRendering?.();
      this._renderOnce?.();
    });
  }

  do(actions: readonly Square1MoveInput[] | string, options: Square1AnimationOptions = {}): Promise<string> {
    if (this._square1 == null) {
      return Promise.reject(new Error(notInitialisedMessage));
    }

    const stopRendering = this._startRenderLoop?.();
    return this._square1.do(actions, options).finally(() => {
      stopRendering?.();
      this._renderOnce?.();
    });
  }

  reset(): string {
    if (this._square1 == null) {
      throw new Error(notInitialisedMessage);
    }

    const state = this._square1.reset();
    this._renderOnce?.();
    return state;
  }

  setState(state: string): boolean {
    if (this._square1 == null) {
      throw new Error(notInitialisedMessage);
    }

    const updated = this._square1.setState(state);
    this._renderOnce?.();
    return updated;
  }

  getState(): string {
    if (this._square1 == null) {
      throw new Error(notInitialisedMessage);
    }

    return this._square1.getState();
  }

  disconnectedCallback(): void {
    this._cleanup?.();
    this._cleanup = null;
    this._renderOnce = null;
    this._square1 = null;
    this._startRenderLoop = null;
    this._updateCamera = null;
    this._updatePixelRatio = null;
  }

  private rebuildPreservingState(): void {
    if (this._square1 == null) {
      return;
    }

    const state = this._square1.getState();
    this.init();
    this.setState(state);
  }

  private init(): void {
    this._cleanup?.();
    const canvas = this.canvas.cloneNode(false) as HTMLCanvasElement;
    this.canvas.replaceWith(canvas);
    this.canvas = canvas;
    const square1 = new Square1D({
      animationSpeedMs: this.animationSpeedMs,
      animationStyle: this.animationStyle,
    });
    this._square1 = square1;

    const scene = new Scene();
    const renderer = new WebGLRenderer({
      alpha: true,
      antialias: this.antialias,
      canvas,
    });
    renderer.setSize(this.clientWidth, this.clientHeight);
    const updatePixelRatio = () => {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.maxDevicePixelRatio));
    };
    this._updatePixelRatio = updatePixelRatio;
    updatePixelRatio();

    const camera = new PerspectiveCamera(this.cameraFieldOfView, this.clientWidth / this.clientHeight, 1, 2000);
    const controls = new PointerOrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);

    let isDisposed = false;
    let renderFrameId = 0;
    let loopFrameId = 0;
    let activeRenderLoops = 0;

    const updateCamera = () => {
      camera.fov = this.cameraFieldOfView;
      camera.aspect = this.clientWidth / this.clientHeight;
      camera.updateProjectionMatrix();
      camera.position.setFromSpherical(this.targetCameraSpherical());
      camera.lookAt(square1.position);
      controls.update();
      requestRender();
    };
    this._updateCamera = updateCamera;
    updateCamera();

    const ambientLight = new AmbientLight('white', 0.4);
    const spotLight1 = new DirectionalLight('white', 2);
    const spotLight2 = new DirectionalLight('white', 2);
    const spotLight3 = new DirectionalLight('white', 2);
    const spotLight4 = new DirectionalLight('white', 2);
    spotLight1.position.set(5, 5, 5);
    spotLight2.position.set(-5, 5, 5);
    spotLight3.position.set(5, -5, 0);
    spotLight4.position.set(-10, -5, -5);
    scene.add(ambientLight, spotLight1, spotLight2, spotLight3, spotLight4, square1);

    function renderScene() {
      renderer.render(scene, camera);
      const host = square1ElementHost(canvas);
      if (host?.hasAttribute('render-events')) {
        host.dispatchEvent(new CustomEvent(renderEventName));
      }
    }

    function requestRender() {
      if (isDisposed || renderFrameId !== 0 || loopFrameId !== 0) {
        return;
      }
      renderFrameId = requestAnimationFrame(() => {
        renderFrameId = 0;
        renderScene();
      });
    }

    const startRenderLoop = (): (() => void) => {
      activeRenderLoops++;
      let stopped = false;
      const tick = () => {
        if (isDisposed || activeRenderLoops === 0) {
          loopFrameId = 0;
          return;
        }
        renderScene();
        loopFrameId = requestAnimationFrame(tick);
      };
      if (loopFrameId === 0) {
        loopFrameId = requestAnimationFrame(tick);
      }
      return () => {
        if (stopped) {
          return;
        }
        stopped = true;
        activeRenderLoops = Math.max(0, activeRenderLoops - 1);
        if (activeRenderLoops === 0 && loopFrameId !== 0) {
          cancelAnimationFrame(loopFrameId);
          loopFrameId = 0;
          requestRender();
        }
      };
    };

    this._renderOnce = requestRender;
    this._startRenderLoop = startRenderLoop;
    requestRender();

    controls.addEventListener('change', requestRender);

    const resizeObserver = new ResizeObserver(
      debounce((entries: ResizeObserverEntry[]) => {
        const { width, height } = entries[0].contentRect;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
        requestRender();
      }, 30),
    );
    resizeObserver.observe(this);

    this._cleanup = () => {
      isDisposed = true;
      if (renderFrameId !== 0) {
        cancelAnimationFrame(renderFrameId);
      }
      if (loopFrameId !== 0) {
        cancelAnimationFrame(loopFrameId);
      }
      resizeObserver.disconnect();
      controls.removeEventListener('change', requestRender);
      controls.dispose();
      renderer.dispose();
    };
  }

  private targetCameraSpherical(): Spherical {
    return new Spherical(
      this.cameraRadius,
      polarAngleOffset + this.cameraPeekAngleVertical * maxPolarAngle,
      this.cameraPeekAngleHorizontal * maxAzimuthAngle,
    );
  }
}

function square1ElementHost(canvas: HTMLCanvasElement): HTMLElement | undefined {
  const root = canvas.getRootNode();
  if ('host' in root && root.host instanceof HTMLElement) {
    return root.host;
  }

  return undefined;
}
