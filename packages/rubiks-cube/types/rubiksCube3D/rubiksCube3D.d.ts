/**
 * @implements {RubiksCubeViewInterface}
 */
export default class RubiksCube3D extends Object3D<import("three").Object3DEventMap> implements RubiksCubeViewInterface {
    /**
     * @public
     * @param {RubiksCube3DSettings} cubeSettings
     */
    constructor(cubeSettings: RubiksCube3DSettings);
    /** @type {RubiksCube3DSettings} */
    _cubeSettings: RubiksCube3DSettings;
    /** @type {number} */
    _pieceGap: number;
    /** @type {CubeType} */
    _cubeType: CubeType;
    /** @type {CubeConfig} */
    _cubeConfig: CubeConfig;
    /** @type {Group} */
    _mainGroup: Group;
    /** @type {Group} */
    _animationGroup: Group;
    /** @type {GSAPAnimation | undefined} */
    _currentAnimation: GSAPAnimation | undefined;
    /**
     * Creates the main group containing all the pieces of the cube in their default position and rotation. Should only be called once during initialization.
     * @private
     **/
    private createCubeGroup;
    /**
     * @param {Group} group
     * @returns {(CornerPiece | EdgePiece | CenterPiece)[]}
     */
    _getPieces(group?: Group): (CornerPiece | EdgePiece | CenterPiece)[];
    /**
     * Returns the sticker state of the cube. Can only be called when an Animation is not in progress as not all pieces would be in the main group.
     * @returns {StickerState}
     */
    getStickerState(): StickerState;
    /**
     * Sets the sticker state of the cube. Can only be called when an Animation is not in progress as not all pieces would be in the main group.
     * @private
     * @param {StickerState} stickerState
     */
    private setStickerState;
    /**
     *
     * @param {string} logo
     */
    addLogo(logo: string): void;
    /**
     * Returns the pieces that should be rotated for a given slice. If the slice has no layers, all pieces will be returned. Should only be called before an Animation is started.
     * @private
     * @param {Slice} slice
     * @returns {Object3D[]}
     */
    private getRotationLayer;
    /**
     * Updates the gap of the pieces. To be used when the cube is not rotating
     * @private
     * @param {number} pieceGap
     * @returns {void}
     */
    private updateGap;
    /**
     * Adds pieces in the rotationGroup back into the main group.
     * Updates the position and rotation of the pieces according to their world position and rotation, then resets the rotation of the rotation group.
     * Should only be called when a rotation is in progress.
     * @private
     * @returns {void}
     */
    private clearAnimationGroup;
    /**
     * @private
     * @param {Slice} slice
     */
    private fillAnimationGroup;
    /**
     * @public
     * @param {number} animationSpeedMs
     */
    public setCurrentAnimationSpeed(animationSpeedMs: number): void;
    /**
     * @public
     */
    public reset(): void;
    /**
     * @public
     * @param {StickerState} stickerState
     */
    public setState(stickerState: StickerState): void;
    /**
     * sets the state of the cube
     * @public
     * @param {CubeType} cubeType
     * @returns {void}
     */
    public setType(cubeType: CubeType): void;
    /**
     * @public
     * @param {Slice} slice
     * @param {{animationSpeedMs: number?, ease: gsap.EaseString | gsap.EaseFunction | undefined}} [options]
     * @returns {Promise<void>}
     */
    public slice(slice: Slice, options?: {
        animationSpeedMs: number | null;
        ease: gsap.EaseString | gsap.EaseFunction | undefined;
    }): Promise<void>;
}
export type RubiksCubeViewInterface = _RubiksCubeViewInterface;
import { Object3D } from 'three';
import RubiksCube3DSettings from './cubeSettings';
import type { CubeType } from '../core';
import type { CubeConfig } from './cubeConfig';
import { Group } from 'three';
import { CornerPiece } from './cornerPiece';
import { EdgePiece } from './edgePiece';
import { CenterPiece } from './centerPiece';
import type { StickerState } from '../state/stickerState';
import type { Slice } from '../state/slice';
import type { RubiksCubeViewInterface as _RubiksCubeViewInterface } from '../rubiksCube/rubiksCubeController';
