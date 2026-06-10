/// <reference path="globals.d.ts" preserve="true" />
export class RubiksCubeElement extends HTMLElement {
    /**
     * @param {string} tagName the name of the tag to register the web component under
     */
    static register(tagName?: string): void;
    static get observedAttributes(): ("cube-type" | "piece-gap" | "animation-speed-ms" | "animation-style" | "camera-speed-ms" | "camera-radius" | "camera-field-of-view" | "camera-peek-angle-horizontal" | "camera-peek-angle-vertical" | "max-device-pixel-ratio" | "antialias" | "logo")[];
    /** @private @type {HTMLCanvasElement} */
    private canvas;
    /** @private @type {Settings} */
    private settings;
    /** @private @type {RubiksCube3D?} */
    private _rubiksCube3D;
    /** @private @type {RubiksCubeController?} */
    private _rubiksCube;
    /** @private @type {(() => void) | null} */
    private _renderOnce;
    /** @private @type {((updateControls?: boolean) => () => void) | null} */
    private _startRenderLoop;
    /** @private @type {(() => void) | null} */
    private _updatePixelRatio;
    /** @private @type {(() => void) | null} */
    private _cleanup;
    connectedCallback(): void;
    /**
     * @param {string} name
     * @param {string?} oldVal
     * @param {string?} newVal
     *  */
    attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null): void;
    /** @private */
    private animateCameraSetting;
    /** @private */
    private animateCameraRadius;
    /** @private */
    private updateCameraFOV;
    /** @internal @typedef {{eventId: string, move: Movement, reason: string}} MovementFailedEventData */
    /**
     * @param {Movement} move
     * @param {AnimationOptions} [options]
     * @returns {Promise<string>}
     */
    move(move: Movement, options?: AnimationOptions): Promise<string>;
    /**
     * @param {Rotation} rotation
     * @param {AnimationOptions} [options]
     * @returns {Promise<string>}
     */
    rotate(rotation: Rotation, options?: AnimationOptions): Promise<string>;
    /**
     * @returns {string}
     */
    reset(): string;
    /**
     * @param {string} kociembaState
     * @returns {boolean}
     */
    setState(kociembaState: string): boolean;
    /**
     * @returns {string}
     */
    getState(): string;
    /**
     * @param {CubeType} cubeType
     * @returns {string}
     */
    setType(cubeType: CubeType): string;
    /**
     * @private
     **/
    private _rebuild;
    disconnectedCallback(): void;
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
    peek(action: PeekAction, options?: CameraOptions | null): Promise<PeekState>;
    /** @private */
    private init;
}
import type { Movement } from '../core';
import type { AnimationOptions } from '../rubiksCube';
import type { Rotation } from '../core';
import type { CubeType } from '../core';
import type { PeekAction } from './constants';
import type { CameraOptions } from './constants';
import type { PeekState } from './constants';
