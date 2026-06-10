// @ts-check
import { CubeTypes } from '../core';
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
    constructor(options = {}) {
        /** @type {CubeType} */
        this.cubeType = options.cubeType ?? CubeTypes.Three;
        /** @type {number} */
        this.pieceGap = options.pieceGap ?? 1.04;
        /** @type {number} */
        this.animationSpeedMs = options.animationSpeedMs ?? 150;
        /** @type {gsap.EaseString | gsap.EaseFunction} */
        this.animationStyle = options.animationStyle ?? 'sine';
        /** @type {string | null} */
        this.logo = options.logo ?? null;
    }
}
