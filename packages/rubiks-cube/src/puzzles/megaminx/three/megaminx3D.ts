import { gsap } from 'gsap';
import { Group, Object3D, Quaternion, Vector3 } from 'three';
import type { TurnPlan } from '../../../shared/turnPlan';
import { megaminxMoveToTurn, parseMegaminxAlgorithm, reverseMegaminxMove } from '../core/notation';
import type { MegaminxFace, MegaminxMove, MegaminxTurn } from '../core/types';
import { MegaminxFaceOrder } from '../core/types';
import { defaultMegaminxStickerState, parseMegaminxStickerState } from '../state/stickerState';
import {
  DEFAULT_MEGAMINX_ANIMATION_SPEED_MS,
  faceNormals,
  MEGAMINX_FACE_TURN_STICKER_COUNT,
  TURN_ANGLE_RADIANS,
} from './config';
import { createFaceStickers, type StickerSlot } from './geometry';
import { MegaminxSticker } from './sticker';

type Megaminx3DOptions = {
  animationSpeedMs?: number;
  animationStyle?: gsap.EaseString | gsap.EaseFunction;
};

type MegaminxAnimationOptions = {
  animationSpeedMs?: number;
  reverse?: boolean;
};

export class Megaminx3D extends Object3D {
  animationSpeedMs: number;
  animationStyle: gsap.EaseString | gsap.EaseFunction;
  _mainGroup: Group;
  _animationGroup: Group;
  _stickers: MegaminxSticker[];
  _slots: StickerSlot[];
  _currentAnimation: gsap.core.Tween | undefined;
  _moveQueue: Promise<void>;

  constructor(options: Megaminx3DOptions = {}) {
    super();
    this.animationSpeedMs = options.animationSpeedMs ?? DEFAULT_MEGAMINX_ANIMATION_SPEED_MS;
    this.animationStyle = options.animationStyle ?? 'linear';
    this._stickers = [];
    this._slots = [];
    this._currentAnimation = undefined;
    this._moveQueue = Promise.resolve();
    this._mainGroup = this.createMegaminxGroup();
    this._animationGroup = new Group();
    this.add(this._mainGroup, this._animationGroup);
  }

  createMegaminxGroup(): Group {
    const group = new Group();

    let slotIndex = 0;
    for (const face of MegaminxFaceOrder) {
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

  private facesByNearestSlot(): MegaminxFace[] {
    const available = new Set(this._stickers);
    const faces: MegaminxFace[] = [];

    for (const slot of this._slots) {
      let nearest: MegaminxSticker | undefined;
      let nearestDistance = Number.POSITIVE_INFINITY;

      for (const sticker of Array.from(available)) {
        const distance = sticker.position.distanceToSquared(slot.position);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = sticker;
        }
      }

      if (!nearest) {
        throw new Error(`Megaminx slot ${slot.id} did not map to a sticker`);
      }

      available.delete(nearest);
      faces.push(nearest.face);
    }

    return faces;
  }

  setState(state: string): boolean {
    const faces = parseMegaminxStickerState(state);
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

  turnPlan(move: MegaminxMove, options: Pick<MegaminxAnimationOptions, 'reverse'> = {}): TurnPlan {
    const directedMove = options.reverse ? reverseMegaminxMove(move) : move;
    const turn = megaminxMoveToTurn(directedMove);
    const axis = axisForFace(turn.face);
    const stickers = this.stickersForTurn(turn);

    return {
      angleRadians: angleForTurn(turn),
      axis: { x: axis.x, y: axis.y, z: axis.z },
      pieceIds: stickers.map((sticker) => sticker.stickerId),
    };
  }

  applyMove(move: MegaminxMove, options: Pick<MegaminxAnimationOptions, 'reverse'> = {}): string {
    this.finishCurrentAnimation();
    const directedMove = options.reverse ? reverseMegaminxMove(move) : move;
    const turn = megaminxMoveToTurn(directedMove);

    this.applyTurn(turn, angleForTurn(turn));

    return this.getState();
  }

  move(move: MegaminxMove, options: MegaminxAnimationOptions = {}): Promise<string> {
    const runMove = () => this.runMove(move, options);
    const result = this._moveQueue.then(runMove, runMove);
    this._moveQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  private runMove(move: MegaminxMove, options: MegaminxAnimationOptions = {}): Promise<string> {
    this.finishCurrentAnimation();
    const directedMove = options.reverse ? reverseMegaminxMove(move) : move;
    const turn = megaminxMoveToTurn(directedMove);
    const stickers = this.stickersForTurn(turn);
    const axis = axisForFace(turn.face);
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

  async do(actions: readonly MegaminxMove[] | string, options: MegaminxAnimationOptions = {}): Promise<string> {
    const moves = typeof actions === 'string' ? parseMegaminxAlgorithm(actions) : actions;

    for (const move of moves) {
      await this.move(move, options);
    }

    return this.getState();
  }

  private applyTurn(turn: MegaminxTurn, angle: number): void {
    this.applyTurnToStickers(this.stickersForTurn(turn), axisForFace(turn.face), angle);
  }

  private applyTurnToStickers(stickers: readonly MegaminxSticker[], axis: Vector3, angle: number): void {
    const quaternion = new Quaternion().setFromAxisAngle(axis, angle);
    for (const sticker of stickers) {
      sticker.backing.position.applyQuaternion(quaternion);
      sticker.backing.quaternion.premultiply(quaternion);
      sticker.position.applyQuaternion(quaternion);
      sticker.quaternion.premultiply(quaternion);
    }
    this.snapToNearestSlots();
  }

  private fillAnimationGroup(stickers: readonly MegaminxSticker[]): void {
    for (const sticker of stickers) {
      this._animationGroup.add(sticker.backing, sticker);
    }
  }

  private clearAnimationGroup(): void {
    const stickers = this._animationGroup.children.filter(
      (child): child is MegaminxSticker => child instanceof MegaminxSticker,
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

  private stickersForTurn(turn: MegaminxTurn): MegaminxSticker[] {
    const axis = axisForFace(turn.face);

    return this._stickers
      .map((sticker) => ({
        projection: this.nearestSlotForSticker(sticker).position.dot(axis),
        sticker,
      }))
      .sort((a, b) => b.projection - a.projection)
      .slice(0, MEGAMINX_FACE_TURN_STICKER_COUNT)
      .map(({ sticker }) => sticker);
  }

  private nearestSlotForSticker(sticker: MegaminxSticker): StickerSlot {
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

function axisForFace(face: MegaminxFace): Vector3 {
  return faceNormals[face].clone().normalize();
}

function angleForTurn(turn: MegaminxTurn): number {
  return turn.amount * TURN_ANGLE_RADIANS;
}

export { DEFAULT_MEGAMINX_ANIMATION_SPEED_MS, MegaminxFaceColors } from './config';
export { MegaminxSticker } from './sticker';
export type { Megaminx3DOptions, MegaminxAnimationOptions };
export { defaultMegaminxStickerState };
