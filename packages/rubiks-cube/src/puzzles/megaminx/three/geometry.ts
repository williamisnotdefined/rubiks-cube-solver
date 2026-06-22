import type { Quaternion } from 'three';
import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three';
import type { MegaminxFace } from '../core/types';
import { MegaminxFaceOrder } from '../core/types';
import {
  BACKING_OFFSET,
  BACKING_SCALE,
  CENTER_STICKER_RADIUS,
  CORNER_STICKER_SCALE,
  DODECAHEDRON_FACE_DISTANCE,
  EDGE_STICKER_SCALE,
  faceNormals,
  STICKER_OFFSET,
  STICKER_RADIUS,
} from './config';
import { MegaminxSticker } from './sticker';

type FaceGeometry = {
  center: Vector3;
  normal: Vector3;
  tangent: Vector3;
  bitangent: Vector3;
  vertices: Vector3[];
};

export type StickerSlot = {
  backingPosition: Vector3;
  backingQuaternion: Quaternion;
  face: MegaminxFace;
  id: string;
  position: Vector3;
  quaternion: Quaternion;
  slotIndex: number;
};

const adjacentDot = 1 / Math.sqrt(5);
const adjacencyEpsilon = 0.001;
const planeEpsilon = 0.000001;
const geometryCache = new Map<MegaminxFace, FaceGeometry>();

export function createFaceStickers(face: MegaminxFace, startIndex: number): MegaminxSticker[] {
  const faceGeometry = getFaceGeometry(face);
  const stickerCenters = createStickerCenters(faceGeometry);

  return stickerCenters.map((center, localIndex) => {
    const normal = faceGeometry.normal.clone();
    const position = center.clone().add(normal.clone().multiplyScalar(STICKER_OFFSET));
    const backingPosition = center.clone().add(normal.clone().multiplyScalar(BACKING_OFFSET));
    const radius = localIndex === 0 ? CENTER_STICKER_RADIUS : STICKER_RADIUS;
    const id = `megaminx-${face}-${startIndex + localIndex}`;
    const sticker = new MegaminxSticker(
      id,
      startIndex + localIndex,
      face,
      createPentagonGeometry(faceGeometry, center, radius, position),
      createPentagonGeometry(faceGeometry, center, radius * BACKING_SCALE, backingPosition),
    );
    sticker.backing.position.copy(backingPosition);
    sticker.position.copy(position);

    return sticker;
  });
}

function createStickerCenters(faceGeometry: FaceGeometry): Vector3[] {
  const { center, vertices } = faceGeometry;
  const centers = [center.clone()];

  for (let index = 0; index < vertices.length; index++) {
    const vertex = vertices[index];
    const nextVertex = vertices[(index + 1) % vertices.length];
    const edgeCenter = vertex.clone().add(nextVertex).multiplyScalar(0.5);
    centers.push(center.clone().add(vertex.clone().sub(center).multiplyScalar(CORNER_STICKER_SCALE)));
    centers.push(center.clone().add(edgeCenter.sub(center).multiplyScalar(EDGE_STICKER_SCALE)));
  }

  return centers;
}

function getFaceGeometry(face: MegaminxFace): FaceGeometry {
  const cached = geometryCache.get(face);
  if (cached) {
    return cached;
  }

  const normal = faceNormals[face].clone();
  const center = normal.clone().multiplyScalar(DODECAHEDRON_FACE_DISTANCE);
  const vertices = faceVertices(face, normal, center);
  const tangent = vertices[0].clone().sub(center).normalize();
  const bitangent = normal.clone().cross(tangent).normalize();
  const result = { center, normal, tangent, bitangent, vertices };
  geometryCache.set(face, result);

  return result;
}

function faceVertices(face: MegaminxFace, normal: Vector3, center: Vector3): Vector3[] {
  const neighbors = MegaminxFaceOrder.filter((candidate) => {
    return candidate !== face && Math.abs(faceNormals[candidate].dot(normal) - adjacentDot) < adjacencyEpsilon;
  });
  const vertices: Vector3[] = [];

  for (let i = 0; i < neighbors.length; i++) {
    for (let j = i + 1; j < neighbors.length; j++) {
      const point = intersectPlanes(normal, faceNormals[neighbors[i]], faceNormals[neighbors[j]]);
      if (
        !point ||
        !isInsideDodecahedron(point) ||
        vertices.some((vertex) => vertex.distanceToSquared(point) < 1e-10)
      ) {
        continue;
      }

      vertices.push(point);
    }
  }

  if (vertices.length !== 5) {
    throw new Error(`Megaminx face ${face} did not produce a pentagon`);
  }

  return sortAroundFace(vertices, center, normal);
}

function intersectPlanes(a: Vector3, b: Vector3, c: Vector3): Vector3 | undefined {
  const denominator = a.dot(b.clone().cross(c));
  if (Math.abs(denominator) < planeEpsilon) {
    return undefined;
  }

  return b
    .clone()
    .cross(c)
    .add(c.clone().cross(a))
    .add(a.clone().cross(b))
    .multiplyScalar(DODECAHEDRON_FACE_DISTANCE / denominator);
}

function isInsideDodecahedron(point: Vector3): boolean {
  return MegaminxFaceOrder.every((face) => faceNormals[face].dot(point) <= DODECAHEDRON_FACE_DISTANCE + planeEpsilon);
}

function sortAroundFace(vertices: Vector3[], center: Vector3, normal: Vector3): Vector3[] {
  const tangent = vertices[0].clone().sub(center).normalize();
  const bitangent = normal.clone().cross(tangent).normalize();

  return vertices
    .slice()
    .sort((a, b) => angleAround(a, center, tangent, bitangent) - angleAround(b, center, tangent, bitangent));
}

function angleAround(point: Vector3, center: Vector3, tangent: Vector3, bitangent: Vector3): number {
  const local = point.clone().sub(center);
  return Math.atan2(local.dot(bitangent), local.dot(tangent));
}

function createPentagonGeometry(
  faceGeometry: FaceGeometry,
  _center: Vector3,
  radius: number,
  origin: Vector3,
): BufferGeometry {
  const vertices: number[] = [];
  const geometryCenter = origin.clone();
  const points = Array.from({ length: 5 }, (_, index) => {
    const angle = (2 * Math.PI * index) / 5;
    return geometryCenter
      .clone()
      .add(faceGeometry.tangent.clone().multiplyScalar(Math.cos(angle) * radius))
      .add(faceGeometry.bitangent.clone().multiplyScalar(Math.sin(angle) * radius));
  });

  for (let index = 0; index < points.length; index++) {
    const nextIndex = (index + 1) % points.length;
    for (const point of [geometryCenter, points[index], points[nextIndex]]) {
      const local = point.clone().sub(origin);
      vertices.push(local.x, local.y, local.z);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();

  return geometry;
}
