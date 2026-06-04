import type { AnalyzeScanFaceResponse, ScanSessionFaceRequest } from '@api/scan'
import type { ScanFaceSymbol, ScanFacesPayload } from '@api/solver/types'
import type { ScanCaptureSource } from './scanCapture'
import { assignTileDetectionsToReviewGrid } from './scanTileDetections'
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

type ScanSessionReviewedSticker = NonNullable<ScanSessionFaceRequest['reviewedStickers']>[number]

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
export const scan3StickersPerFace = 9
export const scan2StickersPerFace = 4

export const scanSymbolDetails: Record<
  ScanFaceSymbol,
  { label: string; background: string; foreground: string }
> = {
  U: { label: 'White', background: 'var(--scan-u-bg)', foreground: 'var(--scan-u-fg)' },
  R: { label: 'Red', background: 'var(--scan-r-bg)', foreground: 'var(--scan-r-fg)' },
  F: { label: 'Green', background: 'var(--scan-f-bg)', foreground: 'var(--scan-f-fg)' },
  D: { label: 'Yellow', background: 'var(--scan-d-bg)', foreground: 'var(--scan-d-fg)' },
  L: { label: 'Orange', background: 'var(--scan-l-bg)', foreground: 'var(--scan-l-fg)' },
  B: { label: 'Blue', background: 'var(--scan-b-bg)', foreground: 'var(--scan-b-fg)' },
}

const lowConfidenceThreshold = 0.3
const detectedOverwriteConfidenceMargin = 0.03

export function createEmptyScanStickers(centerSymbol: ScanFaceSymbol, stickersPerFace = scan3StickersPerFace): ScanSticker[] {
  const centerIndex = scanCenterIndex(stickersPerFace)
  return Array.from({ length: stickersPerFace }, (_, index) =>
    centerIndex !== undefined && index === centerIndex
      ? { symbol: centerSymbol, confidence: 1, source: 'center' }
      : { confidence: 0, source: 'empty' },
  )
}

export function createInitialScanFaceDrafts(stickersPerFace = scan3StickersPerFace): ScanFaceDrafts {
  return Object.fromEntries(
    scanFaceOrder.map(({ symbol }) => [
      symbol,
      {
        confirmed: false,
        stickers: createEmptyScanStickers(symbol, stickersPerFace),
        symbol,
      },
    ]),
  ) as ScanFaceDrafts
}

export function isScanFaceComplete(stickers: readonly ScanSticker[], stickersPerFace = scan3StickersPerFace): boolean {
  return stickers.length === stickersPerFace && stickers.every((sticker) => sticker.symbol !== undefined)
}

export function validateScanFaceDraft(
  faces: ScanFaces,
  symbol: ScanFaceSymbol,
  stickers: readonly ScanSticker[],
  stickersPerFace = scan3StickersPerFace,
): ScanFaceDraftValidation | undefined {
  if (!isScanFaceComplete(stickers, stickersPerFace)) {
    return { key: 'confirmAllNineColors' }
  }

  const centerIndex = scanCenterIndex(stickersPerFace)
  if (centerIndex !== undefined && stickers[centerIndex]?.symbol !== symbol) {
    return { key: 'centerColorMismatch' }
  }

  const nextFaces: ScanFaces = {
    ...faces,
    [symbol]: { symbol, stickers: stickers.slice() },
  }
  const counts = countScanSymbols(nextFaces)
  const overflowSymbol = scanSymbols.find((scanSymbol) => counts[scanSymbol] > stickersPerFace)

  if (overflowSymbol !== undefined && balancedScanFaceSymbols(nextFaces, stickersPerFace) === undefined) {
    return { key: 'colorAppearsMoreThanNine', values: { symbol: overflowSymbol } }
  }

  return undefined
}

