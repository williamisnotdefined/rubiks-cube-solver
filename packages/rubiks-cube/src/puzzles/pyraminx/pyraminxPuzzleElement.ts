import { gsap } from 'gsap';
import { AmbientLight, DirectionalLight, PerspectiveCamera, Scene, Spherical, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { type AnimationStyle, AnimationStyles } from '../../shared/animation';
import { CameraState } from '../../shared/cameraState';
import { debounce } from '../../shared/debouncer';
import type { PyraminxAnimationOptions } from './pyraminx3D';
import { DEFAULT_PYRAMINX_ANIMATION_SPEED_MS, Pyraminx3D } from './pyraminx3D';
import type { PyraminxMove } from './types';

type RenderLoopStarter = (updateControls?: boolean) => () => void;

const notInitialisedMessage =
  'PyraminxPuzzleElement is not initialised - element must be connected to the DOM before calling this method.';
const renderEventName = 'pyraminx-render';
const defaultSettings = {
  animationSpeedMs: DEFAULT_PYRAMINX_ANIMATION_SPEED_MS,
  animationStyle: AnimationStyles.Linear,
  antialias: true,
  cameraFieldOfView: 75,
  cameraPeekAngleHorizontal: 0.6,
  cameraPeekAngleVertical: 0.6,
  cameraRadius: 5,
  cameraSpeedMs: 100,
  maxDevicePixelRatio: 2,
};
const maxAzimuthAngle = (5 * Math.PI) / 16;
const polarAngleOffset = Math.PI / 2;
const maxPolarAngle = (5 * Math.PI) / 16;
const minFieldOfView = 30;
const maxFieldOfView = 100;
const minCameraRadius = 4;
const minDevicePixelRatio = 0.25;
const maxDevicePixelRatio = 4;
const InternalEvents = Object.freeze({
  cameraFieldOfViewChanged: 'pyraminxCameraFieldOfViewChanged',
  cameraRadiusChanged: 'pyraminxCameraRadiusChanged',
  cameraSettingsChanged: 'pyraminxCameraSettingsChanged',
});

export const PyraminxAttributeNames = {
  animationSpeed: 'animation-speed-ms',
  animationStyle: 'animation-style',
  antialias: 'antialias',
  cameraFieldOfView: 'camera-field-of-view',
  cameraPeekAngleHorizontal: 'camera-peek-angle-horizontal',
  cameraPeekAngleVertical: 'camera-peek-angle-vertical',
  cameraRadius: 'camera-radius',
  cameraSpeed: 'camera-speed-ms',
  maxDevicePixelRatio: 'max-device-pixel-ratio',
} as const;

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
    this.animationSpeedMs = defaultSettings.animationSpeedMs;
    this.animationStyle = defaultSettings.animationStyle;
    this.antialias = defaultSettings.antialias;
    this.cameraFieldOfView = defaultSettings.cameraFieldOfView;
    this.cameraPeekAngleHorizontal = defaultSettings.cameraPeekAngleHorizontal;
    this.cameraPeekAngleVertical = defaultSettings.cameraPeekAngleVertical;
    this.cameraRadius = defaultSettings.cameraRadius;
    this.cameraSpeedMs = defaultSettings.cameraSpeedMs;
    this.maxDevicePixelRatio = defaultSettings.maxDevicePixelRatio;
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
        this.setAnimationSpeed(newVal);
        if (this._pyraminx) {
          this._pyraminx.animationSpeedMs = this.animationSpeedMs;
        }
        break;
      case PyraminxAttributeNames.animationStyle:
        this.setAnimationStyle(newVal);
        if (this._pyraminx) {
          this._pyraminx.animationStyle = this.animationStyle;
        }
        break;
      case PyraminxAttributeNames.cameraRadius:
        this.setCameraRadius(newVal);
        if (oldVal !== newVal && oldVal !== null) {
          this.animateCameraRadius();
        }
        break;
      case PyraminxAttributeNames.cameraFieldOfView:
        this.setCameraFieldOfView(newVal);
        if (oldVal !== newVal && oldVal !== null) {
          this.updateCameraFOV();
        }
        break;
      case PyraminxAttributeNames.cameraPeekAngleHorizontal:
        this.setCameraPeekAngleHorizontal(newVal);
        if (oldVal !== newVal && oldVal !== null) {
          this.animateCameraSetting();
        }
        break;
      case PyraminxAttributeNames.cameraPeekAngleVertical:
        this.setCameraPeekAngleVertical(newVal);
        if (oldVal !== newVal && oldVal !== null) {
          this.animateCameraSetting();
        }
        break;
      case PyraminxAttributeNames.cameraSpeed:
        this.setCameraSpeed(newVal);
        break;
      case PyraminxAttributeNames.maxDevicePixelRatio:
        this.setMaxDevicePixelRatio(newVal);
        this._updatePixelRatio?.();
        this._renderOnce?.();
        break;
      case PyraminxAttributeNames.antialias:
        this.setAntialias(newVal);
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

  private setAnimationSpeed(value: string | null): void {
    const speed = Number(value);
    if (speed >= 0 && value != null) {
      this.animationSpeedMs = speed;
      return;
    }
    console.warn(`Invalid Pyraminx animation speed value. Min is 0. Value is ${value}`);
  }

  private setAnimationStyle(value: unknown): void {
    if (value && Object.values(AnimationStyles).includes(value as AnimationStyle)) {
      this.animationStyle = value as AnimationStyle;
      return;
    }
    console.warn(
      `Invalid Pyraminx animation style value. Accepted Values are [${Object.values(AnimationStyles).join(', ')}] Value is ${value}`,
    );
  }

  private setCameraSpeed(value: string | null): void {
    const speed = Number(value);
    if (speed >= 0 && value != null) {
      this.cameraSpeedMs = speed;
      return;
    }
    console.warn(`Invalid Pyraminx camera speed value. Min is 0. Value is ${value}`);
  }

  private setCameraRadius(value: string | null): void {
    const radius = Number(value);
    if (radius >= minCameraRadius && value != null) {
      this.cameraRadius = radius;
      return;
    }
    console.warn(`Invalid Pyraminx camera radius value. Min is ${minCameraRadius}. Value is ${value}`);
  }

  private setCameraFieldOfView(value: string | null): void {
    const fov = Number(value);
    if (fov >= minFieldOfView && fov <= maxFieldOfView && value != null) {
      this.cameraFieldOfView = fov;
      return;
    }
    console.warn(
      `Invalid Pyraminx camera FOV value. Min is ${minFieldOfView} Max is ${maxFieldOfView}. Value is ${value}.`,
    );
  }

  private setCameraPeekAngleHorizontal(value: string | null): void {
    const angle = Number(value);
    if (angle >= 0 && angle <= 1 && value != null) {
      this.cameraPeekAngleHorizontal = angle;
      return;
    }
    console.warn(`Invalid Pyraminx camera peek angle horizontal value. Min is 0, Max is 1. Value is ${value}`);
  }

  private setCameraPeekAngleVertical(value: string | null): void {
    const angle = Number(value);
    if (angle >= 0 && angle <= 1 && value != null) {
      this.cameraPeekAngleVertical = angle;
      return;
    }
    console.warn(`Invalid Pyraminx camera peek angle vertical value. Min is 0, Max is 1. Value is ${value}`);
  }

  private setMaxDevicePixelRatio(value: string | null): void {
    if (value == null || value === '') {
      this.maxDevicePixelRatio = defaultSettings.maxDevicePixelRatio;
      return;
    }
    const ratio = Number(value);
    if (ratio >= minDevicePixelRatio && ratio <= maxDevicePixelRatio) {
      this.maxDevicePixelRatio = ratio;
      return;
    }
    console.warn(
      `Invalid Pyraminx max device pixel ratio value. Min is ${minDevicePixelRatio}, Max is ${maxDevicePixelRatio}. Value is ${value}`,
    );
  }

  private setAntialias(value: string | null): void {
    if (value == null) {
      this.antialias = defaultSettings.antialias;
      return;
    }
    const normalized = String(value).toLowerCase();
    if (['', 'true', '1', 'yes', 'on'].includes(normalized)) {
      this.antialias = true;
      return;
    }
    if (['false', '0', 'no', 'off'].includes(normalized)) {
      this.antialias = false;
      return;
    }
    console.warn(`Invalid Pyraminx antialias value. Accepted values are true/false. Value is ${value}`);
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
