import { describe, expect, it } from 'vitest'
import type { ScanTileDetection } from '@api/scan'
import { assignTileDetectionsToReviewGrid, validStickerTileDetections } from '../scanTileDetections'

describe('scanTileDetections', () => {
  it('keeps confident detector tiles by default', () => {
    const detections = tileDetections(0.6)

    expect(validStickerTileDetections(detections)).toHaveLength(9)
    expect(assignTileDetectionsToReviewGrid(detections)).toHaveLength(9)
  })

  it('filters noise below the detector threshold', () => {
    const detections = [...tileDetections(0.6), tileDetection(9, 0.4)]

    expect(validStickerTileDetections(detections)).toHaveLength(9)
  })
})

function tileDetections(confidence: number): ScanTileDetection[] {
  return Array.from({ length: 9 }, (_, index) => tileDetection(index, confidence))
}

function tileDetection(index: number, confidence: number): ScanTileDetection {
  const row = Math.floor(index / 3)
  const column = index % 3

  return {
    bbox: {
      height: 0.18,
      width: 0.18,
      x: 0.25 + column * 0.25,
      y: 0.25 + row * 0.25,
    },
    confidence,
    symbol: index === 4 ? 'U' : 'F',
  }
}
