import { PerspectiveCamera, Quaternion, Vector3 } from 'three';

type PointerOrbitEvent = 'change' | 'end' | 'start';

export const pointerOrbitFullDragRadians = Math.PI * 2;
const pointerOrbitDampingFactor = 0.86;
const pointerOrbitMinimumVelocity = 0.00001;
const minPolarAngle = 0.001;
const maxPolarAngle = Math.PI - minPolarAngle;

export class PointerOrbitControls {
  readonly target = new Vector3(0, 0, 0);
  private activePointerId: number | null = null;
  private lastX = 0;
  private lastY = 0;
  private velocityPitch = 0;
  private velocityYaw = 0;
  private readonly stableUp: Vector3;
  private readonly listeners = new Map<PointerOrbitEvent, Set<() => void>>();

  constructor(
    private readonly camera: PerspectiveCamera,
    private readonly domElement: HTMLElement,
  ) {
    this.stableUp = this.camera.up.clone().normalize();
    this.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.domElement.addEventListener('pointermove', this.onPointerMove);
    this.domElement.addEventListener('pointerup', this.onPointerEnd);
    this.domElement.addEventListener('pointercancel', this.onPointerEnd);
  }

  addEventListener(type: PointerOrbitEvent, listener: () => void): void {
    const listeners = this.listeners.get(type) ?? new Set<() => void>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: PointerOrbitEvent, listener: () => void): void {
    this.listeners.get(type)?.delete(listener);
  }

  update(): boolean {
    if (this.activePointerId !== null) {
      return false;
    }

    if (
      Math.abs(this.velocityYaw) < pointerOrbitMinimumVelocity &&
      Math.abs(this.velocityPitch) < pointerOrbitMinimumVelocity
    ) {
      this.velocityYaw = 0;
      this.velocityPitch = 0;
      return false;
    }

    const moved = this.orbit(this.velocityYaw, this.velocityPitch);
    this.velocityYaw *= pointerOrbitDampingFactor;
    this.velocityPitch *= pointerOrbitDampingFactor;
    if (!moved) {
      this.velocityYaw = 0;
      this.velocityPitch = 0;
    }
    return moved;
  }

  handleResize(): void {
    // Size is read from the DOM for every drag delta, so resize has no cached state to update.
  }

  dispose(): void {
    this.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.domElement.removeEventListener('pointerup', this.onPointerEnd);
    this.domElement.removeEventListener('pointercancel', this.onPointerEnd);
    this.listeners.clear();
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }
    this.activePointerId = event.pointerId;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    this.velocityYaw = 0;
    this.velocityPitch = 0;
    this.domElement.setPointerCapture?.(event.pointerId);
    this.dispatch('start');
    event.preventDefault();
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (this.activePointerId !== event.pointerId) {
      return;
    }
    const deltaX = event.clientX - this.lastX;
    const deltaY = event.clientY - this.lastY;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    if (deltaX === 0 && deltaY === 0) {
      return;
    }
    const { width, height } = this.getDragSize();
    this.velocityYaw = (-deltaX / width) * pointerOrbitFullDragRadians;
    this.velocityPitch = (-deltaY / height) * pointerOrbitFullDragRadians;
    this.orbit(this.velocityYaw, this.velocityPitch);
    this.dispatch('change');
    event.preventDefault();
  };

  private readonly onPointerEnd = (event: PointerEvent): void => {
    if (this.activePointerId !== event.pointerId) {
      return;
    }
    this.activePointerId = null;
    if (this.domElement.hasPointerCapture?.(event.pointerId)) {
      this.domElement.releasePointerCapture(event.pointerId);
    }
    this.dispatch('end');
    event.preventDefault();
  };

  private orbit(yawRadians: number, pitchRadians: number): boolean {
    const offset = this.camera.position.clone().sub(this.target);
    const radius = offset.length();
    if (radius === 0) {
      return false;
    }
    const initialOffset = offset.clone();

    const yaw = new Quaternion().setFromAxisAngle(this.stableUp, yawRadians);
    offset.applyQuaternion(yaw);

    const polarAngle = offset.angleTo(this.stableUp);
    const clampedPitch = Math.min(Math.max(pitchRadians, minPolarAngle - polarAngle), maxPolarAngle - polarAngle);
    const right = new Vector3().crossVectors(this.stableUp, offset);
    if (right.lengthSq() > 0 && clampedPitch !== 0) {
      right.normalize();
      offset.applyQuaternion(new Quaternion().setFromAxisAngle(right, clampedPitch));
    }

    offset.setLength(radius);
    this.camera.position.copy(this.target).add(offset);
    this.camera.up.copy(this.stableUp);
    this.camera.lookAt(this.target);
    return offset.distanceToSquared(initialOffset) > 1e-12;
  }

  private getDragSize(): { height: number; width: number } {
    const rect = this.domElement.getBoundingClientRect();
    return {
      height: Math.max(rect.height || this.domElement.clientHeight || 1, 1),
      width: Math.max(rect.width || this.domElement.clientWidth || 1, 1),
    };
  }

  private dispatch(type: PointerOrbitEvent): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener();
    }
  }
}
