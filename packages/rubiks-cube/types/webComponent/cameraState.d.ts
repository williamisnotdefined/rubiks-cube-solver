/** @import {PeekAction, PeekState} from './constants' */
export class CameraState {
    /**
     * @param {boolean} up
     * @param {boolean} right
     */
    constructor(up?: boolean, right?: boolean);
    /** @type {boolean} */
    Up: boolean;
    /** @type {boolean} */
    Right: boolean;
    /**
     * @param {PeekAction} action
     */
    peekCamera(action: PeekAction): void;
    /**
     * @returns {PeekState}
     */
    toPeekState(): PeekState;
}
import type { PeekAction } from './constants';
import type { PeekState } from './constants';
