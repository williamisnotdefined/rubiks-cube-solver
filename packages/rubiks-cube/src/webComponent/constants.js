/**
 * @typedef CameraOptions
 * @property {number} [cameraSpeedMs]
 */

/**
 * @typedef {typeof AnimationStyles[keyof typeof AnimationStyles]} AnimationStyle
 */
export const AnimationStyles = Object.freeze({
    Exponential: 'exponential',
    Linear: 'linear',
    Next: 'next',
    Fixed: 'fixed',
    Match: 'match',
});

/**
 * @typedef {typeof PeekStates [keyof typeof PeekStates]} PeekState
 */
export const PeekStates = Object.freeze({
    RightUp: 'rightUp',
    RightDown: 'rightDown',
    LeftUp: 'leftUp',
    LeftDown: 'leftDown',
});

/**
 * @typedef {typeof PeekActions [keyof typeof PeekActions]} PeekAction
 */
export const PeekActions = Object.freeze({
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
});

/**
 * @typedef {typeof AttributeNames[keyof typeof AttributeNames]} AttributeName
 */
export const AttributeNames = {
    /** @type {'cube-type'} */
    cubeType: 'cube-type',
    /** @type {'piece-gap'} */
    pieceGap: 'piece-gap',
    /** @type {'animation-speed-ms'} */
    animationSpeed: 'animation-speed-ms',
    /** @type {'animation-style'} */
    animationStyle: 'animation-style',
    /** @type {'camera-speed-ms'} */
    cameraSpeed: 'camera-speed-ms',
    /** @type {'camera-radius'} */
    cameraRadius: 'camera-radius',
    /** @type {'camera-field-of-view'} */
    cameraFieldOfView: 'camera-field-of-view',
    /** @type {'camera-peek-angle-horizontal'} */
    cameraPeekAngleHorizontal: 'camera-peek-angle-horizontal',
    /** @type {'camera-peek-angle-vertical'} */
    cameraPeekAngleVertical: 'camera-peek-angle-vertical',
    /** @type {'max-device-pixel-ratio'} */
    maxDevicePixelRatio: 'max-device-pixel-ratio',
    /** @type {'antialias'} */
    antialias: 'antialias',
    /** @type {'logo'} */
    logo: 'logo',
};
