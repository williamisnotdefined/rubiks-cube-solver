import { gsap } from 'gsap';
import { AmbientLight, DirectionalLight, PerspectiveCamera, Scene, Spherical, WebGLRenderer } from 'three';
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
  type Square1AnimationStyle,
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

type RenderLoopStarter = (updateControls?: boolean) => () => void;
type CleanupOptions = { preservePuzzle?: boolean };

export class Square1PuzzleElement extends HTMLElement {
  canvas: HTMLCanvasElement;
  animationSpeedMs: number;
  animationStyle: Square1AnimationStyle;
  antialias: boolean;
  cameraFieldOfView: number;
  cameraPeekAngleHorizontal: number;
  cameraPeekAngleVertical: number;
  cameraRadius: number;
  cameraSpeedMs: number;
  maxDevicePixelRatio: number;
  private _activeMovePromises: Set<Promise<string>>;
  private _cleanup: ((options?: CleanupOptions) => void) | null;
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
    this._activeMovePromises = new Set();
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

  attributeChangedCallback(name: string, _oldVal: string | null, newVal: string | null): void {
    switch (name) {
      case Square1AttributeNames.animationSpeed: {
        const previous = this.animationSpeedMs;
        setSquare1AnimationSpeed(this, newVal);
        if (this._square1 && this.animationSpeedMs !== previous) {
          this._square1.animationSpeedMs = this.animationSpeedMs;
        }
        break;
      }
      case Square1AttributeNames.animationStyle: {
        const previous = this.animationStyle;
        setSquare1AnimationStyle(this, newVal);
        if (this._square1 && this.animationStyle !== previous) {
          this._square1.animationStyle = this.animationStyle;
        }
        break;
      }
      case Square1AttributeNames.cameraRadius: {
        const previous = this.cameraRadius;
        setSquare1CameraRadius(this, newVal);
        if (this.cameraRadius !== previous) {
          this._updateCamera?.();
        }
        break;
      }
      case Square1AttributeNames.cameraFieldOfView: {
        const previous = this.cameraFieldOfView;
        setSquare1CameraFieldOfView(this, newVal);
        if (this.cameraFieldOfView !== previous) {
          this._updateCamera?.();
        }
        break;
      }
      case Square1AttributeNames.cameraPeekAngleHorizontal: {
        const previous = this.cameraPeekAngleHorizontal;
        setSquare1CameraPeekAngleHorizontal(this, newVal);
        if (this.cameraPeekAngleHorizontal !== previous) {
          this._updateCamera?.();
        }
        break;
      }
      case Square1AttributeNames.cameraPeekAngleVertical: {
        const previous = this.cameraPeekAngleVertical;
        setSquare1CameraPeekAngleVertical(this, newVal);
        if (this.cameraPeekAngleVertical !== previous) {
          this._updateCamera?.();
        }
        break;
      }
      case Square1AttributeNames.cameraSpeed:
        setSquare1CameraSpeed(this, newVal);
        break;
      case Square1AttributeNames.maxDevicePixelRatio: {
        const previous = this.maxDevicePixelRatio;
        setSquare1MaxDevicePixelRatio(this, newVal);
        if (this.maxDevicePixelRatio !== previous) {
          this._updatePixelRatio?.();
          this._renderOnce?.();
        }
        break;
      }
      case Square1AttributeNames.antialias: {
        const previous = this.antialias;
        setSquare1Antialias(this, newVal);
        if (this.antialias !== previous && this._square1) {
          this.rebuildPreservingState();
        }
        break;
      }
    }
  }

  move(move: Square1MoveInput, options: Square1AnimationOptions = {}): Promise<string> {
    if (this._square1 == null) {
      return Promise.reject(new Error(notInitialisedMessage));
    }

    const stopRendering = this._startRenderLoop?.();
    return this.trackMovePromise(this._square1.move(move, options), stopRendering);
  }

  do(actions: readonly Square1MoveInput[] | string, options: Square1AnimationOptions = {}): Promise<string> {
    if (this._square1 == null) {
      return Promise.reject(new Error(notInitialisedMessage));
    }

    const stopRendering = this._startRenderLoop?.();
    return this.trackMovePromise(this._square1.do(actions, options), stopRendering);
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
    this._activeMovePromises.clear();
  }

  private rebuildPreservingState(): void {
    if (this._square1 == null) {
      return;
    }

    const pendingMovePromises = [...this._activeMovePromises];
    this.init(this._square1);
    this.renderUntilMovesSettle(pendingMovePromises);
  }

  private trackMovePromise(promise: Promise<string>, stopRendering: (() => void) | undefined): Promise<string> {
    let trackedPromise!: Promise<string>;
    trackedPromise = promise.finally(() => {
      stopRendering?.();
      this._activeMovePromises.delete(trackedPromise);
      this._renderOnce?.();
    });
    this._activeMovePromises.add(trackedPromise);
    return trackedPromise;
  }

  private renderUntilMovesSettle(movePromises: readonly Promise<string>[]): void {
    if (movePromises.length === 0) {
      this._renderOnce?.();
      return;
    }

    const stopRendering = this._startRenderLoop?.();
    Promise.allSettled(movePromises).finally(() => {
      stopRendering?.();
      this._renderOnce?.();
    });
  }

