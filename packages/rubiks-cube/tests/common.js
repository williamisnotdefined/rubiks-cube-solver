import RubiksCube3DSettings from '../src/rubiksCube3D/cubeSettings.js';
import RubiksCube3D from '../src/rubiksCube3D/rubiksCube3D.js';
/**
 * @param {import('../src/core.js').CubeType} cubeType
 * @returns {RubiksCube3D}
 **/
export function createTestCube(cubeType) {
    const settings = new RubiksCube3DSettings({ pieceGap: 1.04, animationSpeedMs: 0, cubeType, animationStyle: 'sine' });
    return new RubiksCube3D(settings);
}
