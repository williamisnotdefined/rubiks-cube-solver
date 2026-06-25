import { gsap } from 'gsap';
import { Group, Object3D } from 'three';
import type { TurnPlan } from '../../../shared/turnPlan';
import {
  parseSquare1Algorithm,
  parseSquare1MoveToken,
  Square1NotationError,
  square1MoveToString,
} from '../core/notation';
import type { Square1LayerPieceId, Square1Move, Square1PieceDefinition, Square1PieceId } from '../core/types';
import { SQUARE1_LAYER_UNIT_COUNT, Square1MiddlePieceOrder } from '../core/types';
import {
  cloneSquare1VisualStateModel,
  createSolvedSquare1VisualStateModel,
  defaultSquare1VisualState,
  parseSquare1VisualState,
  type Square1VisualStateModel,
  serializeSquare1VisualState,
  square1PieceDefinitionById,
} from '../state/visualState';
import { DEFAULT_SQUARE1_ANIMATION_SPEED_MS, SQUARE1_UNIT_ANGLE_RADIANS } from './config';
import { createSquare1LayerPieceGeometry, createSquare1MiddlePieceGeometry } from './geometry';
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

type LayerSplit = {
  firstHalf: Square1LayerPieceId[];
  secondHalf: Square1LayerPieceId[];
};

export class Square1IllegalMoveError extends Error {
  constructor(move: Square1Move) {
    super(`Illegal Square-1 move for current shape: ${square1MoveToString(move)}`);
    this.name = 'Square1IllegalMoveError';
  }
}

export class Square1D extends Object3D {
  animationSpeedMs: number;
  animationStyle: gsap.EaseString | gsap.EaseFunction;
  _animationGroup: Group;
  _bottomLayerGroup: Group;
  _currentAnimation: gsap.core.Tween | undefined;
  _mainGroup: Group;
  _middleGroup: Group;
  _model: Square1VisualStateModel;
  _moveQueue: Promise<void>;
  _pieces: Square1Piece[];
  _topLayerGroup: Group;

  constructor(options: Square1DOptions = {}) {
    super();
    this.animationSpeedMs = options.animationSpeedMs ?? DEFAULT_SQUARE1_ANIMATION_SPEED_MS;
    this.animationStyle = options.animationStyle ?? 'linear';
    this._model = createSolvedSquare1VisualStateModel();
    this._pieces = [];
    this._currentAnimation = undefined;
    this._moveQueue = Promise.resolve();
    this._mainGroup = new Group();
    this._animationGroup = new Group();
    this._topLayerGroup = new Group();
    this._bottomLayerGroup = new Group();
    this._middleGroup = new Group();
    this.add(this._mainGroup, this._animationGroup);
    this.rebuildPieces();
  }

  pieceCount(): number {
    return this._pieces.length;
  }

  reset(): string {
    this.finishCurrentAnimation();
    this._model = createSolvedSquare1VisualStateModel();
    this.rebuildPieces();
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
    this.rebuildPieces();

    return true;
  }

  turnPlan(moveInput: Square1MoveInput, options: Pick<Square1AnimationOptions, 'reverse'> = {}): TurnPlan {
    const move = this.directedMove(moveInput, options.reverse);
    if (move.kind === 'slash') {
      const { firstHalf: topRight } = splitLayerForSlash(this._model.top, this._model.topOffset, move);
      const { firstHalf: bottomRight } = splitLayerForSlash(this._model.bottom, this._model.bottomOffset, move);
      return {
        angleRadians: Math.PI,
        axis: { x: 0, y: 0, z: 1 },
        pieceIds: [...topRight, ...bottomRight, this.middleRightPieceId()],
      };
    }

    const topIds = move.top === 0 ? [] : this._model.top;
    const bottomIds = move.bottom === 0 ? [] : this._model.bottom;
    const angleUnits = move.top !== 0 ? -move.top : move.bottom;

    return {
      angleRadians: angleUnits * SQUARE1_UNIT_ANGLE_RADIANS,
      axis: { x: 0, y: 1, z: 0 },
      pieceIds: [...topIds, ...bottomIds],
    };
  }

