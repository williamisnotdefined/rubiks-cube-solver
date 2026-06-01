import { describe, expect, it } from 'vitest'
import type { AnalyzeScanFaceResponse } from '@api/scan'
import {
  clearScanFaceDraft,
  confirmScanFaceDraft,
  confirmedDraftCount,
  createEmptyScanStickers,
  createInitialScanFaceDrafts,
  replaceScanSticker,
  replaceScanFaceDraftSticker,
  scanFaceStatusFromDraft,
  scanFacesFromDrafts,
  scanStickersFromAnalysis,
  scanSessionFacesFromDrafts,
  scanFacesToPayload,
  scanSymbols,
  validateScanFaceDraft,
  type ScanFaces,
  type ScanSticker,
} from '../scanState'

describe('scan state helpers', () => {
  it('keeps the center sticker fixed for a new face', () => {
    const stickers = createEmptyScanStickers('F')

    expect(stickers[4]).toMatchObject({ symbol: 'F', source: 'center' })
    expect(stickers.filter((sticker) => sticker.symbol === undefined)).toHaveLength(8)
  })

  it('creates editable drafts for all scan faces', () => {
    const drafts = createInitialScanFaceDrafts()

    expect(scanSymbols.every((symbol) => drafts[symbol].symbol === symbol)).toBe(true)
    expect(scanSymbols.every((symbol) => drafts[symbol].stickers[4]?.symbol === symbol)).toBe(true)
    expect(confirmedDraftCount(drafts)).toBe(0)
  })

  it('keeps draft edits until a face is confirmed or cleared', () => {
    const drafts = createInitialScanFaceDrafts()
    const editedDrafts = replaceScanFaceDraftSticker(drafts, 'F', 0, 'R')

    expect(scanFaceStatusFromDraft(editedDrafts.F)).toBe('draft')
    expect(editedDrafts.F.stickers[0]).toMatchObject({ source: 'manual', symbol: 'R' })

    const readyDrafts = {
      ...editedDrafts,
      F: { ...editedDrafts.F, stickers: filledStickers('F') },
    }
    const confirmedDrafts = confirmScanFaceDraft(readyDrafts, 'F')

    expect(confirmedDraftCount(confirmedDrafts)).toBe(1)
    expect(scanFacesFromDrafts(confirmedDrafts).F).toMatchObject({ symbol: 'F' })

    const clearedDrafts = clearScanFaceDraft(confirmedDrafts, 'F')

    expect(confirmedDraftCount(clearedDrafts)).toBe(0)
    expect(scanFacesFromDrafts(clearedDrafts).F).toBeUndefined()
    expect(scanFaceStatusFromDraft(clearedDrafts.F)).toBe('pending')
  })

  it('requires all stickers before confirming a face', () => {
    expect(validateScanFaceDraft({}, 'U', createEmptyScanStickers('U'))).toEqual({
      key: 'confirmAllNineColors',
    })
  })

  it('blocks partial color counts above nine', () => {
    const confirmedFaces: ScanFaces = {
      U: { symbol: 'U', stickers: filledStickers('U') },
    }
    const nextFace = filledStickers('U')
    nextFace[4] = { symbol: 'R', confidence: 1, source: 'center' }

    expect(validateScanFaceDraft(confirmedFaces, 'R', nextFace)).toEqual({
      key: 'colorAppearsMoreThanNine',
      values: { symbol: 'U' },
    })
  })

  it('allows detected partial overcounts when alternatives can stay within color limits', () => {
    const confirmedFaces: ScanFaces = {
      U: { symbol: 'U', stickers: filledStickers('U') },
    }
    const nextFace = detectedStickersWithAlternative('U', 'R')
    nextFace[4] = { symbol: 'R', confidence: 1, source: 'center' }

    expect(validateScanFaceDraft(confirmedFaces, 'R', nextFace)).toBeUndefined()
  })

  it('builds a solve payload only after all faces are complete with exact counts', () => {
    const faces = Object.fromEntries(
      scanSymbols.map((symbol) => [symbol, { symbol, stickers: filledStickers(symbol) }]),
    ) as ScanFaces

    expect(scanFacesToPayload(faces)).toEqual({
      U: 'UUUUUUUUU',
      R: 'RRRRRRRRR',
      F: 'FFFFFFFFF',
      D: 'DDDDDDDDD',
      L: 'LLLLLLLLL',
      B: 'BBBBBBBBB',
    })

    expect(scanFacesToPayload({ ...faces, B: undefined })).toBeUndefined()
  })

  it('builds a scan session payload from confirmed photo drafts', () => {
    const drafts = createInitialScanFaceDrafts()
    const confirmedDrafts = scanSymbols.reduce((currentDrafts, symbol) => {
      const nextDrafts = {
        ...currentDrafts,
        [symbol]: {
          ...currentDrafts[symbol],
          photoDataUrl: `data:image/jpeg;base64,${symbol}`,
          stickers: filledDetectedStickers(symbol),
        },
      }

      return confirmScanFaceDraft(nextDrafts, symbol)
    }, drafts)
    const editedDrafts = replaceScanFaceDraftSticker(confirmedDrafts, 'F', 0, 'R')

    expect(scanSessionFacesFromDrafts(editedDrafts)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          expectedTop: 'U',
          image: 'data:image/jpeg;base64,F',
          manualOverrides: { 0: 'R' },
          symbol: 'F',
        }),
        expect.objectContaining({
          expectedTop: 'F',
          image: 'data:image/jpeg;base64,U',
          symbol: 'U',
        }),
      ]),
    )
  })

  it('includes explicit center overrides in scan session payloads', () => {
    const drafts = createInitialScanFaceDrafts()
    const confirmedDrafts = scanSymbols.reduce((currentDrafts, symbol) => {
      const nextDrafts = {
        ...currentDrafts,
        [symbol]: {
          ...currentDrafts[symbol],
          photoDataUrl: `data:image/jpeg;base64,${symbol}`,
          stickers: filledDetectedStickers(symbol),
        },
      }

      return confirmScanFaceDraft(nextDrafts, symbol, {
        centerOverrideConfirmed: symbol === 'D',
      })
    }, drafts)

    expect(scanSessionFacesFromDrafts(confirmedDrafts)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          manualOverrides: { 4: 'D' },
          symbol: 'D',
        }),
      ]),
    )
  })

  it('balances detected low-confidence stickers before building the solve payload', () => {
    const faces = Object.fromEntries(
      scanSymbols.map((symbol) => [symbol, { symbol, stickers: filledStickers(symbol) }]),
    ) as ScanFaces
    faces.U!.stickers[0] = {
      alternatives: [
        { confidence: 0.95, symbol: 'U' },
        { confidence: 0.45, symbol: 'R' },
      ],
      confidence: 0.12,
      source: 'detected',
      symbol: 'R',
    }

    expect(scanFacesToPayload(faces)).toEqual({
      U: 'UUUUUUUUU',
      R: 'RRRRRRRRR',
      F: 'FFFFFFFFF',
      D: 'DDDDDDDDD',
      L: 'LLLLLLLLL',
      B: 'BBBBBBBBB',
    })
  })

  it('does not rebalance manual color count errors', () => {
    const faces = Object.fromEntries(
      scanSymbols.map((symbol) => [symbol, { symbol, stickers: filledStickers(symbol) }]),
    ) as ScanFaces
    faces.U!.stickers[0] = { confidence: 1, source: 'manual', symbol: 'R' }

    expect(scanFacesToPayload(faces)).toBeUndefined()
  })

  it('rotates the white face captured with green on top before solving', () => {
    const faces: ScanFaces = {
      U: { symbol: 'U', stickers: stickersFromSymbols('FRBLUDFRB') },
      R: { symbol: 'R', stickers: stickersFromSymbols('UURRRRRRR') },
      F: { symbol: 'F', stickers: stickersFromSymbols('UUFFFFFFF') },
      D: { symbol: 'D', stickers: stickersFromSymbols('UDDDDDDDD') },
      L: { symbol: 'L', stickers: stickersFromSymbols('ULLLLLLLL') },
      B: { symbol: 'B', stickers: stickersFromSymbols('UUBBBBBBB') },
    }

    expect(scanFacesToPayload(faces)).toEqual({
      U: 'BRFDULBRF',
      R: 'UURRRRRRR',
      F: 'UUFFFFFFF',
      D: 'UDDDDDDDD',
      L: 'ULLLLLLLL',
      B: 'UUBBBBBBB',
    })
  })

  it('replaces a selected sticker with a manual color', () => {
    const stickers = createEmptyScanStickers('U')
    stickers[0] = {
      alternatives: [{ confidence: 0.4, symbol: 'U' }],
      confidence: 0.2,
      source: 'detected',
      symbol: 'B',
    }
    const next = replaceScanSticker(stickers, 0, 'R')

    expect(next[0]).toMatchObject({ symbol: 'R', source: 'manual' })
    expect(next[0].alternatives).toBeUndefined()
  })

  it('uses grid detections for review stickers when analysis stickers disagree', () => {
    const stickers = scanStickersFromAnalysis(analysisWithGridDisagreement(), 'F')

    expect(stickers.map((sticker) => sticker.symbol).join('')).toBe('LRRFBBRFD')
    expect(stickers[4]).toMatchObject({ confidence: 0.91, source: 'center', symbol: 'B' })
    expect(validateScanFaceDraft({}, 'F', stickers)).toEqual({ key: 'centerColorMismatch' })
  })
})

