import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAnalyzeScanFace, type AnalyzeScanFaceResponse } from '@api/scan'
import type { ScanFaceSymbol } from '@api/solver/types'
import { captureScanImage } from '../scanCapture'
import {
  canApplyLiveAutofill,
  currentDraftHasReviewContent,
  nextUnconfirmedFaceIndex,
  rejectedCaptureReason,
  scanAutoCaptureMetadata,
  scanCaptureMetadata,
  scanQualityMessage,
} from '../scanCaptureWorkflowHelpers'
import {
  clearScanFaceDraft,
  confirmScanFaceDraft,
  countScanSymbols,
  createEmptyScanStickers,
  createInitialScanFaceDrafts,
  isScanFaceComplete,
  lowConfidenceCount,
  mergeLiveDetectedScanStickers,
  replaceScanFaceDraftSticker,
  scanFaceOrder,
  scanFaceStatusFromDraft,
  scanFacesFromDrafts,
  scanStickersFromAnalysis,
  scanStickersFromTemporalConsensus,
  validateScanFaceDraft,
  type ScanFaceDraft,
  type ScanFaces,
} from '../scanState'
import { isTemporalConsensusReady } from '../scanTemporalConsensus'
import { useCameraStream } from './useCameraStream'
import { useLiveScanPreview } from './useLiveScanPreview'

type UseScanCaptureWorkflowOptions = {
  centerIndex?: number
  gridSize: 2 | 3
  stickersPerFace: number
  getAnalysisMessage?: (analysis: AnalyzeScanFaceResponse) => string | undefined
  isReviewFace?: (symbol: ScanFaceSymbol) => boolean
  onDraftCleared?: () => void
  onDraftEdited?: (face: ScanFaceSymbol, stickerIndex: number) => void
  onFaceChanged?: () => void
  onFaceCleared?: (face: ScanFaceSymbol) => void
}

