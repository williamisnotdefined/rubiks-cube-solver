/// @ts-check
import { Euler, Quaternion, Vector3 } from 'three';
import { CubeTypes, Faces, isMovement, IsRotation, Movements, reverse, translate } from '../core';
import { Axi, GetMovementSlice, GetRotationSlice } from './slice';
import { defaultStickerState, fromKociemba, getEmptyStickerState, getStickerFaceIndex, toKociemba } from './stickerState';
/** @import {StickerState} from './stickerState' */
/** @import {Rotation, CubeType, Movement, Face} from '../core' */
/** @import {Slice} from './slice' */

/**
 *  @typedef {{corners: pieceState[], edges: pieceState[], centers: pieceState[]}} state
 */

/**
 * @typedef {{position: vector, rotation: vector, stickers: {face: Face, direction: vector}[]}} pieceState
 */

/**
 * @typedef {{x: number,y: number,z: number}} vector
 */

/**
 *  @typedef {{translate?: boolean | undefined, reverse?: boolean | undefined}} MoveOptions
 */

/**
 *  @typedef {{reverse?: boolean | undefined}} RotationOptions
 */

const Layers = {
    [CubeTypes.Two]: [-1, 1],
    [CubeTypes.Three]: [-1, 0, 1],
    [CubeTypes.Four]: [-2, -1, 1, 2],
    [CubeTypes.Five]: [-2, -1, 0, 1, 2],
    [CubeTypes.Six]: [-3, -2, -1, 1, 2, 3],
    [CubeTypes.Seven]: [-3, -2, -1, 0, 1, 2, 3],
};

const ERROR_MARGIN = 0.0001;
export class RubiksCubeState {
    /**
     *
     * @param {CubeType} cubeType
     */
    constructor(cubeType) {
        this.cubeType = cubeType;
        /** @type {StickerState?} */
        this.stickerState = null;
        /** @type {number[]} */
        this.layers = Layers[cubeType];
        /** @type {pieceState[]} */
        this.corners = corners(this.layers).map((corner) => {
            return {
                position: corner.position,
                rotation: corner.rotation,
                stickers: [
                    { face: Faces.U, direction: { x: 0, y: 0, z: 1 } },
                    { face: Faces.U, direction: { x: 0, y: 1, z: 0 } },
                    { face: Faces.U, direction: { x: 1, y: 0, z: 0 } },
                ],
            };
        });
        /** @type {pieceState[]} */
        this.edges = edges(this.layers).map((edge) => {
            return {
                position: edge.position,
                rotation: edge.rotation,
                stickers: [
                    { face: Faces.U, direction: { x: 0, y: 0, z: 1 } },
                    { face: Faces.U, direction: { x: 0, y: 1, z: 0 } },
                ],
            };
        });
        /** @type {pieceState[]} */
        this.centers = centers(this.layers).map((center) => {
            return {
                position: center.position,
                rotation: center.rotation,
                stickers: [{ face: Faces.U, direction: { x: 0, y: 0, z: 1 } }],
            };
        });
        /** @type {StickerState?} */
        this.stickerState = null;
        this.setState(defaultStickerState(cubeType));
    }

    reset() {
        this.stickerState = null;
        this.setState(defaultStickerState(this.cubeType));
    }

    /**
     * @param {StickerState} stickerState
     * @returns {void}
     */
    setState(stickerState) {
        this.stickerState = stickerState;
        [...this.corners, ...this.edges, ...this.centers].forEach((piece) => {
            piece.stickers.forEach((sticker) => {
                const stickerPosition = new Vector3(sticker.direction.x, sticker.direction.y, sticker.direction.z);
                stickerPosition.applyEuler(new Euler(piece.rotation.x, piece.rotation.y, piece.rotation.z));
                stickerPosition.round();
                const { face, i, j } = getStickerFaceIndex(stickerPosition, piece.position, this.layers);
                sticker.face = stickerState[face][i][j];
            });
        });
    }

