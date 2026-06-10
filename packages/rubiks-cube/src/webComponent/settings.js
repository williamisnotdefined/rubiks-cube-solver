// @ts-check
import { CubeTypes } from '../core';
import RubiksCube3DSettings from '../rubiksCube3D/cubeSettings';
import { AnimationStyles } from './constants';
/** @import {CubeType} from '../core' */
/** @import {AnimationStyle} from './constants' */

const defaultCubeSettings = {
    cubeType: CubeTypes.Three,
    animationSpeedMs: 100,
    animationStyle: 'linear',
    pieceGap: 1.04,
};

const defaultSettings = {
    cameraSpeedMs: 100,
    cameraRadius: 5,
    cameraPeekAngleHorizontal: 0.6,
    cameraPeekAngleVertical: 0.6,
    cameraFieldOfView: 75,
    maxDevicePixelRatio: 2,
    antialias: true,
};

const minGap = 1;
const maxGap = 1.1;
const minRadius = 4;
const minFieldOfView = 30;
const maxFieldOfView = 100;
const minDevicePixelRatio = 0.25;
const maxDevicePixelRatio = 4;

export default class Settings {
    constructor() {
        /** @type {RubiksCube3DSettings} */
        this.rubiksCube3DSettings = new RubiksCube3DSettings({
            pieceGap: defaultCubeSettings.pieceGap,
            animationSpeedMs: defaultCubeSettings.animationSpeedMs,
            cubeType: defaultCubeSettings.cubeType,
            animationStyle: defaultCubeSettings.animationStyle,
        });
        /** @type {number} */
        this.cameraSpeedMs = defaultSettings.cameraSpeedMs;
        /** @type {number} */
        this.cameraRadius = defaultSettings.cameraRadius;
        /** @type {number} */
        this.cameraFieldOfView = defaultSettings.cameraFieldOfView;
        /** @type {number} */
        this.cameraPeekAngleHorizontal = defaultSettings.cameraPeekAngleHorizontal;
        /** @type {number} */
        this.cameraPeekAngleVertical = defaultSettings.cameraPeekAngleVertical;
        /** @type {number} */
        this.maxDevicePixelRatio = defaultSettings.maxDevicePixelRatio;
        /** @type {boolean} */
        this.antialias = defaultSettings.antialias;
    }

    /** @param {any} value */
    setCubeType(value) {
        if (value && Object.values(CubeTypes).includes(value)) {
            const cubeType = /** @type {CubeType} */ (value);
            this.rubiksCube3DSettings.cubeType = cubeType;
            return;
        }
        console.warn(`Invalid cube type value. Accepted Values are [${Object.values(CubeTypes).join(', ')}] Value is ${value}`);
    }

    /** @param {string | null} value*/
    setPieceGap(value) {
        const gap = Number(value);
        if (gap >= minGap && gap <= maxGap && value != null) {
            this.rubiksCube3DSettings.pieceGap = gap;
            return;
        }
        console.warn(`Invalid pieceGap value. Min is ${minGap}. Max is ${maxGap}. Value is ${value}`);
    }

    /** @param {string | null} value in ms */
    setAnimationSpeed(value) {
        var speed = Number(value);
        if (speed >= 0 && value != null) {
            this.rubiksCube3DSettings.animationSpeedMs = speed;
            return;
        }
        console.warn(`Invalid animation speed value. Min is 0. Value is ${value}`);
    }

    /** @param {any} value */
    setAnimationStyle(value) {
        if (value && Object.values(AnimationStyles).includes(value)) {
            const validStyle = /** @type {AnimationStyle} */ (value);
            this.rubiksCube3DSettings.animationStyle = validStyle;
            return;
        }
        console.warn(`Invalid animation style value. Accepted Values are [${Object.values(AnimationStyles).join(', ')}] Value is ${value}`);
    }

    /** @param {string | null} value in ms */
    setCameraSpeed(value) {
        var speed = Number(value);
        if (speed >= 0 && value != null) {
            this.cameraSpeedMs = speed;
            return;
        }
        console.warn(`Invalid camera speed value. Min is 0. Value is ${value}`);
    }

    /** @param {string | null} value */
    setCameraRadius(value) {
        var radius = Number(value);
        if (radius >= minRadius && value != null) {
            this.cameraRadius = radius;
            return;
        }
        console.warn(`Invalid camera radius value. Min is ${minRadius}. Value is ${value}`);
    }

    /** @param {string | null} value in ms */
    setCameraPeekAngleHorizontal(value) {
        var angle = Number(value);
        if (angle >= 0 && angle <= 1 && value != null) {
            this.cameraPeekAngleHorizontal = angle;
            return;
        }
        console.warn(`Invalid camera peek angle horizontal value. Min is 0, Max is 1. Value is ${value}`);
    }

    /** @param {string | null} value in ms */
    setCameraPeekAngleVertical(value) {
        var angle = Number(value);
        if (angle >= 0 && angle <= 1 && value != null) {
            this.cameraPeekAngleVertical = angle;
            return;
        }
        console.warn(`Invalid camera peek angle vertical value. Min is 0, Max is 1. Value is ${value}`);
    }

    /** @param {string | null} value in ms */
    setCameraFieldOfView(value) {
        var fov = Number(value);
        if (fov < minFieldOfView && value != null) {
            console.warn(`Invalid camera FOV value. Min is ${minFieldOfView} Max is ${maxFieldOfView}. Value is ${value} which is below the minimum.`);
            return;
        }
        if (fov > maxFieldOfView && value != null) {
            console.warn(`Invalid camera FOV value. Min is ${minFieldOfView} Max is ${maxFieldOfView}. Value is ${value} which is above the maximum.`);
            return;
        }
        if (value == null) {
            console.warn(`Invalid camera FOV value. Min is ${minFieldOfView} Max is ${maxFieldOfView}. Value is ${value}.`);
        }
        this.cameraFieldOfView = fov;
    }

    /** @param {string | null} value */
    setMaxDevicePixelRatio(value) {
        if (value == null || value === '') {
            this.maxDevicePixelRatio = defaultSettings.maxDevicePixelRatio;
            return;
        }
        const ratio = Number(value);
        if (ratio >= minDevicePixelRatio && ratio <= maxDevicePixelRatio) {
            this.maxDevicePixelRatio = ratio;
            return;
        }
        console.warn(`Invalid max device pixel ratio value. Min is ${minDevicePixelRatio}, Max is ${maxDevicePixelRatio}. Value is ${value}`);
    }

    /** @param {string | null} value */
    setAntialias(value) {
        if (value == null) {
            this.antialias = defaultSettings.antialias;
            return;
        }
        const normalized = String(value).toLowerCase();
        if (['', 'true', '1', 'yes', 'on'].includes(normalized)) {
            this.antialias = true;
            return;
        }
        if (['false', '0', 'no', 'off'].includes(normalized)) {
            this.antialias = false;
            return;
        }
        console.warn(`Invalid antialias value. Accepted values are true/false. Value is ${value}`);
    }

    /** @param {string | null} value in ms */
    setLogo(value) {
        this.rubiksCube3DSettings.logo = value;
    }
}
