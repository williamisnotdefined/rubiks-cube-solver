import './setup';
import { PerspectiveCamera, Quaternion, Vector3 } from 'three';
import { describe, expect, test } from 'vitest';
import { PointerOrbitControls } from '../src/shared/puzzleControls';

function dispatchPointer(target: EventTarget, type: string, clientX: number, clientY: number) {
  const event = new MouseEvent(type, {
    bubbles: true,
    button: 0,
    cancelable: true,
    clientX,
    clientY,
  });
  Object.defineProperties(event, {
    pointerId: { value: 1 },
    pointerType: { value: 'mouse' },
  });
  target.dispatchEvent(event);
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
});
