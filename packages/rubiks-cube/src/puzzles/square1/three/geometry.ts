import type { ColorRepresentation } from 'three';
import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three';
import type { Square1LayerName, Square1PieceKind } from '../core/types';
import { Square1Faces } from '../core/types';
import {
  SQUARE1_BOTTOM_Y,
  SQUARE1_CUT_OFFSET,
  SQUARE1_LAYER_HALF_SIZE,
  SQUARE1_LAYER_HEIGHT,
  SQUARE1_MIDDLE_HEIGHT,
  SQUARE1_STICKER_INSET,
  SQUARE1_STICKER_LIFT,
  SQUARE1_STICKER_VERTICAL_INSET,
  SQUARE1_TOP_Y,
  Square1FaceColors,
} from './config';

export type Square1StickerGeometry = {
  color: ColorRepresentation;
  geometry: BufferGeometry;
};

export type Square1PieceGeometry = {
  body: BufferGeometry;
  stickers: Square1StickerGeometry[];
};

type Point2 = {
  x: number;
  z: number;
};

const fullTurnUnits = 12;
const pieceBoundaryPhaseUnits = 0.5;
const tolerance = 0.0001;

export function createSquare1LayerPieceGeometry(
  startUnits: number,
  widthUnits: number,
  pieceKind: Square1PieceKind,
  layer: Extract<Square1LayerName, 'top' | 'bottom'>,
): Square1PieceGeometry {
  const start = startUnits + pieceBoundaryPhaseUnits;
  const end = start + widthUnits;
  const yCenter = layer === 'top' ? SQUARE1_TOP_Y : SQUARE1_BOTTOM_Y;
  const yMin = yCenter - SQUARE1_LAYER_HEIGHT / 2;
  const yMax = yCenter + SQUARE1_LAYER_HEIGHT / 2;
  const points = createSquare1OuterLayerPolygon(start, end);
  const stickers: Square1StickerGeometry[] = [];

  stickers.push({
    color: Square1FaceColors[layer === 'top' ? Square1Faces.U : Square1Faces.D],
    geometry: createCapStickerGeometry(points, layer === 'top' ? yMax : yMin, layer),
  });
  stickers.push(...createExternalSideStickerGeometries(points, yMin, yMax));

  return {
    body: createPrismGeometry(points, yMin, yMax),
    stickers,
  };
}

export function createSquare1MiddlePieceGeometry(index: 0 | 1): Square1PieceGeometry {
  const half = SQUARE1_LAYER_HALF_SIZE;
  const h = SQUARE1_CUT_OFFSET;
  const points =
    index === 0
      ? [
          { x: -half, z: -h },
          { x: -half, z: half },
          { x: half, z: half },
          { x: half, z: h },
        ]
      : [
          { x: -half, z: -half },
          { x: half, z: -half },
          { x: half, z: h },
          { x: -half, z: -h },
        ];
  const yMin = -SQUARE1_MIDDLE_HEIGHT / 2;
  const yMax = SQUARE1_MIDDLE_HEIGHT / 2;

  return {
    body: createPrismGeometry(points, yMin, yMax),
    stickers: createExternalSideStickerGeometries(points, yMin, yMax),
  };
}

function createSquare1OuterLayerPolygon(startUnits: number, endUnits: number): Point2[] {
  return [
    { x: 0, z: 0 },
    squareBoundaryPoint(startUnits),
    ...squareCornerPointsBetween(startUnits, endUnits),
    squareBoundaryPoint(endUnits),
  ];
}

function createPrismGeometry(points: readonly Point2[], yMin: number, yMax: number): BufferGeometry {
  const vertices: number[] = [];

  pushCap(vertices, points, yMax, false);
  pushCap(vertices, points, yMin, true);
  for (let index = 0; index < points.length; index++) {
    const nextIndex = (index + 1) % points.length;
    pushQuad(
      vertices,
      toVector3(points[index], yMax),
      toVector3(points[index], yMin),
      toVector3(points[nextIndex], yMin),
      toVector3(points[nextIndex], yMax),
    );
  }

  return createBufferGeometry(vertices);
}

