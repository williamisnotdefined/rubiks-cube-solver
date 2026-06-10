/**
 * @typedef CameraOptions
 * @property {number} [cameraSpeedMs]
 */
/**
 * @typedef {typeof AnimationStyles[keyof typeof AnimationStyles]} AnimationStyle
 */
export const AnimationStyles: Readonly<{
    Exponential: "exponential";
    Linear: "linear";
    Next: "next";
    Fixed: "fixed";
    Match: "match";
}>;
/**
 * @typedef {typeof PeekStates [keyof typeof PeekStates]} PeekState
 */
export const PeekStates: Readonly<{
    RightUp: "rightUp";
    RightDown: "rightDown";
    LeftUp: "leftUp";
    LeftDown: "leftDown";
}>;
/**
 * @typedef {typeof PeekActions [keyof typeof PeekActions]} PeekAction
 */
export const PeekActions: Readonly<{
    Horizontal: "horizontal";
    Vertical: "vertical";
    Right: "right";
    Left: "left";
    Up: "up";
    Down: "down";
    RightUp: "rightUp";
    RightDown: "rightDown";
    LeftUp: "leftUp";
    LeftDown: "leftDown";
}>;
export namespace AttributeNames {
    let cubeType: "cube-type";
    let pieceGap: "piece-gap";
    let animationSpeed: "animation-speed-ms";
    let animationStyle: "animation-style";
    let cameraSpeed: "camera-speed-ms";
    let cameraRadius: "camera-radius";
    let cameraFieldOfView: "camera-field-of-view";
    let cameraPeekAngleHorizontal: "camera-peek-angle-horizontal";
    let cameraPeekAngleVertical: "camera-peek-angle-vertical";
    let maxDevicePixelRatio: "max-device-pixel-ratio";
    let antialias: "antialias";
    let logo: "logo";
}
export type CameraOptions = {
    cameraSpeedMs?: number;
};
export type AnimationStyle = (typeof AnimationStyles)[keyof typeof AnimationStyles];
export type PeekState = (typeof PeekStates)[keyof typeof PeekStates];
export type PeekAction = (typeof PeekActions)[keyof typeof PeekActions];
export type AttributeName = (typeof AttributeNames)[keyof typeof AttributeNames];
