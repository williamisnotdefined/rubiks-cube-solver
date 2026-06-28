import type { ScanFaceSymbol } from '@api/solver/types'

export type ScanColorSymbol = 'W' | 'Y' | 'R' | 'O' | 'G' | 'B'

const faceToColorSymbol = {
  B: 'B',
  D: 'Y',
  F: 'G',
  L: 'O',
  R: 'R',
  U: 'W',
} as const satisfies Record<ScanFaceSymbol, ScanColorSymbol>

const colorToFaceSymbol = {
  B: 'B',
  G: 'F',
  O: 'L',
  R: 'R',
  W: 'U',
  Y: 'D',
} as const satisfies Record<ScanColorSymbol, ScanFaceSymbol>

export function faceSymbolToColorSymbol(symbol: ScanFaceSymbol): ScanColorSymbol {
  return faceToColorSymbol[symbol]
}

export function colorSymbolToFaceSymbol(symbol: ScanColorSymbol): ScanFaceSymbol {
  return colorToFaceSymbol[symbol]
}

export function scanColorCode(symbol: ScanFaceSymbol): ScanColorSymbol {
  return faceSymbolToColorSymbol(symbol)
}
