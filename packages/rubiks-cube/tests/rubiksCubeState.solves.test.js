// @ts-check
import './setup.js';
import { expect, test } from 'vitest';
import { toKociemba } from '../src/state/stickerState.js';
import { scrambles } from './testScrambles.js';
import { RubiksCubeState } from '../src/state/rubiksCubeState.js';

test.each(scrambles)('RubiksCubeState solve on $cubeType with scramble = $scramble', ({ cubeType, scramble, solution }) => {
    // Arrange
    const cube = new RubiksCubeState(cubeType);
    const initialState = cube.getState();
    const initialKociembaState = toKociemba(initialState);
    const scrambleMoves = /** @type {import('../src/core/index.js').Movement[]} */ (scramble.split(' '));

    scrambleMoves.forEach((move) => {
        cube.move(move);
    });
    const scrambleState = toKociemba(cube.getState());

    // Act

    const solutionActions = /** @type {(import('../src/core/index.js').Movement | import('../src/core/index.js').Rotation)[]} */ (solution.split(' '));
    for (const action of solutionActions) {
        if (action.includes('x') || action.includes('y') || action.includes('z')) {
            cube.rotate(/** @type {import('../src/core/index.js').Rotation} */ (action));
        } else {
            cube.move(/** @type {import('../src/core/index.js').Movement} */ (action));
        }
    }
    const solvedState = toKociemba(cube.getState());

    // Assert
    expect(scrambleState).not.toBe(initialKociembaState);
    expect(solvedState).toBe(initialKociembaState);
});