    /**
     * @return {StickerState}
     */
    getState() {
        if (this.stickerState) {
            return this.stickerState;
        }
        const stickerState = getEmptyStickerState(this.cubeType);
        [...this.corners, ...this.edges, ...this.centers].forEach((piece) => {
            piece.stickers.forEach((sticker) => {
                const stickerPosition = new Vector3(sticker.direction.x, sticker.direction.y, sticker.direction.z);
                stickerPosition.applyEuler(new Euler(piece.rotation.x, piece.rotation.y, piece.rotation.z));
                stickerPosition.round();
                const { face, i, j } = getStickerFaceIndex(stickerPosition, piece.position, this.layers);
                stickerState[face][i][j] = sticker.face;
            });
        });
        this.stickerState = stickerState;
        return this.stickerState;
    }

    /**
     * @returns {string}
     */
    getKociemba() {
        return toKociemba(this.getState());
    }

    /**
     * @param {string} kociembaString
     * @returns {boolean}
     */
    setKociemba(kociembaString) {
        const stickerState = fromKociemba(kociembaString);
        if (stickerState == null) {
            return false;
        }
        this.setState(stickerState);
        return true;
    }

    /**
     *
     * @param {Slice} slice
     */
    slice(slice) {
        [...this.corners, ...this.edges, ...this.centers]
            .filter((piece) => {
                switch (slice.axis) {
                    case Axi.x:
                        return slice.layerIds.map((id) => this.layers[id]).some((layer) => Math.abs(layer - piece.position.x) < ERROR_MARGIN);
                    case Axi.y:
                        return slice.layerIds.map((id) => this.layers[id]).some((layer) => Math.abs(layer - piece.position.y) < ERROR_MARGIN);
                    case Axi.z:
                        return slice.layerIds.map((id) => this.layers[id]).some((layer) => Math.abs(layer - piece.position.z) < ERROR_MARGIN);
                }
            })
            .forEach((piece) => {
                const position = new Vector3(piece.position.x, piece.position.y, piece.position.z);
                const rotation = new Quaternion().setFromEuler(new Euler(piece.rotation.x, piece.rotation.y, piece.rotation.z));
                const rotationAxis = new Vector3(
                    slice.axis === Axi.x ? slice.direction : 0,
                    slice.axis === Axi.y ? slice.direction : 0,
                    slice.axis === Axi.z ? slice.direction : 0,
                ).normalize();

                const angle = (Math.abs(slice.direction) * Math.PI) / 2;

                // Apply rotation
                const rotationQuat = new Quaternion();
                rotationQuat.setFromAxisAngle(rotationAxis, angle);
                position.applyQuaternion(rotationQuat);
                rotation.premultiply(rotationQuat);

                // Update piece position
                piece.position.x = this.layers[this._getLayerNumber(position.x)];
                piece.position.y = this.layers[this._getLayerNumber(position.y)];
                piece.position.z = this.layers[this._getLayerNumber(position.z)];

                // Update rotation using quaternion multiplication
                const newRotation = new Euler().setFromQuaternion(rotation);
                piece.rotation.x = newRotation.x;
                piece.rotation.y = newRotation.y;
                piece.rotation.z = newRotation.z;
            });
        this.stickerState = null;
    }

    /**
     * @param {Movement} movement
     * @param {MoveOptions} [options]
     * @returns {Slice?}
     */
    move(movement, options) {
        let action = movement;
        if (options?.reverse) {
            action = reverse(movement);
        }
        if (options?.translate) {
            action = translate(movement, this.cubeType);
        }
        const slice = GetMovementSlice(movement, this.layers.length);
        if (slice == null) {
            console.error(`Failed to get movement slice. Invalid movement: [${movement}]`);
            return null;
        }
        this.slice(slice);
        return slice;
    }

