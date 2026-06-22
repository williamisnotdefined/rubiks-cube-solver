import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three';
import type { MegaminxFace } from '../core/types';
import { MEGAMINX_FACE_STICKER_COUNT, MegaminxFaceOrder } from '../core/types';
import {
  CORNER_CUT_RATIO,
  DODECAHEDRON_FACE_DISTANCE,
  FACE_INSET_RATIO,
  faceNormals,
  SURFACE_DEPTH,
  SURFACE_OFFSET,
} from './config';
import { MegaminxPhysicalPiece, type MegaminxPieceType, MegaminxSticker } from './sticker';

type FaceGeometry = {
  center: Vector3;
  normal: Vector3;
  vertices: Vector3[];
};

type SurfaceCell = {
  face: MegaminxFace;
  pieceKey: string;
  pieceType: MegaminxPieceType;
  polygon: Vector3[];
  slotIndex: number;
};

export type SurfaceSlot = {
  face: MegaminxFace;
  id: string;
  pieceKey: string;
  pieceType: MegaminxPieceType;
  position: Vector3;
  slotIndex: number;
};

export type MegaminxPhysicalModel = {
  pieces: MegaminxPhysicalPiece[];
  slots: SurfaceSlot[];
  stickers: MegaminxSticker[];
};

const adjacentDot = 1 / Math.sqrt(5);
const adjacencyEpsilon = 0.001;
const planeEpsilon = 0.000001;
const faceGeometryCache = new Map<MegaminxFace, FaceGeometry>();
const faceCellsCache = new Map<MegaminxFace, SurfaceCell[]>();

export function createPhysicalMegaminxModel(): MegaminxPhysicalModel {
  const piecesByKey = new Map<string, MegaminxPhysicalPiece>();
  const slots: SurfaceSlot[] = [];
  const stickers: MegaminxSticker[] = [];

  for (const face of MegaminxFaceOrder) {
    for (const cell of faceCells(face)) {
      const piece = getOrCreatePiece(piecesByKey, cell);
      const normal = faceNormals[cell.face].clone().normalize();
      const topPolygon = insetPolygon(cell.polygon, FACE_INSET_RATIO).map((point) =>
        point.clone().add(normal.clone().multiplyScalar(SURFACE_OFFSET)),
      );
      const position = averagePoint(topPolygon);
      const sticker = new MegaminxSticker(
        `megaminx-${cell.pieceKey}-${cell.slotIndex}`,
        cell.slotIndex,
        cell.face,
        cell.pieceKey,
        cell.pieceType,
        createExtrudedSurfaceGeometry(topPolygon, normal, position),
      );
      sticker.position.copy(position);
      piece.addSticker(sticker);
      stickers[cell.slotIndex] = sticker;
      slots[cell.slotIndex] = {
        face: cell.face,
        id: sticker.stickerId,
        pieceKey: cell.pieceKey,
        pieceType: cell.pieceType,
        position: position.clone(),
        slotIndex: cell.slotIndex,
      };
    }
  }

  const pieces = Array.from(piecesByKey.values());

  return { pieces, slots, stickers };
}

function getOrCreatePiece(piecesByKey: Map<string, MegaminxPhysicalPiece>, cell: SurfaceCell): MegaminxPhysicalPiece {
  const existing = piecesByKey.get(cell.pieceKey);
  if (existing) {
    return existing;
  }

  const piece = new MegaminxPhysicalPiece(cell.pieceKey, cell.pieceType);
  piecesByKey.set(cell.pieceKey, piece);

  return piece;
}

function faceCells(face: MegaminxFace): SurfaceCell[] {
  const cached = faceCellsCache.get(face);
  if (cached) {
    return cached;
  }

  const faceGeometry = getFaceGeometry(face);
  const { center, vertices } = faceGeometry;
  const innerVertices = vertices.map((vertex) => center.clone().add(vertex.clone().sub(center).multiplyScalar(0.38)));
  const startIndex = MegaminxFaceOrder.indexOf(face) * MEGAMINX_FACE_STICKER_COUNT;
  const cells: SurfaceCell[] = [
    {
      face,
      pieceKey: pieceKey('center', [face]),
      pieceType: 'center',
      polygon: innerVertices,
      slotIndex: startIndex,
    },
  ];

  for (let index = 0; index < vertices.length; index++) {
    const vertex = vertices[index];
    const nextVertex = vertices[(index + 1) % vertices.length];
    const previousVertex = vertices[(index + vertices.length - 1) % vertices.length];
    const innerVertex = innerVertices[index];
    const nextInnerVertex = innerVertices[(index + 1) % innerVertices.length];
    const cornerNext = vertex.clone().lerp(nextVertex, CORNER_CUT_RATIO);
    const cornerPrevious = vertex.clone().lerp(previousVertex, CORNER_CUT_RATIO);
    const edgeStart = cornerNext;
    const edgeEnd = vertex.clone().lerp(nextVertex, 1 - CORNER_CUT_RATIO);
    const cornerFaces = facesForVertex(face, vertex);
    const edgeFaces = facesForEdge(face, vertex.clone().add(nextVertex).multiplyScalar(0.5));

    cells.push({
      face,
      pieceKey: pieceKey('corner', cornerFaces),
      pieceType: 'corner',
      polygon: [vertex, cornerNext, innerVertex, cornerPrevious],
      slotIndex: startIndex + 1 + index * 2,
    });
    cells.push({
      face,
      pieceKey: pieceKey('edge', edgeFaces),
      pieceType: 'edge',
      polygon: [innerVertex, nextInnerVertex, edgeEnd, edgeStart],
      slotIndex: startIndex + 2 + index * 2,
    });
  }

  faceCellsCache.set(face, cells);

  return cells;
}

