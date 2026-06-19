export const notInitialisedMessage =
  'PyraminxPuzzleElement is not initialised - element must be connected to the DOM before calling this method.';
export const renderEventName = 'pyraminx-render';

export const maxAzimuthAngle = (5 * Math.PI) / 16;
export const polarAngleOffset = Math.PI / 2;
export const maxPolarAngle = (5 * Math.PI) / 16;

export const InternalEvents = Object.freeze({
  cameraFieldOfViewChanged: 'pyraminxCameraFieldOfViewChanged',
  cameraRadiusChanged: 'pyraminxCameraRadiusChanged',
  cameraSettingsChanged: 'pyraminxCameraSettingsChanged',
});

export const PyraminxAttributeNames = {
  animationSpeed: 'animation-speed-ms',
  animationStyle: 'animation-style',
  antialias: 'antialias',
  cameraFieldOfView: 'camera-field-of-view',
  cameraPeekAngleHorizontal: 'camera-peek-angle-horizontal',
  cameraPeekAngleVertical: 'camera-peek-angle-vertical',
  cameraRadius: 'camera-radius',
  cameraSpeed: 'camera-speed-ms',
  maxDevicePixelRatio: 'max-device-pixel-ratio',
} as const;
