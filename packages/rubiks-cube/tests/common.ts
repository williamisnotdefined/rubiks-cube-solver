import type { CubeType } from '../src/core';
import RubiksCube3DSettings from '../src/rubiksCube3D/cubeSettings';
import RubiksCube3D from '../src/rubiksCube3D/rubiksCube3D';

/**
 * @returns {RubiksCube3D}
 **/
export function createTestCube(cubeType: CubeType) {
  const settings = new RubiksCube3DSettings({ pieceGap: 1.04, animationSpeedMs: 0, cubeType, animationStyle: 'sine' });
  return new RubiksCube3D(settings);
}
