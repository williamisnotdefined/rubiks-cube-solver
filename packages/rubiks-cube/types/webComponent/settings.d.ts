export default class Settings {
    /** @type {RubiksCube3DSettings} */
    rubiksCube3DSettings: RubiksCube3DSettings;
    /** @type {number} */
    cameraSpeedMs: number;
    /** @type {number} */
    cameraRadius: number;
    /** @type {number} */
    cameraFieldOfView: number;
    /** @type {number} */
    cameraPeekAngleHorizontal: number;
    /** @type {number} */
    cameraPeekAngleVertical: number;
    /** @type {number} */
    maxDevicePixelRatio: number;
    /** @type {boolean} */
    antialias: boolean;
    /** @param {any} value */
    setCubeType(value: any): void;
    /** @param {string | null} value*/
    setPieceGap(value: string | null): void;
    /** @param {string | null} value in ms */
    setAnimationSpeed(value: string | null): void;
    /** @param {any} value */
    setAnimationStyle(value: any): void;
    /** @param {string | null} value in ms */
    setCameraSpeed(value: string | null): void;
    /** @param {string | null} value */
    setCameraRadius(value: string | null): void;
    /** @param {string | null} value in ms */
    setCameraPeekAngleHorizontal(value: string | null): void;
    /** @param {string | null} value in ms */
    setCameraPeekAngleVertical(value: string | null): void;
    /** @param {string | null} value in ms */
    setCameraFieldOfView(value: string | null): void;
    /** @param {string | null} value */
    setMaxDevicePixelRatio(value: string | null): void;
    /** @param {string | null} value */
    setAntialias(value: string | null): void;
    /** @param {string | null} value in ms */
    setLogo(value: string | null): void;
}
import RubiksCube3DSettings from '../rubiksCube3D/cubeSettings';
