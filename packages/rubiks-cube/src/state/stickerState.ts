import type { CubeType, Face } from '../core';
import { CubeTypes, Faces } from '../core';

export type Vector = { x: number; y: number; z: number };
export type StickerState = Record<Face, Face[][]>;

const ERROR_MARGIN = 0.0001;
const LayerCount = {
  [CubeTypes.Two]: 2,
  [CubeTypes.Three]: 3,
  [CubeTypes.Four]: 4,
  [CubeTypes.Five]: 5,
  [CubeTypes.Six]: 6,
  [CubeTypes.Seven]: 7,
} satisfies Record<CubeType, number>;

export function getStickerFaceIndex(
  stickerDirection: Vector,
  piecePosition: Vector,
  layers: number[],
): { face: Face; i: number; j: number } {
  const last = layers.length - 1;
  const layerIndex = (val: number): number => {
    for (let i = 0; i < layers.length; i++) {
      if (Math.abs(val - layers[i]) < ERROR_MARGIN) {
        return i;
      }
    }
    throw new Error(`Failed to get layer number. position ${val} not found in layers ${layers}`);
  };
  if (stickerDirection.x === 1)
    return { face: Faces.R, i: last - layerIndex(piecePosition.y), j: last - layerIndex(piecePosition.z) };
  if (stickerDirection.x === -1)
    return { face: Faces.L, i: last - layerIndex(piecePosition.y), j: layerIndex(piecePosition.z) };
  if (stickerDirection.y === 1)
    return { face: Faces.U, i: layerIndex(piecePosition.z), j: layerIndex(piecePosition.x) };
  if (stickerDirection.y === -1)
    return { face: Faces.D, i: last - layerIndex(piecePosition.z), j: layerIndex(piecePosition.x) };
  if (stickerDirection.z === 1)
    return { face: Faces.F, i: last - layerIndex(piecePosition.y), j: layerIndex(piecePosition.x) };
  if (stickerDirection.z === -1)
    return { face: Faces.B, i: last - layerIndex(piecePosition.y), j: last - layerIndex(piecePosition.x) };
  throw new Error(`StickerDirection is not a standard unit vector. vector: ${stickerDirection}`);
}

export const defaultStickerState = (cubeType: CubeType): StickerState => {
  const n = LayerCount[cubeType];
  if (n == null) {
    throw new Error(`Invalid CubeType`);
  }
  return initialStickerState(n);
};

const initialStickerState = (layerCount: number): StickerState => {
  const state: StickerState = {
    [Faces.R]: Array.from({ length: layerCount }, () => Array.from({ length: layerCount }, () => Faces.R)),
    [Faces.U]: Array.from({ length: layerCount }, () => Array.from({ length: layerCount }, () => Faces.U)),
    [Faces.F]: Array.from({ length: layerCount }, () => Array.from({ length: layerCount }, () => Faces.F)),
    [Faces.B]: Array.from({ length: layerCount }, () => Array.from({ length: layerCount }, () => Faces.B)),
    [Faces.D]: Array.from({ length: layerCount }, () => Array.from({ length: layerCount }, () => Faces.D)),
    [Faces.L]: Array.from({ length: layerCount }, () => Array.from({ length: layerCount }, () => Faces.L)),
  };
  return state;
};

export const getEmptyStickerState = (cubeType: CubeType): StickerState => {
  const n = LayerCount[cubeType];
  if (n == null) {
    throw new Error(`Invalid CubeType`);
  }
  return emptyStickerState(n);
};
const emptyStickerState = (layerCount: number): StickerState => {
  const state: StickerState = {
    [Faces.R]: Array.from({ length: layerCount }, () => [] as Face[]),
    [Faces.U]: Array.from({ length: layerCount }, () => [] as Face[]),
    [Faces.F]: Array.from({ length: layerCount }, () => [] as Face[]),
    [Faces.B]: Array.from({ length: layerCount }, () => [] as Face[]),
    [Faces.D]: Array.from({ length: layerCount }, () => [] as Face[]),
    [Faces.L]: Array.from({ length: layerCount }, () => [] as Face[]),
  };
  return state;
};

export function toKociemba(stickerState: StickerState): string {
  return `${stickerState.U.flat().join('')}${stickerState.R.flat().join('')}${stickerState.F.flat().join('')}${stickerState.D.flat().join('')}${stickerState.L.flat().join('')}${stickerState.B.flat().join('')}`;
}

export function fromKociemba(kociembaString: string): StickerState | undefined {
  switch (kociembaString.length) {
    case 6 * 2 * 2:
      return fromKociembaWithLayerCount(kociembaString, 2);
    case 6 * 3 * 3:
      return fromKociembaWithLayerCount(kociembaString, 3);
    case 6 * 4 * 4:
      return fromKociembaWithLayerCount(kociembaString, 4);
    case 6 * 5 * 5:
      return fromKociembaWithLayerCount(kociembaString, 5);
    case 6 * 6 * 6:
      return fromKociembaWithLayerCount(kociembaString, 6);
    case 6 * 7 * 7:
      return fromKociembaWithLayerCount(kociembaString, 7);
    default:
      console.error(`Invalid state string length.`);
      return;
  }
}

function fromKociembaWithLayerCount(kociembaString: string, layerCount: number): StickerState | undefined {
  const stickerState = emptyStickerState(layerCount);
  for (let i = 0; i < 6; i++) {
    const faceString = kociembaString.slice(i * layerCount ** 2, (i + 1) * layerCount ** 2);
    for (let j = 0; j < layerCount; j++) {
      const rowString = faceString.slice(j * layerCount, (j + 1) * layerCount);
      for (let k = 0; k < layerCount; k++) {
        const face = Object.values(Faces).find((face) => rowString[k] === face);
        if (!face) {
          return undefined;
        }
        switch (i) {
          case 0:
            stickerState.U[j][k] = face;
            break;
          case 1:
            stickerState.R[j][k] = face;
            break;
          case 2:
            stickerState.F[j][k] = face;
            break;
          case 3:
            stickerState.D[j][k] = face;
            break;
          case 4:
            stickerState.L[j][k] = face;
            break;
          case 5:
            stickerState.B[j][k] = face;
            break;
        }
      }
    }
  }
  return stickerState;
}
