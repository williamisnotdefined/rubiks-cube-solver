import { IsRotation, isMovement } from '../src/puzzles/cube/core';
import { AttributeNames, PeekActions, RubiksCubeElement } from '../src/puzzles/cube/element';
import {
  DEFAULT_MEGAMINX_ANIMATION_SPEED_MS,
  MegaminxAttributeNames,
  MegaminxMoves,
  MegaminxPuzzleElement,
} from '../src/puzzles/megaminx';
import {
  DEFAULT_PYRAMINX_ANIMATION_SPEED_MS,
  isPyraminxMove,
  PyraminxAttributeNames,
  PyraminxMoves,
  PyraminxPuzzleElement,
} from '../src/puzzles/pyraminx';
import {
  DEFAULT_SQUARE1_ANIMATION_SPEED_MS,
  isSquare1MoveToken,
  Square1AttributeNames,
  Square1MoveTokens,
  Square1PuzzleElement,
} from '../src/puzzles/square1';

if (!customElements.get('rubiks-cube')) {
  RubiksCubeElement.register();
}
if (!customElements.get('pyraminx-puzzle')) {
  PyraminxPuzzleElement.register();
}
if (!customElements.get('megaminx-puzzle')) {
  MegaminxPuzzleElement.register();
}
if (!customElements.get('square1-puzzle')) {
  Square1PuzzleElement.register();
}

const frame = /** @type {HTMLDivElement} */ (document.getElementById('cube-frame'));
const status = /** @type {HTMLDivElement} */ (document.getElementById('status'));
const puzzleTitle = /** @type {HTMLHeadingElement} */ (document.getElementById('puzzle-title'));
const quickActions = /** @type {HTMLDivElement} */ (document.getElementById('quick-actions'));
const stateOutput = /** @type {HTMLTextAreaElement} */ (document.getElementById('state-output'));
const fpsOutput = /** @type {HTMLElement} */ (document.getElementById('fps'));
const moveCountOutput = /** @type {HTMLElement} */ (document.getElementById('move-count'));
const lastMoveOutput = /** @type {HTMLElement} */ (document.getElementById('last-move-ms'));
const lastRunOutput = /** @type {HTMLElement} */ (document.getElementById('last-run-ms'));
const rendersPerSecondOutput = /** @type {HTMLElement} */ (document.getElementById('renders-per-second'));
const totalRendersOutput = /** @type {HTMLElement} */ (document.getElementById('total-renders'));
const stateInput = /** @type {HTMLTextAreaElement} */ (document.getElementById('state-input'));
const cubeOnlySettings = Array.from(document.querySelectorAll<HTMLElement>('[data-cube-only]'));
const megaminxOnlySettings = Array.from(document.querySelectorAll<HTMLElement>('[data-megaminx-only]'));
const runAlgorithmButton = /** @type {HTMLButtonElement} */ (document.getElementById('run-algorithm'));

