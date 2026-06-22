import type { MegaminxFace } from '../core/types';
import { MEGAMINX_FACE_STICKER_COUNT, MEGAMINX_STICKER_COUNT, MegaminxFaceOrder } from '../core/types';

const faceSymbols = new Set<string>(MegaminxFaceOrder);

export function defaultMegaminxStickerState(): string {
  return MegaminxFaceOrder.map((face) => face.repeat(MEGAMINX_FACE_STICKER_COUNT)).join('');
}

export function isMegaminxStickerState(value: string): value is string {
  return value.length === MEGAMINX_STICKER_COUNT && Array.from(value).every((face) => faceSymbols.has(face));
}

export function parseMegaminxStickerState(value: string): MegaminxFace[] | undefined {
  if (!isMegaminxStickerState(value)) {
    return undefined;
  }

  return Array.from(value) as MegaminxFace[];
}
