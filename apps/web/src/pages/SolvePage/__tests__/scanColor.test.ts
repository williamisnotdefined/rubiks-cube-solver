import { describe, expect, it } from 'vitest'
import { classifyScanColor, isMismatchedScanCenter } from '../scanColor'

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
})
