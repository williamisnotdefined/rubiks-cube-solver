import { gsap } from 'gsap';
import { AmbientLight, DirectionalLight, PerspectiveCamera, Scene, Spherical, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { AnimationStyle } from '../../../shared/animation';
import { CameraState } from '../../../shared/cameraState';
import { debounce } from '../../../shared/debouncer';
import type { MegaminxMove } from '../core/types';
import type { MegaminxAnimationOptions, MegaminxVisualStyle } from '../three/megaminx3D';
import { Megaminx3D } from '../three/megaminx3D';
import {
  InternalEvents,
  MegaminxAttributeNames,
  maxAzimuthAngle,
  maxPolarAngle,
  notInitialisedMessage,
  polarAngleOffset,
  renderEventName,
} from './constants';
import {
  createDefaultMegaminxElementSettings,
  setMegaminxAnimationSpeed,
  setMegaminxAnimationStyle,
  setMegaminxAntialias,
  setMegaminxCameraFieldOfView,
  setMegaminxCameraPeekAngleHorizontal,
  setMegaminxCameraPeekAngleVertical,
  setMegaminxCameraRadius,
  setMegaminxCameraSpeed,
  setMegaminxMaxDevicePixelRatio,
  setMegaminxVisualStyle,
} from './settings';

type RenderLoopStarter = (updateControls?: boolean) => () => void;

export class MegaminxPuzzleElement extends HTMLElement {
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
  visualStyle: MegaminxVisualStyle;
  private _megaminx: Megaminx3D | null;
  private _renderOnce: (() => void) | null;
  private _startRenderLoop: RenderLoopStarter | null;
  private _updatePixelRatio: (() => void) | null;
  private _cleanup: (() => void) | null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    const root = this.shadowRoot as ShadowRoot;
    root.innerHTML = `<canvas id="megaminx-canvas" style="display:block;"></canvas>`;
    this.canvas = root.getElementById('megaminx-canvas') as HTMLCanvasElement;
    const settings = createDefaultMegaminxElementSettings();
    this.animationSpeedMs = settings.animationSpeedMs;
    this.animationStyle = settings.animationStyle;
    this.antialias = settings.antialias;
    this.cameraFieldOfView = settings.cameraFieldOfView;
    this.cameraPeekAngleHorizontal = settings.cameraPeekAngleHorizontal;
    this.cameraPeekAngleVertical = settings.cameraPeekAngleVertical;
    this.cameraRadius = settings.cameraRadius;
    this.cameraSpeedMs = settings.cameraSpeedMs;
    this.maxDevicePixelRatio = settings.maxDevicePixelRatio;
    this.visualStyle = settings.visualStyle;
    this._megaminx = null;
    this._renderOnce = null;
    this._startRenderLoop = null;
    this._updatePixelRatio = null;
    this._cleanup = null;
  }

  static register(tagName = 'megaminx-puzzle'): void {
    if (!customElements.get(tagName)) {
      customElements.define(tagName, MegaminxPuzzleElement);
    }
  }

  static get observedAttributes(): string[] {
    return Object.values(MegaminxAttributeNames);
  }

  connectedCallback(): void {
    for (const attr of MegaminxPuzzleElement.observedAttributes) {
      if (this.hasAttribute(attr)) {
        this.attributeChangedCallback(attr, null, this.getAttribute(attr));
      }
    }
    this.init();
  }

  attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null): void {
    switch (name) {
      case MegaminxAttributeNames.animationSpeed:
        setMegaminxAnimationSpeed(this, newVal);
        if (this._megaminx) {
          this._megaminx.animationSpeedMs = this.animationSpeedMs;
        }
        break;
      case MegaminxAttributeNames.animationStyle:
        setMegaminxAnimationStyle(this, newVal);
        if (this._megaminx) {
          this._megaminx.animationStyle = this.animationStyle;
        }
        break;
      case MegaminxAttributeNames.cameraRadius:
        setMegaminxCameraRadius(this, newVal);
        if (oldVal !== newVal && oldVal !== null) {
          this.animateCameraRadius();
        }
        break;
      case MegaminxAttributeNames.cameraFieldOfView:
        setMegaminxCameraFieldOfView(this, newVal);
        if (oldVal !== newVal && oldVal !== null) {
          this.updateCameraFOV();
        }
        break;
      case MegaminxAttributeNames.cameraPeekAngleHorizontal:
        setMegaminxCameraPeekAngleHorizontal(this, newVal);
        if (oldVal !== newVal && oldVal !== null) {
          this.animateCameraSetting();
        }
        break;
      case MegaminxAttributeNames.cameraPeekAngleVertical:
        setMegaminxCameraPeekAngleVertical(this, newVal);
        if (oldVal !== newVal && oldVal !== null) {
          this.animateCameraSetting();
        }
        break;
      case MegaminxAttributeNames.cameraSpeed:
        setMegaminxCameraSpeed(this, newVal);
        break;
      case MegaminxAttributeNames.maxDevicePixelRatio:
        setMegaminxMaxDevicePixelRatio(this, newVal);
        this._updatePixelRatio?.();
        this._renderOnce?.();
        break;
      case MegaminxAttributeNames.antialias:
        setMegaminxAntialias(this, newVal);
        if (oldVal !== newVal && oldVal !== null) {
          this.rebuildPreservingState();
        }
        break;
      case MegaminxAttributeNames.visualStyle:
        setMegaminxVisualStyle(this, newVal);
        this._megaminx?.setVisualStyle(this.visualStyle);
        this._renderOnce?.();
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

  move(move: MegaminxMove, options: MegaminxAnimationOptions = {}): Promise<string> {
    if (this._megaminx == null) {
      return Promise.reject(new Error(notInitialisedMessage));
    }

    const stopRendering = this._startRenderLoop?.();
    return this._megaminx.move(move, options).finally(() => {
      stopRendering?.();
      this._renderOnce?.();
    });
  }

  do(actions: readonly MegaminxMove[] | string, options: MegaminxAnimationOptions = {}): Promise<string> {
    if (this._megaminx == null) {
      return Promise.reject(new Error(notInitialisedMessage));
    }

    const stopRendering = this._startRenderLoop?.();
    return this._megaminx.do(actions, options).finally(() => {
      stopRendering?.();
      this._renderOnce?.();
    });
  }

  reset(): string {
    if (this._megaminx == null) {
      throw new Error(notInitialisedMessage);
    }

    const state = this._megaminx.reset();
    this._renderOnce?.();
    return state;
  }

  setState(state: string): boolean {
    if (this._megaminx == null) {
      throw new Error(notInitialisedMessage);
    }

    const updated = this._megaminx.setState(state);
    this._renderOnce?.();
    return updated;
  }

  getState(): string {
    if (this._megaminx == null) {
      throw new Error(notInitialisedMessage);
    }

    return this._megaminx.getState();
  }

  disconnectedCallback(): void {
    this._cleanup?.();
    this._cleanup = null;
    this._renderOnce = null;
    this._startRenderLoop = null;
    this._updatePixelRatio = null;
    this._megaminx = null;
  }

  private rebuildPreservingState(): void {
    if (this._megaminx == null) {
      return;
    }

    const state = this._megaminx.getState();
    this.init();
    this.setState(state);
  }

  private init(): void {
    this._cleanup?.();
    const canvas = this.canvas.cloneNode(false) as HTMLCanvasElement;
    this.canvas.replaceWith(canvas);
    this.canvas = canvas;
    const megaminx = new Megaminx3D({
      animationSpeedMs: this.animationSpeedMs,
      animationStyle: this.animationStyle,
      visualStyle: this.visualStyle,
    });
    this._megaminx = megaminx;

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
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.7;
    controls.minPolarAngle = Math.PI * 0.12;
    controls.maxPolarAngle = Math.PI * 0.88;

    const ambientLight = new AmbientLight('white', 0.5);
    const keyLight = new DirectionalLight('white', 2);
    const fillLight = new DirectionalLight('white', 1.4);
    keyLight.position.set(4, 5, 6);
    fillLight.position.set(-5, -3, -4);
    scene.add(ambientLight, keyLight, fillLight, megaminx);

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
      if (!controls.enableDamping) {
        controlsSettling = false;
        requestAnimationFrame(() => {
          stopControlsRenderLoop?.();
          stopControlsRenderLoop = null;
        });
        return;
      }
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
          camera.lookAt(megaminx.position);
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
