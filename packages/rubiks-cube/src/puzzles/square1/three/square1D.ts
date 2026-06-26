import { gsap } from 'gsap';
import { Group, Object3D, Quaternion, Vector3 } from 'three';
import { parseSquare1Algorithm, parseSquare1MoveToken, Square1NotationError } from '../core/notation';
import { applySquare1Move } from '../core/state';
import type { Square1MiddlePieceId, Square1Move, Square1PieceDefinition, Square1PieceId } from '../core/types';
import { Square1PieceDefinitions } from '../core/types';
import {
  createSolvedSquare1VisualStateModel,
  defaultSquare1VisualState,
  parseSquare1VisualState,
  type Square1VisualStateModel,
  serializeSquare1VisualState,
} from '../state/visualState';
import { DEFAULT_SQUARE1_ANIMATION_SPEED_MS } from './config';
import { createSquare1LayerPieceGeometry, createSquare1MiddlePieceGeometry } from './geometry';
import { createSquare1MovePlan, type Square1MovePlan } from './movePlan';
import { applySquare1PiecePose, poseForPiece, type Square1PiecePose } from './pose';
import { Square1Piece } from './sticker';

type Square1DOptions = {
  animationSpeedMs?: number;
  animationStyle?: gsap.EaseString | gsap.EaseFunction;
};

type Square1AnimationOptions = {
  animationSpeedMs?: number;
  reverse?: boolean;
};

type Square1MoveInput = Square1Move | string;

type AnimatedPiecePose = {
  position: Vector3;
  quaternion: Quaternion;
};

export class Square1D extends Object3D {
  animationSpeedMs: number;
  animationStyle: gsap.EaseString | gsap.EaseFunction;
  _currentAnimation: gsap.core.Tween | undefined;
  _mainGroup: Group;
  _model: Square1VisualStateModel;
  _moveQueue: Promise<void>;
  _pieces: Square1Piece[];
  _piecesById: Map<Square1PieceId, Square1Piece>;

  constructor(options: Square1DOptions = {}) {
    super();
    this.animationSpeedMs = options.animationSpeedMs ?? DEFAULT_SQUARE1_ANIMATION_SPEED_MS;
    this.animationStyle = options.animationStyle ?? 'linear';
    this._model = createSolvedSquare1VisualStateModel();
    this._pieces = [];
    this._piecesById = new Map();
    this._currentAnimation = undefined;
    this._moveQueue = Promise.resolve();
    this._mainGroup = new Group();
    this.add(this._mainGroup);
    this.createPersistentPieces();
    this.applyStatePoses();
  }

  pieceCount(): number {
    return this._pieces.length;
  }

  pieceById(id: Square1PieceId): Square1Piece | undefined {
    return this._piecesById.get(id);
  }

  reset(): string {
    this.finishCurrentAnimation();
    this._model = createSolvedSquare1VisualStateModel();
    this.applyStatePoses();
    return this.getState();
  }

  getState(): string {
    return serializeSquare1VisualState(this._model);
  }

  setState(state: string): boolean {
    const nextState = parseSquare1VisualState(state);
    if (!nextState) {
      return false;
    }

    this.finishCurrentAnimation();
    this._model = nextState;
    this.applyStatePoses();

    return true;
  }

  movePlan(moveInput: Square1MoveInput, options: Pick<Square1AnimationOptions, 'reverse'> = {}): Square1MovePlan {
    return createSquare1MovePlan(this._model, this.directedMove(moveInput, options.reverse));
  }

  applyMove(moveInput: Square1MoveInput, options: Pick<Square1AnimationOptions, 'reverse'> = {}): string {
    this.finishCurrentAnimation();
    const move = this.directedMove(moveInput, options.reverse);
    this._model = applySquare1Move(this._model, move);
    this.applyStatePoses();
    return this.getState();
  }

