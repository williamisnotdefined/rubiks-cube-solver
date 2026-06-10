// @ts-check
/// <reference path="./globals.ts" preserve="true" />
import { AmbientLight, DirectionalLight, PerspectiveCamera, Scene, Spherical, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import { debounce } from './debouncer';
import { gsap } from 'gsap';
import Settings from './settings';
import { CameraState } from './cameraState';
import { RubiksCubeController } from '../rubiksCube';
import RubiksCube3D from '../rubiksCube3D/rubiksCube3D';
import { AttributeNames, PeekActions } from './constants';

/** @import {Rotation, Movement, CubeType} from '../core' */
/** @import {PeekAction, PeekState, CameraOptions} from './constants' */
/** @import {AnimationOptions} from '../rubiksCube' */

const maxAzimuthAngle = (5 * Math.PI) / 16;
const polarAngleOffset = Math.PI / 2;
const maxPolarAngle = (5 * Math.PI) / 16;
const notInitialisedMessage = 'RubiksCubeElement is not initialised — element must be connected to the DOM before calling this method.';
const InternalEvents = Object.freeze({
    cameraRadiusChanged: 'cameraRadiusChanged',
    cameraSettingsChanged: 'cameraSettingsChanged',
    cameraFieldOfViewChanged: 'cameraFieldOfViewChanged',
    cameraPeek: 'cameraPeek',
    cameraPeekComplete: 'cameraPeekComplete',
});
const renderEventName = 'rubiks-cube-render';

export class RubiksCubeElement extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        const root = /** @type {ShadowRoot} */ (this.shadowRoot);
        root.innerHTML = `<canvas id="cube-canvas" style="display:block;"></canvas>`;
        /** @private @type {HTMLCanvasElement} */
        this.canvas = /** @type {HTMLCanvasElement} */ (root.getElementById('cube-canvas'));
        /** @private @type {Settings} */
        this.settings = new Settings();
        /** @private @type {RubiksCube3D?} */
        this._rubiksCube3D = null;
        /** @private @type {RubiksCubeController?} */
        this._rubiksCube = null;
        /** @private @type {(() => void) | null} */
        this._renderOnce = null;
        /** @private @type {((updateControls?: boolean) => () => void) | null} */
        this._startRenderLoop = null;
        /** @private @type {(() => void) | null} */
        this._updatePixelRatio = null;
        /** @private @type {(() => void) | null} */
        this._cleanup = null;
    }

    /**
     * @param {string} tagName the name of the tag to register the web component under
     */
    static register(tagName = 'rubiks-cube') {
        customElements.define(tagName, this);
    }

    static get observedAttributes() {
        return [
            AttributeNames.cubeType,
            AttributeNames.pieceGap,
            AttributeNames.animationSpeed,
            AttributeNames.animationStyle,
            AttributeNames.cameraSpeed,
            AttributeNames.cameraRadius,
            AttributeNames.cameraFieldOfView,
            AttributeNames.cameraPeekAngleHorizontal,
            AttributeNames.cameraPeekAngleVertical,
            AttributeNames.maxDevicePixelRatio,
            AttributeNames.antialias,
            AttributeNames.logo,
        ];
    }

    connectedCallback() {
        for (const attr of RubiksCubeElement.observedAttributes) {
            if (this.hasAttribute(attr)) {
                this.attributeChangedCallback(attr, null, this.getAttribute(attr));
            }
        }
        this.init();
    }

    /**
     * @param {string} name
     * @param {string?} oldVal
     * @param {string?} newVal
     *  */
    attributeChangedCallback(name, oldVal, newVal) {
        switch (name) {
            case AttributeNames.cubeType:
                this.settings.setCubeType(newVal);
                if (this._rubiksCube !== null) {
                    this._rebuild();
                }
                break;
            case AttributeNames.pieceGap:
                this.settings.setPieceGap(newVal);
                break;
            case AttributeNames.animationSpeed:
                this.settings.setAnimationSpeed(newVal);
                break;
            case AttributeNames.animationStyle:
                this.settings.setAnimationStyle(newVal);
                break;
            case AttributeNames.cameraSpeed:
                this.settings.setCameraSpeed(newVal);
                break;
            case AttributeNames.cameraRadius:
                this.settings.setCameraRadius(newVal);
                if (oldVal !== newVal && oldVal !== null) {
                    this.animateCameraRadius();
                }
                break;
            case AttributeNames.cameraFieldOfView:
                this.settings.setCameraFieldOfView(newVal);
                if (oldVal !== newVal && oldVal !== null) {
                    this.updateCameraFOV();
                }
                break;
            case AttributeNames.cameraPeekAngleHorizontal:
                this.settings.setCameraPeekAngleHorizontal(newVal);
                if (oldVal !== newVal && oldVal !== null) {
                    this.animateCameraSetting();
                }
                break;
            case AttributeNames.cameraPeekAngleVertical:
                this.settings.setCameraPeekAngleVertical(newVal);
                if (oldVal !== newVal && oldVal !== null) {
                    this.animateCameraSetting();
                }
                break;
            case AttributeNames.maxDevicePixelRatio:
                this.settings.setMaxDevicePixelRatio(newVal);
                this._updatePixelRatio?.();
                this._renderOnce?.();
                break;
            case AttributeNames.antialias: {
                this.settings.setAntialias(newVal);
                if (oldVal !== newVal && oldVal !== null && this._rubiksCube !== null) {
                    const state = this.getState();
                    this.init();
                    this.setState(state);
                }
                break;
            }
            case AttributeNames.logo:
                this.settings.setLogo(newVal);
        }
    }

    /** @private */
    animateCameraSetting() {
        this.dispatchEvent(new CustomEvent(InternalEvents.cameraSettingsChanged));
    }

    /** @private */
    animateCameraRadius() {
        this.dispatchEvent(new CustomEvent(InternalEvents.cameraRadiusChanged));
    }

    /** @private */
    updateCameraFOV() {
        this.dispatchEvent(new CustomEvent(InternalEvents.cameraFieldOfViewChanged));
    }

    /** @internal @typedef {{eventId: string, move: Movement, reason: string}} MovementFailedEventData */
    /**
     * @param {Movement} move
     * @param {AnimationOptions} [options]
     * @returns {Promise<string>}
     */
    move(move, options) {
        if (this._rubiksCube == null) {
            return Promise.reject(new Error(notInitialisedMessage));
        }
        const stopRendering = this._startRenderLoop?.(false);
        return this._rubiksCube.movement(move, options).finally(() => {
            stopRendering?.();
            this._renderOnce?.();
        });
    }

    /**
     * @param {Rotation} rotation
     * @param {AnimationOptions} [options]
     * @returns {Promise<string>}
     */
    rotate(rotation, options) {
        if (this._rubiksCube == null) {
            return Promise.reject(new Error(notInitialisedMessage));
        }
        const stopRendering = this._startRenderLoop?.(false);
        return this._rubiksCube.rotation(rotation, options).finally(() => {
            stopRendering?.();
            this._renderOnce?.();
        });
    }

    /**
     * @returns {string}
     */
    reset() {
        if (this._rubiksCube == null) {
            throw new Error(notInitialisedMessage);
        }
        const state = this._rubiksCube.reset();
        this._renderOnce?.();
        return state;
    }

    /**
     * @param {string} kociembaState
     * @returns {boolean}
     */
    setState(kociembaState) {
        if (this._rubiksCube == null) {
            throw new Error(notInitialisedMessage);
        }
        const updated = this._rubiksCube.setState(kociembaState);
        this._renderOnce?.();
        return updated;
    }

    /**
     * @returns {string}
     */
    getState() {
        if (this._rubiksCube == null) {
            throw new Error(notInitialisedMessage);
        }
        return this._rubiksCube.getState();
    }

    /**
     * @param {CubeType} cubeType
     * @returns {string}
     */
    setType(cubeType) {
        this.setAttribute(AttributeNames.cubeType, cubeType);
        this._renderOnce?.();
        return this.getState();
    }

    /**
     * @private
     **/
    _rebuild() {
        if (this._rubiksCube == null) {
            throw new Error(notInitialisedMessage);
        }
        const state = this._rubiksCube.setType(this.settings.rubiksCube3DSettings.cubeType);
        this._renderOnce?.();
        return state;
    }

    disconnectedCallback() {
        this._cleanup?.();
        this._cleanup = null;
        this._renderOnce = null;
        this._startRenderLoop = null;
        this._updatePixelRatio = null;
        this._rubiksCube = null;
        this._rubiksCube3D = null;
    }

    /** @internal @typedef {{eventId: string, action: PeekAction, options: CameraOptions?}} CameraPeekEventData */
    /** @internal @typedef {{eventId: string, peekState: PeekState }} CameraPeekCompleteEventData */
    /**
     * Animates the camera to a new "peek" position.
     *
     * The camera tracks two independent boolean axes (horizontal: Right/Left, vertical: Up/Down), giving four
     * reachable positions (the {@link PeekState}s). Each `PeekAction` operates on this state machine: actions like
     * `RightUp` set both axes; `Up`/`Right`/`Left`/`Down` set one axis and leave the other untouched;
     * `Horizontal`/`Vertical` toggle one axis relative to its current value. The result of a partial action
     * therefore depends on the current peek state.
     *
     * @param {PeekAction} action
     * @param {CameraOptions?} options
     * @returns {Promise<PeekState>}
     */
    peek(action, options = null) {
        if (this._rubiksCube3D == null) {
            return Promise.reject(new Error(notInitialisedMessage));
        }
        if (!Object.values(PeekActions).includes(action)) {
            return Promise.reject(new Error(`Invalid peek action: ${action}. Valid actions are ${Object.values(PeekActions).join(', ')}`));
        }
        /** @type {CameraPeekEventData} */
        const data = { eventId: crypto.randomUUID(), action, options };
        return new Promise((resolve) => {
            /** @param {CustomEvent<CameraPeekCompleteEventData> | Event} event */ const handler = (event) => {
                const customEvent = /** @type {CustomEvent<CameraPeekCompleteEventData>} */ (event);
                if (customEvent.detail.eventId === data.eventId) {
                    this.removeEventListener(InternalEvents.cameraPeekComplete, handler);
                    resolve(customEvent.detail.peekState);
                }
            };
            this.addEventListener(InternalEvents.cameraPeekComplete, handler);
            this.dispatchEvent(new CustomEvent(InternalEvents.cameraPeek, { detail: data }));
        });
    }

    /** @private */
    init() {
        this._cleanup?.();
        const canvas = /** @type {HTMLCanvasElement} */ (this.canvas.cloneNode(false));
        this.canvas.replaceWith(canvas);
        this.canvas = canvas;
        this._rubiksCube3D = new RubiksCube3D(this.settings.rubiksCube3DSettings);
        this._rubiksCube = new RubiksCubeController(this.settings.rubiksCube3DSettings.cubeType, this._rubiksCube3D);

        // defined core threejs objects
        const scene = new Scene();
        const renderer = new WebGLRenderer({
            alpha: true,
            canvas,
            antialias: this.settings.antialias,
        });
        renderer.setSize(this.clientWidth, this.clientHeight);
        const updatePixelRatio = () => {
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.settings.maxDevicePixelRatio));
        };
        this._updatePixelRatio = updatePixelRatio;
        updatePixelRatio();

        // add camera
        /**
         * @returns {Spherical}
         */
        const cameraState = new CameraState();
        const getTargetCameraSpherical = () => {
            const phi = polarAngleOffset + (cameraState.Up ? -this.settings.cameraPeekAngleVertical : this.settings.cameraPeekAngleVertical) * maxPolarAngle;
            const theta = (cameraState.Right ? this.settings.cameraPeekAngleHorizontal : -this.settings.cameraPeekAngleHorizontal) * maxAzimuthAngle;
            return new Spherical(this.settings.cameraRadius, phi, theta);
        };
        const camera = new PerspectiveCamera(this.settings.cameraFieldOfView, this.clientWidth / this.clientHeight, 1, 2000);
        const cameraSpherical = getTargetCameraSpherical();
        camera.position.setFromSpherical(cameraSpherical);

        // add orbit controls for camera
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableZoom = false;
        controls.enablePan = false;
        controls.enableDamping = true;

        // add lighting to scene
        const ambientLight = new AmbientLight('white', 0.4);
        const spotLight1 = new DirectionalLight('white', 2);
        const spotLight2 = new DirectionalLight('white', 2);
        const spotLight3 = new DirectionalLight('white', 2);
        const spotLight4 = new DirectionalLight('white', 2);
        spotLight1.position.set(5, 5, 5);
        spotLight2.position.set(-5, 5, 5);
        spotLight3.position.set(5, -5, 0);
        spotLight4.position.set(-10, -5, -5);
        scene.add(ambientLight, spotLight1, spotLight2, spotLight3, spotLight4);

        // create cube and add to scene
        const cube = this._rubiksCube3D;
        scene.add(cube);

        let isDisposed = false;
        let renderFrameId = 0;
        let loopFrameId = 0;
        let activeRenderLoops = 0;
        let activeControlRenderLoops = 0;
        let stopControlsRenderLoop = /** @type {(() => void) | null} */ (null);
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

        const startRenderLoop = (updateControls = false) => {
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
            if (controls.enableDamping) {
                controlsSettling = true;
                return;
            }
            controlsSettling = false;
            requestAnimationFrame(() => {
                stopControlsRenderLoop?.();
                stopControlsRenderLoop = null;
            });
        };
        controls.addEventListener('start', onControlsStart);
        controls.addEventListener('change', requestRender);
        controls.addEventListener('end', onControlsEnd);

        //update renderer and camera when container resizes. debouncing events to reduce frequency
        const resizeObserver = new ResizeObserver(
            debounce((/** @type {{ contentRect: { width: number; height: number; }; }[]} */ entries) => {
                const { width, height } = entries[0].contentRect;
                camera.aspect = width / height;
                camera.updateProjectionMatrix();
                renderer.setSize(width, height);
                requestRender();
            }, 30),
        );
        resizeObserver.observe(this);

        // Camera Events

        /**
         * @param {Spherical} targetSpherical
         * @param {number} cameraSpeedMs
         * @param {gsap.EaseString | gsap.EaseFunction | undefined} ease
         * @param { undefined | (() => void) } completedCallback
         */
        const updateCameraPosition = (targetSpherical, cameraSpeedMs, ease, completedCallback = undefined) => {
            const startSpherical = new Spherical().setFromVector3(camera.position);
            const stopRendering = startRenderLoop(false);
            gsap.to(startSpherical, {
                radius: targetSpherical.radius,
                theta: targetSpherical.theta,
                phi: targetSpherical.phi,
                duration: (cameraSpeedMs ? cameraSpeedMs : this.settings.cameraSpeedMs) / 1000,
                ease: ease,
                overwrite: false,
                onUpdate: () => {
                    camera.position.setFromSpherical(startSpherical);
                    camera.lookAt(cube.position);
                    controls.update();
                },
                onComplete: () => {
                    stopRendering();
                    completedCallback?.();
                },
            });
        };

        const onCameraPeek = (event) => {
            const customEvent = /** @type {CustomEvent<CameraPeekEventData>} */ (event);
            cameraState.peekCamera(customEvent.detail.action);
            /** @type {CameraPeekCompleteEventData} */
            const data = { eventId: customEvent.detail.eventId, peekState: cameraState.toPeekState() };
            const completedCallback = () => this.dispatchEvent(new CustomEvent(InternalEvents.cameraPeekComplete, { detail: data }));
            const targetSpherical = getTargetCameraSpherical();
            updateCameraPosition(targetSpherical, customEvent.detail.options?.cameraSpeedMs ?? this.settings.cameraSpeedMs, 'none', completedCallback);
        };

        const onCameraSettingsChanged = () => {
            const targetSpherical = getTargetCameraSpherical();
            updateCameraPosition(targetSpherical, this.settings.cameraSpeedMs, 'none');
        };

        const onCameraRadiusChanged = () => {
            const targetSpherical = new Spherical().setFromVector3(camera.position);
            targetSpherical.radius = this.settings.cameraRadius;
            updateCameraPosition(targetSpherical, this.settings.cameraSpeedMs, 'none');
        };

        const onCameraFieldOfViewChanged = () => {
            camera.fov = this.settings.cameraFieldOfView;
            camera.updateProjectionMatrix();
            requestRender();
        };

        this.addEventListener(InternalEvents.cameraPeek, onCameraPeek);
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
            this.removeEventListener(InternalEvents.cameraPeek, onCameraPeek);
            this.removeEventListener(InternalEvents.cameraSettingsChanged, onCameraSettingsChanged);
            this.removeEventListener(InternalEvents.cameraRadiusChanged, onCameraRadiusChanged);
            this.removeEventListener(InternalEvents.cameraFieldOfViewChanged, onCameraFieldOfViewChanged);
            controls.dispose();
            renderer.dispose();
        };
    }
}
