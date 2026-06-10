export class RubiksCubeState {
    /**
     *
     * @param {CubeType} cubeType
     */
    constructor(cubeType: CubeType);
    cubeType: CubeType;
    /** @type {StickerState?} */
    stickerState: StickerState | null;
    /** @type {number[]} */
    layers: number[];
    /** @type {pieceState[]} */
    corners: pieceState[];
    /** @type {pieceState[]} */
    edges: pieceState[];
    /** @type {pieceState[]} */
    centers: pieceState[];
    reset(): void;
    /**
     * @param {StickerState} stickerState
     * @returns {void}
     */
    setState(stickerState: StickerState): void;
    /**
     * @return {StickerState}
     */
    getState(): StickerState;
    /**
     * @returns {string}
     */
    getKociemba(): string;
    /**
     * @param {string} kociembaString
     * @returns {boolean}
     */
    setKociemba(kociembaString: string): boolean;
    /**
     *
     * @param {Slice} slice
     */
    slice(slice: Slice): void;
    /**
     * @param {Movement} movement
     * @param {MoveOptions} [options]
     * @returns {Slice?}
     */
    move(movement: Movement, options?: MoveOptions): Slice | null;
    /**
     * @param {Rotation} rotation
     * @param {RotationOptions} [options]
     * @returns {Slice?}
     */
    rotate(rotation: Rotation, options?: RotationOptions): Slice | null;
    /**
     * @param {(Rotation | Movement)[]} actions
     * @param {MoveOptions | RotationOptions } [options]
     */
    do(actions: (Rotation | Movement)[], options?: MoveOptions | RotationOptions): void;
    /**
     * @private
     * @param {number} position
     * @returns {number}
     */
    private _getLayerNumber;
}
export function corners(layers: number[]): {
    position: vector;
    rotation: vector;
}[];
export function centers(layers: number[]): {
    position: vector;
    rotation: vector;
}[];
export function edges(layers: number[]): {
    position: vector;
    rotation: vector;
}[];
export type state = {
    corners: pieceState[];
    edges: pieceState[];
    centers: pieceState[];
};
export type pieceState = {
    position: vector;
    rotation: vector;
    stickers: {
        face: Face;
        direction: vector;
    }[];
};
export type vector = {
    x: number;
    y: number;
    z: number;
};
export type MoveOptions = {
    translate?: boolean | undefined;
    reverse?: boolean | undefined;
};
export type RotationOptions = {
    reverse?: boolean | undefined;
};
import type { CubeType } from '../core';
import type { StickerState } from './stickerState';
import type { Slice } from './slice';
import type { Movement } from '../core';
import type { Rotation } from '../core';
import type { Face } from '../core';