export function useScanCaptureWorkflow({
  centerIndex,
  gridSize,
  stickersPerFace,
  getAnalysisMessage,
  isReviewFace,
  onDraftCleared,
  onDraftEdited,
  onFaceChanged,
  onFaceCleared,
}: UseScanCaptureWorkflowOptions) {
  const { t } = useTranslation()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [videoElementRevision, setVideoElementRevision] = useState(0)
  const camera = useCameraStream(true)
  const analyzeScanFace = useAnalyzeScanFace()
  const [drafts, setDrafts] = useState(() => createInitialScanFaceDrafts(stickersPerFace))
  const [currentFaceIndex, setCurrentFaceIndex] = useState(0)
  const currentFace = scanFaceOrder[currentFaceIndex]
  const currentDraft = drafts[currentFace.symbol]
  const stickers = currentDraft.stickers
  const photoDataUrl = currentDraft.photoDataUrl
  const scanAnalysis = currentDraft.analysis
  const [autoScanEnabled, setAutoScanEnabled] = useState(true)
  const [capturing, setCapturing] = useState(false)
  const [message, setMessage] = useState<string | undefined>()
  const confirmedFaces = useMemo(() => scanFacesFromDrafts(drafts), [drafts])
  const draftValidation = validateScanFaceDraft(confirmedFaces, currentFace.symbol, stickers, stickersPerFace)
  const previewFaces: ScanFaces = {
    ...confirmedFaces,
    [currentFace.symbol]: { symbol: currentFace.symbol, stickers },
  }
  const previewCounts = countScanSymbols(previewFaces)
  const faceStatuses = useMemo(
    () =>
      scanFaceOrder.map(({ symbol }) => {
        const status = scanFaceStatusFromDraft(
          drafts[symbol],
          validateScanFaceDraft(confirmedFaces, symbol, drafts[symbol].stickers, stickersPerFace),
        )

        if (status === 'invalid' || status === 'pending') {
          return status
        }

        return isReviewFace?.(symbol) ? 'needsReview' : status
      }),
    [confirmedFaces, drafts, isReviewFace, stickersPerFace],
  )
  const hasReviewCaptureContent =
    photoDataUrl !== undefined || stickers.some((sticker, index) => index !== centerIndex && sticker.symbol !== undefined)
  const hasReviewContent = currentDraftHasReviewContent(currentDraft, centerIndex)
  const liveScan = useLiveScanPreview({
    enabled: autoScanEnabled && camera.status === 'ready' && !capturing && !hasReviewCaptureContent,
    expectedCenter: currentFace.symbol,
    gridSize,
    videoRef,
  })
  const {
    acknowledgeAutoFill,
    latestAnalysis: liveAnalysis,
    latestCapture: liveCapture,
    message: liveMessage,
    resetAutoFill: resetLiveAutoFill,
    shouldAutoFill,
    stableFrameCount: liveStableFrameCount,
    status: liveStatus,
    temporalConsensus: liveTemporalConsensus,
  } = liveScan
  const cameraAnalysis = liveAnalysis
  const cameraTemporalConsensus = liveTemporalConsensus.framesSeen > 0 ? liveTemporalConsensus : undefined
  const scannerMessage =
    hasReviewContent
      ? t('scan.messages.liveReviewReady', { count: stickersPerFace })
      : autoScanEnabled
        ? liveMessage
        : t('scan.messages.autoPaused')
  const canClearPhoto =
    photoDataUrl !== undefined ||
    scanAnalysis !== undefined ||
    stickers.some((sticker, index) => index !== centerIndex && sticker.symbol !== undefined)
  const cameraStream = camera.status === 'ready' ? camera.stream : undefined
  const setVideoRef = useCallback((video: HTMLVideoElement | null) => {
    if (videoRef.current === video) {
      return
    }

    videoRef.current = video
    setVideoElementRevision((revision) => revision + 1)
  }, [])

  useEffect(() => {
    const video = videoRef.current

    if (cameraStream === undefined || video === null) {
      return
    }

    video.srcObject = cameraStream
    void video.play().catch(() => undefined)

    return () => {
      if (video.srcObject === cameraStream) {
        try {
          video.pause()
        } catch {
          // Some test environments do not implement media playback controls.
        }
        video.srcObject = null
      }
    }
  }, [cameraStream, currentFaceIndex, videoElementRevision])

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

    acknowledgeAutoFill()
    const nextStickers = scanStickersFromTemporalConsensus(
      liveTemporalConsensus,
      currentFace.symbol,
      liveAnalysis,
      stickersPerFace,
    )
    const uncertain = lowConfidenceCount(nextStickers)

    setDrafts((currentDrafts) => {
      const draft = currentDrafts[currentFace.symbol]
      if (!canApplyLiveAutofill(draft)) {
        return currentDrafts
      }

      const mergedStickers = mergeLiveDetectedScanStickers(draft.stickers, nextStickers)

      return {
        ...currentDrafts,
        [currentFace.symbol]: {
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
    onFaceCleared?.(currentFace.symbol)
    setMessage(
      uncertain > 0
        ? t('scan.messages.detectedUncertain', { count: uncertain })
        : t('scan.messages.liveReviewReady', { count: stickersPerFace }),
    )
  }, [
    acknowledgeAutoFill,
    currentDraft,
    currentFace.symbol,
    capturing,
    liveAnalysis,
    liveCapture,
    liveTemporalConsensus,
    onFaceCleared,
    photoDataUrl,
    shouldAutoFill,
    stickersPerFace,
    t,
  ])

  async function handleTakePhoto() {
    if (videoRef.current === null || camera.status !== 'ready') {
      setMessage(t('scan.messages.cameraNotReady'))
      return
    }

    const temporalConsensusSnapshot = liveTemporalConsensus.framesSeen > 0 ? liveTemporalConsensus : undefined
    resetLiveAutoFill()
    setCapturing(true)
    onFaceCleared?.(currentFace.symbol)
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
      const capture = await captureScanImage(videoRef.current, camera.stream)
      if (capture === undefined) {
        setMessage(t('scan.messages.cameraFrameFailed'))
        return
      }

      const captureMetadata = scanCaptureMetadata(capture)

      setMessage(t('scan.messages.analyzingFace'))

      const analysis = await analyzeScanFace.mutateAsync({
        expectedCenter: currentFace.symbol,
        gridSize,
        image: capture.photoDataUrl,
      })
      const nextStickers = scanStickersFromAnalysis(analysis, currentFace.symbol, stickersPerFace)

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
          stickers: createEmptyScanStickers(currentFace.symbol, stickersPerFace),
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
        stickers: createEmptyScanStickers(currentFace.symbol, stickersPerFace),
        temporalConsensus: undefined,
      })
      setMessage(error instanceof Error ? error.message : t('scan.messages.analysisFailed'))
    } finally {
      setCapturing(false)
    }
  }

  function setCurrentDraft(patch: Partial<ScanFaceDraft>) {
    setDrafts((currentDrafts) => ({
      ...currentDrafts,
      [currentFace.symbol]: {
        ...currentDrafts[currentFace.symbol],
        ...patch,
      },
    }))
  }

  function handleFaceIndexChange(index: number) {
    if (index < 0 || index >= scanFaceOrder.length || index === currentFaceIndex) {
      return
    }

    setCurrentFaceIndex(index)
    onFaceChanged?.()
    setMessage(undefined)
    resetLiveAutoFill()
    analyzeScanFace.reset()
  }

  function handleStickerColorChange(index: number, symbol: ScanFaceSymbol) {
    setDrafts((currentDrafts) =>
      replaceScanFaceDraftSticker(
        currentDrafts,
        currentFace.symbol,
        index,
        centerIndex !== undefined && index === centerIndex ? currentFace.symbol : symbol,
      ),
    )
    onDraftEdited?.(currentFace.symbol, index)
  }

  function handleClearPhoto() {
    setDrafts((currentDrafts) => clearScanFaceDraft(currentDrafts, currentFace.symbol, stickersPerFace))
    onFaceCleared?.(currentFace.symbol)
    onDraftCleared?.()
    setMessage(undefined)
    resetLiveAutoFill()
    analyzeScanFace.reset()
  }

  function handleAutoScanToggle() {
    setAutoScanEnabled((enabled) => !enabled)
    resetLiveAutoFill()
    setMessage(undefined)
  }

  function confirmCurrentFace(options?: { centerOverrideConfirmed?: boolean }) {
    const nextDrafts = confirmScanFaceDraft(drafts, currentFace.symbol, options)
    const nextFaceIndex = nextUnconfirmedFaceIndex(nextDrafts, currentFaceIndex)
    setDrafts(nextDrafts)
    onFaceCleared?.(currentFace.symbol)

    if (nextFaceIndex !== undefined) {
      handleFaceIndexChange(nextFaceIndex)
      return
    }

    setMessage(
      currentDraft.confirmed ? t('scan.messages.faceUpdated') : t('scan.messages.allFacesConfirmed'),
    )
  }

  return {
    analyzeScanFace,
    autoScanEnabled,
    camera,
    cameraAnalysis,
    cameraTemporalConsensus,
    canClearPhoto,
    capturing,
    confirmCurrentFace,
    confirmedFaces,
    currentDraft,
    currentFace,
    currentFaceIndex,
    draftValidation,
    drafts,
    faceStatuses,
    handleAutoScanToggle,
    handleClearPhoto,
    handleFaceIndexChange,
    handleStickerColorChange,
    handleTakePhoto,
    hasReviewContent,
    liveStableFrameCount,
    liveStatus,
    message,
    photoDataUrl,
    previewCounts,
    scannerMessage,
    setCurrentFaceIndex,
    setDrafts,
    setMessage,
    stickers,
    videoRef: setVideoRef,
  }
}