type PuzzleKind = 'cube' | 'pyraminx' | 'megaminx' | 'square1';
type PlaygroundPuzzle = RubiksCubeElement | PyraminxPuzzleElement | MegaminxPuzzleElement | Square1PuzzleElement;
type UrlBackedInput = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const inputs = {
  puzzleKind: /** @type {HTMLSelectElement} */ (document.getElementById('puzzle-kind')),
  cubeType: /** @type {HTMLSelectElement} */ (document.getElementById('cube-type')),
  animationStyle: /** @type {HTMLSelectElement} */ (document.getElementById('animation-style')),
  animationSpeed: /** @type {HTMLInputElement} */ (document.getElementById('animation-speed-ms')),
  pieceGap: /** @type {HTMLInputElement} */ (document.getElementById('piece-gap')),
  cameraRadius: /** @type {HTMLInputElement} */ (document.getElementById('camera-radius')),
  cameraFieldOfView: /** @type {HTMLInputElement} */ (document.getElementById('camera-field-of-view')),
  cameraSpeed: /** @type {HTMLInputElement} */ (document.getElementById('camera-speed-ms')),
  cameraPeekAngleHorizontal: /** @type {HTMLInputElement} */ (document.getElementById('camera-peek-angle-horizontal')),
  cameraPeekAngleVertical: /** @type {HTMLInputElement} */ (document.getElementById('camera-peek-angle-vertical')),
  logo: /** @type {HTMLInputElement} */ (document.getElementById('logo')),
  megaminxVisualStyle: /** @type {HTMLSelectElement} */ (document.getElementById('megaminx-visual-style')),
  maxDevicePixelRatio: /** @type {HTMLSelectElement} */ (document.getElementById('max-device-pixel-ratio')),
  antialias: /** @type {HTMLSelectElement} */ (document.getElementById('antialias')),
  profileCss: /** @type {HTMLSelectElement} */ (document.getElementById('profile-css')),
  algorithm: /** @type {HTMLTextAreaElement} */ (document.getElementById('algorithm')),
  repeatCount: /** @type {HTMLInputElement} */ (document.getElementById('repeat-count')),
  stressLoop: /** @type {HTMLSelectElement} */ (document.getElementById('stress-loop')),
  fpsMonitor: /** @type {HTMLSelectElement} */ (document.getElementById('fps-monitor')),
};

const cubeAttributeInputs = [
  [AttributeNames.cubeType, inputs.cubeType],
  [AttributeNames.pieceGap, inputs.pieceGap],
  [AttributeNames.logo, inputs.logo],
] as const;

const sharedCubeAttributeInputs = [
  [AttributeNames.animationStyle, inputs.animationStyle],
  [AttributeNames.animationSpeed, inputs.animationSpeed],
  [AttributeNames.cameraSpeed, inputs.cameraSpeed],
  [AttributeNames.cameraRadius, inputs.cameraRadius],
  [AttributeNames.cameraFieldOfView, inputs.cameraFieldOfView],
  [AttributeNames.cameraPeekAngleHorizontal, inputs.cameraPeekAngleHorizontal],
  [AttributeNames.cameraPeekAngleVertical, inputs.cameraPeekAngleVertical],
  [AttributeNames.maxDevicePixelRatio, inputs.maxDevicePixelRatio],
  [AttributeNames.antialias, inputs.antialias],
] as const;

const pyraminxAttributeInputs = [
  [PyraminxAttributeNames.animationStyle, inputs.animationStyle],
  [PyraminxAttributeNames.animationSpeed, inputs.animationSpeed],
  [PyraminxAttributeNames.cameraSpeed, inputs.cameraSpeed],
  [PyraminxAttributeNames.cameraRadius, inputs.cameraRadius],
  [PyraminxAttributeNames.cameraFieldOfView, inputs.cameraFieldOfView],
  [PyraminxAttributeNames.cameraPeekAngleHorizontal, inputs.cameraPeekAngleHorizontal],
  [PyraminxAttributeNames.cameraPeekAngleVertical, inputs.cameraPeekAngleVertical],
  [PyraminxAttributeNames.maxDevicePixelRatio, inputs.maxDevicePixelRatio],
  [PyraminxAttributeNames.antialias, inputs.antialias],
] as const;

const megaminxAttributeInputs = [
  [MegaminxAttributeNames.animationStyle, inputs.animationStyle],
  [MegaminxAttributeNames.animationSpeed, inputs.animationSpeed],
  [MegaminxAttributeNames.cameraSpeed, inputs.cameraSpeed],
  [MegaminxAttributeNames.cameraRadius, inputs.cameraRadius],
  [MegaminxAttributeNames.cameraFieldOfView, inputs.cameraFieldOfView],
  [MegaminxAttributeNames.cameraPeekAngleHorizontal, inputs.cameraPeekAngleHorizontal],
  [MegaminxAttributeNames.cameraPeekAngleVertical, inputs.cameraPeekAngleVertical],
  [MegaminxAttributeNames.maxDevicePixelRatio, inputs.maxDevicePixelRatio],
  [MegaminxAttributeNames.antialias, inputs.antialias],
  [MegaminxAttributeNames.visualStyle, inputs.megaminxVisualStyle],
] as const;

