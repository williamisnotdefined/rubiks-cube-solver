import './setup';
import { expect, test } from 'vitest';
import type { Movement, Rotation } from '../src/puzzles/cube/core';
import { CubeTypes, IsRotation, reverse, translate } from '../src/puzzles/cube/core';
import { RubiksCubeState } from '../src/puzzles/cube/state/rubiksCubeState';
import { GetMovementSlice, GetRotationSlice } from '../src/puzzles/cube/state/slice';
import { toKociemba } from '../src/puzzles/cube/state/stickerState';
import { createTestCube } from './common';
import { scrambles } from './testScrambles';

test.each(scrambles)('$cubeType solve with scramble = $scramble', ({ cubeType, scramble, solution }) => {
  // Arrange
  const cube = createTestCube(cubeType);
  const initialState = toKociemba(cube.getStickerState());
  const scrambleMoves = scramble.split(' ') as Movement[];

  for (const move of scrambleMoves) {
    const slice = GetMovementSlice(move, cube._cubeConfig.layers.length);
    if (slice) {
      cube.slice(slice);
    } else {
      console.error('Invalid action', move);
    }
  }
  const scrambleState = toKociemba(cube.getStickerState());

  // Act
  const solutionActions = solution.split(' ') as (Movement | Rotation)[];
  for (const action of solutionActions) {
    if (IsRotation(action)) {
      const slice = GetRotationSlice(action, cube._cubeConfig.layers.length);
      if (slice) {
        cube.slice(slice);
      } else {
        console.error('Invalid action', action);
      }
    } else {
      const slice = GetMovementSlice(action, cube._cubeConfig.layers.length);
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
  const scrambleMoves = scramble.split(' ') as Movement[];
  const cubeState = new RubiksCubeState(cubeType);
  const initialState = cubeState.getState();
  cubeState.do(scrambleMoves);
  const scrambleState = cubeState.getState();

  // Act
  cube.setState(scrambleState);
  const scramble3DState = cube.getStickerState();
  cube.reset();

  // Assert
  expect(toKociemba(scrambleState)).not.toBe(toKociemba(initialState));
  expect(toKociemba(scramble3DState)).toBe(toKociemba(scrambleState));
  expect(toKociemba(cube.getStickerState())).toBe(toKociemba(initialState));
});

test.each(scrambles)('$cubeType reverse scramble = $scramble', ({ cubeType, scramble }) => {
  // Arrange
  const cube = createTestCube(cubeType);
  const scrambleActions = scramble.split(' ') as (Movement | Rotation)[];
  const initialState = cube.getStickerState();

  // Act
  for (const action of scrambleActions) {
    if (IsRotation(action)) {
      const slice = GetRotationSlice(action, cube._cubeConfig.layers.length);
      if (slice) {
        cube.slice(slice);
      } else {
        console.error('Invalid action', action);
      }
    } else {
      const slice = GetMovementSlice(action, cube._cubeConfig.layers.length);
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
      const slice = GetRotationSlice(reverse(action), cube._cubeConfig.layers.length);
      if (slice) {
        cube.slice(slice);
      } else {
        console.error('Invalid action', action);
      }
    } else {
      const slice = GetMovementSlice(reverse(action), cube._cubeConfig.layers.length);
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
test.each(solves)(
  '3x3 solve on $bigCubeType with scramble = $scramble',
  ({ bigCubeType, cubeType, scramble, solution }) => {
    // Arrange
    const cube = createTestCube(bigCubeType);
    const scrambleActions = scramble.split(' ') as (Movement | Rotation)[];
    const solutionActions = solution.split(' ') as (Movement | Rotation)[];
    const initialState = cube.getStickerState();

    for (const action of scrambleActions) {
      if (IsRotation(action)) {
        const slice = GetRotationSlice(action, cube._cubeConfig.layers.length);
        if (slice) {
          cube.slice(slice);
        } else {
          console.error('Invalid action', action);
        }
      } else {
        const slice = GetMovementSlice(translate(action as Movement, bigCubeType), cube._cubeConfig.layers.length);
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
        const slice = GetRotationSlice(action, cube._cubeConfig.layers.length);
        if (slice) {
          cube.slice(slice);
        } else {
          console.error('Invalid action', action);
        }
      } else {
        const slice = GetMovementSlice(translate(action as Movement, bigCubeType), cube._cubeConfig.layers.length);
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
  },
);
