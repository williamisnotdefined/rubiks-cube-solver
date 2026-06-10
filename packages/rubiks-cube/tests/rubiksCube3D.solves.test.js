// @ts-check
import './setup.js';
import { expect, test } from 'vitest';
import { CubeTypes, IsRotation, reverse, translate } from '../src/core/index.js';
import { toKociemba } from '../src/state/stickerState.js';
import { createTestCube } from './common.js';
import { scrambles } from './testScrambles.js';
import { RubiksCubeState } from '../src/state/rubiksCubeState.js';
import { GetMovementSlice, GetRotationSlice } from '../src/state/slice.js';

test.each(scrambles)('$cubeType solve with scramble = $scramble', ({ cubeType, scramble, solution }) => {
    // Arrange
    const cube = createTestCube(cubeType);
    const initialState = toKociemba(cube.getStickerState());
    const scrambleMoves = /** @type {import('../src/core/index.js').Movement[]} */ (scramble.split(' '));

    for (const move of scrambleMoves) {
        const slice = GetMovementSlice(/** @type {import('../src/core/index.js').Movement} */ (move), cube._cubeConfig.layers.length);
        if (slice) {
            cube.slice(slice);
        } else {
            console.error('Invalid action', move);
        }
    }
    const scrambleState = toKociemba(cube.getStickerState());

    // Act
    const solutionActions = /** @type {(import('../src/core/index.js').Movement | import('../src/core/index.js').Rotation)[]} */ (solution.split(' '));
    for (const action of solutionActions) {
        if (IsRotation(action)) {
            const slice = GetRotationSlice(/** @type {import('../src/core/index.js').Rotation} */ (action), cube._cubeConfig.layers.length);
            if (slice) {
                cube.slice(slice);
            } else {
                console.error('Invalid action', action);
            }
        } else {
            const slice = GetMovementSlice(/** @type {import('../src/core/index.js').Movement} */ (action), cube._cubeConfig.layers.length);
            if (slice) {
                cube.slice(slice);
            } else {
                console.error('Invalid action', action);
            }
        }
    }
    const solutionState = toKociemba(cube.getStickerState());

    // Assert
    expect(scrambleState).not.toBe(initialState);
    expect(solutionState).toBe(initialState);
});

test.each(scrambles)('$cubeType reset scramble = $scramble', ({ cubeType, scramble, solution }) => {
    // Arrange
    const cube = createTestCube(cubeType);
    const scrambleMoves = /** @type {import('../src/core/index.js').Movement[]} */ (scramble.split(' '));
    const cubeState = new RubiksCubeState(cubeType);
    let initialState = cubeState.getState();
    cubeState.do(scrambleMoves);
    let scrambleState = cubeState.getState();

    // Act
    cube.setState(scrambleState);
    let scramble3DState = cube.getStickerState();
    cube.reset();

    // Assert
    expect(toKociemba(scrambleState)).not.toBe(toKociemba(initialState));
    expect(toKociemba(scramble3DState)).toBe(toKociemba(scrambleState));
    expect(toKociemba(cube.getStickerState())).toBe(toKociemba(initialState));
});

test.each(scrambles)('$cubeType reverse scramble = $scramble', ({ cubeType, scramble, solution }) => {
    // Arrange
    const cube = createTestCube(cubeType);
    const scrambleActions = /** @type {(import('../src/core/index.js').Movement | import('../src/core/index.js').Rotation)[]} */ (scramble.split(' '));
    const solutionActions = /** @type {(import('../src/core/index.js').Movement | import('../src/core/index.js').Rotation)[]} */ (solution.split(' '));
    const initialState = cube.getStickerState();

    // Act
    for (const action of scrambleActions) {
        if (IsRotation(action)) {
            const slice = GetRotationSlice(/** @type {import('../src/core/index.js').Rotation} */ (action), cube._cubeConfig.layers.length);
            if (slice) {
                cube.slice(slice);
            } else {
                console.error('Invalid action', action);
            }
        } else {
            const slice = GetMovementSlice(/** @type {import('../src/core/index.js').Movement} */ (action), cube._cubeConfig.layers.length);
            if (slice) {
                cube.slice(slice);
            } else {
                console.error('Invalid action', action);
            }
        }
    }
    const scrambleState = cube.getStickerState();

    // Act
    for (const action of scrambleActions.reverse()) {
        if (IsRotation(action)) {
            const slice = GetRotationSlice(/** @type {import('../src/core/index.js').Rotation} */ (reverse(action)), cube._cubeConfig.layers.length);
            if (slice) {
                cube.slice(slice);
            } else {
                console.error('Invalid action', action);
            }
        } else {
            const slice = GetMovementSlice(/** @type {import('../src/core/index.js').Movement} */ (reverse(action)), cube._cubeConfig.layers.length);
            if (slice) {
                cube.slice(slice);
            } else {
                console.error('Invalid action', action);
            }
        }
    }

    // Assert
    expect(/** @type {string?} **/ (toKociemba(scrambleState))).not.toBe(toKociemba(initialState));
    expect(/** @type {string?} **/ (toKociemba(cube.getStickerState()))).toBe(toKociemba(initialState));
});

const bigCubes = [CubeTypes.Four, CubeTypes.Five, CubeTypes.Six, CubeTypes.Seven];
const threeSolves = scrambles.filter((x) => x.cubeType === CubeTypes.Three);
const solves = bigCubes.flatMap((cubeType) =>
    threeSolves.map((solve) => {
        return { ...solve, bigCubeType: cubeType };
    }),
);
test.each(solves)('3x3 solve on $bigCubeType with scramble = $scramble', ({ bigCubeType, cubeType, scramble, solution }) => {
    // Arrange
    const cube = createTestCube(bigCubeType);
    const scrambleActions = /** @type {(import('../src/core/index.js').Movement | import('../src/core/index.js').Rotation)[]} */ (scramble.split(' '));
    const solutionActions = /** @type {(import('../src/core/index.js').Movement | import('../src/core/index.js').Rotation)[]} */ (solution.split(' '));
    const initialState = cube.getStickerState();

    for (const action of scrambleActions) {
        if (IsRotation(action)) {
            const slice = GetRotationSlice(/** @type {import('../src/core/index.js').Rotation} */ (action), cube._cubeConfig.layers.length);
            if (slice) {
                cube.slice(slice);
            } else {
                console.error('Invalid action', action);
            }
        } else {
            const slice = GetMovementSlice(
                /** @type {import('../src/core/index.js').Movement} */ (translate(action, bigCubeType)),
                cube._cubeConfig.layers.length,
            );
            if (slice) {
                cube.slice(slice);
            } else {
                console.error('Invalid action', action);
            }
        }
    }
    const scrambleState = cube.getStickerState();

    for (const action of solutionActions) {
        if (IsRotation(action)) {
            const slice = GetRotationSlice(/** @type {import('../src/core/index.js').Rotation} */ (action), cube._cubeConfig.layers.length);
            if (slice) {
                cube.slice(slice);
            } else {
                console.error('Invalid action', action);
            }
        } else {
            const slice = GetMovementSlice(
                /** @type {import('../src/core/index.js').Movement} */ (translate(action, bigCubeType)),
                cube._cubeConfig.layers.length,
            );
            if (slice) {
                cube.slice(slice);
            } else {
                console.error('Invalid action', action);
            }
        }
    }
    const solutionState = cube.getStickerState();

    // Assert
    expect(/** @type {string?} **/ (toKociemba(scrambleState))).not.toBe(toKociemba(initialState));
    expect(/** @type {string?} **/ (toKociemba(solutionState))).toBe(toKociemba(initialState));
});
