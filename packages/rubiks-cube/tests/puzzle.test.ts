import './setup';
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { cubingPuzzleIdForSlug, isTwistyReplaySupported, PuzzleSlugs, TwistyPuzzleElement } from '../src/puzzle';

const twistyMocks = vi.hoisted(() => ({
  shouldThrow: false,
  throwString: false,
}));

vi.mock('cubing/twisty', () => ({
  TwistyPlayer: function MockTwistyPlayer(config) {
    if (twistyMocks.shouldThrow) {
      if (twistyMocks.throwString) {
        throw 'cubing string failure';
      }
      throw new Error('cubing unavailable');
    }
    const element = document.createElement('mock-twisty-player');
    Object.defineProperties(element, {
      puzzle: {
        set(value) {
          element.setAttribute('data-puzzle', value);
        },
      },
      alg: {
        set(value) {
          element.setAttribute('data-alg', value);
        },
      },
      experimentalSetupAlg: {
        set(value) {
          element.setAttribute('data-setup-alg', value);
        },
      },
      controlPanel: {
        set(value) {
          element.setAttribute('data-control-panel', value);
        },
      },
      background: {
        set(value) {
          element.setAttribute('data-background', value);
        },
      },
      visualization: {
        set(value) {
          element.setAttribute('data-visualization', value);
        },
      },
      cameraDistance: {
        set(value) {
          element.setAttribute('data-camera-distance', String(value));
        },
      },
    });
    element.setAttribute('data-puzzle', config.puzzle);
    element.setAttribute('data-alg', config.alg ?? '');
    element.setAttribute('data-setup-alg', config.experimentalSetupAlg ?? '');
    element.setAttribute('data-control-panel', config.controlPanel ?? '');
    element.setAttribute('data-background', config.background ?? '');
    element.setAttribute('data-visualization', config.visualization ?? '');
    element.setAttribute('data-camera-distance', String(config.cameraDistance ?? ''));
    return element;
  },
}));

const tagName = 'test-twisty-puzzle-element';

beforeAll(() => {
  TwistyPuzzleElement.register(tagName);
});

afterEach(() => {
  document.body.replaceChildren();
  twistyMocks.shouldThrow = false;
  twistyMocks.throwString = false;
});

describe('twisty puzzle catalog', () => {
  test('maps repository puzzle slugs to cubing puzzle ids', () => {
    expect(cubingPuzzleIdForSlug(PuzzleSlugs.Cube3)).toBe('3x3x3');
    expect(cubingPuzzleIdForSlug(PuzzleSlugs.Megaminx)).toBe('megaminx');
    expect(cubingPuzzleIdForSlug(PuzzleSlugs.Pyraminx)).toBe('pyraminx');
    expect(cubingPuzzleIdForSlug(PuzzleSlugs.Square1)).toBe('square1');
    expect(cubingPuzzleIdForSlug(PuzzleSlugs.Clock)).toBe('clock');
    expect(cubingPuzzleIdForSlug(PuzzleSlugs.Skewb)).toBe('skewb');
  });

  test('rejects unknown replay puzzle slugs', () => {
    expect(cubingPuzzleIdForSlug('missing')).toBeUndefined();
    expect(isTwistyReplaySupported('missing')).toBe(false);
  });
});