  move(moveInput: Square1MoveInput, options: Square1AnimationOptions = {}): Promise<string> {
    const runMove = () => this.runMove(moveInput, options);
    const result = this._moveQueue.then(runMove, runMove);
    this._moveQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  async do(actions: readonly Square1MoveInput[] | string, options: Square1AnimationOptions = {}): Promise<string> {
    const moves = typeof actions === 'string' ? parseSquare1Algorithm(actions) : actions;

    for (const move of moves) {
      await this.move(move, options);
    }

    return this.getState();
  }

  private runMove(moveInput: Square1MoveInput, options: Square1AnimationOptions = {}): Promise<string> {
    this.finishCurrentAnimation();
    const move = this.directedMove(moveInput, options.reverse);
    const plan = createSquare1MovePlan(this._model, move);
    const nextModel = applySquare1Move(this._model, move);
    const speed = options.animationSpeedMs ?? this.animationSpeedMs;
    if (speed === 0 || plan.rotations.length === 0) {
      this._model = nextModel;
      this.applyStatePoses();
      return Promise.resolve(this.getState());
    }

    const startPoses = this.captureCurrentPoses();
    return new Promise((resolve, reject) => {
      const target = { progress: 0 };
      this._currentAnimation = gsap.to(target, {
        duration: speed / 1000,
        ease: this.animationStyle,
        onComplete: () => {
          this._currentAnimation = undefined;
          try {
            this._model = nextModel;
            this.applyStatePoses();
            resolve(this.getState());
          } catch (error) {
            reject(error);
          }
        },
        onUpdate: () => {
          this.previewMove(plan, startPoses, target.progress);
        },
        progress: 1,
      });
    });
  }

  private directedMove(moveInput: Square1MoveInput, reverse = false): Square1Move {
    const move = parseMoveInput(moveInput);
    if (!reverse || move.kind === 'slash') {
      return move;
    }

    return { bottom: -move.bottom, kind: 'coordinate', top: -move.top };
  }

  private previewMove(
    plan: Square1MovePlan,
    startPoses: Map<Square1PieceId, AnimatedPiecePose>,
    progress: number,
  ): void {
    const rotationByPiece = new Map<Square1PieceId, { angleRadians: number; axis: Vector3 }>();
    for (const rotation of plan.rotations) {
      const axis = new Vector3(rotation.axis.x, rotation.axis.y, rotation.axis.z).normalize();
      for (const pieceId of rotation.pieceIds) {
        rotationByPiece.set(pieceId, { angleRadians: rotation.angleRadians, axis });
      }
    }

    for (const piece of this._pieces) {
      const startPose = startPoses.get(piece.pieceId) as AnimatedPiecePose;
      const rotation = rotationByPiece.get(piece.pieceId);
      if (!rotation) {
        piece.position.copy(startPose.position);
        piece.quaternion.copy(startPose.quaternion);
        continue;
      }

      const delta = new Quaternion().setFromAxisAngle(rotation.axis, rotation.angleRadians * progress);
      piece.position.copy(startPose.position).applyQuaternion(delta);
      piece.quaternion.copy(delta).multiply(startPose.quaternion).normalize();
      piece.updateMatrixWorld(true);
    }
  }

  private createPersistentPieces(): void {
    for (const definition of Square1PieceDefinitions) {
      const piece = new Square1Piece(definition, createGeometryForDefinition(definition));
      this._pieces.push(piece);
      this._piecesById.set(piece.pieceId, piece);
      this._mainGroup.add(piece);
    }
  }

  private applyStatePoses(): void {
    for (const definition of Square1PieceDefinitions) {
      const piece = this._piecesById.get(definition.id);
      if (!piece) {
        throw new Error(`Missing Square-1 piece: ${definition.id}`);
      }
      applySquare1PiecePose(piece, poseForPiece(this._model, definition));
    }
  }

  private captureCurrentPoses(): Map<Square1PieceId, Square1PiecePose> {
    return new Map(
      this._pieces.map((piece) => [
        piece.pieceId,
        {
          position: piece.position.clone(),
          quaternion: piece.quaternion.clone(),
        },
      ]),
    );
  }

  private finishCurrentAnimation(): void {
    const animation = this._currentAnimation;
    if (!animation) {
      return;
    }

    animation.progress(1);
    this._currentAnimation = undefined;
  }
}

function parseMoveInput(moveInput: Square1MoveInput): Square1Move {
  if (typeof moveInput !== 'string') {
    return moveInput;
  }

  const move = parseSquare1MoveToken(moveInput);
  if (!move) {
    throw new Square1NotationError(moveInput);
  }

  return move;
}

function createGeometryForDefinition(definition: Square1PieceDefinition) {
  return definition.kind === 'middle'
    ? createSquare1MiddlePieceGeometry(definition.id as Square1MiddlePieceId)
    : createSquare1LayerPieceGeometry(definition.kind);
}

export { Square1IllegalMoveError } from '../core/state';
export { DEFAULT_SQUARE1_ANIMATION_SPEED_MS, Square1FaceColors } from './config';
export { Square1Piece } from './sticker';
export type { Square1AnimationOptions, Square1DOptions, Square1MoveInput };
export { defaultSquare1VisualState };
