import { describe, expect, it } from 'vitest'
import type { ScanFaceSymbol } from '@api/solver/types'
import {
  createDefaultEvenCubeFaceRotations,
  createDefaultEvenCubeNetAssignments,
  evenCubeFitSolution,
  evenCubeScanSessionFacesFromDrafts,
} from '../scan/evenCubeScan'
import {
  scan2StickersPerFace,
  scanFaceOrder,
  type ScanFaceDrafts,
  type ScanSticker,
} from '../scan/scanState'

describe('evenCubeScan', () => {
  it('uses corrected 2x2 defaults for left/right slots and the down face rotation', () => {
    const sessionFaces = evenCubeScanSessionFacesFromDrafts(
      scanDraftsWithStickers({
        D: ['U', 'R', 'F', 'D'],
        L: ['L', 'L', 'L', 'L'],
        R: ['R', 'R', 'R', 'R'],
      }),
      createDefaultEvenCubeFaceRotations(),
      createDefaultEvenCubeNetAssignments(),
      scan2StickersPerFace,
    )

    expect(faceStickers(sessionFaces, 'D')).toEqual(['D', 'F', 'R', 'U'])
    expect(faceStickers(sessionFaces, 'L')).toEqual(['R', 'R', 'R', 'R'])
    expect(faceStickers(sessionFaces, 'R')).toEqual(['L', 'L', 'L', 'L'])
    expect(sessionFaces?.find((face) => face.symbol === 'D')).not.toHaveProperty('image')
  })

  it('scores the corrected 2x2 defaults as no autofit change', () => {
    const solution = evenCubeFitSolution(
      createDefaultEvenCubeNetAssignments(),
      createDefaultEvenCubeFaceRotations(),
    )

    expect(solution.changes).toEqual({
      rotatedFaces: 0,
      rotationQuarterTurns: 0,
      swappedSlots: 0,
    })
    expect(solution.score).toBe(0)
  })
})

function scanDraftsWithStickers(
  overrides: Partial<Record<ScanFaceSymbol, readonly ScanFaceSymbol[]>>,
): ScanFaceDrafts {
  return Object.fromEntries(
    scanFaceOrder.map(({ symbol }) => [
      symbol,
      {
        confirmed: true,
        photoDataUrl: `data:image/jpeg;base64,${symbol}`,
        stickers: scanStickers(overrides[symbol] ?? [symbol, symbol, symbol, symbol]),
        symbol,
      },
    ]),
  ) as ScanFaceDrafts
}

function scanStickers(symbols: readonly ScanFaceSymbol[]): ScanSticker[] {
  return symbols.map((symbol) => ({
    confidence: 1,
    source: 'manual',
    symbol,
  }))
}

function faceStickers(
  faces: ReturnType<typeof evenCubeScanSessionFacesFromDrafts>,
  symbol: ScanFaceSymbol,
): ScanFaceSymbol[] {
  const face = faces?.find((candidate) => candidate.symbol === symbol)
  return face?.reviewedStickers?.map((sticker) => sticker.symbol) ?? []
}
