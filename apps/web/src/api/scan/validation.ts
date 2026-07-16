import { ApiResponseValidationError } from '@api/client'
import { isApiSolveResponse } from '@api/solver/types/validation'
import type { ApiSolveResponse, ScanFaceSymbol } from '@api/solver/types'
import type {
  AnalyzeScanFaceResponse,
  AnalyzeScanFaceVariables,
  AnalyzeScanSessionResponse,
  AnalyzedScanSticker,
  ScanSessionInference,
  ScanSessionInvalidCorner,
  ScanSessionManualTarget,
  ScanSessionResult,
  SolveScanSessionVariables,
} from './types'

type RawAnalyzeScanFaceResponse = Omit<
  AnalyzeScanFaceResponse,
  'detectedCenter' | 'expectedCenter' | 'imageSize' | 'message'
> & {
  detectedCenter?: ScanFaceSymbol | null
  expectedCenter?: ScanFaceSymbol | null
  imageSize?: AnalyzeScanFaceResponse['imageSize'] | null
  message?: string | null
}

type RawAnalyzeScanSessionResponse = Omit<AnalyzeScanSessionResponse, 'faces' | 'message'> & {
  faces: Array<
    Omit<AnalyzeScanSessionResponse['faces'][number], 'analysis'> & {
      analysis: RawAnalyzeScanFaceResponse
    }
  >
  message?: string | null
}

type WireScanSessionResult = Omit<ScanSessionResult, 'message' | 'scan' | 'solve'> & {
  message?: string | null
  scan?: RawAnalyzeScanSessionResponse
  solve?: ApiSolveResponse
}

export type RawScanSessionResult = Omit<ScanSessionResult, 'solve'> & {
  solve?: ApiSolveResponse
}

const faceSymbols = ['U', 'R', 'F', 'D', 'L', 'B'] as const
const scanRotations = [0, 90, 180, 270] as const
const scanFaceStatuses = [
  'detected',
  'center_mismatch',
  'face_not_found',
  'low_confidence',
  'invalid_image',
  'request_too_large',
  'vision_unavailable',
  'vision_error',
] as const
const scanAnalysisStatuses = ['analyzed', 'partial_failure', 'invalid_session'] as const
const scanSessionStatuses = [
  'accepted',
  'needs_rescan_face',
  'needs_manual_confirmation',
  'state_ambiguous',
  'orientation_ambiguous',
  'invalid_session',
  'invalid_cube_state',
  'not_found_within_limits',
  'node_limit_exceeded',
  'vision_unavailable',
  'vision_error',
  'api_error',
  'unknown_puzzle',
  'unsupported_puzzle',
] as const

export function parseAnalyzeScanFaceResponse(
  value: unknown,
  gridSize?: 2 | 3,
): AnalyzeScanFaceResponse {
  if (!isAnalyzeScanFaceResponse(value, stickerIndexMaxForGrid(gridSize))) {
    throw new ApiResponseValidationError('scan analysis')
  }

  return normalizeAnalyzeScanFaceResponse(value)
}

export function parseScanSessionResult(value: unknown, puzzleSlug?: string): RawScanSessionResult {
  if (!isScanSessionResult(value, stickerIndexMaxForPuzzle(puzzleSlug))) {
    throw new ApiResponseValidationError('scan session')
  }

  return {
    ...value,
    message: value.message ?? undefined,
    scan: value.scan === undefined ? undefined : normalizeAnalyzeScanSessionResponse(value.scan),
  }
}

export function assertAnalyzeScanFaceVariables(variables: AnalyzeScanFaceVariables): void {
  if (variables.gridSize !== undefined && variables.gridSize !== 2 && variables.gridSize !== 3) {
    throw new TypeError('gridSize must be 2 or 3')
  }
}

