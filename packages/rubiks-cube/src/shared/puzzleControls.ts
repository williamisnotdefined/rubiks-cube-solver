import { PerspectiveCamera, Quaternion, Vector3 } from 'three';

type PointerOrbitEvent = 'change' | 'end' | 'start';

export const pointerOrbitFullDragRadians = Math.PI * 2;

export class PointerOrbitControls {
  readonly target = new Vector3(0, 0, 0);
  private activePointerId: number | null = null;
  private lastX = 0;
  private lastY = 0;
  private readonly listeners = new Map<PointerOrbitEvent, Set<() => void>>();

  constructor(
    private readonly camera: PerspectiveCamera,
    private readonly domElement: HTMLElement,
  ) {
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
    return false;
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
    this.orbit((-deltaX / width) * pointerOrbitFullDragRadians, (-deltaY / height) * pointerOrbitFullDragRadians);
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

  private orbit(yawRadians: number, pitchRadians: number): void {
    const offset = this.camera.position.clone().sub(this.target);
    const screenUp = new Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion).normalize();
    const screenRight = new Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion).normalize();
    const yaw = new Quaternion().setFromAxisAngle(screenUp, yawRadians);
    const pitch = new Quaternion().setFromAxisAngle(screenRight, pitchRadians);

    offset.applyQuaternion(yaw).applyQuaternion(pitch);
    this.camera.up.applyQuaternion(yaw).applyQuaternion(pitch).normalize();
    this.camera.position.copy(this.target).add(offset);
    this.camera.lookAt(this.target);
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
