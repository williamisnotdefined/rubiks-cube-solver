import { IsRotation, isMovement } from '../src/core';
import {
  DEFAULT_PYRAMINX_ANIMATION_SPEED_MS,
  isPyraminxMove,
  PyraminxAttributeNames,
  PyraminxMoves,
  PyraminxPuzzleElement,
} from '../src/puzzles/pyraminx';
import { AttributeNames, PeekActions, RubiksCubeElement } from '../src/webComponent';

if (!customElements.get('rubiks-cube')) {
  RubiksCubeElement.register();
}
if (!customElements.get('pyraminx-puzzle')) {
  PyraminxPuzzleElement.register();
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
const runAlgorithmButton = /** @type {HTMLButtonElement} */ (document.getElementById('run-algorithm'));

type PuzzleKind = 'cube' | 'pyraminx';
type PlaygroundPuzzle = RubiksCubeElement | PyraminxPuzzleElement;

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

const defaultAlgorithms: Record<PuzzleKind, string> = {
  cube: "R U R' U'",
  pyraminx: "U L R' u b'",
};

const defaultAnimationSpeeds: Record<PuzzleKind, number> = {
  cube: 100,
  pyraminx: DEFAULT_PYRAMINX_ANIMATION_SPEED_MS,
};

let puzzle: PlaygroundPuzzle;
let moveCount = 0;
let stressRunning = false;
let algorithmRunning = false;
let fpsFrameId = 0;
let totalRenders = 0;
let lastRenderAt = 0;
let renderIdleTimer = 0;

puzzle = createPuzzle();

for (const [attributeName, input] of [...sharedCubeAttributeInputs, ...cubeAttributeInputs]) {
  input.addEventListener('input', () => setAttributeFromInput(attributeName, input));
}
for (const [attributeName, input] of pyraminxAttributeInputs) {
  input.addEventListener('input', () => setAttributeFromInput(attributeName, input));
}

inputs.puzzleKind.addEventListener('change', () => {
  const puzzleKind = getPuzzleKind();
  inputs.algorithm.value = defaultAlgorithms[puzzleKind];
  inputs.animationSpeed.value = String(defaultAnimationSpeeds[puzzleKind]);
  remountPuzzle();
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
  if (inputs.fpsMonitor.value === 'on') {
    startFpsMonitor();
  } else {
    stopFpsMonitor();
  }
});
inputs.profileCss.addEventListener('change', updateProfileCss);
document.getElementById('stop-stress')?.addEventListener('click', () => {
  stressRunning = false;
  inputs.stressLoop.value = 'off';
  setStatus('idle');
});

updateProfileCss();
updateState();

function getPuzzleKind(): PuzzleKind {
  return inputs.puzzleKind.value === 'pyraminx' ? 'pyraminx' : 'cube';
}

function createPuzzle(): PlaygroundPuzzle {
  puzzle?.removeEventListener('rubiks-cube-render', onPuzzleRender);
  puzzle?.removeEventListener('pyraminx-render', onPuzzleRender);
  const puzzleKind = getPuzzleKind();
  updatePlaygroundChrome(puzzleKind);
  renderQuickActions();

  const nextPuzzle = puzzleKind === 'pyraminx' ? createPyraminx() : createCube();
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

function remountPuzzle() {
  puzzle = createPuzzle();
  moveCount = 0;
  moveCountOutput.textContent = '0';
  stateInput.value = '';
  updateState();
  setStatus('remounted');
}

function renderQuickActions() {
  const actions = getPuzzleKind() === 'pyraminx' ? pyraminxActions : cubeActions;
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
  const isPyraminx = puzzleKind === 'pyraminx';
  puzzleTitle.textContent = isPyraminx ? 'Pyraminx' : 'Rubiks Cube';
  stateInput.placeholder = isPyraminx ? 'Paste a pyraminx-stickers-v1 state string' : 'Paste a Kociemba state string';
  for (const setting of cubeOnlySettings) {
    setting.hidden = isPyraminx;
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
      const valid = puzzleKind === 'pyraminx' ? isPyraminxMove(action) : isMovement(action) || IsRotation(action);
      if (!valid) {
        console.warn(`Ignoring invalid action: ${action}`);
      }
      return valid;
    });
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
