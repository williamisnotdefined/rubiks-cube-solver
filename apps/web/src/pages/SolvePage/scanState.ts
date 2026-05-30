import type { ScanFaceSymbol, ScanFacesPayload } from '@api/solver/types'

export type RgbColor = {
  r: number
  g: number
  b: number
}

export type ScanStickerSource = 'empty' | 'detected' | 'manual' | 'center'

export type ScanSticker = {
  symbol?: ScanFaceSymbol
  rgb?: RgbColor
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
}

export const scanFaceOrder = [
  {
    symbol: 'U',
    label: 'Top face',
    instruction: 'Hold the top face square inside the guide, then confirm the colors.',
  },
  {
    symbol: 'R',
    label: 'Right face',
    instruction: 'Turn the cube to the right face without changing your confirmed colors.',
  },
  {
    symbol: 'F',
    label: 'Front face',
    instruction: 'Capture the front face as flat and centered as possible.',
  },
  {
    symbol: 'D',
    label: 'Bottom face',
    instruction: 'Turn to the bottom face and review every detected square.',
  },
  {
    symbol: 'L',
    label: 'Left face',
    instruction: 'Capture the left face, then correct any uncertain colors.',
  },
  {
    symbol: 'B',
    label: 'Back face',
    instruction: 'Capture the back face. The final solve uses the colors you confirm.',
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
): string | undefined {
  if (!isScanFaceComplete(stickers)) {
    return 'Confirm all 9 colors before continuing.'
  }

  if (stickers[4]?.symbol !== symbol) {
    return 'The center color must match the face being scanned.'
  }

  const nextFaces: ScanFaces = {
    ...faces,
    [symbol]: { symbol, stickers: stickers.slice() },
  }
  const counts = countScanSymbols(nextFaces)
  const overflowSymbol = scanSymbols.find((scanSymbol) => counts[scanSymbol] > 9)

  if (overflowSymbol !== undefined) {
    return `${scanSymbolDetails[overflowSymbol].label} appears more than 9 times.`
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

    payload[symbol] = face.stickers
      .map((sticker) => sticker.symbol)
      .filter((stickerSymbol): stickerSymbol is ScanFaceSymbol => stickerSymbol !== undefined)
      .join('')
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
  return stickers.map((sticker, stickerIndex) =>
    stickerIndex === index
      ? {
          ...sticker,
          symbol,
          confidence: 1,
          source: stickerIndex === 4 ? 'center' : source,
        }
      : sticker,
  )
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
