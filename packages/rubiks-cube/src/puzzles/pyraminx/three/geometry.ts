import type { Quaternion } from 'three';
import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three';
import type { PyraminxFace } from '../core/types';
import { PyraminxFaces } from '../core/types';
import {
  BACKING_OFFSET,
  BACKING_SCALE,
  faceVertices,
  PYRAMINX_FACE_SIZE,
  STICKER_OFFSET,
  STICKER_SCALE,
  vertexPositions,
} from './config';
import { PyraminxSticker } from './sticker';

type BarycentricWeights = Record<PyraminxFace, number>;

type BarycentricPoint = {
  point: Vector3;
  weights: BarycentricWeights;
};

export type StickerSlot = {
  backingPosition: Vector3;
  backingQuaternion: Quaternion;
  face: PyraminxFace;
  id: string;
  position: Vector3;
  quaternion: Quaternion;
  slotIndex: number;
};

export function createFaceStickers(face: PyraminxFace, startIndex: number): PyraminxSticker[] {
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
