import type { AnalyzeScanFaceResponse, ScanColorAlternative, ScanDetectionBox } from '@api/scan'
import type { ScanFaceSymbol } from '@api/solver/types'

export type TemporalScanFrame = {
  analysis: AnalyzeScanFaceResponse
  capturedAt: number
  expectedCenter: ScanFaceSymbol
}

export type TemporalStickerConsensus = {
  agreement: number
  alternatives: ScanColorAlternative[]
  bboxStability?: number
  confidence: number
  framesUsed: number
  index: number
  margin: number
  symbol?: ScanFaceSymbol
}

export type TemporalFaceConsensusStatus =
  | 'empty'
  | 'collecting'
  | 'unstable'
  | 'partial_grid'
  | 'color_disagreement'
  | 'center_mismatch'
  | 'ready'

export type TemporalFaceConsensus = {
  bboxStability: number
  faceConfidence: number
  framesRejected: number
  framesSeen: number
  framesUsed: number
  gridConfidence: number
  rejectReasons: string[]
  status: TemporalFaceConsensusStatus
  stickers: TemporalStickerConsensus[]
  temporalAgreement: number
}

export type TemporalConsensusOptions = {
  maxFrameAgeMs: number
  maxFrames: number
  maxMeanBboxMovement: number
  maxStickerBboxMovement: number
  minBboxStability: number
  minFaceAgreement: number
  minFaceConfidence: number
  minFrames: number
  minGridConfidence: number
  minGridDetections: number
  minStickerAgreement: number
  minStickerConfidence: number
  minStickerMargin: number
}

export const defaultTemporalConsensusOptions = {
  maxFrameAgeMs: 1_800,
  maxFrames: 12,
  maxMeanBboxMovement: 0.035,
  maxStickerBboxMovement: 0.06,
  minBboxStability: 0.78,
  minFaceAgreement: 0.84,
  minFaceConfidence: 0.5,
  minFrames: 6,
  minGridConfidence: 0.62,
  minGridDetections: 8,
  minStickerAgreement: 0.75,
  minStickerConfidence: 0.62,
  minStickerMargin: 0.12,
} as const satisfies TemporalConsensusOptions

const scanSymbols = ['U', 'R', 'F', 'D', 'L', 'B'] as const satisfies readonly ScanFaceSymbol[]
const acceptedDetectionModes = new Set(['tile_detector', 'sticker_grid'])
const criticalQualityWarnings = new Set(['image_blurry', 'image_too_dark', 'image_too_bright'])

export function addTemporalScanFrame(
  buffer: readonly TemporalScanFrame[],
  frame: TemporalScanFrame,
  options: TemporalConsensusOptions = defaultTemporalConsensusOptions,
): TemporalScanFrame[] {
  const minimumCapturedAt = frame.capturedAt - options.maxFrameAgeMs
  return [...buffer, frame]
    .filter((bufferedFrame) => bufferedFrame.capturedAt >= minimumCapturedAt)
    .slice(-options.maxFrames)
}

export function buildTemporalFaceConsensus(
  buffer: readonly TemporalScanFrame[],
  options: TemporalConsensusOptions = defaultTemporalConsensusOptions,
): TemporalFaceConsensus {
  if (buffer.length === 0) {
    return emptyTemporalConsensus('empty')
  }

  const frameEvaluations = buffer.map((frame) => ({ frame, reasons: temporalFrameRejectReasons(frame, options) }))
  const usableFrames = frameEvaluations
    .filter(({ reasons }) => reasons.length === 0)
    .map(({ frame }) => frame)
  const rejectReasons = uniqueReasons(frameEvaluations.flatMap(({ reasons }) => reasons))
  const framesRejected = buffer.length - usableFrames.length
  const averageGridConfidence = average(usableFrames.map(({ analysis }) => analysis.gridConfidence ?? 0))
  const averageFaceConfidence = average(usableFrames.map(({ analysis }) => analysis.faceConfidence))

  if (rejectReasons.includes('center_mismatch') && usableFrames.length === 0) {
    return {
      ...emptyTemporalConsensus('center_mismatch'),
      faceConfidence: averageFaceConfidence,
      framesRejected,
      framesSeen: buffer.length,
      gridConfidence: averageGridConfidence,
      rejectReasons,
    }
  }

  if (usableFrames.length < options.minFrames) {
    return {
      ...emptyTemporalConsensus(rejectReasons.includes('grid_partial') ? 'partial_grid' : 'collecting'),
      faceConfidence: averageFaceConfidence,
      framesRejected,
      framesSeen: buffer.length,
      framesUsed: usableFrames.length,
      gridConfidence: averageGridConfidence,
      rejectReasons,
    }
  }

  const stickers = Array.from({ length: 9 }, (_, index) => stickerConsensus(index, usableFrames))
  const temporalAgreement = average(stickers.map((sticker) => sticker.agreement))
  const bboxStats = bboxStability(usableFrames, options)
  const status = temporalConsensusStatus(stickers, temporalAgreement, bboxStats, options)

  return {
    bboxStability: bboxStats.stability,
    faceConfidence: averageFaceConfidence,
    framesRejected,
    framesSeen: buffer.length,
    framesUsed: usableFrames.length,
    gridConfidence: averageGridConfidence,
    rejectReasons: status === 'unstable' ? uniqueReasons([...rejectReasons, 'bbox_unstable']) : rejectReasons,
    status,
    stickers: stickers.map((sticker) => ({
      ...sticker,
      bboxStability: bboxStats.stickerStability[sticker.index],
    })),
    temporalAgreement,
  }
}