const square1AttributeInputs = [
  [Square1AttributeNames.animationStyle, inputs.animationStyle],
  [Square1AttributeNames.animationSpeed, inputs.animationSpeed],
  [Square1AttributeNames.cameraSpeed, inputs.cameraSpeed],
  [Square1AttributeNames.cameraRadius, inputs.cameraRadius],
  [Square1AttributeNames.cameraFieldOfView, inputs.cameraFieldOfView],
  [Square1AttributeNames.cameraPeekAngleHorizontal, inputs.cameraPeekAngleHorizontal],
  [Square1AttributeNames.cameraPeekAngleVertical, inputs.cameraPeekAngleVertical],
  [Square1AttributeNames.maxDevicePixelRatio, inputs.maxDevicePixelRatio],
  [Square1AttributeNames.antialias, inputs.antialias],
] as const;

const cubeActions = [
  'R',
  "R'",
  'R2',
  'U',
  "U'",
  'U2',
  'F',
  "F'",
  'x',
  'y',
  'z',
  PeekActions.Horizontal,
  PeekActions.Vertical,
  PeekActions.Right,
  PeekActions.Up,
];

const pyraminxActions = Object.values(PyraminxMoves);
const megaminxActions = [
  MegaminxMoves.RPP,
  MegaminxMoves.RMM,
  MegaminxMoves.DPP,
  MegaminxMoves.DMM,
  MegaminxMoves.U,
  MegaminxMoves.UP,
] as const;
const megaminxActionSet = new Set<string>(megaminxActions);
const square1Actions = [
  Square1MoveTokens.OneZero,
  Square1MoveTokens.MinusOneZero,
  Square1MoveTokens.TwoZero,
  Square1MoveTokens.MinusTwoZero,
  Square1MoveTokens.ThreeZero,
  Square1MoveTokens.MinusThreeZero,
  Square1MoveTokens.FourZero,
  Square1MoveTokens.MinusFourZero,
  Square1MoveTokens.FiveZero,
  Square1MoveTokens.MinusFiveZero,
  Square1MoveTokens.SixZero,
  Square1MoveTokens.ZeroOne,
  Square1MoveTokens.ZeroMinusOne,
  Square1MoveTokens.ZeroTwo,
  Square1MoveTokens.ZeroMinusTwo,
  Square1MoveTokens.ZeroThree,
  Square1MoveTokens.ZeroMinusThree,
  Square1MoveTokens.ZeroFour,
  Square1MoveTokens.ZeroMinusFour,
  Square1MoveTokens.ZeroFive,
  Square1MoveTokens.ZeroMinusFive,
  Square1MoveTokens.ZeroSix,
  Square1MoveTokens.OneMinusOne,
  Square1MoveTokens.MinusOneOne,
  Square1MoveTokens.Slash,
] as const;

const defaultAlgorithms: Record<PuzzleKind, string> = {
  cube: "R U R' U'",
  megaminx: "R++ D-- R++ D-- U'",
  pyraminx: "U L R' u b'",
  square1: '(3,0) (0,3) (-3,0) (0,-3)',
};

const defaultAnimationSpeeds: Record<PuzzleKind, number> = {
  cube: 100,
  megaminx: DEFAULT_MEGAMINX_ANIMATION_SPEED_MS,
  pyraminx: DEFAULT_PYRAMINX_ANIMATION_SPEED_MS,
  square1: DEFAULT_SQUARE1_ANIMATION_SPEED_MS,
};

