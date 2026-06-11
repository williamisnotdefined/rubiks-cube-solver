import type { CubeType, Movement, Rotation } from '../core';
import { CubeTypes, IsRotation, isMovement, reverse } from '../core';
import { RubiksCubeState } from '../state';
import { RubiksCubeElement } from '../webComponent/rubiksCubeElement';
import styles from './styles.css?inline';

const sheet = new CSSStyleSheet();
sheet.replaceSync(styles);

export const RubiksCubePlayerAttributes = {
  CubeType: 'cubeType',
  Setup: 'setup',
  Alg: 'alg',
} as const;

const PlayState = {
  Idle: 'idle',
  Forward: 'forward',
  Backward: 'backward',
} as const;

type PlayState = (typeof PlayState)[keyof typeof PlayState];

export class RubiksCubePlayer extends HTMLElement {
  rubiksCubeElement: RubiksCubeElement;
  startButton: HTMLButtonElement;
  backwardsStepButton: HTMLButtonElement;
  backwardsButton: HTMLButtonElement;
  stopButton: HTMLButtonElement;
  forwardsStepbutton: HTMLButtonElement;
  forwardbutton: HTMLButtonElement;
  endButton: HTMLButtonElement;
  cubeType: CubeType;
  setup: string;
  alg: string;
  setupState: string | null;
  algMoves: (Movement | Rotation)[];
  currentMoveIndex: number;
  playState: PlayState;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    const root = this.shadowRoot as ShadowRoot;
    root.innerHTML = `
        <rubiks-cube camera-radius="10" camera-field-of-view="40"></rubiks-cube>
        <div class="playback-options">
                <button class="playback-icon" id="playback-start" aria-label="Jump to start">
                    <svg xmlns="http://www.w3.org/2000/svg" height="24" width="24" viewBox="0 0 640 640">
                        <path
                            d="M556.2 541.6C544.2 546.6 530.5 543.8 521.3 534.7L352 365.3L352 512C352 524.9 344.2 536.6 332.2 541.6C320.2 546.6 306.5 543.8 297.3 534.7L128 365.3L128 512C128 529.7 113.7 544 96 544C78.3 544 64 529.7 64 512L64 128C64 110.3 78.3 96 96 96C113.7 96 128 110.3 128 128L128 274.7L297.4 105.4C306.6 96.2 320.3 93.5 332.3 98.5C344.3 103.5 352 115.1 352 128L352 274.7L521.4 105.3C530.6 96.1 544.3 93.4 556.3 98.4C568.3 103.4 576 115.1 576 128L576 512C576 524.9 568.2 536.6 556.2 541.6z"
                        />
                    </svg>
                </button>
                <button class="playback-icon" id="playback-backward" aria-label="rewind">
                    <svg xmlns="http://www.w3.org/2000/svg" height="24" width="24" viewBox="0 0 640 640">
                        <path
                            d="M236.3 107.1C247.9 96 265 92.9 279.7 99.2C294.4 105.5 304 120 304 136L304 272.3L476.3 107.2C487.9 96 505 92.9 519.7 99.2C534.4 105.5 544 120 544 136L544 504C544 520 534.4 534.5 519.7 540.8C505 547.1 487.9 544 476.3 532.9L304 367.7L304 504C304 520 294.4 534.5 279.7 540.8C265 547.1 247.9 544 236.3 532.9L44.3 348.9C36.5 341.3 32 330.9 32 320C32 309.1 36.5 298.7 44.3 291.1L236.3 107.1z"
                        />
                    </svg>
                </button>
                <button class="playback-icon" id="playback-backward-step" aria-label="Previous step">
                    <svg xmlns="http://www.w3.org/2000/svg" height="24" width="24" viewBox="0 0 640 640">
                        <path
                            d="M491 100.8C478.1 93.8 462.3 94.5 450 102.6L192 272.1L192 128C192 110.3 177.7 96 160 96C142.3 96 128 110.3 128 128L128 512C128 529.7 142.3 544 160 544C177.7 544 192 529.7 192 512L192 367.9L450 537.5C462.3 545.6 478 546.3 491 539.3C504 532.3 512 518.8 512 504.1L512 136.1C512 121.4 503.9 107.9 491 100.9z"
                        />
                    </svg>
                </button>
                <button class="playback-icon" id="playback-stop" aria-label="Stop playback">
                    <svg xmlns="http://www.w3.org/2000/svg" height="24" width="24" viewBox="0 0 640 640">
                        <path
                            d="M160 96L480 96C515.3 96 544 124.7 544 160L544 480C544 515.3 515.3 544 480 544L160 544C124.7 544 96 515.3 96 480L96 160C96 124.7 124.7 96 160 96z"
                        />
                    </svg>
                </button>
                <button class="playback-icon" id="playback-forward-step" aria-label="Next step">
                    <svg xmlns="http://www.w3.org/2000/svg" height="24" width="24" viewBox="0 0 640 640">
                        <path
                            d="M149 100.8C161.9 93.8 177.7 94.5 190 102.6L448 272.1L448 128C448 110.3 462.3 96 480 96C497.7 96 512 110.3 512 128L512 512C512 529.7 497.7 544 480 544C462.3 544 448 529.7 448 512L448 367.9L190 537.5C177.7 545.6 162 546.3 149 539.3C136 532.3 128 518.7 128 504L128 136C128 121.3 136.1 107.8 149 100.8z"
                        />
                    </svg>
                </button>
                <button class="playback-icon" id="playback-forward" aria-label="Play Forward">
                    <svg xmlns="http://www.w3.org/2000/svg" height="24" width="24" viewBox="0 0 640 640">
                        <path
                            d="M403.7 107.1C392.1 96 375 92.9 360.3 99.2C345.6 105.5 336 120 336 136L336 272.3L163.7 107.2C152.1 96 135 92.9 120.3 99.2C105.6 105.5 96 120 96 136L96 504C96 520 105.6 534.5 120.3 540.8C135 547.1 152.1 544 163.7 532.9L336 367.7L336 504C336 520 345.6 534.5 360.3 540.8C375 547.1 392.1 544 403.7 532.9L595.7 348.9C603.6 341.4 608 330.9 608 320C608 309.1 603.5 298.7 595.7 291.1L403.7 107.1z"
                        />
                    </svg>
                </button>
                <button class="playback-icon" id="playback-end" aria-label="Jump to end">
                    <svg xmlns="http://www.w3.org/2000/svg" height="24" width="24" viewBox="0 0 640 640">
                        <path
                            d="M83.8 541.6C95.8 546.6 109.5 543.8 118.7 534.7L288 365.3L288 512C288 524.9 295.8 536.6 307.8 541.6C319.8 546.6 333.5 543.8 342.7 534.7L512 365.3L512 512C512 529.7 526.3 544 544 544C561.7 544 576 529.7 576 512L576 128C576 110.3 561.7 96 544 96C526.3 96 512 110.3 512 128L512 274.7L342.6 105.3C333.4 96.1 319.7 93.4 307.7 98.4C295.7 103.4 288 115.1 288 128L288 274.7L118.6 105.4C109.4 96.2 95.7 93.5 83.7 98.5C71.7 103.5 64 115.1 64 128L64 512C64 524.9 71.8 536.6 83.8 541.6z"
                        />
                    </svg>
                </button>
        </div>`;
    root.adoptedStyleSheets = [sheet];
    this.rubiksCubeElement = root.querySelector('rubiks-cube') as RubiksCubeElement;
    this.startButton = root.querySelector('#playback-start') as HTMLButtonElement;
    this.backwardsStepButton = root.querySelector('#playback-backward-step') as HTMLButtonElement;
    this.backwardsButton = root.querySelector('#playback-backward') as HTMLButtonElement;
    this.stopButton = root.querySelector('#playback-stop') as HTMLButtonElement;
    this.forwardsStepbutton = root.querySelector('#playback-forward-step') as HTMLButtonElement;
    this.forwardbutton = root.querySelector('#playback-forward') as HTMLButtonElement;
    this.endButton = root.querySelector('#playback-end') as HTMLButtonElement;
    this.cubeType = CubeTypes.Three;
    this.setup = '';
    this.alg = '';
    this.setupState = null;
    this.algMoves = [];
    this.currentMoveIndex = 0;
    this.playState = PlayState.Idle;
  }

  static register(tagName = 'rubiks-cube-player'): void {
    if (!customElements.get(tagName)) {
      customElements.define(tagName, RubiksCubePlayer);
    }
  }

  static get observedAttributes(): string[] {
    return [...Object.values(RubiksCubePlayerAttributes), RubiksCubePlayerAttributes.CubeType.toLowerCase()];
  }

  connectedCallback(): void {
    RubiksCubeElement.register();
    for (const attr of RubiksCubeElement.observedAttributes) {
      if (this.hasAttribute(attr)) {
        this.rubiksCubeElement.setAttribute(attr, this.getAttribute(attr) as string);
      }
    }
    for (const attr of Object.values(RubiksCubePlayerAttributes)) {
      if (this.hasAttribute(attr)) {
        this.attributeChangedCallback(attr, null, this.getAttribute(attr));
      }
    }
    this.startButton.addEventListener('click', () => this.jumpToStart());
    this.backwardsButton.addEventListener('click', () => this.playBackward());
    this.backwardsStepButton.addEventListener('click', () => this.stepBackward());
    this.stopButton.addEventListener('click', () => this.stop());
    this.forwardsStepbutton.addEventListener('click', () => this.stepForward());
    this.forwardbutton.addEventListener('click', () => this.playForward());
    this.endButton.addEventListener('click', () => this.jumpToEnd());
  }

  attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null): void {
    switch (name) {
      case RubiksCubePlayerAttributes.CubeType:
      case 'cubetype':
        this.cubeType = (newVal ?? CubeTypes.Three) as CubeType;
        this.rubiksCubeElement.setType(this.cubeType);
        break;
      case RubiksCubePlayerAttributes.Setup:
        this.setup = newVal ?? '';
        break;
      case RubiksCubePlayerAttributes.Alg:
        this.alg = newVal ?? '';
        break;
    }
    this.init();
  }

  cleanScramble(scramble: string): string[] {
    if (!scramble) {
      return [];
    }
    return scramble
      .replace(/\s*\/\/.*$/gm, '')
      .replace(/\s+/gm, ' ')
      .trim()
      .split(' ')
      .filter((token) => token.length > 0);
  }

  init(): void {
    const setupActions = this.cleanScramble(this.setup).filter(
      (action): action is Rotation | Movement => isMovement(action) || IsRotation(action),
    );
    const setupState = new RubiksCubeState(this.cubeType);
    setupState.do(setupActions);
    this.setupState = setupState.getKociemba();
    this.algMoves = this.cleanScramble(this.alg).filter(
      (action): action is Rotation | Movement => isMovement(action) || IsRotation(action),
    );
    this.currentMoveIndex = 0;
    this.playState = PlayState.Idle;
    this.rubiksCubeElement.setState(this.setupState);
  }

  private _animate(action: Movement | Rotation, reverseAction: boolean): Promise<string> {
    if (isMovement(action)) {
      const directed = reverseAction ? reverse(action) : action;
      return this.rubiksCubeElement.move(directed);
    }
    const directed = reverseAction ? reverse(action) : action;
    return this.rubiksCubeElement.rotate(directed);
  }

  async stepForward(): Promise<void> {
    this.playState = PlayState.Idle;
    if (this.currentMoveIndex >= this.algMoves.length) {
      return;
    }
    const action = this.algMoves[this.currentMoveIndex];
    this.currentMoveIndex++;
    await this._animate(action, false);
  }

  async stepBackward(): Promise<void> {
    this.playState = PlayState.Idle;
    if (this.currentMoveIndex <= 0) {
      return;
    }
    this.currentMoveIndex--;
    const action = this.algMoves[this.currentMoveIndex];
    await this._animate(action, true);
  }

  async playForward(): Promise<void> {
    if (this.playState === PlayState.Forward) {
      return;
    }
    this.playState = PlayState.Forward;
    while (this.playState === PlayState.Forward && this.currentMoveIndex < this.algMoves.length) {
      const action = this.algMoves[this.currentMoveIndex];
      this.currentMoveIndex++;
      await this._animate(action, false);
    }
    if (this.playState === PlayState.Forward) {
      this.playState = PlayState.Idle;
    }
  }

  async playBackward(): Promise<void> {
    if (this.playState === PlayState.Backward) {
      return;
    }
    this.playState = PlayState.Backward;
    while (this.playState === PlayState.Backward && this.currentMoveIndex > 0) {
      this.currentMoveIndex--;
      const action = this.algMoves[this.currentMoveIndex];
      await this._animate(action, true);
    }
    if (this.playState === PlayState.Backward) {
      this.playState = PlayState.Idle;
    }
  }

  stop(): void {
    this.playState = PlayState.Idle;
  }

  jumpToStart(): void {
    this.stop();
    this.currentMoveIndex = 0;
    if (this.setupState) {
      this.rubiksCubeElement.setState(this.setupState);
    }
  }

  jumpToEnd(): void {
    this.stop();
    const finalState = new RubiksCubeState(this.cubeType);
    if (this.setupState) {
      finalState.setKociemba(this.setupState);
    }
    finalState.do(this.algMoves);
    this.rubiksCubeElement.setState(finalState.getKociemba());
    this.currentMoveIndex = this.algMoves.length;
  }
}
