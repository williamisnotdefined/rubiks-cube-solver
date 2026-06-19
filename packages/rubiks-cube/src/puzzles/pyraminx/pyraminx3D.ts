import { gsap } from 'gsap';
import type { ColorRepresentation } from 'three';
import {
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  Vector3,
} from 'three';
import type { TurnPlan } from '../turnPlan';
import { parsePyraminxAlgorithm, pyraminxMoveToTurn, reversePyraminxMove } from './notation';
import { defaultPyraminxStickerState, parsePyraminxStickerState } from './stickerState';
import type { PyraminxFace, PyraminxMove, PyraminxTurn } from './types';
import { PyraminxFaceOrder, PyraminxFaces } from './types';

type Pyraminx3DOptions = {
  animationSpeedMs?: number;
  animationStyle?: gsap.EaseString | gsap.EaseFunction;
};

type PyraminxAnimationOptions = {
  animationSpeedMs?: number;
  reverse?: boolean;
};

type BarycentricWeights = Record<PyraminxFace, number>;

type BarycentricPoint = {
  point: Vector3;
  weights: BarycentricWeights;
};

type StickerSlot = {
  backingPosition: Vector3;
  backingQuaternion: Quaternion;
  face: PyraminxFace;
  id: string;
  position: Vector3;
  quaternion: Quaternion;
  slotIndex: number;
};

const PYRAMINX_FACE_SIZE = 3;
const TETRA_RADIUS = 1.55;
const BACKING_SCALE = 1;
const BACKING_OFFSET = 0.018;
const STICKER_SCALE = 0.82;
const STICKER_OFFSET = 0.04;
const LAYER_EPSILON = 0.04;
const TURN_ANGLE_RADIANS = (2 * Math.PI) / 3;
export const DEFAULT_PYRAMINX_ANIMATION_SPEED_MS = 220;
const MAIN_LAYER_PROJECTION = TETRA_RADIUS / 9;
const TIP_LAYER_PROJECTION = (5 * TETRA_RADIUS) / 9;
const BASE_Y = -TETRA_RADIUS / 3;
const BASE_RADIUS = (2 * Math.sqrt(2) * TETRA_RADIUS) / 3;

const vertexPositions: Record<PyraminxFace, Vector3> = {
  [PyraminxFaces.U]: new Vector3(0, TETRA_RADIUS, 0),
  [PyraminxFaces.L]: new Vector3((-Math.sqrt(3) * BASE_RADIUS) / 2, BASE_Y, BASE_RADIUS / 2),
  [PyraminxFaces.R]: new Vector3((Math.sqrt(3) * BASE_RADIUS) / 2, BASE_Y, BASE_RADIUS / 2),
  [PyraminxFaces.B]: new Vector3(0, BASE_Y, -BASE_RADIUS),
};

const faceVertices: Record<PyraminxFace, readonly [PyraminxFace, PyraminxFace, PyraminxFace]> = {
  [PyraminxFaces.U]: [PyraminxFaces.L, PyraminxFaces.B, PyraminxFaces.R],
  [PyraminxFaces.L]: [PyraminxFaces.U, PyraminxFaces.R, PyraminxFaces.B],
  [PyraminxFaces.R]: [PyraminxFaces.U, PyraminxFaces.B, PyraminxFaces.L],
  [PyraminxFaces.B]: [PyraminxFaces.U, PyraminxFaces.L, PyraminxFaces.R],
};

export const PyraminxFaceColors = {
  [PyraminxFaces.U]: 'white',
  [PyraminxFaces.L]: '#2cbf13',
  [PyraminxFaces.R]: 'red',
  [PyraminxFaces.B]: 'blue',
} satisfies Record<PyraminxFace, ColorRepresentation>;

export class PyraminxSticker extends Mesh<BufferGeometry, MeshStandardMaterial> {
  backing: Mesh<BufferGeometry, MeshBasicMaterial>;
  stickerId: string;
  slotIndex: number;
  face: PyraminxFace;

  constructor(
    stickerId: string,
    slotIndex: number,
    face: PyraminxFace,
    geometry: BufferGeometry,
    backingGeometry: BufferGeometry,
  ) {
    super(
      geometry,
      new MeshStandardMaterial({
        color: PyraminxFaceColors[face],
        metalness: 0,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
        roughness: 0.4,
        side: DoubleSide,
      }),
    );
    this.backing = new Mesh(
      backingGeometry,
      new MeshBasicMaterial({
        color: 'black',
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
        side: DoubleSide,
      }),
    );
    this.stickerId = stickerId;
    this.slotIndex = slotIndex;
    this.face = face;
  }

