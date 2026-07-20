import './setup';
import { expect, test } from 'vitest';
import type { Movement, Rotation } from '../src/puzzles/cube/core';
import { RubiksCubeState } from '../src/puzzles/cube/state/rubiksCubeState';
import { toKociemba } from '../src/puzzles/cube/state/stickerState';
import { scrambles } from './testScrambles';

test.each(scrambles)(
  'RubiksCubeState solve on $cubeType with scramble = $scramble',
  ({ cubeType, scramble, solution }) => {
    // Arrange
    const cube = new RubiksCubeState(cubeType);
    const initialState = cube.getState();
    const initialKociembaState = toKociemba(initialState);
    const scrambleMoves = scramble.split(' ') as Movement[];

    scrambleMoves.forEach((move) => {
      cube.move(move);
    });
    const scrambleState = toKociemba(cube.getState());

    // Act

    const solutionActions = solution.split(' ') as (Movement | Rotation)[];
    for (const action of solutionActions) {
      if (action.includes('x') || action.includes('y') || action.includes('z')) {
        cube.rotate(action as Rotation);
      } else {
        cube.move(action as Movement);
      }
    }
    const solvedState = toKociemba(cube.getState());

    // Assert
    expect(scrambleState).not.toBe(initialKociembaState);
    expect(solvedState).toBe(initialKociembaState);
  },
);