    /**
     * @param {Rotation} rotation
     * @param {RotationOptions} [options]
     * @returns {Slice?}
     */
    rotate(rotation, options) {
        let action = rotation;
        if (options?.reverse) {
            action = reverse(rotation);
        }
        const slice = GetRotationSlice(action, this.layers.length);
        if (slice == null) {
            console.error(`Failed to get rotation slice. invalid rotation: [${action}]`);
            return null;
        }
        this.slice(slice);
        return slice;
    }

    /**
     * @param {(Rotation | Movement)[]} actions
     * @param {MoveOptions | RotationOptions } [options]
     */
    do(actions, options) {
        actions.forEach((action) => {
            if (isMovement(action)) {
                this.move(/** @type {Movement} */ (action), options);
            } else if (IsRotation(action)) {
                this.rotate(/** @type  {Rotation} */ (action), options);
            } else {
                console.error(`Invalid Notation: ${action}`);
            }
        });
    }

    /**
     * @private
     * @param {number} position
     * @returns {number}
     */
    _getLayerNumber(position) {
        for (let i = 0; i < this.layers.length; i++) {
            if (Math.abs(position - this.layers[i]) < ERROR_MARGIN) {
                return i;
            }
        }
        throw new Error(`Failed to get layer number. position ${position} not found in layers ${this.layers}`);
    }
}

/**
 * @param {number[]} layers
 * @return {{position: vector, rotation: vector}[]}
 */
export const corners = (layers) => {
    const lastLayer = layers[layers.length - 1];
    const firstLayer = layers[0];
    return [
        {
            position: { x: lastLayer, y: lastLayer, z: lastLayer },
            rotation: { x: 0, y: 0, z: 0 },
        },
        {
            position: { x: lastLayer, y: lastLayer, z: firstLayer },
            rotation: { x: 0, y: Math.PI / 2, z: 0 },
        },
        {
            position: { x: lastLayer, y: firstLayer, z: lastLayer },
            rotation: { x: 0, y: Math.PI / 2, z: Math.PI },
        },
        {
            position: { x: lastLayer, y: firstLayer, z: firstLayer },
            rotation: { x: 0, y: Math.PI, z: Math.PI },
        },
        {
            position: { x: firstLayer, y: lastLayer, z: lastLayer },
            rotation: { x: 0, y: -Math.PI / 2, z: 0 },
        },
        {
            position: { x: firstLayer, y: lastLayer, z: firstLayer },
            rotation: { x: 0, y: Math.PI, z: 0 },
        },
        {
            position: { x: firstLayer, y: firstLayer, z: lastLayer },
            rotation: { x: 0, y: 0, z: Math.PI },
        },
        {
            position: { x: firstLayer, y: firstLayer, z: firstLayer },
            rotation: { x: 0, y: -Math.PI / 2, z: Math.PI },
        },
    ];
};

/**
 * @param {number[]} layers
 * @return {{position: vector, rotation: vector}[]}
 */
export const centers = (layers) => {
    const lastLayer = layers[layers.length - 1];
    const firstLayer = layers[0];
    const innerLayers = layers.slice(1, -1);
    return [
        //right
        ...innerLayers.flatMap((layer1) =>
            innerLayers.map((layer2) => {
                return {
                    position: { x: lastLayer, y: layer1, z: layer2 },
                    rotation: { x: 0, y: Math.PI / 2, z: 0 },
                };
            }),
        ),
        //up
        ...innerLayers.flatMap((layer1) =>
            innerLayers.map((layer2) => {
                return {
                    position: { x: layer1, y: lastLayer, z: layer2 },
                    rotation: { x: -Math.PI / 2, y: 0, z: 0 },
                };
            }),
        ),
        //front
        ...innerLayers.flatMap((layer1) =>
            innerLayers.map((layer2) => {
                return {
                    position: { x: layer1, y: layer2, z: lastLayer },
                    rotation: { x: 0, y: 0, z: 0 },
                };
            }),
        ),
        //back
        ...innerLayers.flatMap((layer1) =>
            innerLayers.map((layer2) => {
                return {
                    position: { x: layer1, y: layer2, z: firstLayer },
                    rotation: { x: 0, y: Math.PI, z: 0 },
                };
            }),
        ),
        //down
        ...innerLayers.flatMap((layer1) =>
            innerLayers.map((layer2) => {
                return {
                    position: { x: layer1, y: firstLayer, z: layer2 },
                    rotation: { x: Math.PI / 2, y: 0, z: 0 },
                };
            }),
        ),
        //left
        ...innerLayers.flatMap((layer1) =>
            innerLayers.map((layer2) => {
                return {
                    position: { x: firstLayer, y: layer1, z: layer2 },
                    rotation: { x: 0, y: -Math.PI / 2, z: 0 },
                };
            }),
        ),
    ];
};