const urlBackedInputs: [string, UrlBackedInput][] = [
  ['puzzle', inputs.puzzleKind],
  ['cubeType', inputs.cubeType],
  ['animationStyle', inputs.animationStyle],
  ['animationSpeedMs', inputs.animationSpeed],
  ['pieceGap', inputs.pieceGap],
  ['cameraRadius', inputs.cameraRadius],
  ['cameraFov', inputs.cameraFieldOfView],
  ['cameraSpeedMs', inputs.cameraSpeed],
  ['peekHorizontal', inputs.cameraPeekAngleHorizontal],
  ['peekVertical', inputs.cameraPeekAngleVertical],
  ['logo', inputs.logo],
  ['megaminxStyle', inputs.megaminxVisualStyle],
  ['maxDpr', inputs.maxDevicePixelRatio],
  ['antialias', inputs.antialias],
  ['profileCss', inputs.profileCss],
  ['algorithm', inputs.algorithm],
  ['repeat', inputs.repeatCount],
  ['stress', inputs.stressLoop],
  ['fps', inputs.fpsMonitor],
];

let puzzle: PlaygroundPuzzle;
let moveCount = 0;
let stressRunning = false;
let algorithmRunning = false;
let fpsFrameId = 0;
let totalRenders = 0;
let lastRenderAt = 0;
let renderIdleTimer = 0;

applyUrlSettings();
puzzle = createPuzzle();

for (const [attributeName, input] of [...sharedCubeAttributeInputs, ...cubeAttributeInputs]) {
  input.addEventListener('input', () => {
    setAttributeFromInput(attributeName, input);
    updateUrlSettings();
  });
}
for (const [attributeName, input] of pyraminxAttributeInputs) {
  input.addEventListener('input', () => {
    setAttributeFromInput(attributeName, input);
    updateUrlSettings();
  });
}
for (const [attributeName, input] of megaminxAttributeInputs) {
  input.addEventListener('input', () => {
    setAttributeFromInput(attributeName, input);
    updateUrlSettings();
  });
}
for (const [attributeName, input] of square1AttributeInputs) {
  input.addEventListener('input', () => {
    setAttributeFromInput(attributeName, input);
    updateUrlSettings();
  });
}

inputs.puzzleKind.addEventListener('change', () => {
  const puzzleKind = getPuzzleKind();
  inputs.algorithm.value = defaultAlgorithms[puzzleKind];
  inputs.animationSpeed.value = String(defaultAnimationSpeeds[puzzleKind]);
  remountPuzzle();
  updateUrlSettings();
});

document.getElementById('reset')?.addEventListener('click', () => {
  puzzle.reset();
  updateState();
  setStatus('reset');
});

document.getElementById('get-state')?.addEventListener('click', updateState);
document.getElementById('set-state')?.addEventListener('click', () => {
  const updated = puzzle.setState(stateInput.value.trim());
  setStatus(updated ? 'state applied' : 'invalid state');
  updateState();
});
document.getElementById('remount')?.addEventListener('click', remountPuzzle);
runAlgorithmButton.addEventListener('click', () => runAlgorithm());
inputs.fpsMonitor.addEventListener('change', () => {
  updateFpsMonitor();
  updateUrlSettings();
});
inputs.profileCss.addEventListener('change', () => {
  updateProfileCss();
  updateUrlSettings();
});
inputs.algorithm.addEventListener('input', updateUrlSettings);
inputs.repeatCount.addEventListener('input', updateUrlSettings);
inputs.stressLoop.addEventListener('change', updateUrlSettings);
document.getElementById('stop-stress')?.addEventListener('click', () => {
  stressRunning = false;
  inputs.stressLoop.value = 'off';
  updateUrlSettings();
  setStatus('idle');
});

updateProfileCss();
updateFpsMonitor();
updateState();