export function scanFacesToPayload(faces: ScanFaces, stickersPerFace = scan3StickersPerFace): ScanFacesPayload | undefined {
  if (!allScanFacesComplete(faces, stickersPerFace)) {
    return undefined
  }

  const balancedFaces = exactScanCounts(faces, stickersPerFace)
    ? scanFaceSymbolsFromFaces(faces)
    : balancedScanFaceSymbols(faces, stickersPerFace)

  if (balancedFaces === undefined) {
    return undefined
  }

  const payload = {} as ScanFacesPayload

  for (const { symbol } of scanFaceOrder) {
    const faceSymbols = balancedFaces[symbol]
    payload[symbol] = orientScanFaceSymbols(symbol, faceSymbols!).join('')
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
  stickersPerFace = scan3StickersPerFace,
): ScanSessionFaceRequest[] | undefined {
  const faces: ScanSessionFaceRequest[] = []

  for (const { symbol } of scanFaceOrder) {
    const draft = drafts[symbol]
    if (!draft.confirmed || !isScanFaceComplete(draft.stickers, stickersPerFace)) {
      return undefined
    }

    const centerIndex = scanCenterIndex(stickersPerFace)
    const reviewedStickers = orientScanFaceReviewedStickers(symbol, draft.stickers)
    const manualOverrides: Partial<Record<number, ScanFaceSymbol>> = {}
    for (const sticker of reviewedStickers) {
      if (
        sticker.symbol !== undefined &&
        ((centerIndex === undefined || sticker.index !== centerIndex) && sticker.source === 'manual' ||
          (centerIndex !== undefined && sticker.index === centerIndex && draft.centerOverrideConfirmed === true))
      ) {
        manualOverrides[sticker.index] = sticker.symbol
      }
    }

    faces.push({
      clientRotation: reviewedStickers.every(isManuallyReviewedSticker) ? 0 : undefined,
      expectedTop: expectedTopForScanFace(symbol),
      image: draft.photoDataUrl,
      manualOverrides: Object.keys(manualOverrides).length > 0 ? manualOverrides : undefined,
      reviewedStickers,
      symbol,
    })
  }

  return faces
}

function isManuallyReviewedSticker(sticker: ScanSessionReviewedSticker): boolean {
  return sticker.source === 'manual' || sticker.source === 'center'
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
  stickersPerFace = scan3StickersPerFace,
): ScanFaceDrafts {
  return {
    ...drafts,
    [symbol]: {
      confirmed: false,
      stickers: createEmptyScanStickers(symbol, stickersPerFace),
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

export function scanStickersFromAnalysis(
  analysis: AnalyzeScanFaceResponse,
  centerSymbol: ScanFaceSymbol,
  stickersPerFace = scan3StickersPerFace,
): ScanSticker[] {
  const stickers = createEmptyScanStickers(centerSymbol, stickersPerFace)
  const analyzedStickersByIndex = new Map(analysis.stickers.map((sticker) => [sticker.index, sticker]))
  const assignedTiles = assignTileDetectionsToReviewGrid(analysis.tileDetections, {
    gridSize: stickersPerFace === scan2StickersPerFace ? 2 : 3,
  })
  const centerIndex = scanCenterIndex(stickersPerFace)

  for (let index = 0; index < stickersPerFace; index += 1) {
    const analyzedSticker = analyzedStickersByIndex.get(index)
    const assignedTile = assignedTiles?.[index]
    const symbol = centerIndex !== undefined && index === centerIndex ? centerSymbol : assignedTile?.symbol ?? analyzedSticker?.symbol

    if (symbol === undefined) {
      continue
    }

    stickers[index] = {
      alternatives: scanStickerAlternativesFromAnalysis(analyzedSticker, assignedTile?.symbol),
      confidence:
        centerIndex !== undefined && index === centerIndex
          ? 1
          : assignedTile?.confidence ?? analyzedSticker!.confidence,
      rgb: analyzedSticker?.rgb,
      source: centerIndex !== undefined && index === centerIndex ? 'center' : 'detected',
      symbol,
    }
  }

  return stickers
}

export function scanStickersFromTemporalConsensus(
  consensus: TemporalFaceConsensus,
  centerSymbol: ScanFaceSymbol,
  analysis?: AnalyzeScanFaceResponse,
  stickersPerFace = scan3StickersPerFace,
): ScanSticker[] {
  const stickers = createEmptyScanStickers(centerSymbol, stickersPerFace)
  const analyzedStickersByIndex = new Map(analysis?.stickers.map((sticker) => [sticker.index, sticker]))
  const centerIndex = scanCenterIndex(stickersPerFace)

  for (const consensusSticker of consensus.stickers) {
    if (consensusSticker.index < 0 || consensusSticker.index >= stickersPerFace || consensusSticker.symbol === undefined) {
      continue
    }

    const analyzedSticker = analyzedStickersByIndex.get(consensusSticker.index)
    const symbol = centerIndex !== undefined && consensusSticker.index === centerIndex ? centerSymbol : consensusSticker.symbol
    const alternatives = consensusSticker.alternatives
      .filter((alternative) => alternative.symbol !== symbol)
      .map((alternative) => ({
        confidence: alternative.confidence,
        symbol: alternative.symbol,
      }))

    stickers[consensusSticker.index] = {
      alternatives: alternatives.length > 0 ? alternatives : undefined,
      confidence: centerIndex !== undefined && consensusSticker.index === centerIndex ? 1 : consensusSticker.confidence,
      rgb: analyzedSticker?.rgb,
      source: centerIndex !== undefined && consensusSticker.index === centerIndex ? 'center' : 'detected',
      symbol,
    }
  }

  return stickers
}

function scanStickerAlternativesFromAnalysis(
  analyzedSticker: AnalyzeScanFaceResponse['stickers'][number] | undefined,
  tileSymbol: ScanFaceSymbol | undefined,
): ScanStickerAlternative[] | undefined {
  const alternatives = new Map<ScanFaceSymbol, number>()

  if (tileSymbol !== undefined) {
    alternatives.set(tileSymbol, 1)
  }

  if (analyzedSticker?.symbol !== undefined) {
    alternatives.set(
      analyzedSticker.symbol,
      Math.max(alternatives.get(analyzedSticker.symbol) ?? 0, analyzedSticker.confidence),
    )
  }

  for (const alternative of analyzedSticker?.alternatives ?? []) {
    alternatives.set(
      alternative.symbol,
      Math.max(alternatives.get(alternative.symbol) ?? 0, alternative.confidence),
    )
  }

  if (alternatives.size === 0) {
    return undefined
  }

  return [...alternatives.entries()]
    .map(([symbol, confidence]) => ({ confidence, symbol }))
    .sort((left, right) => right.confidence - left.confidence)
}

export function mergeLiveDetectedScanStickers(
  currentStickers: readonly ScanSticker[],
  incomingStickers: readonly ScanSticker[],
): ScanSticker[] {
  const stickerCount = Math.max(currentStickers.length, incomingStickers.length)

  return Array.from({ length: stickerCount }, (_, index) => {
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

export function scanCenterIndex(stickersPerFace: number): number | undefined {
  return stickersPerFace === scan3StickersPerFace ? 4 : undefined
}

function hasScanFaceDraftContent(draft: ScanFaceDraft): boolean {
  return (
    draft.photoDataUrl !== undefined ||
    draft.analysis !== undefined ||
    draft.lastRejectedCapture !== undefined ||
    draft.stickers.some((sticker, index) => index !== 4 && sticker.symbol !== undefined)
  )
}

function allScanFacesComplete(faces: ScanFaces, stickersPerFace: number): boolean {
  return scanFaceOrder.every(({ symbol }) => {
    const face = faces[symbol]
    return face !== undefined && isScanFaceComplete(face.stickers, stickersPerFace)
  })
}

function exactScanCounts(faces: ScanFaces, stickersPerFace: number): boolean {
  const counts = countScanSymbols(faces)
  return scanSymbols.every((symbol) => counts[symbol] === stickersPerFace)
}

function scanFaceSymbolsFromFaces(
  faces: ScanFaces,
): Partial<Record<ScanFaceSymbol, ScanFaceSymbol[]>> {
  const faceSymbols: Partial<Record<ScanFaceSymbol, ScanFaceSymbol[]>> = {}

  for (const face of Object.values(faces)) {
    faceSymbols[face!.symbol] = face!.stickers.map((sticker) => sticker.symbol as ScanFaceSymbol)
  }

  return faceSymbols
}

function balancedScanFaceSymbols(faces: ScanFaces, stickersPerFace: number): Partial<Record<ScanFaceSymbol, ScanFaceSymbol[]>> | undefined {
  const assignments: Partial<Record<ScanFaceSymbol, ScanFaceSymbol[]>> = {}
  const quotas = Object.fromEntries(scanSymbols.map((symbol) => [symbol, stickersPerFace])) as Record<
    ScanFaceSymbol,
    number
  >
  const flexibleStickers: FlexibleStickerAssignment[] = []

  for (const face of Object.values(faces)) {
    const completedFace = face!
    assignments[completedFace.symbol] = Array.from({ length: stickersPerFace }, () => completedFace.symbol)

    for (const [index, sticker] of completedFace.stickers.entries()) {
      if (sticker.source === 'manual' || sticker.source === 'center') {
        const symbol = sticker.symbol!
        quotas[symbol] -= 1
        assignments[completedFace.symbol]![index] = symbol
        continue
      }

      flexibleStickers.push({
        candidates: scanStickerCandidates(sticker),
        faceSymbol: completedFace.symbol,
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

  scores.set(sticker.symbol!, sticker.confidence + 0.04)

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
): ScanFaceSymbol[] | undefined {
  const memo = new Map<string, number | undefined>()
  const choices = new Map<string, ScanFaceSymbol>()
  const initialQuotas = scanSymbols.map((symbol) => quotas[symbol])

  function bestScore(index: number, remainingQuotas: readonly number[]): number | undefined {
    const key = assignmentMemoKey(index, remainingQuotas)
    const cached = memo.get(key)
    if (memo.has(key)) {
      return cached
    }

    if (index === stickers.length) {
      memo.set(key, 0)
      return 0
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
    const symbol = choices.get(assignmentMemoKey(index, remainingQuotas))!

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

function orientScanFaceReviewedStickers(
  symbol: ScanFaceSymbol,
  stickers: readonly ScanSticker[],
): ScanSessionReviewedSticker[] {
  return orientScanFaceItems(symbol, stickers).map((sticker, index) => ({
    confidence: sticker.confidence,
    index,
    source: sticker.source,
    symbol: sticker.symbol as ScanFaceSymbol,
  }))
}

function orientScanFaceItems<T>(symbol: ScanFaceSymbol, items: readonly T[]): T[] {
  if (symbol === 'U') {
    return rotateFaceSymbols180(items)
  }

  return items.slice()
}

export function expectedTopForScanFace(symbol: ScanFaceSymbol): ScanFaceSymbol {
  return symbol === 'U' || symbol === 'D' ? 'F' : 'U'
}

function rotateFaceSymbols180<T>(faceSymbols: readonly T[]): T[] {
  if (faceSymbols.length === scan2StickersPerFace) {
    return [
      faceSymbols[3],
      faceSymbols[2],
      faceSymbols[1],
      faceSymbols[0],
    ]
  }

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