export function assertSolveScanSessionVariables(variables: SolveScanSessionVariables): void {
  const maxIndex = stickerIndexMaxForPuzzle(variables.puzzleSlug)

  for (const face of variables.faces) {
    if (face.clientRotation !== undefined && !isSupportedScanRotation(face.clientRotation)) {
      throw new TypeError('clientRotation must be one of 0, 90, 180, 270')
    }

    if (
      face.reviewedStickers?.some((sticker) => !isStickerIndex(sticker.index, maxIndex)) === true
    ) {
      throw new TypeError(`reviewed sticker indexes must be integers in 0..${maxIndex}`)
    }

    if (
      face.manualOverrides !== undefined &&
      Object.keys(face.manualOverrides).some((index) => !isStickerIndexKey(index, maxIndex))
    ) {
      throw new TypeError(`manual override indexes must be integers in 0..${maxIndex}`)
    }
  }
}

export function isSupportedScanRotation(value: unknown): value is 0 | 90 | 180 | 270 {
  return (
    typeof value === 'number' && scanRotations.includes(value as (typeof scanRotations)[number])
  )
}

export function genericApiErrorMessage(value: unknown): string | undefined {
  if (!isRecord(value) || 'ok' in value || 'status' in value) {
    return undefined
  }

  if (typeof value.message === 'string' && value.message.length > 0) {
    return value.message
  }

  if (Array.isArray(value.message)) {
    const messages = value.message.filter(
      (message): message is string => typeof message === 'string' && message.length > 0,
    )
    if (messages.length > 0) {
      return messages.join(', ')
    }
  }

  return undefined
}

function isAnalyzeScanFaceResponse(
  value: unknown,
  maxIndex = 8,
): value is RawAnalyzeScanFaceResponse {
  return (
    isRecord(value) &&
    typeof value.ok === 'boolean' &&
    isOneOf(value.status, scanFaceStatuses) &&
    value.ok === (value.status === 'detected') &&
    isOptionalNullableString(value.message) &&
    typeof value.centerMismatch === 'boolean' &&
    isOptionalNullableFaceSymbol(value.detectedCenter) &&
    isOptionalNullableFaceSymbol(value.expectedCenter) &&
    isFiniteNumber(value.confidence) &&
    isFiniteNumber(value.detectedCenterConfidence) &&
    isFiniteNumber(value.faceConfidence) &&
    (value.detectionMode === undefined ||
      value.detectionMode === null ||
      typeof value.detectionMode === 'string') &&
    (value.imageSize === undefined || value.imageSize === null || isImageSize(value.imageSize)) &&
    (value.imageQuality === undefined || isImageQuality(value.imageQuality)) &&
    Array.isArray(value.stickers) &&
    value.stickers.every((sticker) => isAnalyzedScanSticker(sticker, maxIndex)) &&
    (value.tileDetections === undefined ||
      (Array.isArray(value.tileDetections) && value.tileDetections.every(isTileDetection))) &&
    isStringArray(value.qualityWarnings) &&
    isStringArray(value.warnings)
  )
}

function isAnalyzedScanSticker(value: unknown, maxIndex: number): value is AnalyzedScanSticker {
  return (
    isRecord(value) &&
    isStickerIndex(value.index, maxIndex) &&
    isFaceSymbol(value.symbol) &&
    isFiniteNumber(value.confidence) &&
    isRgbColor(value.rgb) &&
    Array.isArray(value.polygon) &&
    value.polygon.every(isAnalysisPoint) &&
    Array.isArray(value.alternatives) &&
    value.alternatives.every(isColorAlternative) &&
    (value.probabilities === undefined || isColorProbabilities(value.probabilities)) &&
    (value.quality === undefined || isStickerQuality(value.quality))
  )
}

