import { type AnimationStyle, AnimationStyles } from '../../../shared/animation';
import { DEFAULT_CAMERA_RADIUS } from '../../../shared/cameraDefaults';
import { DEFAULT_SQUARE1_ANIMATION_SPEED_MS } from '../three/square1D';

export type Square1ElementSettings = {
  animationSpeedMs: number;
  animationStyle: AnimationStyle;
  antialias: boolean;
  cameraFieldOfView: number;
  cameraPeekAngleHorizontal: number;
  cameraPeekAngleVertical: number;
  cameraRadius: number;
  cameraSpeedMs: number;
  maxDevicePixelRatio: number;
};

export const defaultSquare1ElementSettings: Square1ElementSettings = {
  animationSpeedMs: DEFAULT_SQUARE1_ANIMATION_SPEED_MS,
  animationStyle: AnimationStyles.Linear,
  antialias: true,
  cameraFieldOfView: 70,
  cameraPeekAngleHorizontal: 0.55,
  cameraPeekAngleVertical: 0.45,
  cameraRadius: DEFAULT_CAMERA_RADIUS,
  cameraSpeedMs: 100,
  maxDevicePixelRatio: 2,
};

const minFieldOfView = 30;
const maxFieldOfView = 100;
const minCameraRadius = 4;
const minDevicePixelRatio = 0.25;
const maxDevicePixelRatio = 4;

export function createDefaultSquare1ElementSettings(): Square1ElementSettings {
  return { ...defaultSquare1ElementSettings };
}

export function setSquare1AnimationSpeed(target: Square1ElementSettings, value: string | null): void {
  const speed = Number(value);
  if (speed >= 0 && value != null) {
    target.animationSpeedMs = speed;
    return;
  }
  console.warn(`Invalid Square-1 animation speed value. Min is 0. Value is ${value}`);
}

export function setSquare1AnimationStyle(target: Square1ElementSettings, value: unknown): void {
  if (value && Object.values(AnimationStyles).includes(value as AnimationStyle)) {
    target.animationStyle = value as AnimationStyle;
    return;
  }
  console.warn(
    `Invalid Square-1 animation style value. Accepted Values are [${Object.values(AnimationStyles).join(', ')}] Value is ${value}`,
  );
}

export function setSquare1CameraSpeed(target: Square1ElementSettings, value: string | null): void {
  const speed = Number(value);
  if (speed >= 0 && value != null) {
    target.cameraSpeedMs = speed;
    return;
  }
  console.warn(`Invalid Square-1 camera speed value. Min is 0. Value is ${value}`);
}

export function setSquare1CameraRadius(target: Square1ElementSettings, value: string | null): void {
  if (value == null) {
    target.cameraRadius = defaultSquare1ElementSettings.cameraRadius;
    return;
  }

  const radius = Number(value);
  if (radius >= minCameraRadius) {
    target.cameraRadius = radius;
    return;
  }
  console.warn(`Invalid Square-1 camera radius value. Min is ${minCameraRadius}. Value is ${value}`);
}

export function setSquare1CameraFieldOfView(target: Square1ElementSettings, value: string | null): void {
  if (value == null) {
    target.cameraFieldOfView = defaultSquare1ElementSettings.cameraFieldOfView;
    return;
  }

  const fov = Number(value);
  if (fov >= minFieldOfView && fov <= maxFieldOfView) {
    target.cameraFieldOfView = fov;
    return;
  }
  console.warn(
    `Invalid Square-1 camera FOV value. Min is ${minFieldOfView} Max is ${maxFieldOfView}. Value is ${value}.`,
  );
}

export function setSquare1CameraPeekAngleHorizontal(target: Square1ElementSettings, value: string | null): void {
  const angle = Number(value);
  if (angle >= 0 && angle <= 1 && value != null) {
    target.cameraPeekAngleHorizontal = angle;
    return;
  }
  console.warn(`Invalid Square-1 camera peek angle horizontal value. Min is 0, Max is 1. Value is ${value}`);
}

export function setSquare1CameraPeekAngleVertical(target: Square1ElementSettings, value: string | null): void {
  const angle = Number(value);
  if (angle >= 0 && angle <= 1 && value != null) {
    target.cameraPeekAngleVertical = angle;
    return;
  }
  console.warn(`Invalid Square-1 camera peek angle vertical value. Min is 0, Max is 1. Value is ${value}`);
}

export function setSquare1MaxDevicePixelRatio(target: Square1ElementSettings, value: string | null): void {
  if (value == null || value === '') {
    target.maxDevicePixelRatio = defaultSquare1ElementSettings.maxDevicePixelRatio;
    return;
  }
  const ratio = Number(value);
  if (ratio >= minDevicePixelRatio && ratio <= maxDevicePixelRatio) {
    target.maxDevicePixelRatio = ratio;
    return;
  }
  console.warn(
    `Invalid Square-1 max device pixel ratio value. Min is ${minDevicePixelRatio}, Max is ${maxDevicePixelRatio}. Value is ${value}`,
  );
}

export function setSquare1Antialias(target: Square1ElementSettings, value: string | null): void {
  if (value == null) {
    target.antialias = defaultSquare1ElementSettings.antialias;
    return;
  }
  const normalized = String(value).toLowerCase();
  if (['', 'true', '1', 'yes', 'on'].includes(normalized)) {
    target.antialias = true;
    return;
  }
  if (['false', '0', 'no', 'off'].includes(normalized)) {
    target.antialias = false;
    return;
  }
  console.warn(`Invalid Square-1 antialias value. Accepted values are true/false. Value is ${value}`);
}
