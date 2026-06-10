// @ts-check
import { IsRotation, isMovement } from '../src/core/index.js';
import { AttributeNames, PeekActions, RubiksCubeElement } from '../src/webComponent/index.js';

if (!customElements.get('rubiks-cube')) {
    RubiksCubeElement.register();
}

const frame = /** @type {HTMLDivElement} */ (document.getElementById('cube-frame'));
const status = /** @type {HTMLDivElement} */ (document.getElementById('status'));
const quickActions = /** @type {HTMLDivElement} */ (document.getElementById('quick-actions'));
const stateOutput = /** @type {HTMLTextAreaElement} */ (document.getElementById('state-output'));
const fpsOutput = /** @type {HTMLElement} */ (document.getElementById('fps'));
const moveCountOutput = /** @type {HTMLElement} */ (document.getElementById('move-count'));
const lastMoveOutput = /** @type {HTMLElement} */ (document.getElementById('last-move-ms'));
const lastRunOutput = /** @type {HTMLElement} */ (document.getElementById('last-run-ms'));
const rendersPerSecondOutput = /** @type {HTMLElement} */ (document.getElementById('renders-per-second'));
const totalRendersOutput = /** @type {HTMLElement} */ (document.getElementById('total-renders'));
const stateInput = /** @type {HTMLTextAreaElement} */ (document.getElementById('state-input'));

const inputs = {
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

const attributeInputs = [
    [AttributeNames.cubeType, inputs.cubeType],
    [AttributeNames.animationStyle, inputs.animationStyle],
    [AttributeNames.animationSpeed, inputs.animationSpeed],
    [AttributeNames.pieceGap, inputs.pieceGap],
    [AttributeNames.cameraRadius, inputs.cameraRadius],
    [AttributeNames.cameraFieldOfView, inputs.cameraFieldOfView],
    [AttributeNames.cameraSpeed, inputs.cameraSpeed],
    [AttributeNames.cameraPeekAngleHorizontal, inputs.cameraPeekAngleHorizontal],
    [AttributeNames.cameraPeekAngleVertical, inputs.cameraPeekAngleVertical],
    [AttributeNames.logo, inputs.logo],
    [AttributeNames.maxDevicePixelRatio, inputs.maxDevicePixelRatio],
    [AttributeNames.antialias, inputs.antialias],
];

const actionButtons = ['R', "R'", 'R2', 'U', "U'", 'U2', 'F', "F'", 'x', 'y', 'z', PeekActions.Horizontal, PeekActions.Vertical, PeekActions.Right, PeekActions.Up];

/** @type {RubiksCubeElement} */
let cube;
let moveCount = 0;
let stressRunning = false;
let fpsFrameId = 0;
let totalRenders = 0;
let lastRenderAt = 0;
let renderIdleTimer = 0;

cube = createCube();

for (const action of actionButtons) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = action;
    button.addEventListener('click', () => runAction(action));
    quickActions.append(button);
}

for (const [attributeName, input] of attributeInputs) {
    input.addEventListener('input', () => setAttributeFromInput(attributeName, input));
}

document.getElementById('reset')?.addEventListener('click', () => {
    cube.reset();
    updateState();
    setStatus('reset');
});

document.getElementById('get-state')?.addEventListener('click', updateState);
document.getElementById('set-state')?.addEventListener('click', () => {
    const updated = cube.setState(stateInput.value.trim());
    setStatus(updated ? 'state applied' : 'invalid state');
    updateState();
});
document.getElementById('remount')?.addEventListener('click', remountCube);
document.getElementById('run-algorithm')?.addEventListener('click', () => runAlgorithm());
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

function createCube() {
    cube?.removeEventListener('rubiks-cube-render', onCubeRender);
    const nextCube = document.createElement('rubiks-cube');
    nextCube.setAttribute('render-events', '');
    for (const [attributeName, input] of attributeInputs) {
        if (input.value.trim() !== '') {
            nextCube.setAttribute(attributeName, input.value);
        }
    }
    nextCube.addEventListener('rubiks-cube-render', onCubeRender);
    frame.replaceChildren(nextCube);
    return /** @type {RubiksCubeElement} */ (nextCube);
}

function remountCube() {
    cube = createCube();
    updateState();
    setStatus('remounted');
}

/**
 * @param {string} attributeName
 * @param {HTMLInputElement | HTMLSelectElement} input
 */
function setAttributeFromInput(attributeName, input) {
    if (attributeName === AttributeNames.logo && input.value.trim() === '') {
        cube.removeAttribute(attributeName);
        return;
    }
    cube.setAttribute(attributeName, input.value);
}

/**
 * @param {string} action
 */
async function runAction(action) {
    const startedAt = performance.now();
    setStatus(`running ${action}`);
    try {
        if (isMovement(action)) {
            await cube.move(action);
        } else if (IsRotation(action)) {
            await cube.rotate(action);
        } else if (Object.values(PeekActions).includes(action)) {
            await cube.peek(action);
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
    const startedAt = performance.now();
    const repeatCount = Math.max(1, Number(inputs.repeatCount.value) || 1);
    const stress = inputs.stressLoop.value === 'on';
    const actions = parseAlgorithm(inputs.algorithm.value);
    if (actions.length === 0) {
        setStatus('no valid actions');
        return;
    }
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
    return value
        .replace(/\s*\/\/.*$/gm, '')
        .replace(/\s+/gm, ' ')
        .trim()
        .split(' ')
        .filter((action) => action.length > 0)
        .filter((action) => {
            const valid = isMovement(action) || IsRotation(action);
            if (!valid) {
                console.warn(`Ignoring invalid action: ${action}`);
            }
            return valid;
        });
}

function updateState() {
    try {
        stateOutput.value = cube.getState();
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

function onCubeRender() {
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
