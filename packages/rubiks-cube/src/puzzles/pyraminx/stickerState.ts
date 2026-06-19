import { PyraminxFaceOrder, PYRAMINX_FACE_STICKER_COUNT, PYRAMINX_STICKER_COUNT } from './types';
import type { PyraminxFace } from './types';

const faceSymbols = new Set<string>(PyraminxFaceOrder);

export function defaultPyraminxStickerState(): string {
  return PyraminxFaceOrder.map((face) => face.repeat(PYRAMINX_FACE_STICKER_COUNT)).join('');
}

export function isPyraminxStickerState(value: string): value is string {
  return value.length === PYRAMINX_STICKER_COUNT && Array.from(value).every((face) => faceSymbols.has(face));
}

export function parsePyraminxStickerState(value: string): PyraminxFace[] | undefined {
  if (!isPyraminxStickerState(value)) {
    return undefined;
  }

  return Array.from(value) as PyraminxFace[];
}
