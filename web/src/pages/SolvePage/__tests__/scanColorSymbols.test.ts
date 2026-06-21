import { describe, expect, it } from 'vitest'
import {
  colorSymbolToFaceSymbol,
  faceSymbolToColorSymbol,
  scanColorCode,
} from '../scan/scanColorSymbols'

describe('scan color symbols', () => {
  it('maps internal face symbols to user-facing color codes', () => {
    expect(faceSymbolToColorSymbol('U')).toBe('W')
    expect(faceSymbolToColorSymbol('D')).toBe('Y')
    expect(faceSymbolToColorSymbol('F')).toBe('G')
    expect(faceSymbolToColorSymbol('B')).toBe('B')
    expect(faceSymbolToColorSymbol('R')).toBe('R')
    expect(faceSymbolToColorSymbol('L')).toBe('O')
    expect(scanColorCode('F')).toBe('G')
  })

  it('maps user-facing color codes back to internal face symbols', () => {
    expect(colorSymbolToFaceSymbol('W')).toBe('U')
    expect(colorSymbolToFaceSymbol('Y')).toBe('D')
    expect(colorSymbolToFaceSymbol('G')).toBe('F')
    expect(colorSymbolToFaceSymbol('B')).toBe('B')
    expect(colorSymbolToFaceSymbol('R')).toBe('R')
    expect(colorSymbolToFaceSymbol('O')).toBe('L')
  })
})
