export type CameraOptions = {
  cameraSpeedMs?: number;
};

export const AnimationStyles = {
  Exponential: 'exponential',
  Linear: 'linear',
  Next: 'next',
  Fixed: 'fixed',
  Match: 'match',
} as const;

export type AnimationStyle = (typeof AnimationStyles)[keyof typeof AnimationStyles];

export const PeekStates = {
  RightUp: 'rightUp',
  RightDown: 'rightDown',
  LeftUp: 'leftUp',
  LeftDown: 'leftDown',
} as const;

export type PeekState = (typeof PeekStates)[keyof typeof PeekStates];

export const PeekActions = {
  Horizontal: 'horizontal',
  Vertical: 'vertical',
  Right: 'right',
  Left: 'left',
  Up: 'up',
  Down: 'down',
  RightUp: 'rightUp',
  RightDown: 'rightDown',
  LeftUp: 'leftUp',
  LeftDown: 'leftDown',
} as const;

export type PeekAction = (typeof PeekActions)[keyof typeof PeekActions];

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
