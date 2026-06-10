export namespace RubiksCubePlayerAttributes {
    let CubeType: string;
    let Setup: string;
    let Alg: string;
}
export class RubiksCubePlayer extends HTMLElement {
    /**
     * @param {string} tagName the name of the tag to register the web component under
     */
    static register(tagName?: string): void;
    rubiksCubeElement: RubiksCubeElement;
    startButton: HTMLButtonElement;
    backwardsStepButton: HTMLButtonElement;
    backwardsButton: HTMLButtonElement;
    stopButton: HTMLButtonElement;
    forwardsStepbutton: HTMLButtonElement;
    forwardbutton: HTMLButtonElement;
    endButton: HTMLButtonElement;
    /** @type {CubeType} */
    cubeType: CubeType;
    setup: string;
    alg: string;
    /** @type {string?} */
    setupState: string | null;
    /** @type {(Movement | Rotation)[]} */
    algMoves: (Movement | Rotation)[];
    currentMoveIndex: number;
    /** @type {typeof PlayState[keyof typeof PlayState]} */
    playState: (typeof PlayState)[keyof typeof PlayState];
    connectedCallback(): void;
    /**
     * @param {string} name
     * @param {string?} oldVal
     * @param {string?} newVal
     *  */
    attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null): void;
    /**
     *
     * @param {string} scramble
     * @returns {string[]}
     **/
    cleanScramble(scramble: string): string[];
    init(): void;
    /**
     * @private
     * @param {Movement | Rotation} action
     * @param {boolean} reverseAction
     * @returns {Promise<string>}
     */
    private _animate;
    stepForward(): Promise<void>;
    stepBackward(): Promise<void>;
    playForward(): Promise<void>;
    playBackward(): Promise<void>;
    stop(): void;
    jumpToStart(): void;
    jumpToEnd(): void;
}
export type RubiksCubeElement = import("../webComponent/rubiksCubeElement").RubiksCubeElement;
import { RubiksCubeElement } from '../webComponent/rubiksCubeElement';
import type { CubeType as CubeType_1 } from '../core';
import type { Movement } from '../core';
import type { Rotation } from '../core';
declare const PlayState: Readonly<{
    Idle: "idle";
    Forward: "forward";
    Backward: "backward";
}>;
export {};
