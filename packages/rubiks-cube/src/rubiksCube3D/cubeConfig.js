// @ts-check
import { CubeTypes, Faces } from '../core';
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
export function getCubeConfig(cubeType) {
    switch (cubeType) {
        case CubeTypes.Two:
            return {
                layers: [-1, 1],
                pieceSize: 2,
                coreSize: 1.7,
                outerLayerMultiplier: 1,
            };
            break;
        case CubeTypes.Three:
            return {
                layers: [-1, 0, 1],
                pieceSize: 1,
                coreSize: 1.32,
                outerLayerMultiplier: 1,
            };
        case CubeTypes.Four:
            return {
                layers: [-1, -1 / 3, 1 / 3, 1],
                pieceSize: 2 / 3,
                coreSize: 1.25,
                outerLayerMultiplier: 1.1,
            };
        case CubeTypes.Five:
            return {
                layers: [-1, -1 / 2, 0, 1 / 2, 1],
                pieceSize: 1 / 2,
                coreSize: 1.2,
                outerLayerMultiplier: 1.2,
            };
        case CubeTypes.Six:
            return {
                layers: [-1, -3 / 5, -1 / 5, 1 / 5, 3 / 5, 1],
                pieceSize: 2 / 5,
                coreSize: 1.18,
                outerLayerMultiplier: 1.3,
            };
        case CubeTypes.Seven:
            return {
                layers: [-1, -2 / 3, -1 / 3, 0, 1 / 3, 2 / 3, 1],
                pieceSize: 1 / 3,
                coreSize: 1.16,
                outerLayerMultiplier: 1.35,
            };
        default:
            throw new Error(`Unsupported cube type: ${cubeType}`);
    }
}

export const FaceColors = {
    [Faces.B]: 'blue',
    [Faces.D]: 'yellow',
    [Faces.F]: '#2cbf13',
    [Faces.L]: '#fc9a05',
    [Faces.R]: 'red',
    [Faces.U]: 'white',
};

/**
 * @param {ColorRepresentation} color
 * @return {Face}
 * */
export const ColorToFace = (color) => {
    const face = Object.values(Faces).find((face) => FaceColors[face] === color);
    if (!face) {
        throw new Error(`Invalid color: ${color}`);
    }
    return face;
};
