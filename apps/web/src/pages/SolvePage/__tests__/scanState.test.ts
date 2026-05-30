import { describe, expect, it } from 'vitest'
import {
  createEmptyScanStickers,
  replaceScanSticker,
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

  it('requires all stickers before confirming a face', () => {
    expect(validateScanFaceDraft({}, 'U', createEmptyScanStickers('U'))).toBe(
      'Confirm all 9 colors before continuing.',
    )
  })

  it('blocks partial color counts above nine', () => {
    const confirmedFaces: ScanFaces = {
      U: { symbol: 'U', stickers: filledStickers('U') },
    }
    const nextFace = filledStickers('U')
    nextFace[4] = { symbol: 'R', confidence: 1, source: 'center' }

    expect(validateScanFaceDraft(confirmedFaces, 'R', nextFace)).toBe('White appears more than 9 times.')
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
})

function filledStickers(symbol: (typeof scanSymbols)[number]): ScanSticker[] {
  return Array.from({ length: 9 }, (_, index) => ({
    symbol,
    confidence: 1,
    source: index === 4 ? 'center' : 'manual',
  }))
}
