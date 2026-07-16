import type { ScanFaceSymbol } from '@api/solver/types'
import type { ScanSessionFaceRequest, ScanSessionReviewedSticker } from '../types'
import { isSupportedScanRotation } from '../validation'

export type ScanFaceRotation = 0 | 90 | 180 | 270

export type VisualScanSticker = {
  confidence?: number
  source?: string
  symbol: ScanFaceSymbol
}

export type VisualScanFace = {
  canonicalFace: ScanFaceSymbol
  clientRotation?: ScanFaceRotation
  expectedTop?: ScanFaceSymbol
  rotation: ScanFaceRotation
  stickers: readonly VisualScanSticker[]
}

export function buildScanSessionFace({
  canonicalFace,
  clientRotation,
  expectedTop,
  rotation,
  stickers,
}: VisualScanFace): ScanSessionFaceRequest {
  if (!isSupportedScanRotation(rotation)) {
    throw new TypeError('rotation must be one of 0, 90, 180, 270')
  }
  if (clientRotation !== undefined && !isSupportedScanRotation(clientRotation)) {
    throw new TypeError('clientRotation must be one of 0, 90, 180, 270')
  }

  const reviewedStickers = visualStickersToCanonical(stickers, rotation)
  const manualOverrides: Partial<Record<number, ScanFaceSymbol>> = {}

  for (const sticker of reviewedStickers) {
    if (sticker.source === 'manual' || sticker.source === 'center') {
      manualOverrides[sticker.index] = sticker.symbol
    }
  }

  return {
    clientRotation,
    expectedTop,
    manualOverrides: Object.keys(manualOverrides).length > 0 ? manualOverrides : undefined,
    reviewedStickers,
    symbol: canonicalFace,
  }
}

export function buildScanSessionFaces(faces: readonly VisualScanFace[]): ScanSessionFaceRequest[] {
  return faces.map(buildScanSessionFace)
}

export function visualStickersToCanonical(
  stickers: readonly VisualScanSticker[],
  rotation: ScanFaceRotation,
): ScanSessionReviewedSticker[] {
  const gridSize = squareGridSize(stickers.length)

  return stickers
    .map((sticker, visualIndex) => ({
      confidence: sticker.confidence,
      index: visualStickerIndexToCanonical(visualIndex, gridSize, rotation),
      source: sticker.source,
      symbol: sticker.symbol,
    }))
    .sort((left, right) => left.index - right.index)
}

export function visualStickerIndexToCanonical(
  visualIndex: number,
  gridSize: number,
  rotation: ScanFaceRotation,
): number {
  const row = Math.floor(visualIndex / gridSize)
  const column = visualIndex % gridSize

  if (rotation === 90) {
    return column * gridSize + (gridSize - 1 - row)
  }
  if (rotation === 180) {
    return (gridSize - 1 - row) * gridSize + (gridSize - 1 - column)
  }
  if (rotation === 270) {
    return (gridSize - 1 - column) * gridSize + row
  }

  return visualIndex
}

export function canonicalStickerIndexToVisual(
  canonicalIndex: number,
  gridSize: number,
  rotation: ScanFaceRotation,
): number {
  const inverseRotation = ((360 - rotation) % 360) as ScanFaceRotation
  return visualStickerIndexToCanonical(canonicalIndex, gridSize, inverseRotation)
}

function squareGridSize(stickerCount: number): number {
  const gridSize = Math.sqrt(stickerCount)
  if (!Number.isInteger(gridSize)) {
    throw new Error(`Scan face must contain a square sticker grid, received ${stickerCount}.`)
  }

  return gridSize
}
