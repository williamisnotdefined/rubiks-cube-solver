// @ts-check
import { CubeTypes, Faces } from '../core';
/** @import {Face, CubeType} from '../core' */
/** @import {vector} from './rubiksCubeState' */

/**
 * @typedef StickerState
 * @property {Face[][]} Face.U
 * @property {Face[][]} Face.D
 * @property {Face[][]} Face.F
 * @property {Face[][]} Face.B
 * @property {Face[][]} Face.L
 * @property {Face[][]} Face.R
 **/

const ERROR_MARGIN = 0.0001;
const LayerCount = {
    [CubeTypes.Two]: 2,
    [CubeTypes.Three]: 3,
    [CubeTypes.Four]: 4,
    [CubeTypes.Five]: 5,
    [CubeTypes.Six]: 6,
    [CubeTypes.Seven]: 7,
};

/**
 * @param {vector} stickerDirection
 * @param {vector} piecePosition
 * @param {number[]} layers
 * @returns {{face: Face, i: number, j: number}}
 */
export function getStickerFaceIndex(stickerDirection, piecePosition, layers) {
    const last = layers.length - 1;
    /** @type {(val: number) => number} */
    const layerIndex = (val) => {
        for (let i = 0; i < layers.length; i++) {
            if (Math.abs(val - layers[i]) < ERROR_MARGIN) {
                return i;
            }
        }
        throw new Error(`Failed to get layer number. position ${val} not found in layers ${layers}`);
    };
    if (stickerDirection.x === 1) return { face: Faces.R, i: last - layerIndex(piecePosition.y), j: last - layerIndex(piecePosition.z) };
    if (stickerDirection.x === -1) return { face: Faces.L, i: last - layerIndex(piecePosition.y), j: layerIndex(piecePosition.z) };
    if (stickerDirection.y === 1) return { face: Faces.U, i: layerIndex(piecePosition.z), j: layerIndex(piecePosition.x) };
    if (stickerDirection.y === -1) return { face: Faces.D, i: last - layerIndex(piecePosition.z), j: layerIndex(piecePosition.x) };
    if (stickerDirection.z === 1) return { face: Faces.F, i: last - layerIndex(piecePosition.y), j: layerIndex(piecePosition.x) };
    if (stickerDirection.z === -1) return { face: Faces.B, i: last - layerIndex(piecePosition.y), j: last - layerIndex(piecePosition.x) };
    throw new Error(`StickerDirection is not a standard unit vector. vector: ${stickerDirection}`);
}

/**
 *
 * @param {CubeType} cubeType
 * @return {StickerState}
 */
export const defaultStickerState = (cubeType) => {
    const n = LayerCount[cubeType];
    if (n == null) {
        throw new Error(`Invalid CubeType`);
    }
    return initialStickerState(n);
};

/**
 *
 * @param {number} layerCount
 * @returns {StickerState}
 */
const initialStickerState = (layerCount) => {
    const state = {
        [Faces.R]: Array.from({ length: layerCount }, () => Array.from({ length: layerCount }, () => Faces.R)),
        [Faces.U]: Array.from({ length: layerCount }, () => Array.from({ length: layerCount }, () => Faces.U)),
        [Faces.F]: Array.from({ length: layerCount }, () => Array.from({ length: layerCount }, () => Faces.F)),
        [Faces.B]: Array.from({ length: layerCount }, () => Array.from({ length: layerCount }, () => Faces.B)),
        [Faces.D]: Array.from({ length: layerCount }, () => Array.from({ length: layerCount }, () => Faces.D)),
        [Faces.L]: Array.from({ length: layerCount }, () => Array.from({ length: layerCount }, () => Faces.L)),
    };
    return state;
};

/**
 *
 * @param {CubeType} cubeType
 * @return {StickerState}
 */
export const getEmptyStickerState = (cubeType) => {
    const n = LayerCount[cubeType];
    if (n == null) {
        throw new Error(`Invalid CubeType`);
    }
    return emptyStickerState(n);
};
/**
 *
 * @param {number} layerCount
 * @returns {StickerState}
 */
const emptyStickerState = (layerCount) => {
    const state = {
        [Faces.R]: Array.from({ length: layerCount }, () => []),
        [Faces.U]: Array.from({ length: layerCount }, () => []),
        [Faces.F]: Array.from({ length: layerCount }, () => []),
        [Faces.B]: Array.from({ length: layerCount }, () => []),
        [Faces.D]: Array.from({ length: layerCount }, () => []),
        [Faces.L]: Array.from({ length: layerCount }, () => []),
    };
    return state;
};

/**
 * @param {StickerState} stickerState
 * @returns {string}
 */
export function toKociemba(stickerState) {
    return `${stickerState.U.flat().join('')}${stickerState.R.flat().join('')}${stickerState.F.flat().join('')}${stickerState.D.flat().join('')}${stickerState.L.flat().join('')}${stickerState.B.flat().join('')}`;
}

/**
 * @param {string} kociembaString
 * @returns {StickerState | undefined} stickerState
 */
export function fromKociemba(kociembaString) {
    switch (kociembaString.length) {
        case 6 * 2 * 2:
            return fromKociembaWithLayerCount(kociembaString, 2);
        case 6 * 3 * 3:
            return fromKociembaWithLayerCount(kociembaString, 3);
        case 6 * 4 * 4:
            return fromKociembaWithLayerCount(kociembaString, 4);
        case 6 * 5 * 5:
            return fromKociembaWithLayerCount(kociembaString, 5);
        case 6 * 6 * 6:
            return fromKociembaWithLayerCount(kociembaString, 6);
        case 6 * 7 * 7:
            return fromKociembaWithLayerCount(kociembaString, 7);
        default:
            console.error(`Invalid state string length.`);
            return;
    }
}

/**
 * @param {string} kociembaString
 * @param {number} layerCount
 * @returns {StickerState | undefined } stickerState
 */
function fromKociembaWithLayerCount(kociembaString, layerCount) {
    let stickerState = emptyStickerState(layerCount);
    for (let i = 0; i < 6; i++) {
        const faceString = kociembaString.slice(i * layerCount ** 2, (i + 1) * layerCount ** 2);
        for (let j = 0; j < layerCount; j++) {
            const rowString = faceString.slice(j * layerCount, (j + 1) * layerCount);
            for (let k = 0; k < layerCount; k++) {
                const face = Object.values(Faces).find((face) => rowString[k] === face);
                if (!face) {
                    return undefined;
                }
                switch (i) {
                    case 0:
                        stickerState.U[j][k] = face;
                        break;
                    case 1:
                        stickerState.R[j][k] = face;
                        break;
                    case 2:
                        stickerState.F[j][k] = face;
                        break;
                    case 3:
                        stickerState.D[j][k] = face;
                        break;
                    case 4:
                        stickerState.L[j][k] = face;
                        break;
                    case 5:
                        stickerState.B[j][k] = face;
                        break;
                    default:
                        throw new Error(`Invalid value for i - [${i}]. i should be between [0,5] inclusive.`);
                }
            }
        }
    }
    return stickerState;
}
