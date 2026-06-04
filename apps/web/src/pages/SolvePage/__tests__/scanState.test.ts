import { describe, expect, it } from 'vitest'
import type { AnalyzeScanFaceResponse } from '@api/scan'
import {
  clearScanFaceDraft,
  confirmScanFaceDraft,
  confirmedDraftCount,
  countScanSymbols,
  createEmptyScanStickers,
  createInitialScanFaceDrafts,
  mergeLiveDetectedScanStickers,
  replaceScanSticker,
  replaceScanFaceDraftSticker,
  scanFaceStatusFromDraft,
  scanFacesFromDrafts,
  scanStickersFromAnalysis,
  scanStickersFromTemporalConsensus,
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

  it('reports center mismatches and confirmed drafts that need review', () => {
    const wrongCenter = filledStickers('R')
    wrongCenter[4] = { confidence: 1, source: 'center', symbol: 'U' }

    expect(validateScanFaceDraft({}, 'R', wrongCenter)).toEqual({ key: 'centerColorMismatch' })
    expect(
      scanFaceStatusFromDraft(
        { confirmed: true, stickers: wrongCenter, symbol: 'R' },
        { key: 'centerColorMismatch' },
      ),
    ).toBe('invalid')

    const lowConfidence = filledDetectedStickers('F')
    lowConfidence[0] = { confidence: 0.12, source: 'detected', symbol: 'F' }

    expect(scanFaceStatusFromDraft({ confirmed: true, stickers: lowConfidence, symbol: 'F' })).toBe(
      'needsReview',
    )
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

  it('ignores undefined faces while counting scan colors', () => {
    expect(countScanSymbols({ U: undefined, R: { symbol: 'R', stickers: filledStickers('R') } })).toMatchObject({
      R: 9,
      U: 0,
    })
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
          reviewedStickers: expect.arrayContaining([
            expect.objectContaining({ index: 0, source: 'manual', symbol: 'R' }),
          ]),
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

  it('keeps edited center stickers as center-sourced overrides', () => {
    const next = replaceScanSticker(createEmptyScanStickers('U'), 4, 'R')

    expect(next[4]).toMatchObject({ confidence: 1, source: 'center', symbol: 'R' })
  })

  it('fills review stickers from sparse analysis results', () => {
    const stickers = scanStickersFromAnalysis(
      scanAnalysis({
        stickers: [analyzedSticker(0, 'R', 0.62, [{ confidence: 0.41, symbol: 'F' }])],
        tileDetections: undefined,
      }),
      'U',
    )

    expect(stickers[0]).toMatchObject({
      alternatives: [
        { confidence: 0.62, symbol: 'R' },
        { confidence: 0.41, symbol: 'F' },
      ],
      confidence: 0.62,
      source: 'detected',
      symbol: 'R',
    })
    expect(stickers[2]).toMatchObject({ confidence: 0, source: 'empty' })
    expect(stickers[4]).toMatchObject({ confidence: 1, source: 'center', symbol: 'U' })
  })

  it('prefers assigned detector tiles while preserving analysis alternatives', () => {
    const stickers = scanStickersFromAnalysis(
      scanAnalysis({
        stickers: [analyzedSticker(0, 'R', 0.62, [{ confidence: 0.55, symbol: 'B' }])],
        tileDetections: tileDetections('F'),
      }),
      'F',
    )

    expect(stickers[0]).toMatchObject({
      alternatives: [
        { confidence: 1, symbol: 'F' },
        { confidence: 0.62, symbol: 'R' },
        { confidence: 0.55, symbol: 'B' },
      ],
      confidence: 0.9,
      source: 'detected',
      symbol: 'F',
    })
  })

  it('fills review stickers from live temporal consensus', () => {
    const stickers = scanStickersFromTemporalConsensus(
      {
        bboxStability: 0.9,
        faceConfidence: 0.88,
        framesRejected: 0,
        framesSeen: 6,
        framesUsed: 6,
        rejectReasons: [],
        status: 'ready',
        stickers: [...'FFFFFFFFF'].map((symbol, index) => ({
          agreement: 1,
          alternatives: [{ confidence: 0.2, symbol: 'R' }],
          confidence: 0.91,
          framesUsed: 6,
          index,
          margin: 0.7,
          symbol: symbol as (typeof scanSymbols)[number],
        })),
        temporalAgreement: 1,
        tileConfidence: 0.91,
      },
      'F',
    )

    expect(stickers.map((sticker) => sticker.symbol).join('')).toBe('FFFFFFFFF')
    expect(stickers[0]).toMatchObject({ source: 'detected', symbol: 'F' })
    expect(stickers[4]).toMatchObject({ confidence: 1, source: 'center', symbol: 'F' })
  })

  it('ignores invalid temporal consensus stickers and removes duplicate alternatives', () => {
    const stickers = scanStickersFromTemporalConsensus(
      {
        bboxStability: 0.9,
        faceConfidence: 0.88,
        framesRejected: 0,
        framesSeen: 6,
        framesUsed: 6,
        rejectReasons: [],
        status: 'ready',
        stickers: [
          { agreement: 1, alternatives: [], confidence: 0.9, framesUsed: 6, index: -1, margin: 1, symbol: 'R' },
          { agreement: 1, alternatives: [], confidence: 0.9, framesUsed: 6, index: 9, margin: 1, symbol: 'R' },
          { agreement: 1, alternatives: [], confidence: 0.9, framesUsed: 6, index: 0, margin: 1, symbol: undefined },
          {
            agreement: 1,
            alternatives: [
              { confidence: 0.7, symbol: 'F' },
              { confidence: 0.2, symbol: 'R' },
            ],
            confidence: 0.9,
            framesUsed: 6,
            index: 1,
            margin: 1,
            symbol: 'F',
          },
        ],
        temporalAgreement: 1,
        tileConfidence: 0.91,
      },
      'F',
    )

    expect(stickers[0]).toMatchObject({ source: 'empty' })
    expect(stickers[1]).toMatchObject({
      alternatives: [{ confidence: 0.2, symbol: 'R' }],
      source: 'detected',
      symbol: 'F',
    })
  })

  it('only overwrites AI stickers when the incoming confidence is meaningfully higher', () => {
    const current = createEmptyScanStickers('F')
    current[0] = { confidence: 0.8, source: 'detected', symbol: 'R' }
    current[1] = { confidence: 1, source: 'manual', symbol: 'U' }
    current[2] = { confidence: 0.88, source: 'detected', symbol: 'B' }
    const incoming = createEmptyScanStickers('F')
    incoming[0] = { confidence: 0.84, source: 'detected', symbol: 'F' }
    incoming[1] = { confidence: 0.99, source: 'detected', symbol: 'R' }
    incoming[2] = { confidence: 0.89, source: 'detected', symbol: 'L' }

    const merged = mergeLiveDetectedScanStickers(current, incoming)

    expect(merged[0]).toMatchObject({ confidence: 0.84, source: 'detected', symbol: 'F' })
    expect(merged[1]).toMatchObject({ source: 'manual', symbol: 'U' })
    expect(merged[2]).toMatchObject({ confidence: 0.88, source: 'detected', symbol: 'B' })
  })

  it('keeps empty incoming live stickers and fills missing current stickers', () => {
    const incoming: ScanSticker[] = [
      { confidence: 0, source: 'empty' },
      { confidence: 0.8, source: 'detected' },
      { confidence: 0.9, source: 'detected', symbol: 'B' },
    ]

    const merged = mergeLiveDetectedScanStickers([], incoming)

    expect(merged[0]).toMatchObject({ confidence: 0, source: 'empty' })
    expect(merged[1]).toMatchObject({ confidence: 0, source: 'empty' })
    expect(merged[2]).toMatchObject({ confidence: 0.9, source: 'detected', symbol: 'B' })
  })

  it('preserves 2x2 sticker counts when merging live detections', () => {
    const current = createEmptyScanStickers('F', 4)
    const incoming = Array.from({ length: 4 }, () => ({
      confidence: 0.9,
      source: 'detected' as const,
      symbol: 'F' as const,
    }))

    const merged = mergeLiveDetectedScanStickers(current, incoming)

    expect(merged).toHaveLength(4)
    expect(merged.every((sticker) => sticker.symbol === 'F')).toBe(true)
  })

  it('returns no scan session when any draft is unconfirmed or incomplete', () => {
    const drafts = createInitialScanFaceDrafts()

    expect(scanSessionFacesFromDrafts(drafts)).toBeUndefined()

    const incompleteConfirmed = confirmScanFaceDraft(drafts, 'F')

    expect(scanSessionFacesFromDrafts(incompleteConfirmed)).toBeUndefined()
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

function analyzedSticker(
  index: number,
  symbol: (typeof scanSymbols)[number],
  confidence: number,
  alternatives: AnalyzeScanFaceResponse['stickers'][number]['alternatives'] = [],
): AnalyzeScanFaceResponse['stickers'][number] {
  return {
    alternatives,
    confidence,
    index,
    polygon: [],
    rgb: { b: 30, g: 140, r: 50 },
    symbol,
  }
}

function scanAnalysis(
  overrides: Partial<AnalyzeScanFaceResponse> = {},
): AnalyzeScanFaceResponse {
  return {
    centerMismatch: false,
    confidence: 1,
    detectedCenter: 'F',
    detectedCenterConfidence: 1,
    detectionMode: 'tile_detector',
    expectedCenter: 'F',
    faceConfidence: 1,
    imageSize: { height: 480, width: 480 },
    ok: true,
    qualityWarnings: [],
    status: 'detected',
    stickers: [],
    tileDetections: [],
    warnings: [],
    ...overrides,
  }
}

function tileDetections(symbol: (typeof scanSymbols)[number]): AnalyzeScanFaceResponse['tileDetections'] {
  return Array.from({ length: 9 }, (_, index) => ({
    bbox: {
      height: 0.18,
      width: 0.18,
      x: 0.25 + (index % 3) * 0.25,
      y: 0.25 + Math.floor(index / 3) * 0.25,
    },
    confidence: 0.9,
    symbol,
  }))
}
