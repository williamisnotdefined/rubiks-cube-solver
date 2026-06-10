/**
 * @param {vector} stickerDirection
 * @param {vector} piecePosition
 * @param {number[]} layers
 * @returns {{face: Face, i: number, j: number}}
 */
export function getStickerFaceIndex(stickerDirection: vector, piecePosition: vector, layers: number[]): {
    face: Face;
    i: number;
    j: number;
};
/**
 * @param {StickerState} stickerState
 * @returns {string}
 */
export function toKociemba(stickerState: StickerState): string;
/**
 * @param {string} kociembaString
 * @returns {StickerState | undefined} stickerState
 */
export function fromKociemba(kociembaString: string): StickerState | undefined;
export function defaultStickerState(cubeType: CubeType): StickerState;
export function getEmptyStickerState(cubeType: CubeType): StickerState;
export type StickerState = {
    U: Face[][];
    D: Face[][];
    F: Face[][];
    B: Face[][];
    L: Face[][];
    R: Face[][];
};
import type { vector } from './rubiksCubeState';
import type { Face } from '../core';
import type { CubeType } from '../core';
