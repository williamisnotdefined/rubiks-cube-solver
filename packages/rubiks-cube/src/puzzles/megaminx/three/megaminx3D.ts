import { gsap } from 'gsap';
import { Group, Object3D, Quaternion, Vector3 } from 'three';
import type { TurnPlan } from '../../../shared/turnPlan';
import { megaminxMoveToTurn, parseMegaminxAlgorithm, reverseMegaminxMove } from '../core/notation';
import type { MegaminxFace, MegaminxMove, MegaminxTurn } from '../core/types';
import { defaultMegaminxStickerState, parseMegaminxStickerState } from '../state/stickerState';
import {
  DEFAULT_MEGAMINX_ANIMATION_SPEED_MS,
  DEFAULT_MEGAMINX_VISUAL_STYLE,
  faceNormals,
  MEGAMINX_FACE_TURN_PIECE_COUNT,
  MEGAMINX_WCA_WIDE_TURN_PIECE_COUNT,
  type MegaminxVisualStyle,
  TURN_ANGLE_RADIANS,
} from './config';
import { createPhysicalMegaminxModel, type SurfaceSlot } from './geometry';
import { MegaminxPhysicalPiece, MegaminxSticker } from './sticker';

type Megaminx3DOptions = {
  animationSpeedMs?: number;
  animationStyle?: gsap.EaseString | gsap.EaseFunction;
  visualStyle?: MegaminxVisualStyle;
};

type MegaminxAnimationOptions = {
  animationSpeedMs?: number;
  reverse?: boolean;
};

export class Megaminx3D extends Object3D {
  animationSpeedMs: number;
  animationStyle: gsap.EaseString | gsap.EaseFunction;
  visualStyle: MegaminxVisualStyle;
  _mainGroup: Group;
  _animationGroup: Group;
  _pieces: MegaminxPhysicalPiece[];
  _stickers: MegaminxSticker[];
  _slots: SurfaceSlot[];
  _currentAnimation: gsap.core.Tween | undefined;
  _moveQueue: Promise<void>;

  constructor(options: Megaminx3DOptions = {}) {
    super();
    this.animationSpeedMs = options.animationSpeedMs ?? DEFAULT_MEGAMINX_ANIMATION_SPEED_MS;
    this.animationStyle = options.animationStyle ?? 'linear';
    this.visualStyle = options.visualStyle ?? DEFAULT_MEGAMINX_VISUAL_STYLE;
    this._pieces = [];
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
    const model = createPhysicalMegaminxModel();
    this._pieces = model.pieces;
    this._stickers = model.stickers;
    this._slots = model.slots;

    for (const piece of this._pieces) {
      for (const sticker of piece.stickers) {
        sticker.setVisualStyle(this.visualStyle);
      }
      group.add(piece);
    }

    return group;
  }

  pieceCount(): number {
    return this._pieces.length;
  }

  stickerCount(): number {
    return this._stickers.length;
  }

  setVisualStyle(visualStyle: MegaminxVisualStyle): void {
    this.visualStyle = visualStyle;
    for (const sticker of this._stickers) {
      sticker.setVisualStyle(visualStyle);
    }
  }

  reset(): string {
    this.finishCurrentAnimation();
    for (const piece of this._pieces) {
      this._mainGroup.add(piece);
      piece.position.set(0, 0, 0);
      piece.quaternion.identity();
      for (const sticker of piece.stickers) {
        sticker.setFace(this._slots[sticker.slotIndex].face);
      }
    }
    this._animationGroup.rotation.set(0, 0, 0);
    this._animationGroup.quaternion.identity();

    return this.getState();
  }

  getState(): string {
    return this.facesByNearestSlot().join('');
  }

