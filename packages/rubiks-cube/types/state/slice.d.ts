/**
 * A slice represents an action or movement of a 3D rubiks cube. layers
 * @typedef  Slice
 * @property {Axis} axis the axis that pieces rotate around
 * @property {number[]} layerIds starting from 0 to the size of the cube. Layers represent what layers are included in the movement.
 * @property {number} direction the direction and magnitude of the rotation
 **/
/**
 * @param {Movement} movement
 * @param {number} layerCount
 * @returns {Slice | undefined}
 */
export function GetMovementSlice(movement: Movement, layerCount: number): Slice | undefined;
/**
 * @param {Rotation} rotation
 * @param {number} layerCount
 * @returns {Slice | undefined}
 */
export function GetRotationSlice(rotation: Rotation, layerCount: number): Slice | undefined;
/** @import {Movement, Rotation} from '../core' */
/** @typedef {typeof Axi[keyof typeof Axi]} Axis */
export const Axi: Readonly<{
    x: "x";
    y: "y";
    z: "z";
}>;
/**
 * A slice represents an action or movement of a 3D rubiks cube. layers
 */
export type Slice = {
    /**
     * the axis that pieces rotate around
     */
    axis: Axis;
    /**
     * starting from 0 to the size of the cube. Layers represent what layers are included in the movement.
     */
    layerIds: number[];
    /**
     * the direction and magnitude of the rotation
     */
    direction: number;
};
export type Axis = (typeof Axi)[keyof typeof Axi];
import type { Movement } from '../core';
import type { Rotation } from '../core';
