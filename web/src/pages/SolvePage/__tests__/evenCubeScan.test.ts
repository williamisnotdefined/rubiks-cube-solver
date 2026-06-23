import { describe, expect, it } from 'vitest'
import type { ScanFaceSymbol } from '@api/solver/types'
import {
  allEvenCubeFacesConfirmed,
  createDefaultEvenCubeFaceRotations,
  createDefaultEvenCubeNetAssignments,
  evenCubeCornerDefinitions,
  evenCubeFitSolution,
  evenCubeDraftsFromNet,
  evenCubeScanSessionFacesFromDrafts,
  rotateEvenCubeStickers,
  swapEvenCubeNetAssignments,
  validateEvenCubeScan,
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

  it('returns undefined until every even-cube face is complete', () => {
    const drafts = scanDraftsWithStickers({})
    drafts.U.confirmed = false

    expect(allEvenCubeFacesConfirmed(drafts)).toBe(false)
    expect(evenCubeScanSessionFacesFromDrafts(
      drafts,
      createDefaultEvenCubeFaceRotations(),
      createDefaultEvenCubeNetAssignments(),
      scan2StickersPerFace,
    )).toBeUndefined()
  })

  it('omits manual overrides for detector-sourced stickers', () => {
    const sessionFaces = evenCubeScanSessionFacesFromDrafts(
      scanDraftsWithStickers({}, 'detected'),
      createDefaultEvenCubeFaceRotations(),
      createDefaultEvenCubeNetAssignments(),
      scan2StickersPerFace,
    )

    expect(sessionFaces?.every((face) => face.manualOverrides === undefined)).toBe(true)
  })

  it('reports invalid corner color combinations', () => {
    const drafts = scanDraftsWithStickers({ F: ['U', 'U', 'U', 'U'] })
    const validation = validateEvenCubeScan(
      drafts,
      createDefaultEvenCubeFaceRotations(),
      createDefaultEvenCubeNetAssignments(),
      scan2StickersPerFace,
    )

    expect(validation.ok).toBe(false)
    expect(validation.invalidCorners.length).toBeGreaterThan(0)
  })

  it('rotates square stickers and leaves non-square inputs unchanged', () => {
    const stickers = scanStickers(['U', 'R', 'F', 'D'])

    expect(rotateEvenCubeStickers(stickers, 0).map((sticker) => sticker.symbol)).toEqual(['U', 'R', 'F', 'D'])
    expect(rotateEvenCubeStickers(stickers, 90).map((sticker) => sticker.symbol)).toEqual(['F', 'U', 'D', 'R'])
    expect(rotateEvenCubeStickers(stickers, 180).map((sticker) => sticker.symbol)).toEqual(['D', 'F', 'R', 'U'])
    expect(rotateEvenCubeStickers(stickers, 270).map((sticker) => sticker.symbol)).toEqual(['R', 'D', 'U', 'F'])
    expect(rotateEvenCubeStickers(stickers.slice(0, 3), 90)).toEqual(stickers.slice(0, 3))
  })

  it('swaps net assignments and keeps same-slot swaps stable', () => {
    const assignments = createDefaultEvenCubeNetAssignments()

    expect(swapEvenCubeNetAssignments(assignments, 'F', 'F')).toBe(assignments)
    expect(swapEvenCubeNetAssignments(assignments, 'F', 'U')).toMatchObject({ F: 'U', U: 'F' })
  })

  it('creates net drafts and ignores invalid corner definition sizes', () => {
    const drafts = scanDraftsWithStickers({})
    const netDrafts = evenCubeDraftsFromNet(
      drafts,
      createDefaultEvenCubeFaceRotations(),
      createDefaultEvenCubeNetAssignments(),
    )

    expect(netDrafts.L.symbol).toBe('L')
    expect(netDrafts.L.stickers.every((sticker) => sticker.symbol === 'R')).toBe(true)
    expect(evenCubeCornerDefinitions(1)).toEqual([])
  })
})

function scanDraftsWithStickers(
  overrides: Partial<Record<ScanFaceSymbol, readonly ScanFaceSymbol[]>>,
  source: ScanSticker['source'] = 'manual',
): ScanFaceDrafts {
  return Object.fromEntries(
    scanFaceOrder.map(({ symbol }) => [
      symbol,
      {
        confirmed: true,
        photoDataUrl: `data:image/jpeg;base64,${symbol}`,
        stickers: scanStickers(overrides[symbol] ?? [symbol, symbol, symbol, symbol], source),
        symbol,
      },
    ]),
  ) as ScanFaceDrafts
}

function scanStickers(
  symbols: readonly ScanFaceSymbol[],
  source: ScanSticker['source'] = 'manual',
): ScanSticker[] {
  return symbols.map((symbol) => ({
    confidence: 1,
    source,
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
