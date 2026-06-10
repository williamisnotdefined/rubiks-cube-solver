// @ts-check
import { PeekActions, PeekStates } from './constants';
/** @import {PeekAction, PeekState} from './constants' */

export class CameraState {
    /**
     * @param {boolean} up
     * @param {boolean} right
     */
    constructor(up = true, right = true) {
        /** @type {boolean} */
        this.Up = up;
        /** @type {boolean} */
        this.Right = right;
    }

    /**
     * @param {PeekAction} action
     */
    peekCamera(action) {
        switch (action) {
            case PeekActions.Horizontal:
                this.Right = !this.Right;
                break;
            case PeekActions.Vertical:
                this.Up = !this.Up;
                break;
            case PeekActions.Right:
                this.Right = true;
                break;
            case PeekActions.Left:
                this.Right = false;
                break;
            case PeekActions.Up:
                this.Up = true;
                break;
            case PeekActions.Down:
                this.Up = false;
                break;
            case PeekActions.RightUp:
                this.Right = true;
                this.Up = true;
                break;
            case PeekActions.RightDown:
                this.Right = true;
                this.Up = false;
                break;
            case PeekActions.LeftUp:
                this.Right = false;
                this.Up = true;
                break;
            case PeekActions.LeftDown:
                this.Right = false;
                this.Up = false;
                break;
        }
    }
    /**
     * @returns {PeekState}
     */
    toPeekState() {
        if (this.Right && this.Up) {
            return PeekStates.RightUp;
        }
        if (!this.Right && this.Up) {
            return PeekStates.LeftUp;
        }
        if (this.Right && !this.Up) {
            return PeekStates.RightDown;
        }
        return PeekStates.LeftDown;
    }
}