/**
 * @param {number[]} layers
 * @return {{position: vector, rotation: vector}[]}
 */
export const edges = (layers) => {
    const lastLayer = layers[layers.length - 1];
    const firstLayer = layers[0];
    const edgeLayers = layers.slice(1, -1);
    return [
        // RU
        ...edgeLayers.map((layer) => {
            return {
                position: { x: lastLayer, y: lastLayer, z: layer },
                rotation: { x: 0, y: Math.PI / 2, z: 0 },
            };
        }),
        // RF
        ...edgeLayers.map((layer) => {
            return {
                position: { x: lastLayer, y: layer, z: lastLayer },
                rotation: { x: 0, y: 0, z: -Math.PI / 2 },
            };
        }),
        // RB
        ...edgeLayers.map((layer) => {
            return {
                position: { x: lastLayer, y: layer, z: firstLayer },
                rotation: { x: 0, y: Math.PI / 2, z: -Math.PI / 2 },
            };
        }),
        // RD
        ...edgeLayers.map((layer) => {
            return {
                position: { x: lastLayer, y: firstLayer, z: layer },
                rotation: { x: Math.PI, y: Math.PI / 2, z: 0 },
            };
        }),
        // UF
        ...edgeLayers.map((layer) => {
            return {
                position: { x: layer, y: lastLayer, z: lastLayer },
                rotation: { x: 0, y: 0, z: 0 },
            };
        }),
        // UB
        ...edgeLayers.map((layer) => {
            return {
                position: { x: layer, y: lastLayer, z: firstLayer },
                rotation: { x: -Math.PI / 2, y: 0, z: 0 },
            };
        }),
        // DF
        ...edgeLayers.map((layer) => {
            return {
                position: { x: layer, y: firstLayer, z: lastLayer },
                rotation: { x: Math.PI / 2, y: 0, z: 0 },
            };
        }),
        // DB
        ...edgeLayers.map((layer) => {
            return {
                position: { x: layer, y: firstLayer, z: firstLayer },
                rotation: { x: Math.PI, y: 0, z: 0 },
            };
        }),
        // LU
        ...edgeLayers.map((layer) => {
            return {
                position: { x: firstLayer, y: lastLayer, z: layer },
                rotation: { x: 0, y: -Math.PI / 2, z: 0 },
            };
        }),
        // LF
        ...edgeLayers.map((layer) => {
            return {
                position: { x: firstLayer, y: layer, z: lastLayer },
                rotation: { x: 0, y: 0, z: Math.PI / 2 },
            };
        }),
        // LB
        ...edgeLayers.map((layer) => {
            return {
                position: { x: firstLayer, y: layer, z: firstLayer },
                rotation: { x: 0, y: -Math.PI / 2, z: Math.PI / 2 },
            };
        }),
        // LD
        ...edgeLayers.map((layer) => {
            return {
                position: { x: firstLayer, y: firstLayer, z: layer },
                rotation: { x: 0, y: -Math.PI / 2, z: Math.PI },
            };
        }),
    ];
};
