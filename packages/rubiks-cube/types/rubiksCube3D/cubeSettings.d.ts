/** @import {CubeType} from '../core' */
/**
 * @typedef RubiksCube3DSettingsOptions
 * @property {CubeType} [cubeType]
 * @property {number} [pieceGap]
 * @property {number} [animationSpeedMs]
 * @property {gsap.EaseString | gsap.EaseFunction} [animationStyle]
 * @property {string | null} [logo]
 */
export default class RubiksCube3DSettings {
    /**
     * @param {RubiksCube3DSettingsOptions} [options]
     */
    constructor(options?: RubiksCube3DSettingsOptions);
    /** @type {CubeType} */
    cubeType: CubeType;
    /** @type {number} */
    pieceGap: number;
    /** @type {number} */
    animationSpeedMs: number;
    /** @type {gsap.EaseString | gsap.EaseFunction} */
    animationStyle: gsap.EaseString | gsap.EaseFunction;
    /** @type {string | null} */
    logo: string | null;
}
export type RubiksCube3DSettingsOptions = {
    cubeType?: CubeType;
    pieceGap?: number;
    animationSpeedMs?: number;
    animationStyle?: gsap.EaseString | gsap.EaseFunction;
    logo?: string | null;
};
import type { CubeType } from '../core';