function applyUrlSettings() {
  const params = new URLSearchParams(window.location.search);
  for (const [paramName, input] of urlBackedInputs) {
    const value = params.get(paramName);
    if (value == null) {
      continue;
    }
    setInputValueFromUrl(input, value);
  }
  const puzzleKind = getPuzzleKind();
  if (!params.has('algorithm')) {
    inputs.algorithm.value = defaultAlgorithms[puzzleKind];
  }
  if (!params.has('animationSpeedMs')) {
    inputs.animationSpeed.value = String(defaultAnimationSpeeds[puzzleKind]);
  }
}

function setInputValueFromUrl(input: UrlBackedInput, value: string) {
  if (input instanceof HTMLSelectElement) {
    const optionExists = Array.from(input.options).some((option) => option.value === value);
    if (!optionExists) {
      return;
    }
  }
  input.value = value;
}

function updateUrlSettings() {
  const params = new URLSearchParams();
  for (const [paramName, input] of urlBackedInputs) {
    const value = input.value.trim();
    if (value !== '') {
      params.set(paramName, value);
    }
  }
  const search = params.toString();
  const nextUrl = `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`;
  if (nextUrl !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
    window.history.replaceState(null, '', nextUrl);
  }
}

function getPuzzleKind(): PuzzleKind {
  if (inputs.puzzleKind.value === 'pyraminx') {
    return 'pyraminx';
  }
  if (inputs.puzzleKind.value === 'megaminx') {
    return 'megaminx';
  }
  if (inputs.puzzleKind.value === 'square1') {
    return 'square1';
  }
  return 'cube';
}

function createPuzzle(): PlaygroundPuzzle {
  puzzle?.removeEventListener('rubiks-cube-render', onPuzzleRender);
  puzzle?.removeEventListener('pyraminx-render', onPuzzleRender);
  puzzle?.removeEventListener('megaminx-render', onPuzzleRender);
  puzzle?.removeEventListener('square1-render', onPuzzleRender);
  const puzzleKind = getPuzzleKind();
  updatePlaygroundChrome(puzzleKind);
  renderQuickActions();

  const nextPuzzle =
    puzzleKind === 'pyraminx'
      ? createPyraminx()
      : puzzleKind === 'megaminx'
        ? createMegaminx()
        : puzzleKind === 'square1'
          ? createSquare1()
          : createCube();
  frame.replaceChildren(nextPuzzle);
  return nextPuzzle;
}

function createCube(): RubiksCubeElement {
  const nextCube = document.createElement('rubiks-cube');
  nextCube.setAttribute('render-events', '');
  applyAttributes(nextCube, [...sharedCubeAttributeInputs, ...cubeAttributeInputs]);
  nextCube.addEventListener('rubiks-cube-render', onPuzzleRender);
  return /** @type {RubiksCubeElement} */ (nextCube);
}

function createPyraminx(): PyraminxPuzzleElement {
  const pyraminx = document.createElement('pyraminx-puzzle');
  pyraminx.setAttribute('render-events', '');
  applyAttributes(pyraminx, pyraminxAttributeInputs);
  pyraminx.addEventListener('pyraminx-render', onPuzzleRender);
  return /** @type {PyraminxPuzzleElement} */ (pyraminx);
}

function createMegaminx(): MegaminxPuzzleElement {
  const megaminx = document.createElement('megaminx-puzzle');
  megaminx.setAttribute('render-events', '');
  applyAttributes(megaminx, megaminxAttributeInputs);
  megaminx.addEventListener('megaminx-render', onPuzzleRender);
  return /** @type {MegaminxPuzzleElement} */ (megaminx);
}

function createSquare1(): Square1PuzzleElement {
  const square1 = document.createElement('square1-puzzle');
  square1.setAttribute('render-events', '');
  applyAttributes(square1, square1AttributeInputs);
  square1.addEventListener('square1-render', onPuzzleRender);
  return /** @type {Square1PuzzleElement} */ (square1);
}

function remountPuzzle() {
  puzzle = createPuzzle();
  moveCount = 0;
  moveCountOutput.textContent = '0';
  stateInput.value = '';
  updateState();
  setStatus('remounted');
}

