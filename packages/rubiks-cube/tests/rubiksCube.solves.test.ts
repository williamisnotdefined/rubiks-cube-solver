import './setup';
import { expect, test } from 'vitest';
import { RubiksCubeController } from '../src/puzzles/cube/controller';
import type { Movement, Rotation } from '../src/puzzles/cube/core';
import { IsRotation } from '../src/puzzles/cube/core';
import { toKociemba } from '../src/puzzles/cube/state/stickerState';
import RubiksCube3DSettings from '../src/puzzles/cube/three/cubeSettings';
import RubiksCube3D from '../src/puzzles/cube/three/rubiksCube3D';
import { scrambles } from './testScrambles';

test.each(scrambles)(
  'RubiksCube with 3D view $cubeType solve with scramble = $scramble',
  ({ cubeType, scramble, solution }) => {
    // Arrange
    const cube3D = new RubiksCube3D(
      new RubiksCube3DSettings({ pieceGap: 1, animationSpeedMs: 0, cubeType, animationStyle: 'sine' }),
    );
    const cube = new RubiksCubeController(cubeType, cube3D);
    const initialState = cube.getState();
    const scrambleMoves = scramble.split(' ') as Movement[];

    for (const move of scrambleMoves) {
      cube.movement(move);
    }
    const scrambleState3D = toKociemba(cube3D.getStickerState());
    const scrambleState = cube.getState();

    // Act
    const solutionActions = solution.split(' ') as (Movement | Rotation)[];
    for (const action of solutionActions) {
      if (IsRotation(action)) {
        cube.rotation(action);
      } else {
        cube.movement(action);
      }
    }
    const solutionState3D = toKociemba(cube3D.getStickerState());
    const solutionState = cube.getState();

    // Assert
    expect(scrambleState3D).toBe(scrambleState);
    expect(solutionState3D).toBe(solutionState);
    expect(scrambleState).not.toBe(initialState);
    expect(solutionState).toBe(initialState);
  },
);
