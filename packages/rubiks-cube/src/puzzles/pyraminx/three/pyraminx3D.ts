import { gsap } from 'gsap';
import { Group, Object3D, Quaternion, Vector3 } from 'three';
import type { TurnPlan } from '../../../shared/turnPlan';
import { parsePyraminxAlgorithm, pyraminxMoveToTurn, reversePyraminxMove } from '../core/notation';
import type { PyraminxFace, PyraminxMove, PyraminxTurn } from '../core/types';
import { PyraminxFaceOrder } from '../core/types';
import { defaultPyraminxStickerState, parsePyraminxStickerState } from '../state/stickerState';
import {
  DEFAULT_PYRAMINX_ANIMATION_SPEED_MS,
  LAYER_EPSILON,
  MAIN_LAYER_PROJECTION,
  TIP_LAYER_PROJECTION,
  TURN_ANGLE_RADIANS,
  vertexPositions,
} from './config';
import { createFaceStickers, type StickerSlot } from './geometry';
import { PyraminxSticker } from './sticker';

type Pyraminx3DOptions = {
  animationSpeedMs?: number;
  animationStyle?: gsap.EaseString | gsap.EaseFunction;
};

type PyraminxAnimationOptions = {
  animationSpeedMs?: number;
  reverse?: boolean;
};

export class Pyraminx3D extends Object3D {
  animationSpeedMs: number;
  animationStyle: gsap.EaseString | gsap.EaseFunction;
  _mainGroup: Group;
  _animationGroup: Group;
  _stickers: PyraminxSticker[];
  _slots: StickerSlot[];
  _currentAnimation: gsap.core.Tween | undefined;
  _moveQueue: Promise<void>;

  constructor(options: Pyraminx3DOptions = {}) {
    super();
    this.animationSpeedMs = options.animationSpeedMs ?? DEFAULT_PYRAMINX_ANIMATION_SPEED_MS;
    this.animationStyle = options.animationStyle ?? 'linear';
    this._stickers = [];
    this._slots = [];
    this._currentAnimation = undefined;
    this._moveQueue = Promise.resolve();
    this._mainGroup = this.createPyraminxGroup();
    this._animationGroup = new Group();
    this.add(this._mainGroup, this._animationGroup);
  }

  createPyraminxGroup(): Group {
    const group = new Group();

    let slotIndex = 0;
    for (const face of PyraminxFaceOrder) {
      for (const sticker of createFaceStickers(face, slotIndex)) {
        this._stickers.push(sticker);
        this._slots.push({
          backingPosition: sticker.backing.position.clone(),
          backingQuaternion: sticker.backing.quaternion.clone(),
          face: sticker.face,
          id: sticker.stickerId,
          position: sticker.position.clone(),
          quaternion: sticker.quaternion.clone(),
          slotIndex: sticker.slotIndex,
        });
        group.add(sticker.backing, sticker);
        slotIndex++;
      }
    }

    return group;
  }

  stickerCount(): number {
    return this._stickers.length;
  }

  reset(): string {
    this.finishCurrentAnimation();
    for (const sticker of this._stickers) {
      const slot = this._slots[sticker.slotIndex];
      sticker.backing.position.copy(slot.backingPosition);
      sticker.backing.quaternion.copy(slot.backingQuaternion);
      sticker.position.copy(slot.position);
      sticker.quaternion.copy(slot.quaternion);
      sticker.setFace(slot.face);
    }

    return this.getState();
  }

  getState(): string {
    return this.facesByNearestSlot().join('');
  }

  private facesByNearestSlot(): PyraminxFace[] {
    const available = new Set(this._stickers);
    const faces: PyraminxFace[] = [];

    for (const slot of this._slots) {
      let nearest: PyraminxSticker | undefined;
      let nearestDistance = Number.POSITIVE_INFINITY;

      for (const sticker of Array.from(available)) {
        const distance = sticker.position.distanceToSquared(slot.position);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = sticker;
        }
      }

      if (!nearest) {
        throw new Error(`Pyraminx slot ${slot.id} did not map to a sticker`);
      }

      available.delete(nearest);
      faces.push(nearest.face);
    }

