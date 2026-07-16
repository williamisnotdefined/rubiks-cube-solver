import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AnalyzeScanFaceResponse } from '@api/scan'
import type { ScanFaceSymbol } from '@api/solver/types'
import {
  currentDraftHasReviewContent,
  nextUnconfirmedFaceIndex,
} from '../../scanCaptureWorkflowHelpers'
import {
  clearScanFaceDraft,
  confirmScanFaceDraft,
  countScanSymbols,
  createInitialScanFaceDrafts,
  replaceScanFaceDraftSticker,
  scanFaceOrder,
  scanFaceStatusFromDraft,
  scanFacesFromDrafts,
  validateScanFaceDraft,
  type ScanFaceDraft,
  type ScanFaces,
} from '../../scanState'
import { useCameraStream } from '../useCameraStream'
import { useLiveScanPreview } from '../useLiveScanPreview'
import { useManualScanCapture } from './useManualScanCapture'
import { useScanLiveAutofill } from './useScanLiveAutofill'
import { useScanVideoBinding } from './useScanVideoBinding'

type UseScanCaptureWorkflowOptions = {
  centerIndex?: number
  gridSize: 2 | 3
  stickersPerFace: number
  getAnalysisMessage?: (analysis: AnalyzeScanFaceResponse) => string | undefined
  cameraActive?: boolean
  isReviewFace?: (symbol: ScanFaceSymbol) => boolean
  onDraftCleared?: () => void
  onDraftEdited?: (face: ScanFaceSymbol, stickerIndex: number) => void
  onFaceChanged?: () => void
  onFaceCleared?: (face: ScanFaceSymbol) => void
}

export function useScanCaptureWorkflow({
  centerIndex,
  cameraActive = true,
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
  const camera = useCameraStream(cameraActive)
  const revisionRef = useRef(0)
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
  const cameraStream = camera.status === 'ready' ? camera.stream : undefined
  const { setVideoRef, videoElementRef } = useScanVideoBinding(cameraStream, currentFaceIndex)
  const confirmedFaces = useMemo(() => scanFacesFromDrafts(drafts), [drafts])
  const draftValidation = validateScanFaceDraft(
    confirmedFaces,
    currentFace.symbol,
    stickers,
    stickersPerFace,
  )
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
    photoDataUrl !== undefined ||
    stickers.some((sticker, index) => index !== centerIndex && sticker.symbol !== undefined)
  const hasReviewContent = currentDraftHasReviewContent(currentDraft, centerIndex)
  const liveScan = useLiveScanPreview({
    enabled: autoScanEnabled && camera.status === 'ready' && !capturing && !hasReviewCaptureContent,
    expectedCenter: currentFace.symbol,
    gridSize,
    videoRef: videoElementRef,
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
  const cameraTemporalConsensus =
    liveTemporalConsensus.framesSeen > 0 ? liveTemporalConsensus : undefined
  const scannerMessage = hasReviewContent
    ? t('scan.messages.liveReviewReady', { count: stickersPerFace })
    : autoScanEnabled
      ? liveMessage
      : t('scan.messages.autoPaused')
  const canClearPhoto =
    photoDataUrl !== undefined ||
    scanAnalysis !== undefined ||
    stickers.some((sticker, index) => index !== centerIndex && sticker.symbol !== undefined)
  useScanLiveAutofill({
    acknowledgeAutoFill,
    capturing,
    currentDraft,
    currentFaceSymbol: currentFace.symbol,
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
  })

  const { abortCapture, analyzeScanFace, handleTakePhoto } = useManualScanCapture({
    camera,
    currentFaceSymbol: currentFace.symbol,
    getAnalysisMessage,
    gridSize,
    liveTemporalConsensus,
    revisionRef,
    onFaceCleared,
    resetLiveAutoFill,
    setCapturing,
    setCurrentDraft,
    setMessage,
    stickersPerFace,
    t,
    videoElementRef,
  })

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

    invalidateCapture()
    setCurrentFaceIndex(index)
    onFaceChanged?.()
    setMessage(undefined)
    resetLiveAutoFill()
  }

  function handleStickerColorChange(index: number, symbol: ScanFaceSymbol) {
    invalidateCapture()
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
    invalidateCapture()
    setDrafts((currentDrafts) =>
      clearScanFaceDraft(currentDrafts, currentFace.symbol, stickersPerFace),
    )
    onFaceCleared?.(currentFace.symbol)
    onDraftCleared?.()
    setMessage(undefined)
    resetLiveAutoFill()
  }

  function handleAutoScanToggle() {
    invalidateCapture()
    setAutoScanEnabled((enabled) => !enabled)
    resetLiveAutoFill()
    setMessage(undefined)
  }

  function confirmCurrentFace(options?: { centerOverrideConfirmed?: boolean }) {
    invalidateCapture()
    const nextDrafts = confirmScanFaceDraft(drafts, currentFace.symbol, options)
    const nextFaceIndex = nextUnconfirmedFaceIndex(nextDrafts, currentFaceIndex)
    setDrafts(nextDrafts)
    onFaceCleared?.(currentFace.symbol)

    if (nextFaceIndex !== undefined) {
      handleFaceIndexChange(nextFaceIndex)
      return
    }

    setMessage(
      currentDraft.confirmed
        ? t('scan.messages.faceUpdated')
        : t('scan.messages.allFacesConfirmed'),
    )
  }

  function invalidateCapture() {
    revisionRef.current += 1
    abortCapture()
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
    invalidateCapture,
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
