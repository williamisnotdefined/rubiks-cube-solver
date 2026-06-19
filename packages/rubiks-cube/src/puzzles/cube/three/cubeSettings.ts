import type { CubeType } from '../core';
import { CubeTypes } from '../core';

export type RubiksCube3DSettingsOptions = {
  cubeType?: CubeType;
  pieceGap?: number;
  animationSpeedMs?: number;
  animationStyle?: gsap.EaseString | gsap.EaseFunction;
  logo?: string | null;
};

export default class RubiksCube3DSettings {
  cubeType: CubeType;
  pieceGap: number;
  animationSpeedMs: number;
  animationStyle: gsap.EaseString | gsap.EaseFunction;
  logo: string | null;

  constructor(options: RubiksCube3DSettingsOptions = {}) {
    this.cubeType = options.cubeType ?? CubeTypes.Three;
    this.pieceGap = options.pieceGap ?? 1.04;
    this.animationSpeedMs = options.animationSpeedMs ?? 150;
    this.animationStyle = options.animationStyle ?? 'sine';
    this.logo = options.logo ?? null;
  }
}