    return faces;
  }

  setState(state: string): boolean {
    const faces = parsePyraminxStickerState(state);
    if (!faces) {
      return false;
    }

    this.finishCurrentAnimation();
    this.reset();
    for (let index = 0; index < faces.length; index++) {
      this._stickers[index]?.setFace(faces[index]);
    }

    return true;
  }

  turnPlan(move: PyraminxMove, options: Pick<PyraminxAnimationOptions, 'reverse'> = {}): TurnPlan {
    const directedMove = options.reverse ? reversePyraminxMove(move) : move;
    const turn = pyraminxMoveToTurn(directedMove);
    const axis = axisForVertex(turn.vertex);
    const stickers = this.stickersForTurn(turn);

    return {
      angleRadians: angleForTurn(turn),
      axis: { x: axis.x, y: axis.y, z: axis.z },
      pieceIds: stickers.map((sticker) => sticker.stickerId),
    };
  }

  applyMove(move: PyraminxMove, options: Pick<PyraminxAnimationOptions, 'reverse'> = {}): string {
    this.finishCurrentAnimation();
    const directedMove = options.reverse ? reversePyraminxMove(move) : move;
    const turn = pyraminxMoveToTurn(directedMove);

    this.applyTurn(turn, angleForTurn(turn));

    return this.getState();
  }

  move(move: PyraminxMove, options: PyraminxAnimationOptions = {}): Promise<string> {
    const runMove = () => this.runMove(move, options);
    const result = this._moveQueue.then(runMove, runMove);
    this._moveQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  private runMove(move: PyraminxMove, options: PyraminxAnimationOptions = {}): Promise<string> {
    this.finishCurrentAnimation();
    const directedMove = options.reverse ? reversePyraminxMove(move) : move;
    const turn = pyraminxMoveToTurn(directedMove);
    const stickers = this.stickersForTurn(turn);
    const axis = axisForVertex(turn.vertex);
    const speed = options.animationSpeedMs ?? this.animationSpeedMs;

    if (speed === 0) {
      this.applyTurnToStickers(stickers, axis, angleForTurn(turn));
      return Promise.resolve(this.getState());
    }

    return new Promise((resolve) => {
      this.fillAnimationGroup(stickers);
      const target = { rotation: 0 };
      let previousRotation = 0;

      this._currentAnimation = gsap.to(target, {
        duration: speed / 1000,
        ease: this.animationStyle,
        onComplete: () => {
          this.clearAnimationGroup();
          this._currentAnimation = undefined;
          resolve(this.getState());
        },
        onUpdate: () => {
          const delta = target.rotation - previousRotation;
          this._animationGroup.rotateOnWorldAxis(axis, delta);
          previousRotation = target.rotation;
        },
        rotation: angleForTurn(turn),
      });
    });
  }

  async do(actions: readonly PyraminxMove[] | string, options: PyraminxAnimationOptions = {}): Promise<string> {
    const moves = typeof actions === 'string' ? parsePyraminxAlgorithm(actions) : actions;

    for (const move of moves) {
      await this.move(move, options);
    }

    return this.getState();
  }

  private applyTurn(turn: PyraminxTurn, angle: number): void {
    this.applyTurnToStickers(this.stickersForTurn(turn), axisForVertex(turn.vertex), angle);
  }

  private applyTurnToStickers(stickers: readonly PyraminxSticker[], axis: Vector3, angle: number): void {
    const quaternion = new Quaternion().setFromAxisAngle(axis, angle);
    for (const sticker of stickers) {
      sticker.backing.position.applyQuaternion(quaternion);
      sticker.backing.quaternion.premultiply(quaternion);
      sticker.position.applyQuaternion(quaternion);
      sticker.quaternion.premultiply(quaternion);
    }
    this.snapToNearestSlots();
  }

  private fillAnimationGroup(stickers: readonly PyraminxSticker[]): void {
    for (const sticker of stickers) {
      this._animationGroup.add(sticker.backing, sticker);
    }
  }

  private clearAnimationGroup(): void {
    const stickers = this._animationGroup.children.filter(
      (child): child is PyraminxSticker => child instanceof PyraminxSticker,
    );
    this.updateMatrixWorld(true);
    this._mainGroup.updateMatrixWorld(true);
    this._animationGroup.updateMatrixWorld(true);
    const parentWorldQuaternion = new Quaternion();
    this._mainGroup.getWorldQuaternion(parentWorldQuaternion);
    const inverseParentWorldQuaternion = parentWorldQuaternion.clone().invert();

    for (const sticker of stickers) {
      this.moveAnimatedObjectToMain(sticker.backing, inverseParentWorldQuaternion);
      this.moveAnimatedObjectToMain(sticker, inverseParentWorldQuaternion);
    }

    this._animationGroup.rotation.set(0, 0, 0);
    this._animationGroup.quaternion.identity();
    this.snapToNearestSlots();
  }

  private moveAnimatedObjectToMain(object: Object3D, inverseParentWorldQuaternion: Quaternion): void {
    const worldPosition = new Vector3();
    const worldQuaternion = new Quaternion();
    object.getWorldPosition(worldPosition);
    object.getWorldQuaternion(worldQuaternion);
    this._mainGroup.add(object);
    this._mainGroup.worldToLocal(worldPosition);
    object.position.copy(worldPosition);
    object.quaternion.copy(inverseParentWorldQuaternion.clone().multiply(worldQuaternion));
  }

  private snapToNearestSlots(): void {
    const faces = this.facesByNearestSlot();

    for (let index = 0; index < this._slots.length; index++) {
      const slot = this._slots[index];
      const sticker = this._stickers[index];
      this._mainGroup.add(sticker.backing, sticker);
      sticker.backing.position.copy(slot.backingPosition);
      sticker.backing.quaternion.copy(slot.backingQuaternion);
      sticker.position.copy(slot.position);
      sticker.quaternion.copy(slot.quaternion);
      sticker.setFace(faces[index]);
    }
  }

  private finishCurrentAnimation(): void {
    const animation = this._currentAnimation;
    if (!animation) {
      return;
    }

    animation.progress(1);
    this._currentAnimation = undefined;
  }

  private stickersForTurn(turn: PyraminxTurn): PyraminxSticker[] {
    const axis = axisForVertex(turn.vertex);

    return this._stickers.filter((sticker) => {
      const projection = this.nearestSlotForSticker(sticker).position.dot(axis);

      if (turn.tip) {
        return projection >= TIP_LAYER_PROJECTION - LAYER_EPSILON;
      }

      return projection >= MAIN_LAYER_PROJECTION - LAYER_EPSILON && projection < TIP_LAYER_PROJECTION - LAYER_EPSILON;
    });
  }

  private nearestSlotForSticker(sticker: PyraminxSticker): StickerSlot {
    let nearest = this._slots[0];
    let nearestDistance = sticker.position.distanceToSquared(nearest.position);

    for (const slot of this._slots.slice(1)) {
      const distance = sticker.position.distanceToSquared(slot.position);
      if (distance < nearestDistance) {
        nearest = slot;
        nearestDistance = distance;
      }
    }

    return nearest;
  }
}

function axisForVertex(vertex: PyraminxFace): Vector3 {
  return vertexPositions[vertex].clone().normalize();
}

function angleForTurn(turn: PyraminxTurn): number {
  return (turn.prime ? 1 : -1) * TURN_ANGLE_RADIANS;
}

export { DEFAULT_PYRAMINX_ANIMATION_SPEED_MS, PyraminxFaceColors } from './config';
export { PyraminxSticker } from './sticker';
export type { Pyraminx3DOptions, PyraminxAnimationOptions };
export { defaultPyraminxStickerState };