function renderQuickActions() {
  const puzzleKind = getPuzzleKind();
  const actions =
    puzzleKind === 'pyraminx'
      ? pyraminxActions
      : puzzleKind === 'megaminx'
        ? megaminxActions
        : puzzleKind === 'square1'
          ? square1Actions
          : cubeActions;
  quickActions.replaceChildren(
    ...actions.map((action) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = action;
      button.addEventListener('click', () => runAction(action));
      return button;
    }),
  );
}

function updatePlaygroundChrome(puzzleKind: PuzzleKind) {
  puzzleTitle.textContent =
    puzzleKind === 'pyraminx'
      ? 'Pyraminx'
      : puzzleKind === 'megaminx'
        ? 'Megaminx'
        : puzzleKind === 'square1'
          ? 'Square-1'
          : 'Rubiks Cube';
  stateInput.placeholder =
    puzzleKind === 'pyraminx'
      ? 'Paste a pyraminx-stickers-v1 state string'
      : puzzleKind === 'megaminx'
        ? 'Paste a megaminx-stickers-v1 state string'
        : puzzleKind === 'square1'
          ? 'Paste a square1-pieces-v2 state string'
          : 'Paste a Kociemba state string';
  for (const setting of cubeOnlySettings) {
    setting.hidden = puzzleKind !== 'cube';
  }
  for (const setting of megaminxOnlySettings) {
    setting.hidden = puzzleKind !== 'megaminx';
  }
}

function applyAttributes(element: HTMLElement, attributeInputPairs) {
  for (const [attributeName, input] of attributeInputPairs) {
    if (input.value.trim() !== '') {
      element.setAttribute(attributeName, input.value);
    }
  }
}

/**
 * @param {string} attributeName
 * @param {HTMLInputElement | HTMLSelectElement} input
 */
function setAttributeFromInput(attributeName, input) {
  if (attributeName === AttributeNames.logo && input.value.trim() === '') {
    puzzle.removeAttribute(attributeName);
    return;
  }
  puzzle.setAttribute(attributeName, input.value);
}

/**
 * @param {string} action
 */
async function runAction(action) {
  const startedAt = performance.now();
  setStatus(`running ${action}`);
  try {
    if (getPuzzleKind() === 'pyraminx') {
      if (!isPyraminxMove(action)) {
        throw new Error(`Unsupported Pyraminx action: ${action}`);
      }
      await (puzzle as PyraminxPuzzleElement).move(action);
    } else if (getPuzzleKind() === 'megaminx') {
      if (!isMegaminxPlaygroundAction(action)) {
        throw new Error(`Unsupported Megaminx action: ${action}`);
      }
      await (puzzle as MegaminxPuzzleElement).move(action);
    } else if (getPuzzleKind() === 'square1') {
      if (!isSquare1MoveToken(action)) {
        throw new Error(`Unsupported Square-1 action: ${action}`);
      }
      await (puzzle as Square1PuzzleElement).move(action);
    } else if (isMovement(action)) {
      await (puzzle as RubiksCubeElement).move(action);
    } else if (IsRotation(action)) {
      await (puzzle as RubiksCubeElement).rotate(action);
    } else if (Object.values(PeekActions).includes(action)) {
      await (puzzle as RubiksCubeElement).peek(action);
    } else {
      throw new Error(`Unsupported action: ${action}`);
    }
    moveCount++;
    moveCountOutput.textContent = String(moveCount);
    lastMoveOutput.textContent = `${Math.round(performance.now() - startedAt)} ms`;
    updateState();
    setStatus('idle');
  } catch (error) {
    setStatus('error');
    console.error(error);
  }
}

