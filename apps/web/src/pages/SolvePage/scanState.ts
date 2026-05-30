import type { ScanFaceSymbol, ScanFacesPayload } from '@api/solver/types'

export type RgbColor = {
  r: number
  g: number
  b: number
}

export type ScanStickerSource = 'empty' | 'detected' | 'manual' | 'center'

export type ScanStickerAlternative = {
  symbol: ScanFaceSymbol
  confidence: number
}

export type ScanSticker = {
  symbol?: ScanFaceSymbol
  rgb?: RgbColor
  alternatives?: ScanStickerAlternative[]
  confidence: number
  source: ScanStickerSource
}

export type ConfirmedScanFace = {
  symbol: ScanFaceSymbol
  stickers: ScanSticker[]
  photoDataUrl?: string
}

export type ScanFaces = Partial<Record<ScanFaceSymbol, ConfirmedScanFace>>

export type ScanFaceDefinition = {
  symbol: ScanFaceSymbol
  label: string
  instruction: string
  topLabel: string
}

export type ScanFaceDraftValidation =
  | { key: 'confirmAllNineColors' }
  | { key: 'centerColorMismatch' }
  | { key: 'colorAppearsMoreThanNine'; values: { symbol: ScanFaceSymbol } }

export const scanFaceOrder = [
  {
    symbol: 'F',
    label: 'Green face',
    instruction: 'Capture the green face with the white face at the top of the camera view.',
    topLabel: 'White',
  },
  {
    symbol: 'R',
    label: 'Red face',
    instruction: 'Capture the red face with the white face at the top of the camera view.',
    topLabel: 'White',
  },
  {
    symbol: 'B',
    label: 'Blue face',
    instruction: 'Capture the blue face with the white face at the top of the camera view.',
    topLabel: 'White',
  },
  {
    symbol: 'L',
    label: 'Orange face',
    instruction: 'Capture the orange face with the white face at the top of the camera view.',
    topLabel: 'White',
  },
  {
    symbol: 'U',
    label: 'White face',
    instruction: 'Capture the white face with the green face at the top of the camera view.',
    topLabel: 'Green',
  },
  {
    symbol: 'D',
    label: 'Yellow face',
    instruction: 'Capture the yellow face with the green face at the top of the camera view.',
    topLabel: 'Green',
  },
] as const satisfies readonly ScanFaceDefinition[]

export const scanSymbols = ['U', 'R', 'F', 'D', 'L', 'B'] as const satisfies readonly ScanFaceSymbol[]

export const scanSymbolDetails: Record<
  ScanFaceSymbol,
  { label: string; background: string; foreground: string }
> = {
  U: { label: 'White', background: '#f8fafc', foreground: '#09090b' },
  R: { label: 'Red', background: '#ef4444', foreground: '#ffffff' },
  F: { label: 'Green', background: '#22c55e', foreground: '#052e16' },
  D: { label: 'Yellow', background: '#facc15', foreground: '#111827' },
  L: { label: 'Orange', background: '#f97316', foreground: '#111827' },
  B: { label: 'Blue', background: '#2563eb', foreground: '#ffffff' },
}

const lowConfidenceThreshold = 0.3

export function createEmptyScanStickers(centerSymbol: ScanFaceSymbol): ScanSticker[] {
  return Array.from({ length: 9 }, (_, index) =>
    index === 4
      ? { symbol: centerSymbol, confidence: 1, source: 'center' }
      : { confidence: 0, source: 'empty' },
  )
}

export function isScanFaceComplete(stickers: readonly ScanSticker[]): boolean {
  return stickers.length === 9 && stickers.every((sticker) => sticker.symbol !== undefined)
}

export function validateScanFaceDraft(
  faces: ScanFaces,
  symbol: ScanFaceSymbol,
  stickers: readonly ScanSticker[],
): ScanFaceDraftValidation | undefined {
  if (!isScanFaceComplete(stickers)) {
    return { key: 'confirmAllNineColors' }
  }

  if (stickers[4]?.symbol !== symbol) {
    return { key: 'centerColorMismatch' }
  }

  const nextFaces: ScanFaces = {
    ...faces,
    [symbol]: { symbol, stickers: stickers.slice() },
  }
  const counts = countScanSymbols(nextFaces)
  const overflowSymbol = scanSymbols.find((scanSymbol) => counts[scanSymbol] > 9)

  if (overflowSymbol !== undefined) {
    return { key: 'colorAppearsMoreThanNine', values: { symbol: overflowSymbol } }
  }

  return undefined
}

export function scanFacesToPayload(faces: ScanFaces): ScanFacesPayload | undefined {
  const payload = {} as ScanFacesPayload

  for (const { symbol } of scanFaceOrder) {
    const face = faces[symbol]
    if (face === undefined || !isScanFaceComplete(face.stickers)) {
      return undefined
    }

    const faceSymbols = face.stickers
      .map((sticker) => sticker.symbol)
      .filter((stickerSymbol): stickerSymbol is ScanFaceSymbol => stickerSymbol !== undefined)
    payload[symbol] = orientScanFaceSymbols(symbol, faceSymbols).join('')
  }

  const counts = countScanSymbols(faces)
  if (scanSymbols.some((symbol) => counts[symbol] !== 9)) {
    return undefined
  }

  return payload
}

export function countScanSymbols(faces: ScanFaces): Record<ScanFaceSymbol, number> {
  const counts = Object.fromEntries(scanSymbols.map((symbol) => [symbol, 0])) as Record<
    ScanFaceSymbol,
    number
  >

  for (const face of Object.values(faces)) {
    if (face === undefined) {
      continue
    }

    for (const sticker of face.stickers) {
      if (sticker.symbol !== undefined) {
        counts[sticker.symbol] += 1
      }
    }
  }

  return counts
}

export function replaceScanSticker(
  stickers: readonly ScanSticker[],
  index: number,
  symbol: ScanFaceSymbol,
  source: ScanStickerSource = 'manual',
): ScanSticker[] {
  return stickers.map((sticker, stickerIndex) => {
    if (stickerIndex !== index) {
      return sticker
    }

    const nextSticker: ScanSticker = {
      ...sticker,
      symbol,
      confidence: 1,
      source: stickerIndex === 4 ? 'center' : source,
    }
    delete nextSticker.alternatives

    return nextSticker
  })
}

export function confirmedFaceCount(faces: ScanFaces): number {
  return scanFaceOrder.filter(({ symbol }) => faces[symbol] !== undefined).length
}

export function lowConfidenceCount(stickers: readonly ScanSticker[]): number {
  return stickers.filter((sticker, index) => isLowConfidenceScanSticker(sticker, index)).length
}

export function isLowConfidenceScanSticker(sticker: ScanSticker, index: number): boolean {
  return index !== 4 && sticker.source === 'detected' && sticker.confidence < lowConfidenceThreshold
}

function orientScanFaceSymbols(
  symbol: ScanFaceSymbol,
  faceSymbols: readonly ScanFaceSymbol[],
): ScanFaceSymbol[] {
  if (symbol === 'U') {
    return rotateFaceSymbols180(faceSymbols)
  }

  return faceSymbols.slice()
}

function rotateFaceSymbols180(faceSymbols: readonly ScanFaceSymbol[]): ScanFaceSymbol[] {
  return [
    faceSymbols[8],
    faceSymbols[7],
    faceSymbols[6],
    faceSymbols[5],
    faceSymbols[4],
    faceSymbols[3],
    faceSymbols[2],
    faceSymbols[1],
    faceSymbols[0],
  ]
}