function facesForEdge(face: MegaminxFace, edgeMidpoint: Vector3): MegaminxFace[] {
  const faces = MegaminxFaceOrder.filter((candidate) => {
    return Math.abs(faceNormals[candidate].dot(edgeMidpoint) - DODECAHEDRON_FACE_DISTANCE) < adjacencyEpsilon;
  });
  if (faces.length !== 2 || !faces.includes(face)) {
    throw new Error(`Megaminx edge on ${face} did not resolve to two faces`);
  }

  return faces;
}

function facesForVertex(face: MegaminxFace, vertex: Vector3): MegaminxFace[] {
  const faces = MegaminxFaceOrder.filter((candidate) => {
    return Math.abs(faceNormals[candidate].dot(vertex) - DODECAHEDRON_FACE_DISTANCE) < adjacencyEpsilon;
  });
  if (faces.length !== 3 || !faces.includes(face)) {
    throw new Error(`Megaminx corner on ${face} did not resolve to three faces`);
  }

  return faces;
}

function pieceKey(pieceType: MegaminxPieceType, faces: readonly MegaminxFace[]): string {
  const sortedFaces = faces.slice().sort((a, b) => MegaminxFaceOrder.indexOf(a) - MegaminxFaceOrder.indexOf(b));
  return `${pieceType}:${sortedFaces.join('-')}`;
}

function getFaceGeometry(face: MegaminxFace): FaceGeometry {
  const cached = faceGeometryCache.get(face);
  if (cached) {
    return cached;
  }

  const normal = faceNormals[face].clone();
  const center = normal.clone().multiplyScalar(DODECAHEDRON_FACE_DISTANCE);
  const vertices = faceVertices(face, normal, center);
  const result = { center, normal, vertices };
  faceGeometryCache.set(face, result);

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

function insetPolygon(vertices: readonly Vector3[], ratio: number): Vector3[] {
  const center = averagePoint(vertices);

  return vertices.map((vertex) => center.clone().add(vertex.clone().sub(center).multiplyScalar(ratio)));
}

function averagePoint(points: readonly Vector3[]): Vector3 {
  return points.reduce((sum, point) => sum.add(point), new Vector3()).divideScalar(points.length);
}

function createExtrudedSurfaceGeometry(
  topPolygon: readonly Vector3[],
  normal: Vector3,
  origin: Vector3,
): BufferGeometry {
  const bottomPolygon = topPolygon.map((vertex) => vertex.clone().sub(normal.clone().multiplyScalar(SURFACE_DEPTH)));
  const vertices: number[] = [];

  pushFan(vertices, topPolygon, origin, false);
  pushFan(vertices, bottomPolygon, origin, true);

  for (let index = 0; index < topPolygon.length; index++) {
    const nextIndex = (index + 1) % topPolygon.length;
    pushTriangle(vertices, topPolygon[index], bottomPolygon[index], bottomPolygon[nextIndex], origin);
    pushTriangle(vertices, topPolygon[index], bottomPolygon[nextIndex], topPolygon[nextIndex], origin);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();

  return geometry;
}

function pushFan(vertices: number[], polygon: readonly Vector3[], origin: Vector3, reverse: boolean): void {
  const center = averagePoint(polygon);
  for (let index = 0; index < polygon.length; index++) {
    const nextIndex = (index + 1) % polygon.length;
    if (reverse) {
      pushTriangle(vertices, center, polygon[nextIndex], polygon[index], origin);
    } else {
      pushTriangle(vertices, center, polygon[index], polygon[nextIndex], origin);
    }
  }
}

function pushTriangle(vertices: number[], a: Vector3, b: Vector3, c: Vector3, origin: Vector3): void {
  for (const point of [a, b, c]) {
    const local = point.clone().sub(origin);
    vertices.push(local.x, local.y, local.z);
  }
}
