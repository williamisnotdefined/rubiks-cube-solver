import { DEFAULT_CAMERA_RADIUS } from '../../../shared/cameraDefaults';
import { isNullOrEmptyString } from '../../../shared/string';
import type { CubeType } from '../core';
import { CubeTypes } from '../core';
import RubiksCube3DSettings from '../three/cubeSettings';
import type { AnimationStyle } from './constants';
import { AnimationStyles } from './constants';

const defaultCubeSettings = {
  cubeType: CubeTypes.Three,
  animationSpeedMs: 100,
  animationStyle: 'linear',
  pieceGap: 1.04,
};

const defaultSettings = {
  cameraSpeedMs: 100,
  cameraRadius: DEFAULT_CAMERA_RADIUS,
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
  rubiksCube3DSettings: RubiksCube3DSettings;
  cameraSpeedMs: number;
  cameraRadius: number;
  cameraFieldOfView: number;
  cameraPeekAngleHorizontal: number;
  cameraPeekAngleVertical: number;
  maxDevicePixelRatio: number;
  antialias: boolean;

  constructor() {
    this.rubiksCube3DSettings = new RubiksCube3DSettings({
      pieceGap: defaultCubeSettings.pieceGap,
      animationSpeedMs: defaultCubeSettings.animationSpeedMs,
      cubeType: defaultCubeSettings.cubeType,
      animationStyle: defaultCubeSettings.animationStyle,
    });
    this.cameraSpeedMs = defaultSettings.cameraSpeedMs;
    this.cameraRadius = defaultSettings.cameraRadius;
    this.cameraFieldOfView = defaultSettings.cameraFieldOfView;
    this.cameraPeekAngleHorizontal = defaultSettings.cameraPeekAngleHorizontal;
    this.cameraPeekAngleVertical = defaultSettings.cameraPeekAngleVertical;
    this.maxDevicePixelRatio = defaultSettings.maxDevicePixelRatio;
    this.antialias = defaultSettings.antialias;
  }

  setCubeType(value: unknown): void {
    if (value && Object.values(CubeTypes).includes(value as CubeType)) {
      const cubeType = value as CubeType;
      this.rubiksCube3DSettings.cubeType = cubeType;
      return;
    }
    console.warn(
      `Invalid cube type value. Accepted Values are [${Object.values(CubeTypes).join(', ')}] Value is ${value}`,
    );
  }

  setPieceGap(value: string | null): void {
    const gap = Number(value);
    if (gap >= minGap && gap <= maxGap && value != null) {
      this.rubiksCube3DSettings.pieceGap = gap;
      return;
    }
    console.warn(`Invalid pieceGap value. Min is ${minGap}. Max is ${maxGap}. Value is ${value}`);
  }

  setAnimationSpeed(value: string | null): void {
    const speed = Number(value);
    if (speed >= 0 && value != null) {
      this.rubiksCube3DSettings.animationSpeedMs = speed;
      return;
    }
    console.warn(`Invalid animation speed value. Min is 0. Value is ${value}`);
  }

  setAnimationStyle(value: unknown): void {
    if (value && Object.values(AnimationStyles).includes(value as AnimationStyle)) {
      const validStyle = value as AnimationStyle;
      this.rubiksCube3DSettings.animationStyle = validStyle;
      return;
    }
    console.warn(
      `Invalid animation style value. Accepted Values are [${Object.values(AnimationStyles).join(', ')}] Value is ${value}`,
    );
  }

  setCameraSpeed(value: string | null): void {
    const speed = Number(value);
    if (speed >= 0 && value != null) {
      this.cameraSpeedMs = speed;
      return;
    }
    console.warn(`Invalid camera speed value. Min is 0. Value is ${value}`);
  }

  setCameraRadius(value: string | null): void {
    if (value == null) {
      this.cameraRadius = defaultSettings.cameraRadius;
      return;
    }

    const radius = Number(value);
    if (radius >= minRadius) {
      this.cameraRadius = radius;
      return;
    }
    console.warn(`Invalid camera radius value. Min is ${minRadius}. Value is ${value}`);
  }

  setCameraPeekAngleHorizontal(value: string | null): void {
    const angle = Number(value);
    if (angle >= 0 && angle <= 1 && value != null) {
      this.cameraPeekAngleHorizontal = angle;
      return;
    }
    console.warn(`Invalid camera peek angle horizontal value. Min is 0, Max is 1. Value is ${value}`);
  }

  setCameraPeekAngleVertical(value: string | null): void {
    const angle = Number(value);
    if (angle >= 0 && angle <= 1 && value != null) {
      this.cameraPeekAngleVertical = angle;
      return;
    }
    console.warn(`Invalid camera peek angle vertical value. Min is 0, Max is 1. Value is ${value}`);
  }

  setCameraFieldOfView(value: string | null): void {
    if (value == null) {
      this.cameraFieldOfView = defaultSettings.cameraFieldOfView;
      return;
    }

    const fov = Number(value);
    if (fov < minFieldOfView) {
      console.warn(
        `Invalid camera FOV value. Min is ${minFieldOfView} Max is ${maxFieldOfView}. Value is ${value} which is below the minimum.`,
      );
      return;
    }
    if (fov > maxFieldOfView) {
      console.warn(
        `Invalid camera FOV value. Min is ${minFieldOfView} Max is ${maxFieldOfView}. Value is ${value} which is above the maximum.`,
      );
      return;
    }
    if (Number.isNaN(fov)) {
      console.warn(`Invalid camera FOV value. Min is ${minFieldOfView} Max is ${maxFieldOfView}. Value is ${value}.`);
      return;
    }
    this.cameraFieldOfView = fov;
  }

  setMaxDevicePixelRatio(value: string | null): void {
    if (isNullOrEmptyString(value)) {
      this.maxDevicePixelRatio = defaultSettings.maxDevicePixelRatio;
      return;
    }
    const ratio = Number(value);
    if (ratio >= minDevicePixelRatio && ratio <= maxDevicePixelRatio) {
      this.maxDevicePixelRatio = ratio;
      return;
    }
    console.warn(
      `Invalid max device pixel ratio value. Min is ${minDevicePixelRatio}, Max is ${maxDevicePixelRatio}. Value is ${value}`,
    );
  }

  setAntialias(value: string | null): void {
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

  setLogo(value: string | null): void {
    this.rubiksCube3DSettings.logo = value;
  }
}
