import type { AnalyzeScanFaceResponse, ScanSessionFaceRequest } from '@api/scan'
import type { ScanFaceSymbol, ScanFacesPayload } from '@api/solver/types'
import type { ScanCaptureSource } from './scanCapture'
import type { TemporalFaceConsensus } from './scanTemporalConsensus'

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
  autoCapture?: ScanAutoCaptureMetadata
  capture?: ScanCaptureMetadata
  captureMode?: ScanCaptureMode
  symbol: ScanFaceSymbol
  stickers: ScanSticker[]
  temporalConsensus?: TemporalFaceConsensus
  photoDataUrl?: string
}

export type ScanCaptureMode = 'manual' | 'auto'

export type ScanAutoCaptureMetadata = {
  detectionMode?: string | null
  faceConfidence?: number
  stableFrameCount: number
  temporalAgreement?: number
  bboxStability?: number
  tileConfidence?: number
  tileDetections: number
  triggeredAt: string
}

export type ScanCaptureMetadata = {
  capturedAt: number
  height: number
  source: ScanCaptureSource
  width: number
}

export type RejectedScanCaptureReason = 'empty_stickers' | 'partial_tiles'

export type RejectedScanCapture = {
  analysis: AnalyzeScanFaceResponse
  capture: ScanCaptureMetadata
  photoDataUrl: string
  reason: RejectedScanCaptureReason
}

export type ScanFaces = Partial<Record<ScanFaceSymbol, ConfirmedScanFace>>

export type ScanFaceStatus = 'pending' | 'draft' | 'confirmed' | 'invalid' | 'needsReview'

export type ScanFaceDraft = ConfirmedScanFace & {
  analysis?: AnalyzeScanFaceResponse
  centerOverrideConfirmed?: boolean
  confirmed: boolean
  lastRejectedCapture?: RejectedScanCapture
}

export type ScanFaceDrafts = Record<ScanFaceSymbol, ScanFaceDraft>

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
const detectedOverwriteConfidenceMargin = 0.03

export function createEmptyScanStickers(centerSymbol: ScanFaceSymbol): ScanSticker[] {
  return Array.from({ length: 9 }, (_, index) =>
    index === 4
      ? { symbol: centerSymbol, confidence: 1, source: 'center' }
      : { confidence: 0, source: 'empty' },
  )
}