export function isTemporalConsensusReady(consensus: TemporalFaceConsensus): boolean {
  return consensus.status === 'ready'
}

function temporalFrameRejectReasons(
  frame: TemporalScanFrame,
  options: TemporalConsensusOptions,
): string[] {
  const { analysis, expectedCenter } = frame
  const reasons: string[] = []

  if (!analysis.ok) {
    reasons.push('analysis_not_ok')
  }
  if (analysis.centerMismatch) {
    reasons.push('center_mismatch')
  }
  if (analysis.stickers[4]?.symbol !== undefined && analysis.stickers[4].symbol !== expectedCenter) {
    reasons.push('center_mismatch')
  }
  if (!acceptedDetectionModes.has(analysis.detectionMode ?? '')) {
    reasons.push('unsupported_detection_mode')
  }
  if (analysis.gridStatus !== 'ready') {
    reasons.push('grid_partial')
  }
  if ((analysis.gridDetections?.length ?? 0) < options.minGridDetections) {
    reasons.push('insufficient_grid_detections')
  }
  if ((analysis.gridConfidence ?? 0) < options.minGridConfidence) {
    reasons.push('low_grid_confidence')
  }
  if (analysis.faceConfidence < options.minFaceConfidence) {
    reasons.push('low_face_confidence')
  }
  if (analysis.stickers.length !== 9) {
    reasons.push('incomplete_stickers')
  }
  if ([...(analysis.qualityWarnings ?? []), ...(analysis.warnings ?? [])].some((warning) => criticalQualityWarnings.has(warning))) {
    reasons.push('critical_quality_warning')
  }

  return uniqueReasons(reasons)
}

function stickerConsensus(index: number, frames: readonly TemporalScanFrame[]): TemporalStickerConsensus {
  const scores = new Map<ScanFaceSymbol, number>()
  const frameVotes: ScanFaceSymbol[] = []

  for (const frame of frames) {
    const sticker = frame.analysis.stickers.find((candidate) => candidate.index === index)
    const gridDetection = frame.analysis.gridDetections?.find((candidate) => candidate.index === index)
    const evidence = stickerEvidence(sticker, gridDetection?.symbol)
    const frameWeight = (frame.analysis.gridConfidence ?? 0) * frame.analysis.faceConfidence * (sticker?.confidence ?? gridDetection?.confidence ?? 0.5)
    const frameScores = new Map<ScanFaceSymbol, number>()

    for (const [symbol, score] of evidence) {
      const weightedScore = score * Math.max(0.01, frameWeight)
      scores.set(symbol, (scores.get(symbol) ?? 0) + weightedScore)
      frameScores.set(symbol, weightedScore)
    }

    const vote = sortedScores(frameScores)[0]?.[0]
    if (vote !== undefined) {
      frameVotes.push(vote)
    }
  }

  const sorted = sortedScores(scores)
  const [winner, winnerScore = 0] = sorted[0] ?? []
  const runnerUpScore = sorted[1]?.[1] ?? 0
  const totalScore = sorted.reduce((sum, [, score]) => sum + score, 0)
  const agreement = winner === undefined ? 0 : frameVotes.filter((vote) => vote === winner).length / frames.length
  const alternatives = sorted.slice(1, 3).map(([symbol, score]) => ({
    confidence: totalScore > 0 ? score / totalScore : 0,
    symbol,
  }))

  return {
    agreement,
    alternatives,
    confidence: totalScore > 0 ? winnerScore / totalScore : 0,
    framesUsed: frames.length,
    index,
    margin: totalScore > 0 ? (winnerScore - runnerUpScore) / totalScore : 0,
    symbol: winner,
  }
}

