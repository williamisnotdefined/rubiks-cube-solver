import type { CubeType, Movement, Rotation } from '../core';
import { CubeTypes } from '../core';
import { RubiksCubeState } from '../state';
import type { Slice } from '../state/slice';
import type { StickerState } from '../state/stickerState';
import { fromKociemba, toKociemba } from '../state/stickerState';

export type AnimationOptions = {
  translate?: boolean;
  animationSpeedMs?: number;
  reverse?: boolean;
};

export type RubiksCubeViewInterface = {
  slice(slice: Slice, options?: { animationSpeedMs?: number }): Promise<void>;
  setState(state: StickerState): void;
  reset(): void;
  setType(cubeType: CubeType): void;
};

export default class RubiksCubeController {
  state: RubiksCubeState;
  view: RubiksCubeViewInterface;

  constructor(cubeType: CubeType, view: RubiksCubeViewInterface) {
    this.state = new RubiksCubeState(cubeType);
    this.view = view;
  }

  movement(movement: Movement, options: AnimationOptions = {}): Promise<string> {
    const slice = this.state.move(movement, { reverse: options?.reverse, translate: options?.translate });
    if (slice == null) {
      return Promise.reject(new Error(`Invalid movement: ${movement}`));
    }
    return this.view
      .slice(slice, { animationSpeedMs: options?.animationSpeedMs })
      .then(() => toKociemba(this.state.getState()));
  }

  rotation(rotation: Rotation, options: AnimationOptions = {}): Promise<string> {
    const slice = this.state.rotate(rotation, { reverse: options?.reverse });
    if (slice == null) {
      return Promise.reject(new Error(`Invalid rotation: ${rotation}`));
    }
    return this.view
      .slice(slice, { animationSpeedMs: options?.animationSpeedMs })
      .then(() => toKociemba(this.state.getState()));
  }

  do(actions: (Rotation | Movement)[], options: AnimationOptions = {}): string {
    this.state.do(actions, { translate: options?.translate, reverse: options?.reverse });
    this.view.setState(this.state.getState());
    return toKociemba(this.state.getState());
  }

  reset(): string {
    this.state.reset();
    this.view.reset();
    return toKociemba(this.state.getState());
  }

  setState(kociembaState: string): boolean {
    const state = fromKociemba(kociembaState);
    if (state) {
      this.state.setState(state);
      this.view.setState(state);
      return true;
    }
    return false;
  }

  getState(): string {
    return toKociemba(this.state.getState());
  }

  setType(cubeType: CubeType): string {
    if (!Object.values(CubeTypes).includes(cubeType)) {
      throw new Error(`Invalid cube type: ${cubeType}`);
    }
    this.state = new RubiksCubeState(cubeType);
    this.view.setType(cubeType);
    return toKociemba(this.state.getState());
  }
}
