import type { CubeType } from '../src/puzzles/cube/core';
import RubiksCube3DSettings from '../src/puzzles/cube/three/cubeSettings';
import RubiksCube3D from '../src/puzzles/cube/three/rubiksCube3D';

/**
 * @returns {RubiksCube3D}
 **/
export function createTestCube(cubeType: CubeType) {
  const settings = new RubiksCube3DSettings({ pieceGap: 1.04, animationSpeedMs: 0, cubeType, animationStyle: 'sine' });
  return new RubiksCube3D(settings);
}