  setFace(face: PyraminxFace): void {
    this.face = face;
    this.material.color.set(PyraminxFaceColors[face]);
  }
}

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
  return (turn.prime ? -1 : 1) * TURN_ANGLE_RADIANS;
}

function createFaceStickers(face: PyraminxFace, startIndex: number): PyraminxSticker[] {
  const stickers: PyraminxSticker[] = [];
  const addSticker = (pointCoords: readonly [number, number, number][]) => {
    const points = pointCoords.map((coords) => facePoint(face, coords));
    const center = averagePoint(points.map((point) => point.point));
    const normal = faceNormal(face);
    const backingPosition = center.clone().add(normal.clone().multiplyScalar(BACKING_OFFSET));
    const backingVertices = points.map((point) => {
      return center
        .clone()
        .add(point.point.clone().sub(center).multiplyScalar(BACKING_SCALE))
        .add(normal.clone().multiplyScalar(BACKING_OFFSET));
    });
    const position = center.clone().add(normal.clone().multiplyScalar(STICKER_OFFSET));
    const vertices = points.map((point) => {
      return center
        .clone()
        .add(point.point.clone().sub(center).multiplyScalar(STICKER_SCALE))
        .add(normal.clone().multiplyScalar(STICKER_OFFSET));
    });
    const id = `pyraminx-${face}-${startIndex + stickers.length}`;
    const sticker = new PyraminxSticker(
      id,
      startIndex + stickers.length,
      face,
      createTriangleGeometry(vertices, position),
      createTriangleGeometry(backingVertices, backingPosition),
    );
    sticker.backing.position.copy(backingPosition);
    sticker.position.copy(position);
    stickers.push(sticker);
  };

  for (let a = 0; a < PYRAMINX_FACE_SIZE; a++) {
    for (let b = 0; b < PYRAMINX_FACE_SIZE - a; b++) {
      const c = PYRAMINX_FACE_SIZE - 1 - a - b;
      addSticker([
        [a + 1, b, c],
        [a, b + 1, c],
        [a, b, c + 1],
      ]);
    }
  }

  for (let a = 0; a < PYRAMINX_FACE_SIZE - 1; a++) {
    for (let b = 0; b < PYRAMINX_FACE_SIZE - 1 - a; b++) {
      const c = PYRAMINX_FACE_SIZE - 2 - a - b;
      addSticker([
        [a + 1, b + 1, c],
        [a + 1, b, c + 1],
        [a, b + 1, c + 1],
      ]);
    }
  }

  return stickers;
}

function facePoint(face: PyraminxFace, coords: readonly [number, number, number]): BarycentricPoint {
  const vertices = faceVertices[face];
  const weights = emptyWeights();
  const point = new Vector3();

  for (let index = 0; index < vertices.length; index++) {
    const vertex = vertices[index];
    const weight = coords[index] / PYRAMINX_FACE_SIZE;
    weights[vertex] = weight;
    point.add(vertexPositions[vertex].clone().multiplyScalar(weight));
  }

  return { point, weights };
}

function emptyWeights(): BarycentricWeights {
  return {
    [PyraminxFaces.U]: 0,
    [PyraminxFaces.L]: 0,
    [PyraminxFaces.R]: 0,
    [PyraminxFaces.B]: 0,
  };
}

function averagePoint(points: readonly Vector3[]): Vector3 {
  return points.reduce((sum, point) => sum.add(point), new Vector3()).divideScalar(points.length);
}

function faceNormal(face: PyraminxFace): Vector3 {
  const [a, b, c] = faceVertices[face].map((vertex) => vertexPositions[vertex]);
  const normal = b.clone().sub(a).cross(c.clone().sub(a)).normalize();

  return normal;
}

function createTriangleGeometry(vertices: readonly Vector3[], origin = new Vector3()): BufferGeometry {
  const geometry = new BufferGeometry();
  const values = vertices.flatMap((vertex) => {
    const local = vertex.clone().sub(origin);
    return [local.x, local.y, local.z];
  });

  geometry.setAttribute('position', new Float32BufferAttribute(values, 3));
  geometry.computeVertexNormals();

  return geometry;
}

export type { Pyraminx3DOptions, PyraminxAnimationOptions };
export { defaultPyraminxStickerState };
