import type { AnalyzeScanFaceResponse, ScanColorAlternative, ScanDetectionBox } from '@api/scan'
import type { ScanFaceSymbol } from '@api/solver/types'
import {
  assignTileDetectionsToReviewGrid,
  type IndexedScanTileDetection,
} from './scanTileDetections'

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
  | 'partial_tiles'
  | 'color_disagreement'
  | 'center_mismatch'
  | 'ready'

export type TemporalFaceConsensus = {
  bboxStability: number
  faceConfidence: number
  framesRejected: number
  framesSeen: number
  framesUsed: number
  rejectReasons: string[]
  status: TemporalFaceConsensusStatus
  stickers: TemporalStickerConsensus[]
  temporalAgreement: number
  tileConfidence: number
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
  minStickerAgreement: number
  minStickerConfidence: number
  minStickerMargin: number
  minTileConfidence: number
  minTileDetections: number
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
  minStickerAgreement: 0.75,
  minStickerConfidence: 0.62,
  minStickerMargin: 0.12,
  minTileConfidence: 0.62,
  minTileDetections: 9,
} as const satisfies TemporalConsensusOptions

const acceptedDetectionModes = new Set(['tile_detector'])
const criticalQualityWarnings = new Set(['image_blurry', 'image_too_dark', 'image_too_bright'])

export function tileAssignmentFromAnalysis(
  analysis: AnalyzeScanFaceResponse,
): IndexedScanTileDetection[] | undefined {
  return assignTileDetectionsToReviewGrid(analysis.tileDetections)
}

export function hasCompleteTileDetections(
  analysis: AnalyzeScanFaceResponse,
  expectedCenter: ScanFaceSymbol,
): boolean {
  const assignedTiles = tileAssignmentFromAnalysis(analysis)
  return assignedTiles !== undefined && assignedTiles[4]?.symbol === expectedCenter
}

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

  const frameEvaluations = buffer.map((frame) => ({
    assignedTiles: tileAssignmentFromAnalysis(frame.analysis),
    frame,
    reasons: temporalFrameRejectReasons(frame, options),
  }))
  const usableFrames = frameEvaluations.filter(({ reasons }) => reasons.length === 0)
  const rejectReasons = uniqueReasons(frameEvaluations.flatMap(({ reasons }) => reasons))
  const framesRejected = buffer.length - usableFrames.length
  const averageTileConfidence = average(
    usableFrames.map(({ assignedTiles }) => average((assignedTiles ?? []).map((tile) => tile.confidence))),
  )
  const averageFaceConfidence = average(usableFrames.map(({ frame }) => frame.analysis.faceConfidence))

  if (rejectReasons.includes('center_mismatch') && usableFrames.length === 0) {
    return {
      ...emptyTemporalConsensus('center_mismatch'),
      faceConfidence: averageFaceConfidence,
      framesRejected,
      framesSeen: buffer.length,
      rejectReasons,
      tileConfidence: averageTileConfidence,
    }
  }

  if (usableFrames.length < options.minFrames) {
    return {
      ...emptyTemporalConsensus(rejectReasons.includes('insufficient_tile_detections') ? 'partial_tiles' : 'collecting'),
      faceConfidence: averageFaceConfidence,
      framesRejected,
      framesSeen: buffer.length,
      framesUsed: usableFrames.length,
      rejectReasons,
      tileConfidence: averageTileConfidence,
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
    rejectReasons: status === 'unstable' ? uniqueReasons([...rejectReasons, 'bbox_unstable']) : rejectReasons,
    status,
    stickers: stickers.map((sticker) => ({
      ...sticker,
      bboxStability: bboxStats.stickerStability[sticker.index],
    })),
    temporalAgreement,
    tileConfidence: averageTileConfidence,
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
  const assignedTiles = tileAssignmentFromAnalysis(analysis)

  if (!analysis.ok) {
    reasons.push('analysis_not_ok')
  }
  if (!acceptedDetectionModes.has(analysis.detectionMode ?? '')) {
    reasons.push('unsupported_detection_mode')
  }
  if (assignedTiles === undefined || assignedTiles.length < options.minTileDetections) {
    reasons.push('insufficient_tile_detections')
  }
  if (assignedTiles !== undefined && average(assignedTiles.map((tile) => tile.confidence)) < options.minTileConfidence) {
    reasons.push('low_tile_confidence')
  }
  if (analysis.centerMismatch || (assignedTiles !== undefined && assignedTiles[4]?.symbol !== expectedCenter)) {
    reasons.push('center_mismatch')
  }
  if (analysis.faceConfidence < options.minFaceConfidence) {
    reasons.push('low_face_confidence')
  }
  if ([...(analysis.qualityWarnings ?? []), ...(analysis.warnings ?? [])].some((warning) => criticalQualityWarnings.has(warning))) {
    reasons.push('critical_quality_warning')
  }

  return uniqueReasons(reasons)
}

function stickerConsensus(
  index: number,
  frames: readonly { assignedTiles: IndexedScanTileDetection[] | undefined; frame: TemporalScanFrame }[],
): TemporalStickerConsensus {
  const scores = new Map<ScanFaceSymbol, number>()
  const frameVotes: ScanFaceSymbol[] = []

  for (const { assignedTiles } of frames) {
    const tile = assignedTiles?.[index]
    if (tile === undefined) {
      continue
    }

    scores.set(tile.symbol, (scores.get(tile.symbol) ?? 0) + tile.confidence)
    frameVotes.push(tile.symbol)
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
    framesUsed: frameVotes.length,
    index,
    margin: totalScore > 0 ? (winnerScore - runnerUpScore) / totalScore : 0,
    symbol: winner,
  }
}

function temporalConsensusStatus(
  stickers: readonly TemporalStickerConsensus[],
  temporalAgreement: number,
  bboxStats: BboxStability,
  options: TemporalConsensusOptions,
): TemporalFaceConsensusStatus {
  if (stickers.some((sticker) => sticker.symbol === undefined)) {
    return 'partial_tiles'
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

function bboxStability(
  frames: readonly { assignedTiles: IndexedScanTileDetection[] | undefined; frame: TemporalScanFrame }[],
  options: TemporalConsensusOptions,
): BboxStability {
  const movements: number[] = []
  const stickerStability: Partial<Record<number, number>> = {}

  for (let index = 0; index < 9; index += 1) {
    const boxes = frames
      .map(({ assignedTiles }) => assignedTiles?.[index]?.bbox)
      .filter((bbox): bbox is ScanDetectionBox => bbox !== undefined)
    if (boxes.length < 2) {
      continue
    }
    const movement = averageDistanceFromMean(boxes)
    movements.push(movement)
    stickerStability[index] = 1 - clamp01(movement / options.maxStickerBboxMovement)
  }

  if (movements.length < options.minTileDetections) {
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
    rejectReasons: [],
    status,
    stickers: [],
    temporalAgreement: 0,
    tileConfidence: 0,
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