function createCapStickerGeometry(
  points: readonly Point2[],
  y: number,
  layer: Extract<Square1LayerName, 'top' | 'bottom'>,
): BufferGeometry {
  const insetPoints = insetConvexPolygon(points, SQUARE1_STICKER_INSET);
  const liftedY = layer === 'top' ? y + SQUARE1_STICKER_LIFT : y - SQUARE1_STICKER_LIFT;
  const vertices: number[] = [];

  pushCap(vertices, insetPoints, liftedY, layer === 'bottom');
  return createBufferGeometry(vertices);
}

function createExternalSideStickerGeometries(
  points: readonly Point2[],
  yMin: number,
  yMax: number,
): Square1StickerGeometry[] {
  const stickers: Square1StickerGeometry[] = [];

  for (let index = 0; index < points.length; index++) {
    const nextIndex = (index + 1) % points.length;
    const start = points[index];
    const end = points[nextIndex];
    const boundary = externalBoundaryForSegment(start, end);
    if (!boundary) {
      continue;
    }

    stickers.push({
      color: boundary.color,
      geometry: createSideStickerGeometry(start, end, yMin, yMax, boundary.normal),
    });
  }

  return stickers;
}

function createSideStickerGeometry(
  start: Point2,
  end: Point2,
  yMin: number,
  yMax: number,
  normal: Point2,
): BufferGeometry {
  const segmentLength = Math.hypot(end.x - start.x, end.z - start.z);
  const horizontalInset = Math.min(SQUARE1_STICKER_INSET, segmentLength * 0.2);
  const verticalInset = Math.min(SQUARE1_STICKER_VERTICAL_INSET, (yMax - yMin) * 0.25);
  const direction = {
    x: (end.x - start.x) / segmentLength,
    z: (end.z - start.z) / segmentLength,
  };
  const a = {
    x: start.x + direction.x * horizontalInset + normal.x * SQUARE1_STICKER_LIFT,
    z: start.z + direction.z * horizontalInset + normal.z * SQUARE1_STICKER_LIFT,
  };
  const b = {
    x: end.x - direction.x * horizontalInset + normal.x * SQUARE1_STICKER_LIFT,
    z: end.z - direction.z * horizontalInset + normal.z * SQUARE1_STICKER_LIFT,
  };
  const vertices: number[] = [];

  pushQuad(
    vertices,
    toVector3(a, yMax - verticalInset),
    toVector3(a, yMin + verticalInset),
    toVector3(b, yMin + verticalInset),
    toVector3(b, yMax - verticalInset),
  );

  return createBufferGeometry(vertices);
}

function externalBoundaryForSegment(
  start: Point2,
  end: Point2,
): { color: ColorRepresentation; normal: Point2 } | undefined {
  const half = SQUARE1_LAYER_HALF_SIZE;
  if (isClose(start.x, half) && isClose(end.x, half)) {
    return { color: Square1FaceColors[Square1Faces.R], normal: { x: 1, z: 0 } };
  }
  if (isClose(start.x, -half) && isClose(end.x, -half)) {
    return { color: Square1FaceColors[Square1Faces.L], normal: { x: -1, z: 0 } };
  }
  if (isClose(start.z, half) && isClose(end.z, half)) {
    return { color: Square1FaceColors[Square1Faces.F], normal: { x: 0, z: 1 } };
  }
  if (isClose(start.z, -half) && isClose(end.z, -half)) {
    return { color: Square1FaceColors[Square1Faces.B], normal: { x: 0, z: -1 } };
  }

  return undefined;
}

function pushCap(vertices: number[], points: readonly Point2[], y: number, reverse: boolean): void {
  const center = toVector3(polygonCenter(points), y);
  for (let index = 0; index < points.length; index++) {
    const nextIndex = (index + 1) % points.length;
    const current = toVector3(points[index], y);
    const next = toVector3(points[nextIndex], y);
    if (reverse) {
      pushTriangle(vertices, center, next, current);
    } else {
      pushTriangle(vertices, center, current, next);
    }
  }
}

