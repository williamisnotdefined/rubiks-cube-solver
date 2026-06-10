// @ts-check
import './setup.js';
import { expect, test } from 'vitest';
import { scrambles } from './testScrambles.js';
import { RubiksCubeController } from '../src/rubiksCube';
import RubiksCube3D from '../src/rubiksCube3D/rubiksCube3D.js';
import RubiksCube3DSettings from '../src/rubiksCube3D/cubeSettings.js';
import { toKociemba } from '../src/state/stickerState.js';
import { IsRotation } from '../src/core/index.js';

test.each(scrambles)('RubiksCube with 3D view $cubeType solve with scramble = $scramble', ({ cubeType, scramble, solution }) => {
    // Arrange
    const cube3D = new RubiksCube3D(new RubiksCube3DSettings({ pieceGap: 1, animationSpeedMs: 0, cubeType, animationStyle: 'sine' }));
    const cube = new RubiksCubeController(cubeType, cube3D);
    const initialState = cube.getState();
    const scrambleMoves = /** @type {import('../src/core/index.js').Movement[]} */ (scramble.split(' '));

    for (const move of scrambleMoves) {
        cube.movement(move);
    }
    const scrambleState3D = toKociemba(cube3D.getStickerState());
    const scrambleState = cube.getState();

    // Act
    const solutionActions = /** @type {(import('../src/core/index.js').Movement | import('../src/core/index.js').Rotation)[]} */ (solution.split(' '));
    for (const action of solutionActions) {
        if (IsRotation(action)) {
            cube.rotation(/** @type {import('../src/core/index.js').Rotation} */ (action));
        } else {
            cube.movement(/** @type {import('../src/core/index.js').Movement} */ (action));
        }
    }
    const solutionState3D = toKociemba(cube3D.getStickerState());
    const solutionState = cube.getState();

    // Assert
    expect(scrambleState3D).toBe(scrambleState);
    expect(solutionState3D).toBe(solutionState);
    expect(scrambleState).not.toBe(initialState);
    expect(solutionState).toBe(initialState);
});
