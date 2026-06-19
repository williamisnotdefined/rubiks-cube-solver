import { gsap } from 'gsap';
import { AmbientLight, DirectionalLight, PerspectiveCamera, Scene, Spherical, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { AnimationStyle } from '../../../shared/animation';
import { CameraState } from '../../../shared/cameraState';
import { debounce } from '../../../shared/debouncer';
import type { PyraminxMove } from '../core/types';
import type { PyraminxAnimationOptions } from '../three/pyraminx3D';
import { Pyraminx3D } from '../three/pyraminx3D';
import {
  InternalEvents,
  maxAzimuthAngle,
  maxPolarAngle,
  notInitialisedMessage,
  PyraminxAttributeNames,
  polarAngleOffset,
  renderEventName,
} from './constants';
import {
  createDefaultPyraminxElementSettings,
  setPyraminxAnimationSpeed,
  setPyraminxAnimationStyle,
  setPyraminxAntialias,
  setPyraminxCameraFieldOfView,
  setPyraminxCameraPeekAngleHorizontal,
  setPyraminxCameraPeekAngleVertical,
  setPyraminxCameraRadius,
  setPyraminxCameraSpeed,
  setPyraminxMaxDevicePixelRatio,
} from './settings';

type RenderLoopStarter = (updateControls?: boolean) => () => void;

export class PyraminxPuzzleElement extends HTMLElement {
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
  private _pyraminx: Pyraminx3D | null;
  private _renderOnce: (() => void) | null;
  private _startRenderLoop: RenderLoopStarter | null;
  private _updatePixelRatio: (() => void) | null;
  private _cleanup: (() => void) | null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    const root = this.shadowRoot as ShadowRoot;
    root.innerHTML = `<canvas id="pyraminx-canvas" style="display:block;"></canvas>`;
    this.canvas = root.getElementById('pyraminx-canvas') as HTMLCanvasElement;
    const settings = createDefaultPyraminxElementSettings();
    this.animationSpeedMs = settings.animationSpeedMs;
    this.animationStyle = settings.animationStyle;
    this.antialias = settings.antialias;
    this.cameraFieldOfView = settings.cameraFieldOfView;
    this.cameraPeekAngleHorizontal = settings.cameraPeekAngleHorizontal;
    this.cameraPeekAngleVertical = settings.cameraPeekAngleVertical;
    this.cameraRadius = settings.cameraRadius;
    this.cameraSpeedMs = settings.cameraSpeedMs;
    this.maxDevicePixelRatio = settings.maxDevicePixelRatio;
    this._pyraminx = null;
    this._renderOnce = null;
    this._startRenderLoop = null;
    this._updatePixelRatio = null;
    this._cleanup = null;
  }

  static register(tagName = 'pyraminx-puzzle'): void {
    if (!customElements.get(tagName)) {
      customElements.define(tagName, PyraminxPuzzleElement);
    }
  }

  static get observedAttributes(): string[] {
    return Object.values(PyraminxAttributeNames);
  }

  connectedCallback(): void {
    for (const attr of PyraminxPuzzleElement.observedAttributes) {
      if (this.hasAttribute(attr)) {
        this.attributeChangedCallback(attr, null, this.getAttribute(attr));
      }
    }
    this.init();
  }

  attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null): void {
    switch (name) {
      case PyraminxAttributeNames.animationSpeed:
        setPyraminxAnimationSpeed(this, newVal);
        if (this._pyraminx) {
          this._pyraminx.animationSpeedMs = this.animationSpeedMs;
        }
        break;
      case PyraminxAttributeNames.animationStyle:
        setPyraminxAnimationStyle(this, newVal);
        if (this._pyraminx) {
          this._pyraminx.animationStyle = this.animationStyle;
        }
        break;
      case PyraminxAttributeNames.cameraRadius:
        setPyraminxCameraRadius(this, newVal);
        if (oldVal !== newVal && oldVal !== null) {
          this.animateCameraRadius();
        }
        break;
      case PyraminxAttributeNames.cameraFieldOfView:
        setPyraminxCameraFieldOfView(this, newVal);
        if (oldVal !== newVal && oldVal !== null) {
          this.updateCameraFOV();
        }
        break;
      case PyraminxAttributeNames.cameraPeekAngleHorizontal:
        setPyraminxCameraPeekAngleHorizontal(this, newVal);
        if (oldVal !== newVal && oldVal !== null) {
          this.animateCameraSetting();
        }
        break;
      case PyraminxAttributeNames.cameraPeekAngleVertical:
        setPyraminxCameraPeekAngleVertical(this, newVal);
        if (oldVal !== newVal && oldVal !== null) {
          this.animateCameraSetting();
        }
        break;
      case PyraminxAttributeNames.cameraSpeed:
        setPyraminxCameraSpeed(this, newVal);
        break;
      case PyraminxAttributeNames.maxDevicePixelRatio:
        setPyraminxMaxDevicePixelRatio(this, newVal);
        this._updatePixelRatio?.();
        this._renderOnce?.();
        break;
      case PyraminxAttributeNames.antialias:
        setPyraminxAntialias(this, newVal);
        if (oldVal !== newVal && oldVal !== null) {
          this.rebuildPreservingState();
        }
    }
  }

  animateCameraSetting(): void {
    this.dispatchEvent(new CustomEvent(InternalEvents.cameraSettingsChanged));
  }

  animateCameraRadius(): void {
    this.dispatchEvent(new CustomEvent(InternalEvents.cameraRadiusChanged));
  }

  updateCameraFOV(): void {
    this.dispatchEvent(new CustomEvent(InternalEvents.cameraFieldOfViewChanged));
  }

  move(move: PyraminxMove, options: PyraminxAnimationOptions = {}): Promise<string> {
    if (this._pyraminx == null) {
      return Promise.reject(new Error(notInitialisedMessage));
    }

    const stopRendering = this._startRenderLoop?.();
    return this._pyraminx.move(move, options).finally(() => {
      stopRendering?.();
      this._renderOnce?.();
    });
  }

  do(actions: readonly PyraminxMove[] | string, options: PyraminxAnimationOptions = {}): Promise<string> {
    if (this._pyraminx == null) {
      return Promise.reject(new Error(notInitialisedMessage));
    }

    const stopRendering = this._startRenderLoop?.();
    return this._pyraminx.do(actions, options).finally(() => {
      stopRendering?.();
      this._renderOnce?.();
    });
  }

  reset(): string {
    if (this._pyraminx == null) {
      throw new Error(notInitialisedMessage);
    }

    const state = this._pyraminx.reset();
    this._renderOnce?.();
    return state;
  }

  setState(state: string): boolean {
    if (this._pyraminx == null) {
      throw new Error(notInitialisedMessage);
    }

    const updated = this._pyraminx.setState(state);
    this._renderOnce?.();
    return updated;
  }

  getState(): string {
    if (this._pyraminx == null) {
      throw new Error(notInitialisedMessage);
    }

    return this._pyraminx.getState();
  }

  disconnectedCallback(): void {
    this._cleanup?.();
    this._cleanup = null;
    this._renderOnce = null;
    this._startRenderLoop = null;
    this._updatePixelRatio = null;
    this._pyraminx = null;
  }

  private rebuildPreservingState(): void {
    if (this._pyraminx == null) {
      return;
    }

    const state = this._pyraminx.getState();
    this.init();
    this.setState(state);
  }

  private init(): void {
    this._cleanup?.();
    const canvas = this.canvas.cloneNode(false) as HTMLCanvasElement;
    this.canvas.replaceWith(canvas);
    this.canvas = canvas;
    const pyraminx = new Pyraminx3D({
      animationSpeedMs: this.animationSpeedMs,
      animationStyle: this.animationStyle,
    });
    this._pyraminx = pyraminx;

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

    const cameraState = new CameraState();
    const getTargetCameraSpherical = (): Spherical => {
      const phi =
        polarAngleOffset +
        (cameraState.Up ? -this.cameraPeekAngleVertical : this.cameraPeekAngleVertical) * maxPolarAngle;
      const theta =
        (cameraState.Right ? this.cameraPeekAngleHorizontal : -this.cameraPeekAngleHorizontal) * maxAzimuthAngle;
      return new Spherical(this.cameraRadius, phi, theta);
    };
    const camera = new PerspectiveCamera(this.cameraFieldOfView, this.clientWidth / this.clientHeight, 1, 2000);
    const cameraSpherical = getTargetCameraSpherical();
    camera.position.setFromSpherical(cameraSpherical);
    camera.lookAt(0, 0, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.enableDamping = true;

    const ambientLight = new AmbientLight('white', 0.5);
    const keyLight = new DirectionalLight('white', 2);
    const fillLight = new DirectionalLight('white', 1.4);
    keyLight.position.set(4, 5, 6);
    fillLight.position.set(-5, -3, -4);
    scene.add(ambientLight, keyLight, fillLight, pyraminx);

    let isDisposed = false;
    let renderFrameId = 0;
    let loopFrameId = 0;
    let activeRenderLoops = 0;
    let activeControlRenderLoops = 0;
    let stopControlsRenderLoop: (() => void) | null = null;
    let controlsSettling = false;
    let stableControlFrames = 0;
    const stableControlFrameThreshold = 3;

    const renderScene = () => {
      renderer.render(scene, camera);
      if (this.hasAttribute('render-events')) {
        this.dispatchEvent(new CustomEvent(renderEventName));
      }
    };

    const renderWithControls = () => {
      const controlsChanged = controls.update();
      renderScene();
      return controlsChanged;
    };

    const requestRender = () => {
      if (isDisposed || renderFrameId !== 0 || loopFrameId !== 0) {
        return;
      }
      renderFrameId = requestAnimationFrame(() => {
        renderFrameId = 0;
        renderScene();
      });
    };

    const startRenderLoop = (updateControls = false): (() => void) => {
      activeRenderLoops++;
      if (updateControls) {
        activeControlRenderLoops++;
      }
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

    this._renderOnce = requestRender;
    this._startRenderLoop = startRenderLoop;
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

    const updateCameraPosition = (
      targetSpherical: Spherical,
      cameraSpeedMs: number,
      ease: gsap.EaseString | gsap.EaseFunction | undefined,
    ): void => {
      const startSpherical = new Spherical().setFromVector3(camera.position);
      const stopRendering = startRenderLoop(false);
      gsap.to(startSpherical, {
        duration: cameraSpeedMs / 1000,
        ease,
        overwrite: false,
        phi: targetSpherical.phi,
        radius: targetSpherical.radius,
        theta: targetSpherical.theta,
        onComplete: () => {
          stopRendering();
        },
        onUpdate: () => {
          camera.position.setFromSpherical(startSpherical);
          camera.lookAt(pyraminx.position);
          controls.update();
        },
      });
    };

    const onCameraSettingsChanged = () => {
      updateCameraPosition(getTargetCameraSpherical(), this.cameraSpeedMs, 'none');
    };

    const onCameraRadiusChanged = () => {
      const targetSpherical = new Spherical().setFromVector3(camera.position);
      targetSpherical.radius = this.cameraRadius;
      updateCameraPosition(targetSpherical, this.cameraSpeedMs, 'none');
    };

    const onCameraFieldOfViewChanged = () => {
      camera.fov = this.cameraFieldOfView;
      camera.updateProjectionMatrix();
      requestRender();
    };

    this.addEventListener(InternalEvents.cameraSettingsChanged, onCameraSettingsChanged);
    this.addEventListener(InternalEvents.cameraRadiusChanged, onCameraRadiusChanged);
    this.addEventListener(InternalEvents.cameraFieldOfViewChanged, onCameraFieldOfViewChanged);

    this._cleanup = () => {
      isDisposed = true;
      if (renderFrameId !== 0) {
        cancelAnimationFrame(renderFrameId);
      }
      if (loopFrameId !== 0) {
        cancelAnimationFrame(loopFrameId);
      }
      resizeObserver.disconnect();
      controls.removeEventListener('start', onControlsStart);
      controls.removeEventListener('change', requestRender);
      controls.removeEventListener('end', onControlsEnd);
      this.removeEventListener(InternalEvents.cameraSettingsChanged, onCameraSettingsChanged);
      this.removeEventListener(InternalEvents.cameraRadiusChanged, onCameraRadiusChanged);
      this.removeEventListener(InternalEvents.cameraFieldOfViewChanged, onCameraFieldOfViewChanged);
      controls.dispose();
      renderer.dispose();
    };
  }
}