  applyMove(moveInput: Square1MoveInput, options: Pick<Square1AnimationOptions, 'reverse'> = {}): string {
    this.finishCurrentAnimation();
    const move = this.directedMove(moveInput, options.reverse);
    this._model = applyMoveToModel(this._model, move);
    this.rebuildPieces();
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
    if (move.kind === 'slash') {
      ensureSlashLegal(this._model, move);
    }

    const speed = options.animationSpeedMs ?? this.animationSpeedMs;
    if (speed === 0) {
      this._model = applyMoveToModel(this._model, move);
      this.rebuildPieces();
      return Promise.resolve(this.getState());
    }

    return new Promise((resolve, reject) => {
      const target = { progress: 0 };
      if (move.kind === 'slash') {
        this.fillSlashAnimationGroup(move);
      }
      this._currentAnimation = gsap.to(target, {
        duration: speed / 1000,
        ease: this.animationStyle,
        onComplete: () => {
          this.clearAnimationPreview();
          this._currentAnimation = undefined;
          try {
            this._model = applyMoveToModel(this._model, move);
            this.rebuildPieces();
            resolve(this.getState());
          } catch (error) {
            reject(error);
          }
        },
        onUpdate: () => {
          this.previewMove(move, target.progress);
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

  private previewMove(move: Square1Move, progress: number): void {
    this.clearAnimationPreview();
    if (move.kind === 'slash') {
      this._animationGroup.rotation.z = progress * Math.PI;
      return;
    }

    this._topLayerGroup.rotation.y = layerRotationForOffset(this._model.topOffset + move.top * progress);
    this._bottomLayerGroup.rotation.y = layerRotationForOffset(this._model.bottomOffset - move.bottom * progress);
  }

  private clearAnimationPreview(): void {
    this._topLayerGroup.rotation.set(0, layerRotationForOffset(this._model.topOffset), 0);
    this._bottomLayerGroup.rotation.set(0, layerRotationForOffset(this._model.bottomOffset), 0);
    this._animationGroup.rotation.set(0, 0, 0);
  }

  private fillSlashAnimationGroup(move: Square1Move): void {
    const pieceIds = new Set(this.turnPlan(move).pieceIds);
    for (const piece of this._pieces) {
      if (pieceIds.has(piece.pieceId)) {
        this._animationGroup.add(piece);
      }
    }
  }

  private rebuildPieces(): void {
    this._mainGroup.clear();
    this._animationGroup.clear();
    this.clearAnimationPreview();
    this._pieces = [];
    this._topLayerGroup = this.createLayerGroup(this._model.top, this._model.topOffset, 'top');
    this._bottomLayerGroup = this.createLayerGroup(this._model.bottom, this._model.bottomOffset, 'bottom');
    this._middleGroup = this.createMiddleGroup();
    this._mainGroup.add(this._topLayerGroup, this._middleGroup, this._bottomLayerGroup);
  }

  private createLayerGroup(
    ids: readonly Square1LayerPieceId[],
    offset: number,
    layer: Extract<Square1Piece['displayLayer'], 'top' | 'bottom'>,
  ): Group {
    const group = new Group();
    let cursor = 0;
    for (const id of ids) {
      const definition = requiredPieceDefinition(id);
      const piece = new Square1Piece(
        definition,
        layer,
        createSquare1LayerPieceGeometry(cursor, definition.widthUnits, definition.kind, layer),
      );
      group.add(piece);
      this._pieces.push(piece);
      cursor += definition.widthUnits;
    }
    group.rotation.y = layerRotationForOffset(offset);

    return group;
  }

  private createMiddleGroup(): Group {
    const group = new Group();
    const middleIds = this._model.middleFlipped ? [...Square1MiddlePieceOrder].reverse() : Square1MiddlePieceOrder;
    for (const [index, id] of middleIds.entries()) {
      const piece = new Square1Piece(
        requiredPieceDefinition(id),
        'middle',
        createSquare1MiddlePieceGeometry(index as 0 | 1),
      );
      group.add(piece);
      this._pieces.push(piece);
    }

    return group;
  }

  private middleRightPieceId(): Square1PieceId {
    return this._model.middleFlipped ? 'M0' : 'M1';
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

function applyMoveToModel(model: Square1VisualStateModel, move: Square1Move): Square1VisualStateModel {
  const nextModel = cloneSquare1VisualStateModel(model);
  if (move.kind === 'coordinate') {
    nextModel.topOffset = modUnit(nextModel.topOffset + move.top);
    nextModel.bottomOffset = modUnit(nextModel.bottomOffset - move.bottom);
    return nextModel;
  }

  ensureSlashLegal(nextModel, move);
  const top = splitLayerForSlash(nextModel.top, nextModel.topOffset, move);
  const bottom = splitLayerForSlash(nextModel.bottom, nextModel.bottomOffset, move);
  nextModel.top = [...bottom.firstHalf].reverse().concat(top.secondHalf);
  nextModel.bottom = [...top.firstHalf].reverse().concat(bottom.secondHalf);
  nextModel.topOffset = 0;
  nextModel.bottomOffset = 0;
  nextModel.middleFlipped = !nextModel.middleFlipped;

  return nextModel;
}

function ensureSlashLegal(model: Square1VisualStateModel, move: Square1Move): void {
  if (
    move.kind !== 'slash' ||
    (hasBoundaryAtWorld(model.top, model.topOffset, 0) &&
      hasBoundaryAtWorld(model.top, model.topOffset, 6) &&
      hasBoundaryAtWorld(model.bottom, model.bottomOffset, 0) &&
      hasBoundaryAtWorld(model.bottom, model.bottomOffset, 6))
  ) {
    return;
  }

  throw new Square1IllegalMoveError(move);
}

function splitLayerForSlash(ids: readonly Square1LayerPieceId[], offset: number, move: Square1Move): LayerSplit {
  ensureLayerSlashLegal(ids, offset, move);
  const normalized = normalizeLayerToWorldZero(ids, offset);
  const firstHalf: Square1LayerPieceId[] = [];
  const secondHalf: Square1LayerPieceId[] = [];
  let cursor = 0;
  for (const id of normalized) {
    const width = requiredPieceDefinition(id).widthUnits;
    if (cursor < SQUARE1_LAYER_UNIT_COUNT / 2) {
      firstHalf.push(id);
    } else {
      secondHalf.push(id);
    }
    cursor += width;
  }

  return { firstHalf, secondHalf };
}

function ensureLayerSlashLegal(ids: readonly Square1LayerPieceId[], offset: number, move: Square1Move): void {
  if (hasBoundaryAtWorld(ids, offset, 0) && hasBoundaryAtWorld(ids, offset, SQUARE1_LAYER_UNIT_COUNT / 2)) {
    return;
  }

  throw new Square1IllegalMoveError(move);
}

function normalizeLayerToWorldZero(ids: readonly Square1LayerPieceId[], offset: number): Square1LayerPieceId[] {
  let cursor = 0;
  for (let index = 0; index < ids.length; index++) {
    if (modUnit(cursor + offset) === 0) {
      return [...ids.slice(index), ...ids.slice(0, index)];
    }
    cursor += requiredPieceDefinition(ids[index]).widthUnits;
  }

  return [...ids];
}

function hasBoundaryAtWorld(ids: readonly Square1LayerPieceId[], offset: number, target: number): boolean {
  let cursor = 0;
  for (const id of ids) {
    if (modUnit(cursor + offset) === modUnit(target)) {
      return true;
    }
    cursor += requiredPieceDefinition(id).widthUnits;
  }

  return modUnit(cursor + offset) === modUnit(target);
}

function requiredPieceDefinition(id: Square1PieceId): Square1PieceDefinition {
  const definition = square1PieceDefinitionById(id);
  if (!definition) {
    throw new Error(`Unknown Square-1 piece id: ${id}`);
  }

  return definition;
}

function modUnit(value: number): number {
  return ((value % SQUARE1_LAYER_UNIT_COUNT) + SQUARE1_LAYER_UNIT_COUNT) % SQUARE1_LAYER_UNIT_COUNT;
}

function layerRotationForOffset(offset: number): number {
  return -offset * SQUARE1_UNIT_ANGLE_RADIANS;
}

export { DEFAULT_SQUARE1_ANIMATION_SPEED_MS, Square1FaceColors } from './config';
export { Square1Piece } from './sticker';
export type { Square1AnimationOptions, Square1DOptions, Square1MoveInput };
export { defaultSquare1VisualState };
