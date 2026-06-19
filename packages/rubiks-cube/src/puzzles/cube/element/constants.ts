export type CameraOptions = {
  cameraSpeedMs?: number;
};

export type { AnimationStyle } from '../../../shared/animation';
export { AnimationStyles } from '../../../shared/animation';
export type { PeekAction, PeekState } from '../../../shared/cameraPeek';
export { PeekActions, PeekStates } from '../../../shared/cameraPeek';

export const AttributeNames = {
  cubeType: 'cube-type',
  pieceGap: 'piece-gap',
  animationSpeed: 'animation-speed-ms',
  animationStyle: 'animation-style',
  cameraSpeed: 'camera-speed-ms',
  cameraRadius: 'camera-radius',
  cameraFieldOfView: 'camera-field-of-view',
  cameraPeekAngleHorizontal: 'camera-peek-angle-horizontal',
  cameraPeekAngleVertical: 'camera-peek-angle-vertical',
  maxDevicePixelRatio: 'max-device-pixel-ratio',
  antialias: 'antialias',
  logo: 'logo',
} as const;

export type AttributeName = (typeof AttributeNames)[keyof typeof AttributeNames];
