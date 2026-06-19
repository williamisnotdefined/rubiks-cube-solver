import type { Movement, Rotation } from '../core';
import { Rotations } from '../core';

export const Axi = {
  x: 'x',
  y: 'y',
  z: 'z',
} as const;

export type Axis = (typeof Axi)[keyof typeof Axi];

export type Slice = {
  axis: Axis;
  layerIds: number[];
  direction: number;
};

export function GetMovementSlice(movement: Movement, layerCount: number): Slice | undefined {
  const result = /^([1234567]|[123456]-[1234567])?([RLUDFB]w|[RLUDFBMES]|[rludfbmes])([123])?(')?$/.exec(movement);
  if (result == null) {
    console.error(`Failed to parse movement. Invalid movement: ${movement}`);
    return undefined;
  }
  let layerRangeLower: number | undefined;
  let layerRangeUpper: number | undefined;
  let layerNumber: number | undefined;
  if (result[1]?.includes('-')) {
    layerRangeLower = parseInt(result[1][0], 10);
    layerRangeUpper = parseInt(result[1][2], 10);
  } else {
    layerNumber = result[1] ? parseInt(result[1], 10) : undefined;
  }

  if (layerRangeLower != null && layerRangeUpper != null) {
    if (layerRangeLower >= layerRangeUpper || layerRangeUpper > layerCount || layerRangeLower > layerCount - 1) {
      console.error(
        `${movement} is not valid for the current cubeType. For range inputs like x-yr it should follow that 1 <= x < y <= ${layerCount}.`,
      );
      return undefined;
    }
  }
  if (layerNumber != null && layerNumber > layerCount) {
    console.error(
      `${movement} is not valid for the current cubeType. For inputs like xR it should follow that x <= ${layerCount}.`,
    );
    return undefined;
  }

  const movementType = result[2];
  const rotationNumber = result[3] ? parseInt(result[3], 10) % 4 : 1;
  const isPrime = result[4] === "'";
  const direction = (isPrime ? -1 : 1) * rotationNumber;

  let axis: Axis = Axi.x;
  switch (movementType) {
    case 'R':
    case 'Rw':
    case 'r':
    case 'L':
    case 'Lw':
    case 'l':
    case 'M':
    case 'm':
      axis = Axi.x;
      break;
    case 'U':
    case 'Uw':
    case 'u':
    case 'D':
    case 'Dw':
    case 'd':
    case 'E':
    case 'e':
      axis = Axi.y;
      break;
    case 'F':
    case 'Fw':
    case 'f':
    case 'B':
    case 'Bw':
    case 'b':
    case 'S':
    case 's':
      axis = Axi.z;
      break;
  }

  switch (movementType) {
    case 'R':
    case 'U':
    case 'F': {
      layerNumber = layerNumber ? layerNumber : 1;
      const layerIndex = layerCount - layerNumber;
      let sliceLayers = [layerIndex];
      if (layerRangeLower != null && layerRangeUpper != null) {
        sliceLayers = range(layerCount - layerRangeUpper, layerCount - (layerRangeLower - 1));
      }
      return { axis, layerIds: sliceLayers, direction: -direction };
    }
    case 'L':
    case 'D':
    case 'B': {
      layerNumber = layerNumber ? layerNumber : 1;
      const layerIndex = layerNumber - 1;
      let sliceLayers = [layerIndex];
      if (layerRangeLower != null && layerRangeUpper != null) {
        sliceLayers = range(layerRangeLower - 1, layerRangeUpper);
      }
      return { axis, layerIds: sliceLayers, direction };
    }
    case 'Rw':
    case 'Uw':
    case 'Fw':
    case 'r':
    case 'u':
    case 'f': {
      layerNumber = layerNumber ? layerNumber : 2;
      let sliceLayers = range(layerCount - layerNumber, layerCount);
      if (layerRangeLower != null && layerRangeUpper != null) {
        sliceLayers = range(layerCount - layerRangeUpper, layerCount - (layerRangeLower - 1));
      }
      return { axis, layerIds: sliceLayers, direction: -direction };
    }
    case 'Lw':
    case 'Dw':
    case 'Bw':
    case 'l':
    case 'd':
    case 'b': {
      layerNumber = layerNumber ? layerNumber : 2;
      let sliceLayers = range(0, layerNumber);
      if (layerRangeLower != null && layerRangeUpper != null) {
        sliceLayers = range(layerRangeLower - 1, layerRangeUpper);
      }
      return { axis, layerIds: sliceLayers, direction };
    }
    case 'M':
    case 'E': {
      layerNumber = layerNumber ? layerNumber : 1;
      const lower = Math.max(Math.floor(layerCount / 2) - (layerNumber - 1), 1);
      const upper = Math.min(Math.ceil(layerCount / 2) + (layerNumber - 1), layerCount - 1);
      let sliceLayers = range(lower, upper);
      if (layerRangeLower != null && layerRangeUpper != null) {
        sliceLayers = range(layerCount - layerRangeUpper, layerCount - (layerRangeLower - 1));
      }
      return { axis, layerIds: sliceLayers, direction };
    }
    case 'm':
    case 'e': {
      layerNumber = layerNumber ? layerNumber : 1;
      let sliceLayers = range(layerNumber, layerCount - layerNumber);
      if (layerRangeLower != null && layerRangeUpper != null) {
        sliceLayers = range(layerCount - layerRangeUpper, layerCount - (layerRangeLower - 1));
      }
      return { axis, layerIds: sliceLayers, direction };
    }
    case 'S': {
      layerNumber = layerNumber ? layerNumber : 1;
      const lower = Math.max(Math.floor(layerCount / 2) - (layerNumber - 1), 1);
      const upper = Math.min(Math.ceil(layerCount / 2) + (layerNumber - 1), layerCount - 1);
      let sliceLayers = range(lower, upper);
      if (layerRangeLower != null && layerRangeUpper != null) {
        sliceLayers = range(layerRangeLower - 1, layerRangeUpper);
      }
      return { axis, layerIds: sliceLayers, direction: -direction };
    }
    case 's': {
      layerNumber = layerNumber ? layerNumber : 1;
      let sliceLayers = range(layerNumber, layerCount - layerNumber);
      if (layerRangeLower != null && layerRangeUpper != null) {
        sliceLayers = range(layerRangeLower - 1, layerRangeUpper);
      }
      return { axis, layerIds: sliceLayers, direction: -direction };
    }
  }
}

export function GetRotationSlice(rotation: Rotation, layerCount: number): Slice | undefined {
  const result = /^([xyz])(\d)?(')?$/.exec(rotation);
  if (result == null) {
    console.error(`Failed to parse rotation. invalid rotation: [${rotation}]`);
    return undefined;
  }
  const rotationType = result[1];
  const rotationNumber = result[2] ? parseInt(result[2], 10) : 1;

  const isPrime = result[3] === "'";
  const direction = (isPrime ? 1 : -1) * (rotationNumber % 4);
  switch (rotationType) {
    case Rotations.x:
      return { axis: Axi.x, layerIds: range(layerCount), direction };
    case Rotations.y:
      return { axis: Axi.y, layerIds: range(layerCount), direction };
    case Rotations.z:
      return { axis: Axi.z, layerIds: range(layerCount), direction };
  }
}

const range = (start: number, stop?: number, step = 1): number[] => {
  if (stop === undefined) {
    stop = start;
    start = 0;
  }

  const length = Math.max(Math.ceil((stop - start) / step), 0);
  return Array.from({ length }, (_, i) => start + i * step);
};