function isScanSessionResult(value: unknown, maxIndex: number): value is WireScanSessionResult {
  return (
    isRecord(value) &&
    typeof value.ok === 'boolean' &&
    isOneOf(value.status, scanSessionStatuses) &&
    value.ok === (value.status === 'accepted') &&
    isOptionalNullableString(value.message) &&
    (value.timings === undefined || isSessionTimings(value.timings)) &&
    (value.scan === undefined || isAnalyzeScanSessionResponse(value.scan, maxIndex)) &&
    (value.solve === undefined || isApiSolveResponse(value.solve)) &&
    isSessionSolveConsistent(value) &&
    (value.inference === undefined || isSessionInference(value.inference, maxIndex)) &&
    Array.isArray(value.rescanFaces) &&
    value.rescanFaces.every(isFaceSymbol) &&
    Array.isArray(value.manualTargets) &&
    value.manualTargets.every((target) => isManualTarget(target, maxIndex)) &&
    (value.invalidCorners === undefined ||
      (Array.isArray(value.invalidCorners) &&
        value.invalidCorners.every((corner) => isInvalidCorner(corner, maxIndex))))
  )
}

function isAnalyzeScanSessionResponse(
  value: unknown,
  maxIndex: number,
): value is RawAnalyzeScanSessionResponse {
  return (
    isRecord(value) &&
    typeof value.ok === 'boolean' &&
    isOneOf(value.status, scanAnalysisStatuses) &&
    value.ok === (value.status === 'analyzed') &&
    isOptionalNullableString(value.message) &&
    Array.isArray(value.faces) &&
    value.faces.every(
      (face) =>
        isRecord(face) &&
        isFaceSymbol(face.symbol) &&
        isOptionalFaceSymbol(face.expectedTop) &&
        isAnalyzeScanFaceResponse(face.analysis, maxIndex),
    ) &&
    isStringArray(value.warnings)
  )
}

function normalizeAnalyzeScanSessionResponse(
  value: RawAnalyzeScanSessionResponse,
): AnalyzeScanSessionResponse {
  return {
    ...value,
    faces: value.faces.map((face) => ({
      ...face,
      analysis: normalizeAnalyzeScanFaceResponse(face.analysis),
    })),
    message: value.message ?? undefined,
  }
}

function normalizeAnalyzeScanFaceResponse(
  value: RawAnalyzeScanFaceResponse,
): AnalyzeScanFaceResponse {
  return {
    ...value,
    detectedCenter: value.detectedCenter ?? undefined,
    expectedCenter: value.expectedCenter ?? undefined,
    imageSize: value.imageSize ?? undefined,
    message: value.message ?? undefined,
  }
}

function isSessionInference(value: unknown, maxIndex: number): value is ScanSessionInference {
  return (
    isRecord(value) &&
    isOneOf(value.status, scanSessionStatuses) &&
    isOptionalFiniteNumber(value.margin) &&
    isFiniteNumber(value.stateConfidence) &&
    isOptionalString(value.candidateFacelets) &&
    Array.isArray(value.rescanFaces) &&
    value.rescanFaces.every(isFaceSymbol) &&
    Array.isArray(value.manualTargets) &&
    value.manualTargets.every((target) => isManualTarget(target, maxIndex)) &&
    (value.qualityReasons === undefined || isStringArray(value.qualityReasons))
  )
}

function isManualTarget(value: unknown, maxIndex: number): value is ScanSessionManualTarget {
  return (
    isRecord(value) &&
    isFaceSymbol(value.face) &&
    Array.isArray(value.stickers) &&
    value.stickers.every((index) => isStickerIndex(index, maxIndex))
  )
}

function isInvalidCorner(value: unknown, maxIndex: number): value is ScanSessionInvalidCorner {
  return (
    isRecord(value) &&
    typeof value.position === 'string' &&
    Array.isArray(value.faces) &&
    value.faces.every(isFaceSymbol) &&
    Array.isArray(value.stickers) &&
    value.stickers.every(isFaceSymbol) &&
    (value.targets === undefined ||
      (Array.isArray(value.targets) &&
        value.targets.every(
          (target) =>
            isRecord(target) && isFaceSymbol(target.face) && isStickerIndex(target.index, maxIndex),
        ))) &&
    isOptionalString(value.reason)
  )
}