  private init(preservedSquare1?: Square1D): void {
    this._cleanup?.({ preservePuzzle: preservedSquare1 != null });
    const canvas = this.canvas.cloneNode(false) as HTMLCanvasElement;
    this.canvas.replaceWith(canvas);
    this.canvas = canvas;
    const square1 = preservedSquare1 ?? new Square1D();
    square1.animationSpeedMs = this.animationSpeedMs;
    square1.animationStyle = this.animationStyle;
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
    camera.position.setFromSpherical(this.targetCameraSpherical());
    camera.lookAt(square1.position);
    const controls = new PointerOrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);

    let isDisposed = false;
    let renderFrameId = 0;
    let loopFrameId = 0;
    let activeRenderLoops = 0;
    let activeControlRenderLoops = 0;
    let stopControlsRenderLoop: (() => void) | null = null;
    let controlsSettling = false;
    let stableControlFrames = 0;
    let cameraAnimation: gsap.core.Tween | null = null;
    let stopCameraRenderLoop: (() => void) | null = null;
    const stableControlFrameThreshold = 3;

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

    function renderWithControls() {
      const controlsChanged = controls.update();
      renderScene();
      return controlsChanged;
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

    const startRenderLoop = (updateControls = false): (() => void) => {
      activeRenderLoops++;
      if (updateControls) {
        activeControlRenderLoops++;
      }
      let stopped = false;
      const tick = () => {
        if (isDisposed || activeRenderLoops === 0) {
          loopFrameId = 0;
          return;
        }
        if (activeControlRenderLoops > 0) {
          const controlsChanged = renderWithControls();
          if (controlsSettling) {
            stableControlFrames = controlsChanged ? 0 : stableControlFrames + 1;
            if (stableControlFrames >= stableControlFrameThreshold) {
              controlsSettling = false;
              stopControlsRenderLoop?.();
              stopControlsRenderLoop = null;
            }
          }
        } else {
          renderScene();
        }
        if (isDisposed || activeRenderLoops === 0) {
          loopFrameId = 0;
          return;
        }
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
        if (updateControls) {
          activeControlRenderLoops = Math.max(0, activeControlRenderLoops - 1);
        }
        if (activeRenderLoops === 0 && loopFrameId !== 0) {
          cancelAnimationFrame(loopFrameId);
          loopFrameId = 0;
          requestRender();
        }
      };
    };

    const stopCameraAnimation = () => {
      cameraAnimation?.kill();
      cameraAnimation = null;
      stopCameraRenderLoop?.();
      stopCameraRenderLoop = null;
    };

    const updateCamera = () => {
      camera.fov = this.cameraFieldOfView;
      camera.aspect = this.clientWidth / this.clientHeight;
      camera.updateProjectionMatrix();

      stopCameraAnimation();
      const targetSpherical = this.targetCameraSpherical();
      if (this.cameraSpeedMs === 0) {
        camera.position.setFromSpherical(targetSpherical);
        camera.lookAt(square1.position);
        controls.update();
        requestRender();
        return;
      }

      const startSpherical = new Spherical().setFromVector3(camera.position);
      stopCameraRenderLoop = startRenderLoop(false);
      cameraAnimation = gsap.to(startSpherical, {
        duration: this.cameraSpeedMs / 1000,
        ease: 'none',
        overwrite: false,
        phi: targetSpherical.phi,
        radius: targetSpherical.radius,
        theta: targetSpherical.theta,
        onComplete: () => {
          cameraAnimation = null;
          stopCameraRenderLoop?.();
          stopCameraRenderLoop = null;
          requestRender();
        },
        onUpdate: () => {
          camera.position.setFromSpherical(startSpherical);
          camera.lookAt(square1.position);
          controls.update();
        },
      });
    };

    this._renderOnce = requestRender;
    this._startRenderLoop = startRenderLoop;
    this._updateCamera = updateCamera;
    requestRender();

    const onControlsStart = () => {
      controlsSettling = false;
      stableControlFrames = 0;
      stopControlsRenderLoop ??= startRenderLoop(true);
    };
    const onControlsEnd = () => {
      stableControlFrames = 0;
      controlsSettling = true;
    };
    controls.addEventListener('start', onControlsStart);
    controls.addEventListener('change', requestRender);
    controls.addEventListener('end', onControlsEnd);

    const onResize = debounce((entries: ResizeObserverEntry[]) => {
      const { width, height } = entries[0].contentRect;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      requestRender();
    }, 30);
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(this);

    this._cleanup = ({ preservePuzzle = false }: CleanupOptions = {}) => {
      isDisposed = true;
      if (!preservePuzzle) {
        square1.dispose();
      }
      if (renderFrameId !== 0) {
        cancelAnimationFrame(renderFrameId);
      }
      if (loopFrameId !== 0) {
        cancelAnimationFrame(loopFrameId);
      }
      stopCameraAnimation();
      onResize.cancel();
      resizeObserver.disconnect();
      controls.removeEventListener('start', onControlsStart);
      controls.removeEventListener('change', requestRender);
      controls.removeEventListener('end', onControlsEnd);
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
