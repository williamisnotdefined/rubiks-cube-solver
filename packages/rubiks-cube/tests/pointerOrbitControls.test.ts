import './setup';
import { PerspectiveCamera, Quaternion, Vector3 } from 'three';
import { describe, expect, test, vi } from 'vitest';
import { PointerOrbitControls } from '../src/shared/puzzleControls';

function dispatchPointer(
  target: EventTarget,
  type: string,
  clientX: number,
  clientY: number,
  options: { button?: number; pointerId?: number; pointerType?: string } = {},
) {
  const event = new MouseEvent(type, {
    bubbles: true,
    button: options.button ?? 0,
    cancelable: true,
    clientX,
    clientY,
  });
  Object.defineProperties(event, {
    pointerId: { value: options.pointerId ?? 1 },
    pointerType: { value: options.pointerType ?? 'mouse' },
  });
  target.dispatchEvent(event);
  return event;
}

describe('PointerOrbitControls', () => {
  test('maps full element width and height drags to full rotations', () => {
    const canvas = document.createElement('canvas');
    Object.defineProperty(canvas, 'getBoundingClientRect', {
      value: () => ({ height: 200, width: 400 }),
    });
    const camera = new PerspectiveCamera(75, 1, 1, 2000);
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);
    const controls = new PointerOrbitControls(camera, canvas);

    dispatchPointer(canvas, 'pointerdown', 0, 0);
    dispatchPointer(canvas, 'pointermove', 200, 0);
    expect(camera.position.z).toBeCloseTo(-10);
    dispatchPointer(canvas, 'pointermove', 400, 0);
    expect(camera.position.x).toBeCloseTo(0);
    expect(camera.position.z).toBeCloseTo(10);

    dispatchPointer(canvas, 'pointermove', 400, 100);
    expect(camera.position.y).toBeCloseTo(0);
    expect(camera.position.z).toBeCloseTo(-10);
    dispatchPointer(canvas, 'pointermove', 400, 200);
    expect(camera.position.y).toBeCloseTo(0);
    expect(camera.position.z).toBeCloseTo(10);
    dispatchPointer(canvas, 'pointerup', 400, 200);

    controls.dispose();
  });

  test('uses screen axes for horizontal drags with a tilted camera', () => {
    const canvas = document.createElement('canvas');
    Object.defineProperty(canvas, 'getBoundingClientRect', {
      value: () => ({ height: 200, width: 400 }),
    });
    const camera = new PerspectiveCamera(75, 1, 1, 2000);
    camera.position.set(0, 3, 10);
    camera.up.set(0, 1, 0);
    camera.lookAt(0, 0, 0);
    const initialPosition = camera.position.clone();
    const rawUp = camera.up.clone().normalize();
    const screenUp = new Vector3(0, 1, 0).applyQuaternion(camera.quaternion).normalize();
    const expected = initialPosition.clone().applyQuaternion(new Quaternion().setFromAxisAngle(screenUp, -Math.PI / 2));
    const rawUpExpected = initialPosition
      .clone()
      .applyQuaternion(new Quaternion().setFromAxisAngle(rawUp, -Math.PI / 2));
    const controls = new PointerOrbitControls(camera, canvas);

    dispatchPointer(canvas, 'pointerdown', 0, 100);
    dispatchPointer(canvas, 'pointermove', 100, 100);

    expect(camera.position.x).toBeCloseTo(expected.x);
    expect(camera.position.y).toBeCloseTo(expected.y);
    expect(camera.position.z).toBeCloseTo(expected.z);
    expect(camera.position.distanceTo(rawUpExpected)).toBeGreaterThan(0.1);
    dispatchPointer(canvas, 'pointerup', 100, 100);

    controls.dispose();
  });

  test('ignores inactive pointers and zero-delta pointer moves', () => {
    const canvas = document.createElement('canvas');
    Object.defineProperty(canvas, 'getBoundingClientRect', {
      value: () => ({ height: 200, width: 400 }),
    });
    const camera = new PerspectiveCamera(75, 1, 1, 2000);
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);
    const controls = new PointerOrbitControls(camera, canvas);
    const start = vi.fn();
    const change = vi.fn();
    const end = vi.fn();
    controls.addEventListener('start', start);
    controls.addEventListener('change', change);
    controls.addEventListener('end', end);

    dispatchPointer(canvas, 'pointerdown', 0, 0, { button: 1 });
    expect(start).not.toHaveBeenCalled();

    dispatchPointer(canvas, 'pointerdown', 0, 0);
    expect(start).toHaveBeenCalledTimes(1);
    dispatchPointer(canvas, 'pointermove', 100, 0, { pointerId: 2 });
    dispatchPointer(canvas, 'pointermove', 0, 0);
    expect(change).not.toHaveBeenCalled();

    controls.removeEventListener('change', change);
    dispatchPointer(canvas, 'pointermove', 100, 0);
    expect(change).not.toHaveBeenCalled();
    dispatchPointer(canvas, 'pointerup', 100, 0, { pointerId: 2 });
    expect(end).not.toHaveBeenCalled();
    dispatchPointer(canvas, 'pointerup', 100, 0);
    expect(end).toHaveBeenCalledTimes(1);

    expect(controls.update()).toBe(false);
    expect(controls.handleResize()).toBeUndefined();
    controls.dispose();
  });

  test('uses pointer capture helpers when they are available', () => {
    const canvas = document.createElement('canvas');
    Object.defineProperty(canvas, 'getBoundingClientRect', {
      value: () => ({ height: 0, width: 0 }),
    });
    Object.defineProperties(canvas, {
      clientHeight: { value: 200 },
      clientWidth: { value: 400 },
    });
    canvas.setPointerCapture = vi.fn();
    canvas.hasPointerCapture = vi.fn(() => true);
    canvas.releasePointerCapture = vi.fn();
    const camera = new PerspectiveCamera(75, 1, 1, 2000);
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);
    const controls = new PointerOrbitControls(camera, canvas);

    const downEvent = dispatchPointer(canvas, 'pointerdown', 0, 0, { button: 1, pointerId: 7, pointerType: 'touch' });
    dispatchPointer(canvas, 'pointermove', 200, 0, { pointerId: 7, pointerType: 'touch' });
    const upEvent = dispatchPointer(canvas, 'pointerup', 200, 0, { pointerId: 7, pointerType: 'touch' });

    expect(downEvent.defaultPrevented).toBe(true);
    expect(upEvent.defaultPrevented).toBe(true);
    expect(canvas.setPointerCapture).toHaveBeenCalledWith(7);
    expect(canvas.hasPointerCapture).toHaveBeenCalledWith(7);
    expect(canvas.releasePointerCapture).toHaveBeenCalledWith(7);

    controls.dispose();
  });

  test('falls back to one pixel drag size when element dimensions are unavailable', () => {
    const canvas = document.createElement('canvas');
    Object.defineProperty(canvas, 'getBoundingClientRect', {
      value: () => ({ height: 0, width: 0 }),
    });
    Object.defineProperties(canvas, {
      clientHeight: { value: 0 },
      clientWidth: { value: 0 },
    });
    const camera = new PerspectiveCamera(75, 1, 1, 2000);
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);
    const controls = new PointerOrbitControls(camera, canvas);

    dispatchPointer(canvas, 'pointerdown', 0, 0);
    dispatchPointer(canvas, 'pointermove', 1, 1);

    expect(camera.position.x).toBeCloseTo(0);
    expect(camera.position.y).toBeCloseTo(0);
    expect(camera.position.z).toBeCloseTo(10);

    controls.dispose();
  });
});
