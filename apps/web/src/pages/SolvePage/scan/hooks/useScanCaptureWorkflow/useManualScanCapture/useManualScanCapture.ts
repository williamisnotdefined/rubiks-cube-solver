import type { Dispatch, RefObject, SetStateAction } from 'react'
import type { TFunction } from 'i18next'
import { useAnalyzeScanFace, type AnalyzeScanFaceResponse } from '@api/scan'
import type { ScanFaceSymbol } from '@api/solver/types'
import type { useCameraStream } from '../../useCameraStream'
import { captureScanImage } from '../../../scanCapture'
import {
  rejectedCaptureReason,
  scanCaptureMetadata,
  scanQualityMessage,
} from '../../../scanCaptureWorkflowHelpers'
import {
  createEmptyScanStickers,
  isScanFaceComplete,
  lowConfidenceCount,
  scanStickersFromAnalysis,
  type ScanFaceDraft,
} from '../../../scanState'
import type { TemporalFaceConsensus } from '../../../scanTemporalConsensus'

type UseManualScanCaptureOptions = {
  camera: ReturnType<typeof useCameraStream>
  currentFaceSymbol: ScanFaceSymbol
  getAnalysisMessage?: (analysis: AnalyzeScanFaceResponse) => string | undefined
  gridSize: 2 | 3
  liveTemporalConsensus: TemporalFaceConsensus
  onFaceCleared?: (face: ScanFaceSymbol) => void
  resetLiveAutoFill: () => void
  setCapturing: Dispatch<SetStateAction<boolean>>
  setCurrentDraft: (patch: Partial<ScanFaceDraft>) => void
  setMessage: (message: string | undefined) => void
  stickersPerFace: number
  t: TFunction
  videoElementRef: RefObject<HTMLVideoElement | null>
}

export function useManualScanCapture({
  camera,
  currentFaceSymbol,
  getAnalysisMessage,
  gridSize,
  liveTemporalConsensus,
  onFaceCleared,
  resetLiveAutoFill,
  setCapturing,
  setCurrentDraft,
  setMessage,
  stickersPerFace,
  t,
  videoElementRef,
}: UseManualScanCaptureOptions) {
  const analyzeScanFace = useAnalyzeScanFace()

  async function handleTakePhoto() {
    if (videoElementRef.current === null || camera.status !== 'ready') {
      setMessage(t('scan.messages.cameraNotReady'))
      return
    }

    const temporalConsensusSnapshot = liveTemporalConsensus.framesSeen > 0 ? liveTemporalConsensus : undefined
    resetLiveAutoFill()
    setCapturing(true)
    onFaceCleared?.(currentFaceSymbol)
    setCurrentDraft({
      analysis: undefined,
      autoCapture: undefined,
      captureMode: undefined,
      centerOverrideConfirmed: false,
      lastRejectedCapture: undefined,
      temporalConsensus: undefined,
    })
    setMessage(t('scan.messages.capturingPhoto'))

    try {
      const capture = await captureScanImage(videoElementRef.current, camera.stream)
      if (capture === undefined) {
        setMessage(t('scan.messages.cameraFrameFailed'))
        return
      }

      const captureMetadata = scanCaptureMetadata(capture)

      setMessage(t('scan.messages.analyzingFace'))

      const analysis = await analyzeScanFace.mutateAsync({
        expectedCenter: currentFaceSymbol,
        gridSize,
        image: capture.photoDataUrl,
      })
      const nextStickers = scanStickersFromAnalysis(analysis, currentFaceSymbol, stickersPerFace)

      if (!isScanFaceComplete(nextStickers, stickersPerFace)) {
        setCurrentDraft({
          analysis,
          autoCapture: undefined,
          capture: undefined,
          captureMode: 'manual',
          centerOverrideConfirmed: false,
          confirmed: false,
          lastRejectedCapture: {
            analysis,
            capture: captureMetadata,
            photoDataUrl: capture.photoDataUrl,
            reason: rejectedCaptureReason(analysis),
          },
          photoDataUrl: undefined,
          stickers: createEmptyScanStickers(currentFaceSymbol, stickersPerFace),
          temporalConsensus: temporalConsensusSnapshot,
        })
        setMessage(getAnalysisMessage?.(analysis) ?? t('scan.messages.manualDetectionFailed'))
        return
      }

      setCurrentDraft({
        analysis,
        autoCapture: undefined,
        capture: captureMetadata,
        captureMode: 'manual',
        centerOverrideConfirmed: false,
        confirmed: false,
        lastRejectedCapture: undefined,
        photoDataUrl: capture.photoDataUrl,
        stickers: nextStickers,
        temporalConsensus: temporalConsensusSnapshot,
      })
      const uncertain = lowConfidenceCount(nextStickers)
      const analysisMessage = getAnalysisMessage?.(analysis) ?? scanQualityMessage(t, analysis)
      const detectionMessage =
        uncertain > 0
          ? t('scan.messages.detectedUncertain', { count: uncertain })
          : t('scan.messages.captured')

      setMessage([analysisMessage, detectionMessage].filter(Boolean).join(' '))
    } catch (error) {
      setCurrentDraft({
        analysis: undefined,
        autoCapture: undefined,
        capture: undefined,
        captureMode: undefined,
        confirmed: false,
        photoDataUrl: undefined,
        stickers: createEmptyScanStickers(currentFaceSymbol, stickersPerFace),
        temporalConsensus: undefined,
      })
      setMessage(error instanceof Error ? error.message : t('scan.messages.analysisFailed'))
    } finally {
      setCapturing(false)
    }
  }

  return { analyzeScanFace, handleTakePhoto }
}
