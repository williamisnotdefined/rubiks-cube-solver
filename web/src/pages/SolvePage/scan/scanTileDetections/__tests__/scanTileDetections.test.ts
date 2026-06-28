import { describe, expect, it } from 'vitest'
import type { ScanTileDetection } from '@api/scan'
import {
  assignedTileDetectionsReady,
  assignTileDetectionsToReviewGrid,
  validStickerTileDetections,
} from '../scanTileDetections'

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

  it('filters face boxes, invalid boxes, and custom low-confidence tiles', () => {
    const detections: ScanTileDetection[] = [
      tileDetection(0, 0.8),
      { ...tileDetection(1, 0.9), symbol: 'face' },
      { ...tileDetection(2, 0.9), bbox: { height: 0.18, width: 0, x: 0.25, y: 0.25 } },
      { ...tileDetection(3, 0.9), bbox: { height: 0, width: 0.18, x: 0.25, y: 0.25 } },
      tileDetection(4, 0.69),
    ]

    expect(validStickerTileDetections(detections, 0.7)).toEqual([tileDetection(0, 0.8)])
  })

  it('requires at least nine candidate tiles before assignment', () => {
    expect(assignTileDetectionsToReviewGrid(tileDetections(0.8).slice(0, 8))).toBeUndefined()
  })

  it('checks whether the assigned center matches the expected scan face', () => {
    const detections = tileDetections(0.8)

    expect(assignedTileDetectionsReady(detections, 'U')).toBe(true)
    expect(assignedTileDetectionsReady(detections, 'F')).toBe(false)
  })

  it('chooses the best nine grid tiles from extra detector candidates', () => {
    const detections = [
      ...tileDetections(0.8),
      {
        bbox: { height: 0.18, width: 0.18, x: 0.01, y: 0.01 },
        confidence: 0.99,
        symbol: 'R' as const,
      },
    ]

    expect(assignTileDetectionsToReviewGrid(detections)).toHaveLength(9)
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
