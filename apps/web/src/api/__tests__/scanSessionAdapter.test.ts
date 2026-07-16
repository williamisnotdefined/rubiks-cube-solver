import { describe, expect, it } from 'vitest'
import {
  buildScanSessionFace,
  canonicalStickerIndexToVisual,
  visualStickerIndexToCanonical,
  type ScanFaceRotation,
} from '../scan'

describe('scan session adapter', () => {
  it.each([
    [2, 2],
    [3, 3],
  ])('round-trips visual and canonical indexes for a %sx%s face', (gridSize) => {
    const rotations: ScanFaceRotation[] = [0, 90, 180, 270]

    for (const rotation of rotations) {
      for (let visualIndex = 0; visualIndex < gridSize * gridSize; visualIndex += 1) {
        const canonicalIndex = visualStickerIndexToCanonical(visualIndex, gridSize, rotation)
        expect(canonicalStickerIndexToVisual(canonicalIndex, gridSize, rotation)).toBe(visualIndex)
      }
    }
  })

  it('builds the wire DTO after transforming visual stickers', () => {
    const face = buildScanSessionFace({
      canonicalFace: 'U',
      expectedTop: 'F',
      rotation: 180,
      stickers: [
        { confidence: 1, source: 'manual', symbol: 'U' },
        { confidence: 0.8, source: 'detected', symbol: 'R' },
        { confidence: 0.7, source: 'detected', symbol: 'F' },
        { confidence: 0.6, source: 'detected', symbol: 'D' },
      ],
    })

    expect(face.reviewedStickers?.map((sticker) => sticker.symbol)).toEqual(['D', 'F', 'R', 'U'])
    expect(face.manualOverrides).toEqual({ 3: 'U' })
  })

  it.each([
    Number.NaN,
    Infinity,
    -Infinity,
    0.5,
    -1,
    45,
    360,
  ])('rejects the unsupported visual rotation %s', (rotation) => {
    expect(() =>
      buildScanSessionFace({
        canonicalFace: 'U',
        rotation: rotation as never,
        stickers: [],
      }),
    ).toThrow('rotation must be one of 0, 90, 180, 270')
  })
})