  private facesByNearestSlot(): MegaminxFace[] {
    this.updateMatrixWorld(true);
    const available = new Set(this._stickers);
    const faces: MegaminxFace[] = [];

    for (const slot of this._slots) {
      let nearest: MegaminxSticker | undefined;
      let nearestDistance = Number.POSITIVE_INFINITY;

      for (const sticker of Array.from(available)) {
        const worldPosition = new Vector3();
        sticker.getWorldPosition(worldPosition);
        const distance = worldPosition.distanceToSquared(slot.position);
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
    const axis = axisForTurn(turn);
    const pieces = this.piecesForTurn(turn);

    return {
      angleRadians: angleForTurn(turn),
      axis: { x: axis.x, y: axis.y, z: axis.z },
      pieceIds: pieces.map((piece) => piece.pieceId),
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
    const pieces = this.piecesForTurn(turn);
    const axis = axisForTurn(turn);
    const speed = options.animationSpeedMs ?? this.animationSpeedMs;

    if (speed === 0) {
      this.applyTurnToPieces(pieces, axis, angleForTurn(turn));
      return Promise.resolve(this.getState());
    }

    return new Promise((resolve) => {
      this.fillAnimationGroup(pieces);
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
    this.applyTurnToPieces(this.piecesForTurn(turn), axisForTurn(turn), angle);
  }

  private applyTurnToPieces(pieces: readonly MegaminxPhysicalPiece[], axis: Vector3, angle: number): void {
    const quaternion = new Quaternion().setFromAxisAngle(axis, angle);
    for (const piece of pieces) {
      piece.quaternion.premultiply(quaternion);
    }
    this.snapToNearestSlots();
  }

  private fillAnimationGroup(pieces: readonly MegaminxPhysicalPiece[]): void {
    for (const piece of pieces) {
      this._animationGroup.add(piece);
    }
  }

  private clearAnimationGroup(): void {
    const faces = this.facesByNearestSlot();
    const pieces = this._animationGroup.children.filter(
      (child): child is MegaminxPhysicalPiece => child instanceof MegaminxPhysicalPiece,
    );

    for (const piece of pieces) {
      this._mainGroup.add(piece);
      piece.position.set(0, 0, 0);
      piece.quaternion.identity();
    }

    this._animationGroup.rotation.set(0, 0, 0);
    this._animationGroup.quaternion.identity();
    this.applyFaces(faces);
  }

  private snapToNearestSlots(): void {
    const faces = this.facesByNearestSlot();

    for (const piece of this._pieces) {
      this._mainGroup.add(piece);
      piece.position.set(0, 0, 0);
      piece.quaternion.identity();
    }
    this.applyFaces(faces);
  }

  private applyFaces(faces: readonly MegaminxFace[]): void {
    for (let index = 0; index < this._slots.length; index++) {
      this._stickers[index].setFace(faces[index]);
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

  private piecesForTurn(turn: MegaminxTurn): MegaminxPhysicalPiece[] {
    const pieces = this._pieces.filter((piece) =>
      turn.kind === 'face' ? piece.faces.has(turn.face) : !piece.faces.has(turn.fixedFace),
    );
    const expectedPieceCount =
      turn.kind === 'face' ? MEGAMINX_FACE_TURN_PIECE_COUNT : MEGAMINX_WCA_WIDE_TURN_PIECE_COUNT;
    if (pieces.length !== expectedPieceCount) {
      const turnName = turn.kind === 'face' ? turn.face : `${turn.axis} wide`;
      throw new Error(`Megaminx ${turnName} resolved ${pieces.length} physical pieces for turn`);
    }

    return pieces;
  }
}

function axisForTurn(turn: MegaminxTurn): Vector3 {
  if (turn.kind === 'wca-wide') {
    return faceNormals[turn.fixedFace].clone().normalize().negate();
  }

  return axisForFace(turn.face);
}

function axisForFace(face: MegaminxFace): Vector3 {
  return faceNormals[face].clone().normalize();
}

function angleForTurn(turn: MegaminxTurn): number {
  const angle = turn.amount * TURN_ANGLE_RADIANS;
  return -angle;
}

export {
  DEFAULT_MEGAMINX_ANIMATION_SPEED_MS,
  DEFAULT_MEGAMINX_VISUAL_STYLE,
  MegaminxFaceColors,
  MegaminxVisualStyles,
} from './config';
export { MegaminxPhysicalPiece, MegaminxSticker } from './sticker';
export type { Megaminx3DOptions, MegaminxAnimationOptions, MegaminxVisualStyle };
export { defaultMegaminxStickerState };