function filledStickers(symbol: (typeof scanSymbols)[number]): ScanSticker[] {
  return Array.from({ length: 9 }, (_, index) => ({
    symbol,
    confidence: 1,
    source: index === 4 ? 'center' : 'manual',
  }))
}

function filledDetectedStickers(symbol: (typeof scanSymbols)[number]): ScanSticker[] {
  return Array.from({ length: 9 }, (_, index) => ({
    symbol,
    confidence: 1,
    source: index === 4 ? 'center' : 'detected',
  }))
}

function stickersFromSymbols(symbols: string): ScanSticker[] {
  return [...symbols].map((symbol, index) => ({
    symbol: symbol as (typeof scanSymbols)[number],
    confidence: 1,
    source: index === 4 ? 'center' : 'manual',
  }))
}

function detectedStickersWithAlternative(
  detectedSymbol: (typeof scanSymbols)[number],
  alternativeSymbol: (typeof scanSymbols)[number],
): ScanSticker[] {
  return Array.from({ length: 9 }, (_, index) => ({
    alternatives: [
      { confidence: 0.8, symbol: alternativeSymbol },
      { confidence: 0.4, symbol: detectedSymbol },
    ],
    confidence: 0.18,
    source: index === 4 ? 'center' : 'detected',
    symbol: detectedSymbol,
  }))
}

