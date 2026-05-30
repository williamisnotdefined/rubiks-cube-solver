import { describe, expect, it } from 'vitest'
import {
  classifyScanColor,
  isMismatchedScanCenter,
  reclassifyDetectedScanStickers,
} from '../scanColor'
import type { ScanSticker } from '../scanState'

describe('scan color detection', () => {
  it('classifies low-saturation bright colors as white even with a cool cast', () => {
    expect(classifyScanColor({ r: 198, g: 210, b: 224 }).symbol).toBe('U')
  })

  it('separates red from orange by hue', () => {
    expect(classifyScanColor({ r: 220, g: 48, b: 42 }).symbol).toBe('R')
    expect(classifyScanColor({ r: 242, g: 112, b: 30 }).symbol).toBe('L')
  })

  it('separates yellow from green by hue', () => {
    expect(classifyScanColor({ r: 232, g: 206, b: 42 }).symbol).toBe('D')
    expect(classifyScanColor({ r: 38, g: 172, b: 86 }).symbol).toBe('F')
  })

  it('flags a confidently mismatched captured center', () => {
    const detected = classifyScanColor({ r: 38, g: 172, b: 86 })

    expect(isMismatchedScanCenter('U', detected)).toBe(true)
    expect(isMismatchedScanCenter('F', detected)).toBe(false)
  })

  it('ignores a saturated reference for white', () => {
    const detected = classifyScanColor(
      { r: 38, g: 172, b: 86 },
      { U: { r: 38, g: 172, b: 86 } },
    )

    expect(detected.symbol).toBe('F')
  })

  it('reclassifies detected stickers without overwriting manual corrections', () => {
    const stickers = [
      { symbol: 'R', rgb: { r: 38, g: 172, b: 86 }, confidence: 0.1, source: 'detected' },
      { symbol: 'L', rgb: { r: 242, g: 112, b: 30 }, confidence: 1, source: 'manual' },
      { symbol: 'U', rgb: { r: 205, g: 210, b: 218 }, confidence: 1, source: 'center' },
    ] satisfies ScanSticker[]

    const next = reclassifyDetectedScanStickers(stickers, 'U', {
      F: { r: 38, g: 172, b: 86 },
    })

    expect(next[0]).toMatchObject({ symbol: 'F', source: 'detected' })
    expect(next[1]).toMatchObject({ symbol: 'L', source: 'manual' })
    expect(next[2]).toMatchObject({ symbol: 'U', source: 'center' })
  })
})
