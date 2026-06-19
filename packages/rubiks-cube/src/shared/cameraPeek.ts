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
