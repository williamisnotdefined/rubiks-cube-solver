import { type AnimationStyle, AnimationStyles } from '../../../shared/animation';
import { DEFAULT_CAMERA_RADIUS } from '../../../shared/cameraDefaults';
import {
  DEFAULT_MEGAMINX_ANIMATION_SPEED_MS,
  DEFAULT_MEGAMINX_VISUAL_STYLE,
  type MegaminxVisualStyle,
  MegaminxVisualStyles,
} from '../three/megaminx3D';

export type MegaminxElementSettings = {
  animationSpeedMs: number;
  animationStyle: AnimationStyle;
  antialias: boolean;
  cameraFieldOfView: number;
  cameraPeekAngleHorizontal: number;
  cameraPeekAngleVertical: number;
  cameraRadius: number;
  cameraSpeedMs: number;
  maxDevicePixelRatio: number;
  visualStyle: MegaminxVisualStyle;
};

export const defaultMegaminxElementSettings: MegaminxElementSettings = {
  animationSpeedMs: DEFAULT_MEGAMINX_ANIMATION_SPEED_MS,
  animationStyle: AnimationStyles.Linear,
  antialias: true,
  cameraFieldOfView: 75,
  cameraPeekAngleHorizontal: 0.55,
  cameraPeekAngleVertical: 0.55,
  cameraRadius: DEFAULT_CAMERA_RADIUS,
  cameraSpeedMs: 100,
  maxDevicePixelRatio: 2,
  visualStyle: DEFAULT_MEGAMINX_VISUAL_STYLE,
};

const minFieldOfView = 30;
const maxFieldOfView = 100;
const minCameraRadius = 4.5;
const minDevicePixelRatio = 0.25;
const maxDevicePixelRatio = 4;

export function createDefaultMegaminxElementSettings(): MegaminxElementSettings {
  return { ...defaultMegaminxElementSettings };
}

export function setMegaminxAnimationSpeed(target: MegaminxElementSettings, value: string | null): void {
  const speed = Number(value);
  if (speed >= 0 && value != null) {
    target.animationSpeedMs = speed;
    return;
  }
  console.warn(`Invalid Megaminx animation speed value. Min is 0. Value is ${value}`);
}

export function setMegaminxAnimationStyle(target: MegaminxElementSettings, value: unknown): void {
  if (value && Object.values(AnimationStyles).includes(value as AnimationStyle)) {
    target.animationStyle = value as AnimationStyle;
    return;
  }
  console.warn(
    `Invalid Megaminx animation style value. Accepted Values are [${Object.values(AnimationStyles).join(', ')}] Value is ${value}`,
  );
}

export function setMegaminxCameraSpeed(target: MegaminxElementSettings, value: string | null): void {
  const speed = Number(value);
  if (speed >= 0 && value != null) {
    target.cameraSpeedMs = speed;
    return;
  }
  console.warn(`Invalid Megaminx camera speed value. Min is 0. Value is ${value}`);
}

export function setMegaminxCameraRadius(target: MegaminxElementSettings, value: string | null): void {
  if (value == null) {
    target.cameraRadius = defaultMegaminxElementSettings.cameraRadius;
    return;
  }

  const radius = Number(value);
  if (radius >= minCameraRadius) {
    target.cameraRadius = radius;
    return;
  }
  console.warn(`Invalid Megaminx camera radius value. Min is ${minCameraRadius}. Value is ${value}`);
}

export function setMegaminxCameraFieldOfView(target: MegaminxElementSettings, value: string | null): void {
  if (value == null) {
    target.cameraFieldOfView = defaultMegaminxElementSettings.cameraFieldOfView;
    return;
  }

  const fov = Number(value);
  if (fov >= minFieldOfView && fov <= maxFieldOfView) {
    target.cameraFieldOfView = fov;
    return;
  }
  console.warn(
    `Invalid Megaminx camera FOV value. Min is ${minFieldOfView} Max is ${maxFieldOfView}. Value is ${value}.`,
  );
}

export function setMegaminxCameraPeekAngleHorizontal(target: MegaminxElementSettings, value: string | null): void {
  const angle = Number(value);
  if (angle >= 0 && angle <= 1 && value != null) {
    target.cameraPeekAngleHorizontal = angle;
    return;
  }
  console.warn(`Invalid Megaminx camera peek angle horizontal value. Min is 0, Max is 1. Value is ${value}`);
}

export function setMegaminxCameraPeekAngleVertical(target: MegaminxElementSettings, value: string | null): void {
  const angle = Number(value);
  if (angle >= 0 && angle <= 1 && value != null) {
    target.cameraPeekAngleVertical = angle;
    return;
  }
  console.warn(`Invalid Megaminx camera peek angle vertical value. Min is 0, Max is 1. Value is ${value}`);
}

export function setMegaminxMaxDevicePixelRatio(target: MegaminxElementSettings, value: string | null): void {
  if (value == null || value === '') {
    target.maxDevicePixelRatio = defaultMegaminxElementSettings.maxDevicePixelRatio;
    return;
  }
  const ratio = Number(value);
  if (ratio >= minDevicePixelRatio && ratio <= maxDevicePixelRatio) {
    target.maxDevicePixelRatio = ratio;
    return;
  }
  console.warn(
    `Invalid Megaminx max device pixel ratio value. Min is ${minDevicePixelRatio}, Max is ${maxDevicePixelRatio}. Value is ${value}`,
  );
}

export function setMegaminxAntialias(target: MegaminxElementSettings, value: string | null): void {
  if (value == null) {
    target.antialias = defaultMegaminxElementSettings.antialias;
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
  console.warn(`Invalid Megaminx antialias value. Accepted values are true/false. Value is ${value}`);
}

export function setMegaminxVisualStyle(target: MegaminxElementSettings, value: string | null): void {
  if (value == null || value === '') {
    target.visualStyle = defaultMegaminxElementSettings.visualStyle;
    return;
  }
  if (Object.values(MegaminxVisualStyles).includes(value as MegaminxVisualStyle)) {
    target.visualStyle = value as MegaminxVisualStyle;
    return;
  }
  console.warn(
    `Invalid Megaminx visual style value. Accepted values are [${Object.values(MegaminxVisualStyles).join(', ')}]. Value is ${value}`,
  );
}