function analysisWithGridDisagreement(): AnalyzeScanFaceResponse {
  const gridSymbols = [...'LRRFBBRFD'] as (typeof scanSymbols)[number][]

  return {
    centerMismatch: true,
    confidence: 0.91,
    detectedCenter: 'B',
    detectedCenterConfidence: 0.91,
    detectionMode: 'tile_detector',
    expectedCenter: 'F',
    faceConfidence: 0.9,
    faceQuad: [],
    gridConfidence: 0.84,
    gridDetections: gridSymbols.map((symbol, index) => ({
      bbox: { height: 0.18, width: 0.18, x: 0.2 + (index % 3) * 0.25, y: 0.2 + Math.floor(index / 3) * 0.25 },
      column: index % 3,
      confidence: index === 4 ? 0.91 : 0.86,
      index,
      row: Math.floor(index / 3),
      symbol,
    })),
    gridStatus: 'ready',
    imageSize: { height: 480, width: 480 },
    ok: false,
    qualityWarnings: [],
    status: 'center_mismatch',
    stickers: Array.from({ length: 9 }, (_, index) => ({
      alternatives: [],
      confidence: 0.8,
      index,
      polygon: [],
      rgb: { b: 40, g: 40, r: 220 },
      symbol: 'R' as const,
    })),
    tileDetections: [],
    warnings: [],
  }
}