function insetConvexPolygon(points: readonly Point2[], amount: number): Point2[] {
  const orientation = polygonArea(points) >= 0 ? 1 : -1;
  const offsetLines = points.map((point, index) => {
    const next = points[(index + 1) % points.length];
    const edge = { x: next.x - point.x, z: next.z - point.z };
    const length = Math.hypot(edge.x, edge.z) || 1;
    const normal = {
      x: (-edge.z / length) * orientation,
      z: (edge.x / length) * orientation,
    };

    return {
      point: { x: point.x + normal.x * amount, z: point.z + normal.z * amount },
      direction: edge,
    };
  });

  return points.map((point, index) => {
    const previous = offsetLines[(index - 1 + offsetLines.length) % offsetLines.length];
    const current = offsetLines[index];
    return intersectLines(previous.point, previous.direction, current.point, current.direction) ?? point;
  });
}

function intersectLines(a: Point2, directionA: Point2, b: Point2, directionB: Point2): Point2 | undefined {
  const cross = cross2(directionA, directionB);
  if (Math.abs(cross) < tolerance) {
    return undefined;
  }

  const delta = { x: b.x - a.x, z: b.z - a.z };
  const t = cross2(delta, directionB) / cross;
  return {
    x: a.x + directionA.x * t,
    z: a.z + directionA.z * t,
  };
}

function cross2(a: Point2, b: Point2): number {
  return a.x * b.z - a.z * b.x;
}

function polygonCenter(points: readonly Point2[]): Point2 {
  const total = points.reduce(
    (sum, point) => ({
      x: sum.x + point.x,
      z: sum.z + point.z,
    }),
    { x: 0, z: 0 },
  );

  return {
    x: total.x / points.length,
    z: total.z / points.length,
  };
}

function polygonArea(points: readonly Point2[]): number {
  let area = 0;
  for (let index = 0; index < points.length; index++) {
    const nextIndex = (index + 1) % points.length;
    area += points[index].x * points[nextIndex].z - points[nextIndex].x * points[index].z;
  }

  return area / 2;
}

function squareCornerPointsBetween(startUnits: number, endUnits: number): Point2[] {
  const corners: Point2[] = [];
  const firstCycle = Math.floor(startUnits / fullTurnUnits) * fullTurnUnits;
  for (let cycleOffset = firstCycle; cycleOffset <= endUnits + fullTurnUnits; cycleOffset += fullTurnUnits) {
    for (const cornerUnits of [1.5, 4.5, 7.5, 10.5]) {
      const units = cycleOffset + cornerUnits;
      if (units > startUnits && units < endUnits) {
        corners.push(squareBoundaryPoint(units));
      }
    }
  }

  return corners;
}

function squareBoundaryPoint(units: number): Point2 {
  const direction = radialPoint(1, units);
  const scale = SQUARE1_LAYER_HALF_SIZE / Math.max(Math.abs(direction.x), Math.abs(direction.z));
  return {
    x: direction.x * scale,
    z: direction.z * scale,
  };
}

function radialPoint(radius: number, units: number): Point2 {
  const angle = (units * Math.PI) / 6;
  return {
    x: Math.cos(angle) * radius,
    z: Math.sin(angle) * radius,
  };
}

function createBufferGeometry(vertices: number[]): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function toVector3(point: Point2, y: number): Vector3 {
  return new Vector3(point.x, y, point.z);
}

function pushQuad(vertices: number[], a: Vector3, b: Vector3, c: Vector3, d: Vector3): void {
  pushTriangle(vertices, a, b, c);
  pushTriangle(vertices, a, c, d);
}

function pushTriangle(vertices: number[], a: Vector3, b: Vector3, c: Vector3): void {
  vertices.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
}

function isClose(a: number, b: number): boolean {
  return Math.abs(a - b) < tolerance;
}