function stickerEvidence(
  sticker: AnalyzeScanFaceResponse['stickers'][number] | undefined,
  gridSymbol: ScanFaceSymbol | undefined,
): Map<ScanFaceSymbol, number> {
  const evidence = new Map<ScanFaceSymbol, number>()
  if (sticker?.probabilities !== undefined) {
    for (const symbol of scanSymbols) {
      evidence.set(symbol, sticker.probabilities[symbol] ?? 0)
    }
    return evidence
  }

  if (sticker?.symbol !== undefined) {
    evidence.set(sticker.symbol, Math.max(evidence.get(sticker.symbol) ?? 0, sticker.confidence))
  }
  for (const alternative of sticker?.alternatives ?? []) {
    evidence.set(alternative.symbol, Math.max(evidence.get(alternative.symbol) ?? 0, alternative.confidence))
  }
  if (gridSymbol !== undefined) {
    evidence.set(gridSymbol, Math.max(evidence.get(gridSymbol) ?? 0, 0.55))
  }

  return evidence
}

function temporalConsensusStatus(
  stickers: readonly TemporalStickerConsensus[],
  temporalAgreement: number,
  bboxStats: BboxStability,
  options: TemporalConsensusOptions,
): TemporalFaceConsensusStatus {
  if (stickers.some((sticker) => sticker.symbol === undefined)) {
    return 'partial_grid'
  }
  if (
    stickers.some(
      (sticker) =>
        sticker.agreement < options.minStickerAgreement ||
        sticker.confidence < options.minStickerConfidence ||
        sticker.margin < options.minStickerMargin,
    ) ||
    temporalAgreement < options.minFaceAgreement
  ) {
    return 'color_disagreement'
  }
  if (
    bboxStats.hasEnoughBoxes &&
    (bboxStats.meanMovement > options.maxMeanBboxMovement ||
      bboxStats.maxMovement > options.maxStickerBboxMovement ||
      bboxStats.stability < options.minBboxStability)
  ) {
    return 'unstable'
  }

  return 'ready'
}

type BboxStability = {
  hasEnoughBoxes: boolean
  maxMovement: number
  meanMovement: number
  stability: number
  stickerStability: Partial<Record<number, number>>
}

function bboxStability(frames: readonly TemporalScanFrame[], options: TemporalConsensusOptions): BboxStability {
  const movements: number[] = []
  const stickerStability: Partial<Record<number, number>> = {}

  for (let index = 0; index < 9; index += 1) {
    const boxes = frames
      .map((frame) => frame.analysis.gridDetections?.find((detection) => detection.index === index)?.bbox)
      .filter((bbox): bbox is ScanDetectionBox => bbox !== undefined)
    if (boxes.length < 2) {
      continue
    }
    const movement = averageDistanceFromMean(boxes)
    movements.push(movement)
    stickerStability[index] = 1 - clamp01(movement / options.maxStickerBboxMovement)
  }

  if (movements.length < options.minGridDetections) {
    return {
      hasEnoughBoxes: false,
      maxMovement: 0,
      meanMovement: 0,
      stability: 1,
      stickerStability,
    }
  }

  const meanMovement = average(movements)
  return {
    hasEnoughBoxes: true,
    maxMovement: Math.max(...movements),
    meanMovement,
    stability: 1 - clamp01(meanMovement / options.maxMeanBboxMovement),
    stickerStability,
  }
}

function averageDistanceFromMean(boxes: readonly ScanDetectionBox[]): number {
  const meanX = average(boxes.map((box) => box.x))
  const meanY = average(boxes.map((box) => box.y))
  return average(boxes.map((box) => Math.hypot(box.x - meanX, box.y - meanY)))
}

function emptyTemporalConsensus(status: TemporalFaceConsensusStatus): TemporalFaceConsensus {
  return {
    bboxStability: 0,
    faceConfidence: 0,
    framesRejected: 0,
    framesSeen: 0,
    framesUsed: 0,
    gridConfidence: 0,
    rejectReasons: [],
    status,
    stickers: [],
    temporalAgreement: 0,
  }
}

function sortedScores(scores: Map<ScanFaceSymbol, number>): [ScanFaceSymbol, number][] {
  return [...scores.entries()].sort((left, right) => right[1] - left[1])
}

function uniqueReasons(reasons: readonly string[]): string[] {
  return [...new Set(reasons)].sort()
}

function average(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}
