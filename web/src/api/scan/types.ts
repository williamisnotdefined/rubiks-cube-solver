import type { ScanFaceSymbol, SolveResult } from '@api/solver/types'

export type RgbColor = {
  r: number
  g: number
  b: number
}

export type ScanAnalysisPoint = {
  x: number
  y: number
}

export type ScanDetectionBox = {
  x: number
  y: number
  width: number
  height: number
}

export type ScanTileDetection = {
  symbol: ScanFaceSymbol | 'face'
  confidence: number
  bbox: ScanDetectionBox
}

export type ScanColorAlternative = {
  symbol: ScanFaceSymbol
  confidence: number
}

export type ScanColorProbabilities = Record<ScanFaceSymbol, number>

export type ScanStickerQuality = {
  colorVariance: number
  glareRatio: number
  shadowRatio: number
  margin: number
}

export type ScanImageQuality = {
  blurScore: number
  meanLuminance: number
  glareRatio: number
  shadowRatio: number
}

export type AnalyzedScanSticker = {
  index: number
  symbol: ScanFaceSymbol
  confidence: number
  rgb: RgbColor
  polygon: ScanAnalysisPoint[]
  alternatives: ScanColorAlternative[]
  probabilities?: ScanColorProbabilities
  quality?: ScanStickerQuality
}

export type AnalyzeScanFaceResponse = {
  ok: boolean
  status:
    | 'detected'
    | 'center_mismatch'
    | 'face_not_found'
    | 'low_confidence'
    | 'invalid_image'
    | 'request_too_large'
    | 'vision_unavailable'
    | 'vision_error'
    | string
  message?: string
  centerMismatch: boolean
  detectedCenter?: ScanFaceSymbol
  expectedCenter?: ScanFaceSymbol
  confidence: number
  detectedCenterConfidence: number
  faceConfidence: number
  detectionMode?: 'tile_detector' | 'reviewed_stickers' | 'rejected' | string | null
  imageSize?: {
    width: number
    height: number
  }
  imageQuality?: ScanImageQuality
  stickers: AnalyzedScanSticker[]
  tileDetections?: ScanTileDetection[]
  qualityWarnings: string[]
  warnings: string[]
}

export type AnalyzeScanFaceVariables = {
  expectedCenter: ScanFaceSymbol
  gridSize?: 2 | 3
  image: string
  signal?: AbortSignal
}

export type ScanSessionReviewedSticker = {
  index: number
  symbol: ScanFaceSymbol
  confidence?: number
  source?: 'detected' | 'manual' | 'center' | string
}

export type ScanSessionFaceRequest = {
  symbol: ScanFaceSymbol
  expectedTop?: ScanFaceSymbol
  manualOverrides?: Partial<Record<number, ScanFaceSymbol>>
  reviewedStickers?: ScanSessionReviewedSticker[]
  clientRotation?: 0 | 90 | 180 | 270
}

export type SolveScanSessionVariables = {
  faces: ScanSessionFaceRequest[]
  maxDepth: number
  maxNodes?: number
  puzzleSlug?: string
  strategyId?: string
}

export type AnalyzedScanSessionFace = {
  symbol: ScanFaceSymbol
  expectedTop?: ScanFaceSymbol
  analysis: AnalyzeScanFaceResponse
}

export type AnalyzeScanSessionResponse = {
  ok: boolean
  status: 'analyzed' | 'partial_failure' | 'invalid_session' | string
  message?: string
  faces: AnalyzedScanSessionFace[]
  warnings: string[]
}

export type ScanSessionManualTarget = {
  face: ScanFaceSymbol
  stickers: number[]
}

export type ScanSessionInvalidCorner = {
  position: string
  faces: ScanFaceSymbol[]
  stickers: ScanFaceSymbol[]
  targets?: ScanSessionInvalidCornerTarget[]
  reason?: 'opposite_faces' | 'unknown_corner' | string
}

export type ScanSessionInvalidCornerTarget = {
  face: ScanFaceSymbol
  index: number
}

export type ScanSessionStatus =
  | 'accepted'
  | 'needs_rescan_face'
  | 'needs_manual_confirmation'
  | 'state_ambiguous'
  | 'orientation_ambiguous'
  | 'invalid_session'
  | 'invalid_cube_state'
  | 'vision_unavailable'
  | 'vision_error'
  | 'api_error'
  | string

export type ScanSessionInference = {
  status: ScanSessionStatus
  margin?: number
  stateConfidence: number
  candidateFacelets?: string
  rescanFaces: ScanFaceSymbol[]
  manualTargets: ScanSessionManualTarget[]
  qualityReasons?: string[]
}

export type ScanSessionTimings = {
  totalElapsedMs: number
  visionElapsedMs?: number
  earlyQualityGateElapsedMs?: number
  inferenceElapsedMs?: number
  qualityGateElapsedMs?: number
  solveElapsedMs?: number
}

export type ScanSessionResult = {
  ok: boolean
  status: ScanSessionStatus
  message?: string
  timings?: ScanSessionTimings
  scan?: AnalyzeScanSessionResponse
  solve?: SolveResult
  inference?: ScanSessionInference
  rescanFaces: ScanFaceSymbol[]
  manualTargets: ScanSessionManualTarget[]
  invalidCorners?: ScanSessionInvalidCorner[]
}
