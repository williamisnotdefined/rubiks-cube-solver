/** @import {CubeType, Face} from '../core' */
/** @import {ColorRepresentation} from 'three' */
/**
 * @typedef CubeConfig
 * @property {number[]} layers
 * @property {number} pieceSize
 * @property {number} coreSize
 * @property {number} outerLayerMultiplier
 */
/**
 * @param {CubeType} cubeType
 * @return {CubeConfig}
 */
export function getCubeConfig(cubeType: CubeType): CubeConfig;
export namespace FaceColors {
    let B: string;
    let D: string;
    let F: string;
    let L: string;
    let R: string;
    let U: string;
}
export function ColorToFace(color: ColorRepresentation): Face;
export type CubeConfig = {
    layers: number[];
    pieceSize: number;
    coreSize: number;
    outerLayerMultiplier: number;
};
import type { CubeType } from '../core';
import type { ColorRepresentation } from 'three';
import type { Face } from '../core';