function isSessionTimings(value: unknown): boolean {
  return (
    isRecord(value) &&
    isFiniteNumber(value.totalElapsedMs) &&
    isOptionalFiniteNumber(value.visionElapsedMs) &&
    isOptionalFiniteNumber(value.earlyQualityGateElapsedMs) &&
    isOptionalFiniteNumber(value.inferenceElapsedMs) &&
    isOptionalFiniteNumber(value.qualityGateElapsedMs) &&
    isOptionalFiniteNumber(value.solveElapsedMs)
  )
}

function isImageSize(value: unknown): boolean {
  return isRecord(value) && isFiniteNumber(value.width) && isFiniteNumber(value.height)
}

function isImageQuality(value: unknown): boolean {
  return (
    isRecord(value) &&
    isFiniteNumber(value.blurScore) &&
    isFiniteNumber(value.meanLuminance) &&
    isFiniteNumber(value.glareRatio) &&
    isFiniteNumber(value.shadowRatio)
  )
}

function isTileDetection(value: unknown): boolean {
  return (
    isRecord(value) &&
    (value.symbol === 'face' || isFaceSymbol(value.symbol)) &&
    isFiniteNumber(value.confidence) &&
    isRecord(value.bbox) &&
    isFiniteNumber(value.bbox.x) &&
    isFiniteNumber(value.bbox.y) &&
    isFiniteNumber(value.bbox.width) &&
    isFiniteNumber(value.bbox.height)
  )
}

function isRgbColor(value: unknown): boolean {
  return (
    isRecord(value) && isFiniteNumber(value.r) && isFiniteNumber(value.g) && isFiniteNumber(value.b)
  )
}

function isAnalysisPoint(value: unknown): boolean {
  return isRecord(value) && isFiniteNumber(value.x) && isFiniteNumber(value.y)
}

function isColorAlternative(value: unknown): boolean {
  return isRecord(value) && isFaceSymbol(value.symbol) && isFiniteNumber(value.confidence)
}

function isColorProbabilities(value: unknown): boolean {
  return isRecord(value) && faceSymbols.every((symbol) => isFiniteNumber(value[symbol]))
}

function isStickerQuality(value: unknown): boolean {
  return (
    isRecord(value) &&
    isFiniteNumber(value.colorVariance) &&
    isFiniteNumber(value.glareRatio) &&
    isFiniteNumber(value.shadowRatio) &&
    isFiniteNumber(value.margin)
  )
}

function isFaceSymbol(value: unknown): value is ScanFaceSymbol {
  return typeof value === 'string' && faceSymbols.includes(value as ScanFaceSymbol)
}

function isOptionalFaceSymbol(value: unknown): boolean {
  return value === undefined || isFaceSymbol(value)
}

function isOptionalNullableFaceSymbol(value: unknown): boolean {
  return value === undefined || value === null || isFaceSymbol(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === 'string'
}

function isOptionalNullableString(value: unknown): boolean {
  return value === undefined || value === null || typeof value === 'string'
}

function isOptionalFiniteNumber(value: unknown): boolean {
  return value === undefined || isFiniteNumber(value)
}

function isSessionSolveConsistent(value: Record<string, unknown>): boolean {
  if (value.status === 'accepted') {
    return isRecord(value.solve) && value.solve.ok === true && value.solve.status === 'success'
  }

  return (
    value.solve === undefined ||
    (isRecord(value.solve) && value.solve.ok === false && value.solve.status !== 'success')
  )
}

function isStickerIndex(value: unknown, maxIndex: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= maxIndex
}

function isStickerIndexKey(value: string, maxIndex: number): boolean {
  const index = Number(value)
  return String(index) === value && isStickerIndex(index, maxIndex)
}

function stickerIndexMaxForGrid(gridSize: 2 | 3 | undefined): number {
  return gridSize === 2 ? 3 : 8
}

function stickerIndexMaxForPuzzle(puzzleSlug: string | undefined): number {
  return puzzleSlug === 'cube-2x2x2' ? 3 : 8
}

function isOneOf<TValue extends string>(
  value: unknown,
  allowed: readonly TValue[],
): value is TValue {
  return typeof value === 'string' && allowed.includes(value as TValue)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
