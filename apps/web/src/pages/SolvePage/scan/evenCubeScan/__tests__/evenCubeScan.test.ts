import type { ScanFaceSymbol } from '@api/solver/types'
import { describe, expect, it } from 'vitest'
import {
  type ScanFaceDrafts,
  type ScanSticker,
  scan2StickersPerFace,
  scanFaceOrder,
} from '../../scanState'
import {
  allEvenCubeFacesConfirmed,
  createDefaultEvenCubeFaceRotations,
  createDefaultEvenCubeNetAssignments,
  evenCubeCornerDefinitions,
  evenCubeDraftsFromNet,
  evenCubeFitSolution,
  evenCubeScanSessionFacesFromDrafts,
  findEvenCubeFullFit,
  findEvenCubeRotationFit,
  rotateEvenCubeDrafts,
  rotateEvenCubeStickers,
  swapEvenCubeNetAssignments,
  validateEvenCubeScan,
} from '../evenCubeScan'

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

  it('rejects incomplete drafts and drafts without exact color counts', () => {
    const incompleteDrafts = validNetDrafts()
    incompleteDrafts.U.stickers[0] = {
      ...incompleteDrafts.U.stickers[0],
      symbol: undefined,
    }

    expect(validateEvenCubeScan(incompleteDrafts, {}, identityNetAssignments())).toEqual({
      invalidCorners: [],
      ok: false,
    })
    expect(findEvenCubeFullFit(incompleteDrafts)).toEqual({ status: 'none' })

    const unbalancedDrafts = validNetDrafts()
    unbalancedDrafts.F.stickers = scanStickers(['U', 'U', 'U', 'U'])

    expect(findEvenCubeFullFit(unbalancedDrafts)).toEqual({ status: 'none' })
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

  it('rotates complete draft records without mutating their stickers', () => {
    const drafts = scanDraftsWithStickers({
      F: ['U', 'R', 'F', 'D'],
      U: ['B', 'L', 'D', 'F'],
    })
    const rotated = rotateEvenCubeDrafts(drafts, { F: 90, U: 180 })

    expect(rotated.F.stickers.map((sticker) => sticker.symbol)).toEqual(['F', 'U', 'D', 'R'])
    expect(rotated.U.stickers.map((sticker) => sticker.symbol)).toEqual(['F', 'D', 'L', 'B'])
    expect(rotated.R.stickers).not.toBe(drafts.R.stickers)
    expect(drafts.F.stickers.map((sticker) => sticker.symbol)).toEqual(['U', 'R', 'F', 'D'])
  })

  it('distinguishes none, unique, suggested, and ambiguous automatic fits', () => {
    const ambiguousDrafts = capturedDraftsFromNet(
      draftsFromVisualState('BRLFLFFUBUULRDDRDULFDRBB'),
    )
    expect(findEvenCubeRotationFit(
      ambiguousDrafts,
      createDefaultEvenCubeNetAssignments(),
    )).toMatchObject({
      alternatives: expect.any(Number),
      status: 'ambiguous',
    })
    expect(findEvenCubeFullFit(ambiguousDrafts)).toMatchObject({
      alternatives: expect.any(Number),
      status: 'ambiguous',
    })

    const uniqueDrafts = swapDraftStickers(
      capturedDraftsFromNet(draftsFromVisualState('RLDFUFDDFRBBURDFURLLUBLB')),
      'F',
      'U',
    )
    expect(findEvenCubeRotationFit(
      uniqueDrafts,
      createDefaultEvenCubeNetAssignments(),
    )).toMatchObject({
      solution: { score: expect.any(Number) },
      status: 'unique',
    })

    const rotationSuggestedDrafts = capturedDraftsFromNet(
      draftsFromVisualState('FFLRURBBUBRRDDDLDFLFULUB'),
    )
    expect(findEvenCubeRotationFit(
      rotationSuggestedDrafts,
      createDefaultEvenCubeNetAssignments(),
    )).toMatchObject({
      solution: { score: expect.any(Number) },
      status: 'suggested',
    })

    const fullSuggestedDrafts = swapDraftStickers(
      capturedDraftsFromNet(draftsFromVisualState('RLDFUFDDFRBBURDFURLLUBLB')),
      'F',
      'D',
    )
    expect(findEvenCubeRotationFit(
      fullSuggestedDrafts,
      createDefaultEvenCubeNetAssignments(),
    )).toEqual({ status: 'none' })
    expect(findEvenCubeFullFit(fullSuggestedDrafts)).toMatchObject({
      solution: { score: expect.any(Number) },
      status: 'suggested',
    })
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

function validNetDrafts(): ScanFaceDrafts {
  return scanDraftsWithStickers({
    B: ['F', 'R', 'F', 'B'],
    D: ['D', 'L', 'L', 'U'],
    F: ['R', 'D', 'R', 'F'],
    L: ['B', 'B', 'U', 'F'],
    R: ['L', 'L', 'D', 'R'],
    U: ['U', 'U', 'D', 'B'],
  })
}

function capturedDraftsFromNet(netDrafts: ScanFaceDrafts): ScanFaceDrafts {
  return scanDraftsWithStickers({
    B: stickerSymbols(netDrafts.B.stickers),
    D: stickerSymbols(rotateEvenCubeStickers(netDrafts.D.stickers, 180)),
    F: stickerSymbols(netDrafts.F.stickers),
    L: stickerSymbols(netDrafts.R.stickers),
    R: stickerSymbols(netDrafts.L.stickers),
    U: stickerSymbols(netDrafts.U.stickers),
  })
}

function swapDraftStickers(
  drafts: ScanFaceDrafts,
  first: ScanFaceSymbol,
  second: ScanFaceSymbol,
): ScanFaceDrafts {
  return {
    ...drafts,
    [first]: { ...drafts[first], stickers: drafts[second].stickers },
    [second]: { ...drafts[second], stickers: drafts[first].stickers },
  }
}

function draftsFromVisualState(visualState: string): ScanFaceDrafts {
  const [U, R, F, D, L, B] = visualState.match(/.{4}/g) as string[]

  return scanDraftsWithStickers({
    B: [...B] as ScanFaceSymbol[],
    D: [...D] as ScanFaceSymbol[],
    F: [...F] as ScanFaceSymbol[],
    L: [...L] as ScanFaceSymbol[],
    R: [...R] as ScanFaceSymbol[],
    U: [...U] as ScanFaceSymbol[],
  })
}

function identityNetAssignments() {
  return Object.fromEntries(scanFaceOrder.map(({ symbol }) => [symbol, symbol])) as ReturnType<
    typeof createDefaultEvenCubeNetAssignments
  >
}

function stickerSymbols(stickers: readonly ScanSticker[]): ScanFaceSymbol[] {
  return stickers.map((sticker) => sticker.symbol as ScanFaceSymbol)
}

function faceStickers(
  faces: ReturnType<typeof evenCubeScanSessionFacesFromDrafts>,
  symbol: ScanFaceSymbol,
): ScanFaceSymbol[] {
  const face = faces?.find((candidate) => candidate.symbol === symbol)
  return face?.reviewedStickers?.map((sticker) => sticker.symbol) ?? []
}