describe('TwistyPuzzleElement', () => {
  test('register is idempotent', () => {
    TwistyPuzzleElement.register(tagName);

    expect(customElements.get(tagName)).toBe(TwistyPuzzleElement);
  });

  test('renders a cubing twisty player for supported puzzles', async () => {
    const element = document.createElement(tagName);
    element.setAttribute('puzzle', PuzzleSlugs.Pyraminx);
    element.setAttribute('alg', 'U R L B u l r b');

    document.body.append(element);
    await vi.dynamicImportSettled();

    const player = element.shadowRoot?.querySelector('mock-twisty-player');

    expect(player?.getAttribute('data-puzzle')).toBe('pyraminx');
    expect(player?.getAttribute('data-alg')).toBe('U R L B u l r b');
  });

  test('uses defaults and optional cubing player attributes', async () => {
    const element = document.createElement(tagName);
    element.setAttribute('setup-alg', 'z2');
    element.setAttribute('control-panel', 'none');
    element.setAttribute('background', 'checkered');
    element.setAttribute('visualization', '2D');
    element.setAttribute('camera-distance', '12');

    document.body.append(element);
    await vi.dynamicImportSettled();

    const player = element.shadowRoot?.querySelector('mock-twisty-player');
    expect(player?.getAttribute('data-puzzle')).toBe('3x3x3');
    expect(player?.getAttribute('data-alg')).toBe('');
    expect(player?.getAttribute('data-setup-alg')).toBe('z2');
    expect(player?.getAttribute('data-control-panel')).toBe('none');
    expect(player?.getAttribute('data-background')).toBe('checkered');
    expect(player?.getAttribute('data-visualization')).toBe('2D');
    expect(player?.getAttribute('data-camera-distance')).toBe('12');
  });

  test('updates an existing player when non-puzzle attributes change', async () => {
    const element = document.createElement(tagName) as TwistyPuzzleElement;
    element.setAttribute('puzzle', PuzzleSlugs.Clock);
    element.setAttribute('camera-distance', '-1');
    document.body.append(element);
    await vi.dynamicImportSettled();

    const player = element.shadowRoot?.querySelector('mock-twisty-player');
    expect(player?.getAttribute('data-camera-distance')).toBe('7');

    element.setAlg('UR3+ DR3+');
    element.setAttribute('setup-alg', 'y2');
    element.setAttribute('control-panel', 'bottom-row');
    element.setAttribute('background', 'none');
    element.setAttribute('visualization', '3D');
    element.setAttribute('camera-distance', '5');

    expect(player?.getAttribute('data-alg')).toBe('UR3+ DR3+');
    expect(player?.getAttribute('data-setup-alg')).toBe('y2');
    expect(player?.getAttribute('data-control-panel')).toBe('bottom-row');
    expect(player?.getAttribute('data-background')).toBe('none');
    expect(player?.getAttribute('data-visualization')).toBe('3D');
    expect(player?.getAttribute('data-camera-distance')).toBe('5');

    element.reset();
    expect(player?.getAttribute('data-alg')).toBe('');
  });

  test('rerenders if attributes change before the player exists', async () => {
    const element = document.createElement(tagName) as TwistyPuzzleElement;

    document.body.append(element);
    element.setAlg("R U R'");
    await vi.dynamicImportSettled();

    expect(element.shadowRoot?.querySelector('mock-twisty-player')?.getAttribute('data-alg')).toBe("R U R'");
  });

  test('applies defaults when updating an existing player', async () => {
    const element = document.createElement(tagName) as TwistyPuzzleElement;
    document.body.append(element);
    await vi.dynamicImportSettled();

    const player = element.shadowRoot?.querySelector('mock-twisty-player');
    element.setAlg('R U');

    expect(player?.getAttribute('data-puzzle')).toBe('3x3x3');
    expect(player?.getAttribute('data-alg')).toBe('R U');
    expect(player?.getAttribute('data-setup-alg')).toBe('');
    expect(player?.getAttribute('data-control-panel')).toBe('bottom-row');
    expect(player?.getAttribute('data-background')).toBe('none');
    expect(player?.getAttribute('data-visualization')).toBe('3D');
    expect(player?.getAttribute('data-camera-distance')).toBe('7');
  });

  test('rerenders when the puzzle changes and ignores unchanged attributes before connection', async () => {
    const element = document.createElement(tagName) as TwistyPuzzleElement;
    element.setPuzzle(PuzzleSlugs.Cube2);
    element.setAttribute('alg', 'R U');
    element.setAttribute('alg', 'R U');

    document.body.append(element);
    await vi.dynamicImportSettled();
    expect(element.shadowRoot?.querySelector('mock-twisty-player')?.getAttribute('data-puzzle')).toBe('2x2x2');

    element.setPuzzle(PuzzleSlugs.Skewb);
    await vi.dynamicImportSettled();
    expect(element.shadowRoot?.querySelector('mock-twisty-player')?.getAttribute('data-puzzle')).toBe('skewb');

    element.setPuzzle('missing');
    await vi.dynamicImportSettled();
    expect(element.shadowRoot?.textContent).toContain('Replay is not available for missing.');
  });

  test('renders fallback when cubing fails to load', async () => {
    twistyMocks.shouldThrow = true;
    const element = document.createElement(tagName);

    document.body.append(element);
    await vi.dynamicImportSettled();

    expect(element.shadowRoot?.textContent).toContain('cubing unavailable');
  });

  test('renders generic fallback for non-error cubing failures', async () => {
    twistyMocks.shouldThrow = true;
    twistyMocks.throwString = true;
    const element = document.createElement(tagName);

    document.body.append(element);
    await vi.dynamicImportSettled();

    expect(element.shadowRoot?.textContent).toContain('Replay failed to load.');
  });

  test('cleans up the player when disconnected', async () => {
    const element = document.createElement(tagName);
    document.body.append(element);
    await vi.dynamicImportSettled();
    const player = element.shadowRoot?.querySelector('mock-twisty-player');

    element.remove();

    expect(player?.isConnected).toBe(false);
  });

  test('drops a player created after the element is disconnected', async () => {
    const element = document.createElement(tagName);

    document.body.append(element);
    element.remove();
    await vi.dynamicImportSettled();

    expect(element.shadowRoot?.querySelector('mock-twisty-player')).toBeNull();
  });

  test('renders fallback text for unsupported puzzles', async () => {
    const element = document.createElement(tagName);
    element.setAttribute('puzzle', 'missing');

    document.body.append(element);
    await vi.dynamicImportSettled();

    expect(element.shadowRoot?.textContent).toContain('Replay is not available for missing.');
  });
});
