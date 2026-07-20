import { useEffect, useRef } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { TFunction } from 'i18next'
import type { AnalyzeScanFaceResponse } from '@api/scan'
import type { ScanFaceSymbol } from '@api/solver/types'
import type { CapturedScanImage } from '../../../scanCapture'
import {
  canApplyLiveAutofill,
  scanAutoCaptureMetadata,
  scanCaptureMetadata,
} from '../../../scanCaptureWorkflowHelpers'
import {
  lowConfidenceCount,
  mergeLiveDetectedScanStickers,
  scanStickersFromTemporalConsensus,
  type ScanFaceDraft,
  type ScanFaceDrafts,
} from '../../../scanState'
import {
  isTemporalConsensusReady,
  type TemporalFaceConsensus,
} from '../../../scanTemporalConsensus'

type UseScanLiveAutofillOptions = {
  acknowledgeAutoFill: () => void
  capturing: boolean
  currentDraft: ScanFaceDraft
  currentFaceSymbol: ScanFaceSymbol
  liveAnalysis: AnalyzeScanFaceResponse | undefined
  liveCapture: CapturedScanImage | undefined
  liveTemporalConsensus: TemporalFaceConsensus
  onFaceCleared?: (face: ScanFaceSymbol) => void
  photoDataUrl: string | undefined
  setDrafts: Dispatch<SetStateAction<ScanFaceDrafts>>
  setMessage: Dispatch<SetStateAction<string | undefined>>
  shouldAutoFill: boolean
  stickersPerFace: number
  t: TFunction
}

export function useScanLiveAutofill({
  acknowledgeAutoFill,
  capturing,
  currentDraft,
  currentFaceSymbol,
  liveAnalysis,
  liveCapture,
  liveTemporalConsensus,
  onFaceCleared,
  photoDataUrl,
  setDrafts,
  setMessage,
  shouldAutoFill,
  stickersPerFace,
  t,
}: UseScanLiveAutofillOptions) {
  const acknowledgedCaptureRef = useRef<string | undefined>(undefined)
  const pendingAutoFillRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (
      !shouldAutoFill ||
      capturing ||
      photoDataUrl !== undefined ||
      liveAnalysis === undefined ||
      liveCapture === undefined ||
      !isTemporalConsensusReady(liveTemporalConsensus) ||
      !canApplyLiveAutofill(currentDraft)
    ) {
      return
    }

    const nextStickers = scanStickersFromTemporalConsensus(
      liveTemporalConsensus,
      currentFaceSymbol,
      liveAnalysis,
      stickersPerFace,
    )
    pendingAutoFillRef.current = liveCapture.photoDataUrl
    setDrafts((currentDrafts) => {
      const draft = currentDrafts[currentFaceSymbol]
      if (!canApplyLiveAutofill(draft)) {
        return currentDrafts
      }

      const mergedStickers = mergeLiveDetectedScanStickers(draft.stickers, nextStickers)

      return {
        ...currentDrafts,
        [currentFaceSymbol]: {
          ...draft,
          analysis: liveAnalysis,
          autoCapture: scanAutoCaptureMetadata(liveTemporalConsensus, liveAnalysis),
          capture: scanCaptureMetadata(liveCapture),
          captureMode: 'auto',
          centerOverrideConfirmed: false,
          confirmed: false,
          lastRejectedCapture: undefined,
          photoDataUrl: liveCapture.photoDataUrl,
          stickers: mergedStickers,
          temporalConsensus: liveTemporalConsensus,
        },
      }
    })
  }, [
    currentDraft,
    currentFaceSymbol,
    capturing,
    liveAnalysis,
    liveCapture,
    liveTemporalConsensus,
    photoDataUrl,
    setDrafts,
    shouldAutoFill,
    stickersPerFace,
    t,
  ])

  useEffect(() => {
    const pendingAutoFillPhotoDataUrl = pendingAutoFillRef.current

    if (
      currentDraft.captureMode !== 'auto' ||
      pendingAutoFillPhotoDataUrl === undefined ||
      currentDraft.photoDataUrl !== pendingAutoFillPhotoDataUrl ||
      acknowledgedCaptureRef.current === pendingAutoFillPhotoDataUrl
    ) {
      return
    }

    acknowledgedCaptureRef.current = pendingAutoFillPhotoDataUrl
    pendingAutoFillRef.current = undefined
    acknowledgeAutoFill()
    onFaceCleared?.(currentFaceSymbol)
    setMessage(
      lowConfidenceCount(currentDraft.stickers) > 0
        ? t('scan.messages.detectedUncertain', {
            count: lowConfidenceCount(currentDraft.stickers),
          })
        : t('scan.messages.liveReviewReady', { count: stickersPerFace }),
    )
  }, [
    acknowledgeAutoFill,
    currentDraft,
    currentFaceSymbol,
    onFaceCleared,
    setMessage,
    stickersPerFace,
    t,
  ])
}