export function createInitialScanFaceDrafts(): ScanFaceDrafts {
  return Object.fromEntries(
    scanFaceOrder.map(({ symbol }) => [
      symbol,
      {
        confirmed: false,
        stickers: createEmptyScanStickers(symbol),
        symbol,
      },
    ]),
  ) as ScanFaceDrafts
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

export function scanFacesFromDrafts(drafts: ScanFaceDrafts): ScanFaces {
  const faces: ScanFaces = {}

  for (const { symbol } of scanFaceOrder) {
    const draft = drafts[symbol]
    if (!draft.confirmed) {
      continue
    }

    faces[symbol] = {
      autoCapture: draft.autoCapture,
      capture: draft.capture,
      captureMode: draft.captureMode,
      photoDataUrl: draft.photoDataUrl,
      stickers: draft.stickers,
      symbol,
      temporalConsensus: draft.temporalConsensus,
    }
  }

  return faces
}

export function scanSessionFacesFromDrafts(
  drafts: ScanFaceDrafts,
): ScanSessionFaceRequest[] | undefined {
  const faces: ScanSessionFaceRequest[] = []

  for (const { symbol } of scanFaceOrder) {
    const draft = drafts[symbol]
    if (!draft.confirmed || !isScanFaceComplete(draft.stickers)) {
      return undefined
    }

    const manualOverrides: Partial<Record<number, ScanFaceSymbol>> = {}
    for (const [index, sticker] of draft.stickers.entries()) {
      if (
        sticker.symbol !== undefined &&
        ((index !== 4 && sticker.source === 'manual') ||
          (index === 4 && draft.centerOverrideConfirmed === true))
      ) {
        manualOverrides[index] = sticker.symbol
      }
    }

    faces.push({
      expectedTop: expectedTopForScanFace(symbol),
      image: draft.photoDataUrl,
      manualOverrides: Object.keys(manualOverrides).length > 0 ? manualOverrides : undefined,
      reviewedStickers: draft.stickers.map((sticker, index) => ({
        confidence: sticker.confidence,
        index,
        source: sticker.source,
        symbol: sticker.symbol as ScanFaceSymbol,
      })),
      symbol,
    })
  }

  return faces
}

export function confirmedDraftCount(drafts: ScanFaceDrafts): number {
  return scanFaceOrder.filter(({ symbol }) => drafts[symbol].confirmed).length
}

export function scanFaceStatusFromDraft(
  draft: ScanFaceDraft,
  validation?: ScanFaceDraftValidation,
): ScanFaceStatus {
  if (!draft.confirmed) {
    return hasScanFaceDraftContent(draft) ? 'draft' : 'pending'
  }

  if (validation !== undefined) {
    return 'invalid'
  }

  return lowConfidenceCount(draft.stickers) > 0 ? 'needsReview' : 'confirmed'
}

export function replaceScanFaceDraftSticker(
  drafts: ScanFaceDrafts,
  symbol: ScanFaceSymbol,
  index: number,
  stickerSymbol: ScanFaceSymbol,
): ScanFaceDrafts {
  const draft = drafts[symbol]

  return {
    ...drafts,
    [symbol]: {
      ...draft,
      stickers: replaceScanSticker(draft.stickers, index, stickerSymbol),
    },
  }
}

export function clearScanFaceDraft(
  drafts: ScanFaceDrafts,
  symbol: ScanFaceSymbol,
): ScanFaceDrafts {
  return {
    ...drafts,
    [symbol]: {
      confirmed: false,
      stickers: createEmptyScanStickers(symbol),
      symbol,
    },
  }
}

export function confirmScanFaceDraft(
  drafts: ScanFaceDrafts,
  symbol: ScanFaceSymbol,
  options: { centerOverrideConfirmed?: boolean } = {},
): ScanFaceDrafts {
  return {
    ...drafts,
    [symbol]: {
      ...drafts[symbol],
      centerOverrideConfirmed:
        options.centerOverrideConfirmed ?? drafts[symbol].centerOverrideConfirmed,
      confirmed: true,
    },
  }
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

export function scanStickersFromTemporalConsensus(
  consensus: TemporalFaceConsensus,
  centerSymbol: ScanFaceSymbol,
  analysis?: AnalyzeScanFaceResponse,
): ScanSticker[] {
  const stickers = createEmptyScanStickers(centerSymbol)
  const analyzedStickersByIndex = new Map(analysis?.stickers.map((sticker) => [sticker.index, sticker]))

  for (const consensusSticker of consensus.stickers) {
    if (consensusSticker.index < 0 || consensusSticker.index > 8 || consensusSticker.symbol === undefined) {
      continue
    }

    const analyzedSticker = analyzedStickersByIndex.get(consensusSticker.index)
    const symbol = consensusSticker.index === 4 ? centerSymbol : consensusSticker.symbol
    const alternatives = consensusSticker.alternatives
      .filter((alternative) => alternative.symbol !== symbol)
      .map((alternative) => ({
        confidence: alternative.confidence,
        symbol: alternative.symbol,
      }))

    stickers[consensusSticker.index] = {
      alternatives: alternatives.length > 0 ? alternatives : undefined,
      confidence: consensusSticker.index === 4 ? 1 : consensusSticker.confidence,
      rgb: analyzedSticker?.rgb,
      source: consensusSticker.index === 4 ? 'center' : 'detected',
      symbol,
    }
  }

  return stickers
}

export function mergeLiveDetectedScanStickers(
  currentStickers: readonly ScanSticker[],
  incomingStickers: readonly ScanSticker[],
): ScanSticker[] {
  return Array.from({ length: 9 }, (_, index) => {
    const current = currentStickers[index] ?? { confidence: 0, source: 'empty' as const }
    const incoming = incomingStickers[index]

    if (incoming === undefined || incoming.symbol === undefined || incoming.source === 'empty') {
      return current
    }

    if (current.source === 'manual' || current.source === 'center') {
      return current
    }

    if (current.symbol === undefined || current.source === 'empty') {
      return incoming
    }

    if (incoming.confidence >= current.confidence + detectedOverwriteConfidenceMargin) {
      return incoming
    }

    return current
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

function hasScanFaceDraftContent(draft: ScanFaceDraft): boolean {
  return (
    draft.photoDataUrl !== undefined ||
    draft.analysis !== undefined ||
    draft.lastRejectedCapture !== undefined ||
    draft.stickers.some((sticker, index) => index !== 4 && sticker.symbol !== undefined)
  )
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

export function expectedTopForScanFace(symbol: ScanFaceSymbol): ScanFaceSymbol {
  return symbol === 'U' || symbol === 'D' ? 'F' : 'U'
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
