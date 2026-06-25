import './setup';
import { PerspectiveCamera, Quaternion } from 'three';
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
  test('maps horizontal drags to yaw without changing camera up', () => {
    const canvas = document.createElement('canvas');
    Object.defineProperty(canvas, 'getBoundingClientRect', {
      value: () => ({ height: 200, width: 400 }),
    });
    const camera = new PerspectiveCamera(75, 1, 1, 2000);
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);
    const initialUp = camera.up.clone();
    const controls = new PointerOrbitControls(camera, canvas);

    dispatchPointer(canvas, 'pointerdown', 0, 0);
    dispatchPointer(canvas, 'pointermove', 200, 0);
    expect(camera.position.z).toBeCloseTo(-10);
    expect(camera.up.distanceTo(initialUp)).toBeLessThan(1e-9);
    dispatchPointer(canvas, 'pointermove', 400, 0);
    expect(camera.position.x).toBeCloseTo(0);
    expect(camera.position.z).toBeCloseTo(10);
    expect(camera.up.distanceTo(initialUp)).toBeLessThan(1e-9);
    dispatchPointer(canvas, 'pointerup', 400, 200);

    controls.dispose();
  });

  test('uses stable world up for horizontal drags with a tilted camera', () => {
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
    const expected = initialPosition.clone().applyQuaternion(new Quaternion().setFromAxisAngle(rawUp, -Math.PI / 2));
    const controls = new PointerOrbitControls(camera, canvas);

    dispatchPointer(canvas, 'pointerdown', 0, 100);
    dispatchPointer(canvas, 'pointermove', 100, 100);

    expect(camera.position.x).toBeCloseTo(expected.x);
    expect(camera.position.y).toBeCloseTo(expected.y);
    expect(camera.position.z).toBeCloseTo(expected.z);
    expect(camera.up.distanceTo(rawUp)).toBeLessThan(1e-9);
    dispatchPointer(canvas, 'pointerup', 100, 100);

    controls.dispose();
  });

  test('clamps vertical drags to prevent camera roll and flips', () => {
    const canvas = document.createElement('canvas');
    Object.defineProperty(canvas, 'getBoundingClientRect', {
      value: () => ({ height: 200, width: 400 }),
    });
    const camera = new PerspectiveCamera(75, 1, 1, 2000);
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);
    const initialUp = camera.up.clone();
    const controls = new PointerOrbitControls(camera, canvas);

    dispatchPointer(canvas, 'pointerdown', 200, 100);
    dispatchPointer(canvas, 'pointermove', 200, 500);
    dispatchPointer(canvas, 'pointermove', 200, -500);
    dispatchPointer(canvas, 'pointermove', 300, -450);

    expect(camera.up.distanceTo(initialUp)).toBeLessThan(1e-9);
    expect(Math.abs(camera.position.clone().normalize().dot(initialUp))).toBeLessThan(0.999999);
    dispatchPointer(canvas, 'pointerup', 300, -450);

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

    expect(controls.update()).toBe(true);
    expect(controls.handleResize()).toBeUndefined();
    controls.dispose();
  });

  test('continues briefly after release and damps to rest without roll', () => {
    const canvas = document.createElement('canvas');
    Object.defineProperty(canvas, 'getBoundingClientRect', {
      value: () => ({ height: 200, width: 400 }),
    });
    const camera = new PerspectiveCamera(75, 1, 1, 2000);
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);
    const initialUp = camera.up.clone();
    const controls = new PointerOrbitControls(camera, canvas);

    dispatchPointer(canvas, 'pointerdown', 0, 100);
    dispatchPointer(canvas, 'pointermove', 20, 90);
    dispatchPointer(canvas, 'pointerup', 20, 90);
    const releasedPosition = camera.position.clone();

    expect(controls.update()).toBe(true);
    expect(camera.position.distanceTo(releasedPosition)).toBeGreaterThan(0);
    expect(camera.up.distanceTo(initialUp)).toBeLessThan(1e-9);

    for (let frame = 0; frame < 120; frame++) {
      controls.update();
    }

    expect(controls.update()).toBe(false);
    expect(camera.up.distanceTo(initialUp)).toBeLessThan(1e-9);
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
    const initialUp = camera.up.clone();
    const controls = new PointerOrbitControls(camera, canvas);

    dispatchPointer(canvas, 'pointerdown', 0, 0);
    dispatchPointer(canvas, 'pointermove', 1, 1);

    expect(camera.position.length()).toBeCloseTo(10);
    expect(Number.isFinite(camera.position.x)).toBe(true);
    expect(Number.isFinite(camera.position.y)).toBe(true);
    expect(Number.isFinite(camera.position.z)).toBe(true);
    expect(camera.up.distanceTo(initialUp)).toBeLessThan(1e-9);

    controls.dispose();
  });
});
