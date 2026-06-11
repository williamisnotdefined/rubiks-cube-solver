import type { TwistyPlayer } from 'cubing/twisty';
import type { CubingPuzzleId } from './catalog';

export type TwistyPuzzleControlPanel = 'auto' | 'bottom-row' | 'none';
export type TwistyPuzzleBackground = 'auto' | 'checkered' | 'checkered-transparent' | 'none';
export type TwistyPuzzleVisualization =
  | 'auto'
  | '3D'
  | '2D'
  | 'experimental-2D-LL'
  | 'experimental-2D-LL-face'
  | 'PG3D';

export type TwistyPuzzleConfig = {
  puzzle: CubingPuzzleId;
  alg?: string;
  experimentalSetupAlg?: string;
  controlPanel?: TwistyPuzzleControlPanel;
  background?: TwistyPuzzleBackground;
  visualization?: TwistyPuzzleVisualization;
  cameraDistance?: number;
};

type TwistyPlayerConstructor = typeof import('cubing/twisty').TwistyPlayer;

let twistyPlayerPromise: Promise<TwistyPlayerConstructor> | null = null;

export function loadTwistyPlayer(): Promise<TwistyPlayerConstructor> {
  twistyPlayerPromise ??= import('cubing/twisty').then((module) => module.TwistyPlayer);
  return twistyPlayerPromise;
}

export async function createTwistyPlayer(config: TwistyPuzzleConfig): Promise<TwistyPlayer> {
  const TwistyPlayer = await loadTwistyPlayer();
  return new TwistyPlayer(config as ConstructorParameters<TwistyPlayerConstructor>[0]);
}