async function runAlgorithm() {
  if (algorithmRunning) {
    setStatus('already running');
    return;
  }

  const startedAt = performance.now();
  const repeatCount = Math.max(1, Number(inputs.repeatCount.value) || 1);
  const stress = inputs.stressLoop.value === 'on';
  const actions = parseAlgorithm(inputs.algorithm.value);
  if (actions.length === 0) {
    setStatus('no valid actions');
    return;
  }
  algorithmRunning = true;
  runAlgorithmButton.disabled = true;
  stressRunning = stress;
  setStatus(stress ? 'stress running' : 'algorithm running');
  try {
    do {
      for (let repeat = 0; repeat < repeatCount && (!stress || stressRunning); repeat++) {
        for (const action of actions) {
          if (stress && !stressRunning) break;
          await runAction(action);
        }
      }
    } while (stress && stressRunning);
    lastRunOutput.textContent = `${Math.round(performance.now() - startedAt)} ms`;
    setStatus('idle');
  } catch (error) {
    setStatus('error');
    console.error(error);
  } finally {
    algorithmRunning = false;
    runAlgorithmButton.disabled = false;
    if (!stressRunning) {
      inputs.stressLoop.value = 'off';
      updateUrlSettings();
    }
  }
}

/**
 * @param {string} value
 * @returns {string[]}
 */
function parseAlgorithm(value) {
  const puzzleKind = getPuzzleKind();
  return value
    .replace(/\s*\/\/.*$/gm, '')
    .replace(/\s+/gm, ' ')
    .trim()
    .split(' ')
    .filter((action) => action.length > 0)
    .filter((action) => {
      const valid =
        puzzleKind === 'pyraminx'
          ? isPyraminxMove(action)
          : puzzleKind === 'megaminx'
            ? isMegaminxPlaygroundAction(action)
            : puzzleKind === 'square1'
              ? isSquare1MoveToken(action)
              : isMovement(action) || IsRotation(action);
      if (!valid) {
        console.warn(`Ignoring invalid action: ${action}`);
      }
      return valid;
    });
}

function isMegaminxPlaygroundAction(action: string): action is (typeof megaminxActions)[number] {
  return megaminxActionSet.has(action);
}

function updateState() {
  try {
    stateOutput.value = puzzle.getState();
    if (stateInput.value.trim() === '') {
      stateInput.value = stateOutput.value;
    }
  } catch (error) {
    stateOutput.value = String(error);
  }
}

/**
 * @param {string} value
 */
function setStatus(value) {
  status.textContent = value;
}

function updateProfileCss() {
  document.body.classList.toggle('profile-css', inputs.profileCss.value === 'on');
}

function onPuzzleRender() {
  const now = performance.now();
  totalRenders++;
  totalRendersOutput.textContent = String(totalRenders);
  if (lastRenderAt !== 0) {
    rendersPerSecondOutput.textContent = String(Math.round(1000 / Math.max(now - lastRenderAt, 1)));
  }
  lastRenderAt = now;
  clearTimeout(renderIdleTimer);
  renderIdleTimer = window.setTimeout(() => {
    rendersPerSecondOutput.textContent = '0';
    lastRenderAt = 0;
  }, 250);
}

function updateFpsMonitor() {
  if (inputs.fpsMonitor.value === 'on') {
    startFpsMonitor();
  } else {
    stopFpsMonitor();
  }
}

function startFpsMonitor() {
  if (fpsFrameId !== 0) {
    return;
  }
  let frameCount = 0;
  let lastSample = performance.now();
  const tick = (now) => {
    frameCount++;
    if (now - lastSample >= 1000) {
      fpsOutput.textContent = String(Math.round((frameCount * 1000) / (now - lastSample)));
      frameCount = 0;
      lastSample = now;
    }
    fpsFrameId = requestAnimationFrame(tick);
  };
  fpsFrameId = requestAnimationFrame(tick);
}

function stopFpsMonitor() {
  if (fpsFrameId !== 0) {
    cancelAnimationFrame(fpsFrameId);
    fpsFrameId = 0;
  }
  fpsOutput.textContent = 'off';
}
