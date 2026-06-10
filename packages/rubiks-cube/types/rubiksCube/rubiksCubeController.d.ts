export default class RubiksCubeController {
    /**
     * @param {CubeType} cubeType
     * @param {RubiksCubeViewInterface} view
     * */
    constructor(cubeType: CubeType, view: RubiksCubeViewInterface);
    state: RubiksCubeState;
    view: RubiksCubeViewInterface;
    /**
     * @param {Movement} movement
     * @param {AnimationOptions} [options]
     * @returns {Promise<string>}
     */
    movement(movement: Movement, options?: AnimationOptions): Promise<string>;
    /**
     * @param {Rotation} rotation
     * @param {AnimationOptions} [options]
     * @returns {Promise<string>}
     */
    rotation(rotation: Rotation, options?: AnimationOptions): Promise<string>;
    /**
     * @param {(Rotation | Movement)[]} actions
     * @param {AnimationOptions} [options]
     * @returns {string}
     */
    do(actions: (Rotation | Movement)[], options?: AnimationOptions): string;
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
}
export type AnimationOptions = {
    translate?: boolean;
    animationSpeedMs?: number;
    reverse?: boolean;
};
export type RubiksCubeViewInterface = {
    slice: (arg0: Slice, arg1: any | undefined) => Promise<void>;
    setState: (arg0: StickerState) => void;
    reset: () => void;
    setType: (arg0: CubeType) => void;
};
import { RubiksCubeState } from '../state';
import type { Movement } from '../core';
import type { Rotation } from '../core';
import type { CubeType } from '../core';
import type { Slice } from '../state/slice';
import type { StickerState } from '../state/stickerState';
