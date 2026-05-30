import type { ScanFaceSymbol } from '@api/solver/types'

export type RgbColor = {
  r: number
  g: number
  b: number
}

export type ScanAnalysisPoint = {
  x: number
  y: number
}

export type ScanColorAlternative = {
  symbol: ScanFaceSymbol
  confidence: number
}

export type AnalyzedScanSticker = {
  index: number
  symbol: ScanFaceSymbol
  confidence: number
  rgb: RgbColor
  polygon: ScanAnalysisPoint[]
  alternatives: ScanColorAlternative[]
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
  imageSize?: {
    width: number
    height: number
  }
  faceQuad: ScanAnalysisPoint[]
  stickers: AnalyzedScanSticker[]
  warnings: string[]
}

export type AnalyzeScanFaceVariables = {
  expectedCenter: ScanFaceSymbol
  image: string
  knownCenters: Partial<Record<ScanFaceSymbol, RgbColor>>
}
