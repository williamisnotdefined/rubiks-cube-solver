/// <reference path="../webComponent/globals.ts" preserve="true" />
import type { TwistyPlayer } from 'cubing/twisty';
import type { CubingPuzzleId } from './catalog';
import { cubingPuzzleIdForSlug, isTwistyReplaySupported, PuzzleSlugs } from './catalog';
import type {
  TwistyPuzzleBackground,
  TwistyPuzzleConfig,
  TwistyPuzzleControlPanel,
  TwistyPuzzleVisualization,
} from './cubingAdapter';
import { createTwistyPlayer } from './cubingAdapter';

type ResolvedTwistyPuzzleConfig = TwistyPuzzleConfig & {
  alg: string;
  experimentalSetupAlg: string;
  controlPanel: TwistyPuzzleControlPanel;
  background: TwistyPuzzleBackground;
  visualization: TwistyPuzzleVisualization;
  cameraDistance: number;
};

export const TwistyPuzzleAttributeNames = Object.freeze({
  puzzle: 'puzzle',
  alg: 'alg',
  setupAlg: 'setup-alg',
  controlPanel: 'control-panel',
  background: 'background',
  visualization: 'visualization',
  cameraDistance: 'camera-distance',
});

const defaultPuzzleSlug = PuzzleSlugs.Cube3;
const defaultControlPanel = 'bottom-row';
const defaultBackground = 'none';
const defaultVisualization = '3D';
const defaultCameraDistance = 7;

export class TwistyPuzzleElement extends HTMLElement {
  private _container: HTMLElement;
  private _player: TwistyPlayer | null;
  private _renderId: number;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    const root = this.shadowRoot as ShadowRoot;
    root.innerHTML = `<style>
            :host {
                display: block;
                inline-size: 100%;
                block-size: 100%;
                min-inline-size: 0;
                min-block-size: 0;
            }

            .container,
            twisty-player {
                display: block;
                inline-size: 100%;
                block-size: 100%;
                min-inline-size: 0;
                min-block-size: 0;
            }

            .fallback {
                box-sizing: border-box;
                display: grid;
                inline-size: 100%;
                block-size: 100%;
                min-block-size: 8rem;
                place-items: center;
                padding: 1rem;
                color: inherit;
                font: inherit;
                text-align: center;
            }
        </style><div class="container" part="container"></div>`;
    this._container = root.querySelector('.container') as HTMLElement;
    this._player = null;
    this._renderId = 0;
  }

  static get observedAttributes(): string[] {
    return Object.values(TwistyPuzzleAttributeNames);
  }

  static register(tagName = 'twisty-puzzle'): void {
    if (!customElements.get(tagName)) {
      customElements.define(tagName, TwistyPuzzleElement);
    }
  }

  connectedCallback() {
    void this._render();
  }

  disconnectedCallback() {
    this._renderId += 1;
    this._player?.remove();
    this._player = null;
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue || !this.isConnected) {
      return;
    }

    if (name === TwistyPuzzleAttributeNames.puzzle) {
      void this._render();
      return;
    }

    if (this._player) {
      this._applyPlayerConfig(this._player);
      return;
    }

    void this._render();
  }

  setPuzzle(puzzleSlug: string): void {
    this.setAttribute(TwistyPuzzleAttributeNames.puzzle, puzzleSlug);
  }

  setAlg(alg: string): void {
    this.setAttribute(TwistyPuzzleAttributeNames.alg, alg);
  }

  reset(): void {
    this.setAlg('');
  }

  private async _render(): Promise<void> {
    const renderId = this._renderId + 1;
    this._renderId = renderId;
    const puzzleSlug = this._puzzleSlug();
    const puzzle = cubingPuzzleIdForSlug(puzzleSlug);

    this._player?.remove();
    this._player = null;
    this._container.textContent = '';

    if (!isTwistyReplaySupported(puzzleSlug) || puzzle === undefined) {
      this._renderFallback(`Replay is not available for ${puzzleSlug}.`);
      return;
    }

    try {
      const player = await createTwistyPlayer(this._playerConfig(puzzle));
      if (this._renderId !== renderId || !this.isConnected) {
        player.remove();
        return;
      }

      this._player = player;
      this._container.append(player);
    } catch (error) {
      if (this._renderId === renderId) {
        this._renderFallback(error instanceof Error ? error.message : 'Replay failed to load.');
      }
    }
  }

  private _applyPlayerConfig(player: TwistyPlayer): void {
    const puzzle = cubingPuzzleIdForSlug(this._puzzleSlug());
    if (puzzle === undefined) {
      void this._render();
      return;
    }

    const config = this._playerConfig(puzzle);
    player.puzzle = config.puzzle;
    player.alg = config.alg;
    player.experimentalSetupAlg = config.experimentalSetupAlg;
    player.controlPanel = config.controlPanel;
    player.background = config.background;
    player.visualization = config.visualization;
    player.cameraDistance = config.cameraDistance;
  }

  private _playerConfig(puzzle: CubingPuzzleId): ResolvedTwistyPuzzleConfig {
    return {
      puzzle,
      alg: this.getAttribute(TwistyPuzzleAttributeNames.alg) ?? '',
      experimentalSetupAlg: this.getAttribute(TwistyPuzzleAttributeNames.setupAlg) ?? '',
      controlPanel: (this.getAttribute(TwistyPuzzleAttributeNames.controlPanel) ??
        defaultControlPanel) as TwistyPuzzleControlPanel,
      background: (this.getAttribute(TwistyPuzzleAttributeNames.background) ??
        defaultBackground) as TwistyPuzzleBackground,
      visualization: (this.getAttribute(TwistyPuzzleAttributeNames.visualization) ??
        defaultVisualization) as TwistyPuzzleVisualization,
      cameraDistance: this._cameraDistance(),
    };
  }

  private _cameraDistance(): number {
    const value = this.getAttribute(TwistyPuzzleAttributeNames.cameraDistance);
    const distance = Number(value);
    return Number.isFinite(distance) && distance > 0 ? distance : defaultCameraDistance;
  }

  private _puzzleSlug(): string {
    return this.getAttribute(TwistyPuzzleAttributeNames.puzzle) ?? defaultPuzzleSlug;
  }

  private _renderFallback(message: string): void {
    const fallback = document.createElement('div');
    fallback.className = 'fallback';
    fallback.setAttribute('part', 'fallback');
    fallback.textContent = message;
    this._container.replaceChildren(fallback);
  }
}
