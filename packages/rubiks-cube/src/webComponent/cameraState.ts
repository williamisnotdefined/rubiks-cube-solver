import type { PeekAction, PeekState } from './constants';
import { PeekActions, PeekStates } from './constants';

export class CameraState {
  Up: boolean;
  Right: boolean;

  constructor(up = true, right = true) {
    this.Up = up;
    this.Right = right;
  }

  peekCamera(action: PeekAction): void {
    switch (action) {
      case PeekActions.Horizontal:
        this.Right = !this.Right;
        break;
      case PeekActions.Vertical:
        this.Up = !this.Up;
        break;
      case PeekActions.Right:
        this.Right = true;
        break;
      case PeekActions.Left:
        this.Right = false;
        break;
      case PeekActions.Up:
        this.Up = true;
        break;
      case PeekActions.Down:
        this.Up = false;
        break;
      case PeekActions.RightUp:
        this.Right = true;
        this.Up = true;
        break;
      case PeekActions.RightDown:
        this.Right = true;
        this.Up = false;
        break;
      case PeekActions.LeftUp:
        this.Right = false;
        this.Up = true;
        break;
      case PeekActions.LeftDown:
        this.Right = false;
        this.Up = false;
        break;
    }
  }
  toPeekState(): PeekState {
    if (this.Right && this.Up) {
      return PeekStates.RightUp;
    }
    if (!this.Right && this.Up) {
      return PeekStates.LeftUp;
    }
    if (this.Right && !this.Up) {
      return PeekStates.RightDown;
    }
    return PeekStates.LeftDown;
  }
}
