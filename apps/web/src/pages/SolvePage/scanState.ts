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

type StickerCandidate = {
  score: number
  symbol: ScanFaceSymbol
}

type FlexibleStickerAssignment = {
  candidates: StickerCandidate[]
  faceSymbol: ScanFaceSymbol
  index: number
}

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

  if (overflowSymbol !== undefined && balancedScanFaceSymbols(nextFaces, false) === undefined) {
    return { key: 'colorAppearsMoreThanNine', values: { symbol: overflowSymbol } }
  }

  return undefined
}

export function scanFacesToPayload(faces: ScanFaces): ScanFacesPayload | undefined {
  if (!allScanFacesComplete(faces)) {
    return undefined
  }

  const balancedFaces = exactScanCounts(faces)
    ? scanFaceSymbolsFromFaces(faces)
    : balancedScanFaceSymbols(faces, true)

  if (balancedFaces === undefined) {
    return undefined
  }

  const payload = {} as ScanFacesPayload

  for (const { symbol } of scanFaceOrder) {
    const faceSymbols = balancedFaces[symbol]
    if (faceSymbols === undefined) {
      return undefined
    }

    payload[symbol] = orientScanFaceSymbols(symbol, faceSymbols).join('')
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

function allScanFacesComplete(faces: ScanFaces): boolean {
  return scanFaceOrder.every(({ symbol }) => {
    const face = faces[symbol]
    return face !== undefined && isScanFaceComplete(face.stickers)
  })
}

function exactScanCounts(faces: ScanFaces): boolean {
  const counts = countScanSymbols(faces)
  return scanSymbols.every((symbol) => counts[symbol] === 9)
}

function scanFaceSymbolsFromFaces(
  faces: ScanFaces,
): Partial<Record<ScanFaceSymbol, ScanFaceSymbol[]>> | undefined {
  const faceSymbols: Partial<Record<ScanFaceSymbol, ScanFaceSymbol[]>> = {}

  for (const face of Object.values(faces)) {
    if (face === undefined || !isScanFaceComplete(face.stickers)) {
      return undefined
    }

    faceSymbols[face.symbol] = face.stickers
      .map((sticker) => sticker.symbol)
      .filter((symbol): symbol is ScanFaceSymbol => symbol !== undefined)
  }

  return faceSymbols
}

function balancedScanFaceSymbols(
  faces: ScanFaces,
  requireExactCounts: boolean,
): Partial<Record<ScanFaceSymbol, ScanFaceSymbol[]>> | undefined {
  const assignments: Partial<Record<ScanFaceSymbol, ScanFaceSymbol[]>> = {}
  const quotas = Object.fromEntries(scanSymbols.map((symbol) => [symbol, 9])) as Record<
    ScanFaceSymbol,
    number
  >
  const flexibleStickers: FlexibleStickerAssignment[] = []

  for (const face of Object.values(faces)) {
    if (face === undefined || !isScanFaceComplete(face.stickers)) {
      if (requireExactCounts) {
        return undefined
      }

      continue
    }

    assignments[face.symbol] = Array.from({ length: 9 }, () => face.symbol)

    for (const [index, sticker] of face.stickers.entries()) {
      if (sticker.symbol === undefined) {
        return undefined
      }

      if (sticker.source === 'manual' || sticker.source === 'center') {
        quotas[sticker.symbol] -= 1
        assignments[face.symbol]![index] = sticker.symbol
        continue
      }

      flexibleStickers.push({
        candidates: scanStickerCandidates(sticker),
        faceSymbol: face.symbol,
        index,
      })
    }
  }

  if (scanSymbols.some((symbol) => quotas[symbol] < 0)) {
    return undefined
  }

  const flexibleSymbols = assignFlexibleStickerSymbols(
    flexibleStickers,
    quotas,
    requireExactCounts,
  )
  if (flexibleSymbols === undefined) {
    return undefined
  }

  for (const [assignmentIndex, symbol] of flexibleSymbols.entries()) {
    const sticker = flexibleStickers[assignmentIndex]
    assignments[sticker.faceSymbol]![sticker.index] = symbol
  }

  return assignments
}

function scanStickerCandidates(sticker: ScanSticker): StickerCandidate[] {
  const scores = new Map<ScanFaceSymbol, number>()

  if (sticker.symbol !== undefined) {
    scores.set(sticker.symbol, sticker.confidence + 0.04)
  }

  for (const alternative of sticker.alternatives ?? []) {
    scores.set(alternative.symbol, Math.max(scores.get(alternative.symbol) ?? 0, alternative.confidence))
  }

  return [...scores.entries()]
    .map(([symbol, score]) => ({ score, symbol }))
    .sort((left, right) => right.score - left.score)
}

function assignFlexibleStickerSymbols(
  stickers: readonly FlexibleStickerAssignment[],
  quotas: Record<ScanFaceSymbol, number>,
  requireExactCounts: boolean,
): ScanFaceSymbol[] | undefined {
  const memo = new Map<string, number | undefined>()
  const choices = new Map<string, ScanFaceSymbol>()
  const initialQuotas = scanSymbols.map((symbol) => quotas[symbol])
  const totalCapacity = initialQuotas.reduce((sum, quota) => sum + quota, 0)

  if (totalCapacity < stickers.length || (requireExactCounts && totalCapacity !== stickers.length)) {
    return undefined
  }

  function bestScore(index: number, remainingQuotas: readonly number[]): number | undefined {
    const key = assignmentMemoKey(index, remainingQuotas)
    const cached = memo.get(key)
    if (memo.has(key)) {
      return cached
    }

    const remainingStickerCount = stickers.length - index
    const remainingCapacity = remainingQuotas.reduce((sum, quota) => sum + quota, 0)
    if (
      remainingCapacity < remainingStickerCount ||
      (requireExactCounts && remainingCapacity !== remainingStickerCount)
    ) {
      memo.set(key, undefined)
      return undefined
    }

    if (index === stickers.length) {
      const score = !requireExactCounts || remainingCapacity === 0 ? 0 : undefined
      memo.set(key, score)
      return score
    }

    let best: number | undefined
    let bestSymbol: ScanFaceSymbol | undefined

    for (const candidate of stickers[index].candidates) {
      const symbolIndex = scanSymbols.indexOf(candidate.symbol)
      if (symbolIndex === -1 || remainingQuotas[symbolIndex] <= 0) {
        continue
      }

      const nextQuotas = remainingQuotas.slice()
      nextQuotas[symbolIndex] -= 1
      const nextScore = bestScore(index + 1, nextQuotas)
      if (nextScore === undefined) {
        continue
      }

      const score = candidate.score + nextScore
      if (best === undefined || score > best) {
        best = score
        bestSymbol = candidate.symbol
      }
    }

    if (bestSymbol !== undefined) {
      choices.set(key, bestSymbol)
    }
    memo.set(key, best)
    return best
  }

  if (bestScore(0, initialQuotas) === undefined) {
    return undefined
  }

  const assignedSymbols: ScanFaceSymbol[] = []
  const remainingQuotas = initialQuotas.slice()
  for (let index = 0; index < stickers.length; index += 1) {
    const symbol = choices.get(assignmentMemoKey(index, remainingQuotas))
    if (symbol === undefined) {
      return undefined
    }

    assignedSymbols.push(symbol)
    remainingQuotas[scanSymbols.indexOf(symbol)] -= 1
  }

  return assignedSymbols
}

function assignmentMemoKey(index: number, quotas: readonly number[]): string {
  return `${index}:${quotas.join(',')}`
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
