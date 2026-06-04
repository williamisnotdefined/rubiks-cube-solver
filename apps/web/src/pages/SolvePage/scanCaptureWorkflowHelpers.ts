import type { AnalyzeScanFaceResponse, RgbColor } from '@api/scan'
import type { ScanFaceSymbol } from '@api/solver/types'
import type { TFunction } from 'i18next'
import type { CapturedScanImage } from './scanCapture'
import {
  scanFaceOrder,
  type ScanAutoCaptureMetadata,
  type ScanCaptureMetadata,
  type ScanFaceDraft,
  type ScanFaceDrafts,
  type ScanFaces,
} from './scanState'
import type { TemporalFaceConsensus } from './scanTemporalConsensus'

export function currentDraftHasReviewContent(draft: ScanFaceDraft, centerIndex: number | undefined): boolean {
  return (
    draft.photoDataUrl !== undefined ||
    draft.analysis !== undefined ||
    draft.stickers.some((sticker, index) => index !== centerIndex && sticker.symbol !== undefined)
  )
}

export function canApplyLiveAutofill(draft: ScanFaceDraft): boolean {
  return !draft.confirmed
}

export function nextUnconfirmedFaceIndex(
  drafts: ScanFaceDrafts,
  currentFaceIndex: number,
): number | undefined {
  for (let offset = 1; offset <= scanFaceOrder.length; offset += 1) {
    const nextIndex = (currentFaceIndex + offset) % scanFaceOrder.length
    const face = scanFaceOrder[nextIndex]

    if (!drafts[face.symbol].confirmed) {
      return nextIndex
    }
  }

  return undefined
}

export function scanCaptureMetadata(capture: CapturedScanImage): ScanCaptureMetadata {
  return {
    capturedAt: capture.capturedAt,
    height: capture.height,
    source: capture.source,
    width: capture.width,
  }
}

export function scanAutoCaptureMetadata(
  consensus: TemporalFaceConsensus,
  analysis: AnalyzeScanFaceResponse,
): ScanAutoCaptureMetadata {
  return {
    bboxStability: consensus.bboxStability,
    detectionMode: analysis.detectionMode,
    faceConfidence: analysis.faceConfidence,
    stableFrameCount: consensus.framesUsed,
    temporalAgreement: consensus.temporalAgreement,
    tileConfidence: consensus.tileConfidence,
    tileDetections: analysis.tileDetections!.filter((detection) => detection.symbol !== 'face').length,
    triggeredAt: new Date().toISOString(),
  }
}

export function rejectedCaptureReason(analysis: AnalyzeScanFaceResponse): 'empty_stickers' | 'partial_tiles' {
  return (analysis.tileDetections?.length ?? 0) > 0 || analysis.stickers.length > 0
    ? 'partial_tiles'
    : 'empty_stickers'
}

export function scanQualityMessage(
  t: TFunction,
  analysis: AnalyzeScanFaceResponse,
): string | undefined {
  const warnings = new Set([...analysis.qualityWarnings, ...analysis.warnings])
  const messages: string[] = []

  if (analysis.faceConfidence > 0 && analysis.faceConfidence < 0.55) {
    messages.push(t('scan.messages.lowConfidence'))
  }

  if (warnings.has('image_blurry')) {
    messages.push(t('scan.messages.qualityBlurry'))
  }

  if (warnings.has('image_too_dark')) {
    messages.push(t('scan.messages.qualityDark'))
  }

  if (warnings.has('image_too_bright')) {
    messages.push(t('scan.messages.qualityBright'))
  }

  if (messages.length > 0) {
    return messages.join(' ')
  }

  return analysis.status === 'low_confidence' ? t('scan.messages.lowConfidence') : undefined
}

export function knownCenterReferencesFromFaces(faces: ScanFaces): Partial<Record<ScanFaceSymbol, RgbColor>> {
  const references: Partial<Record<ScanFaceSymbol, RgbColor>> = {}

  for (const face of Object.values(faces)) {
    const center = face?.stickers[4]
    if (face !== undefined && center?.rgb !== undefined) {
      references[face.symbol] = center.rgb
    }
  }

  return references
}
