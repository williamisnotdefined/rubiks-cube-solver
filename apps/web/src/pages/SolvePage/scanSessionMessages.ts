import type { TFunction } from 'i18next'
import type { ScanSessionResult } from '@api/scan'
import type { ScanFaceSymbol } from '@api/solver/types'
import { scanColorCode } from './scanColorSymbols'
import { scanFaceOrder, type ScanFaceDrafts } from './scanState'

export function scanSessionMessage(t: TFunction, result: ScanSessionResult): string {
  const qualityMessage = scanSessionQualityMessage(t, result)
  if (qualityMessage !== undefined) {
    return qualityMessage
  }

  if (result.message !== undefined && result.message.length > 0) {
    return result.message
  }

  switch (result.status) {
    case 'needs_rescan_face':
      return t('scan.messages.sessionNeedsRescan')
    case 'needs_manual_confirmation':
      return t('scan.messages.sessionNeedsManualConfirmation')
    case 'state_ambiguous':
    case 'orientation_ambiguous':
      return t('scan.messages.sessionAmbiguous')
    case 'invalid_cube_state':
      if (result.manualTargets.length > 0) {
        return t('scan.messages.sessionInvalidCornerTargets')
      }

      return t('scan.messages.sessionInvalidCubeState')
    case 'vision_unavailable':
    case 'vision_error':
      return t('scan.messages.sessionVisionUnavailable')
    default:
      return t('scan.messages.sessionRejected')
  }
}

export function scanSessionReadinessMessage(
  t: TFunction,
  drafts: ScanFaceDrafts,
  apiReady: boolean,
  solveDisabledReason: string | undefined,
): string | undefined {
  if (!apiReady) {
    return t('scan.messages.apiNotReady')
  }

  if (solveDisabledReason !== undefined) {
    return solveDisabledReason
  }

  const unconfirmedFaces: ScanFaceSymbol[] = []
  const missingPhotoFaces: ScanFaceSymbol[] = []

  for (const { symbol } of scanFaceOrder) {
    const draft = drafts[symbol]

    if (!draft.confirmed) {
      unconfirmedFaces.push(symbol)
      continue
    }

    if (draft.photoDataUrl === undefined) {
      missingPhotoFaces.push(symbol)
    }
  }

  if (unconfirmedFaces.length > 0) {
    return t('scan.messages.sessionMissingConfirmedFaces', {
      faces: scanColorCodes(unconfirmedFaces),
    })
  }

  if (missingPhotoFaces.length > 0) {
    return t('scan.messages.sessionMissingPhotos', {
      faces: scanColorCodes(missingPhotoFaces),
    })
  }

  return undefined
}

export function scanSessionQualityMessage(
  t: TFunction,
  result: ScanSessionResult,
): string | undefined {
  if (result.status !== 'needs_rescan_face') {
    return undefined
  }

  const reasons = result.inference?.qualityReasons ?? []
  const glareFaces = qualityReasonFaces(reasons, 'image_glare')
  if (glareFaces.length > 0) {
    return t('scan.messages.sessionGlareRescan', { faces: scanColorCodes(glareFaces) })
  }

  const blurryFaces = qualityReasonFaces(reasons, 'image_blurry')
  if (blurryFaces.length > 0) {
    return t('scan.messages.sessionBlurRescan', { faces: scanColorCodes(blurryFaces) })
  }

  const shadowFaces = qualityReasonFaces(reasons, 'image_shadow')
  if (shadowFaces.length > 0) {
    return t('scan.messages.sessionShadowRescan', { faces: scanColorCodes(shadowFaces) })
  }

  return undefined
}

export function qualityReasonFaces(reasons: readonly string[], reasonKind: string): ScanFaceSymbol[] {
  return scanFaceOrder
    .map(({ symbol }) => symbol)
    .filter((symbol) => reasons.includes(`${reasonKind}:${symbol}`))
}

export function scanColorCodes(symbols: readonly ScanFaceSymbol[]): string {
  return symbols.map((symbol) => scanColorCode(symbol)).join(', ')
}

export function scanCnnStatusMessage(
  t: TFunction,
  visionOk: boolean | undefined,
  visionCnnAvailable: boolean | undefined,
  visionCnnReason: string | undefined,
): string {
  if (visionOk === false) {
    return t('scan.modal.visionStatusUnavailable')
  }

  if (visionCnnAvailable === true) {
    return t('scan.modal.cnnEvidenceActive')
  }

  return t('scan.modal.colorFallbackActive', {
    reason: visionCnnReason ?? t('scan.modal.cnnReasonUnknown'),
  })
}

export function scanTileDetectorStatusMessage(
  t: TFunction,
  visionOk: boolean | undefined,
  visionTileDetectorAvailable: boolean | undefined,
  visionTileDetectorReason: string | undefined,
): string {
  if (visionOk === false) {
    return t('scan.modal.visionStatusUnavailable')
  }

  if (visionTileDetectorAvailable === true) {
    return t('scan.modal.tileDetectorActive')
  }

  return t('scan.modal.tileDetectorFallbackActive', {
    reason: visionTileDetectorReason ?? t('scan.modal.tileDetectorReasonUnknown'),
  })
}
