import * as controller from '@rubiks-cube-solver/rubiks-cube/controller';
import * as core from '@rubiks-cube-solver/rubiks-cube/core';
import * as player from '@rubiks-cube-solver/rubiks-cube/player';
import * as cube from '@rubiks-cube-solver/rubiks-cube/puzzles/cube';
import * as megaminx from '@rubiks-cube-solver/rubiks-cube/puzzles/megaminx';
import * as pyraminx from '@rubiks-cube-solver/rubiks-cube/puzzles/pyraminx';
import * as square1 from '@rubiks-cube-solver/rubiks-cube/puzzles/square1';
import * as state from '@rubiks-cube-solver/rubiks-cube/state';
import * as three from '@rubiks-cube-solver/rubiks-cube/three';
import * as view from '@rubiks-cube-solver/rubiks-cube/view';
import { describe, expect, test } from 'vitest';

describe('public package exports', () => {
  test('exposes canonical subpaths', () => {
    expect(view.RubiksCubeElement).toBeTypeOf('function');
    expect(player.RubiksCubePlayer).toBeTypeOf('function');
    expect(three.RubiksCube3D).toBeTypeOf('function');
    expect(controller.RubiksCubeController).toBeTypeOf('function');
    expect(core.Movements.Single.R).toBe('R');
    expect(state.RubiksCubeState).toBeTypeOf('function');
    expect(cube.RubiksCubeElement).toBeTypeOf('function');
    expect(pyraminx.PyraminxPuzzleElement).toBeTypeOf('function');
    expect(megaminx.MegaminxPuzzleElement).toBeTypeOf('function');
    expect(square1.Square1PuzzleElement).toBeTypeOf('function');
  });

  test('keeps cube state subpath narrow', () => {
    expect('toKociemba' in state).toBe(false);
    expect('fromKociemba' in state).toBe(false);
    expect('defaultStickerState' in state).toBe(false);
  });

  test('does not expose legacy direct puzzle aliases', async () => {
    const pyraminxAlias = '@rubiks-cube-solver/rubiks-cube/pyraminx';
    const megaminxAlias = '@rubiks-cube-solver/rubiks-cube/megaminx';
    const square1Alias = '@rubiks-cube-solver/rubiks-cube/square1';

    await expect(import(pyraminxAlias)).rejects.toThrow();
    await expect(import(megaminxAlias)).rejects.toThrow();
    await expect(import(square1Alias)).rejects.toThrow();
  });
});
