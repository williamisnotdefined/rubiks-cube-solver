import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useAnalyzeScanFace,
  useSolveScanSession,
  type AnalyzeScanFaceResponse,
  type RgbColor,
  type ScanSessionResult,
} from '@api/scan'
import type { ScanFaceSymbol, ScanFacesPayload, SolveResult } from '@api/solver/types'
import { Button } from '@components/Button'
import { Loader3x3 } from '@components/Loader3x3'
import { captureScanImage, type CapturedScanImage } from './scanCapture'
import { ScanCameraFrame } from './ScanCameraFrame'
import { ScanFaceCarousel } from './ScanFaceCarousel'
import { ScanFaceColorEditor } from './ScanFaceColorEditor'
import { ScanSolveSettingsModal } from './ScanSolveSettingsModal'
import {
  clearScanFaceDraft,
  confirmScanFaceDraft,
  confirmedDraftCount,
  countScanSymbols,
  createEmptyScanStickers,
  createInitialScanFaceDrafts,
  isScanFaceComplete,
  lowConfidenceCount,
  replaceScanFaceDraftSticker,
  scanFaceOrder,
  scanFaceStatusFromDraft,
  scanFacesFromDrafts,
  scanStickersFromAnalysis,
  scanSessionFacesFromDrafts,
  scanFacesToPayload,
  scanSymbolDetails,
  scanSymbols,
  validateScanFaceDraft,
  type ScanFaceDraft,
  type ScanFaceDrafts,
  type ScanAutoCaptureMetadata,
  type ScanCaptureMetadata,
  type ScanFaces,
  type ScanSticker,
} from './scanState'
import {
  scanColorLabel,
  scanFaceDraftValidationMessage,
  scanFaceInstruction,
  scanFaceLabel,
  scanFaceTopLabel,
} from './scanTranslations'
import { scanColorCode } from './scanColorSymbols'
import { solveErrorDetail, solveErrorMessage } from './solveMessages'
import { useCameraStream } from './hooks/useCameraStream'
import { useLiveScanPreview } from './hooks/useLiveScanPreview'
import {
  buildScanSessionExport,
  downloadScanSessionExport,
  hasExportableScanSession,
  scanExportEnabled,
} from './scanExport'
import type { TemporalFaceConsensus } from './scanTemporalConsensus'

type ScanCubeModalProps = {
  apiReady: boolean
  maxDepth?: number
  maxNodes?: number
  solveDisabledReason?: string
  solving: boolean
  strategyId?: string
  visionCnnAvailable?: boolean
  visionCnnReason?: string
  visionFaceDetectorAvailable?: boolean
  visionFaceDetectorReason?: string
  visionTileDetectorAvailable?: boolean
  visionTileDetectorReason?: string
  visionOk?: boolean
  onClose: () => void
  onSolve: (faces: ScanFacesPayload) => Promise<SolveResult | undefined>
  onSessionAccepted?: (solve: SolveResult) => void
}

type SolveFailure = Exclude<SolveResult, { ok: true }>
type SolveLimitsFailure = SolveFailure & {
  status: 'not_found_within_limits' | 'invalid_limits'
}

type BackendReviewTargets = {
  manualTargets: Partial<Record<ScanFaceSymbol, number[]>>
  rescanFaces: ScanFaceSymbol[]
}

export function ScanCubeModal({
  apiReady,
  maxDepth = 30,
  maxNodes,
  solveDisabledReason,
  solving,
  strategyId,
  visionCnnAvailable,
  visionCnnReason,
  visionFaceDetectorAvailable,
  visionFaceDetectorReason,
  visionTileDetectorAvailable,
  visionTileDetectorReason,
  visionOk,
  onClose,
  onSolve,
  onSessionAccepted,
}: ScanCubeModalProps) {
  const { t } = useTranslation()
  const titleId = useId()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const takePhotoRef = useRef<((source?: 'auto' | 'manual') => Promise<void>) | undefined>(undefined)
  const camera = useCameraStream(true)
  const analyzeScanFace = useAnalyzeScanFace()
  const solveScanSession = useSolveScanSession()
  const [drafts, setDrafts] = useState(() => createInitialScanFaceDrafts())
  const [currentFaceIndex, setCurrentFaceIndex] = useState(0)
  const currentFace = scanFaceOrder[currentFaceIndex]
  const currentDraft = drafts[currentFace.symbol]
  const stickers = currentDraft.stickers
  const photoDataUrl = currentDraft.photoDataUrl
  const scanAnalysis = currentDraft.analysis
  const [autoScanEnabled, setAutoScanEnabled] = useState(true)
  const [capturing, setCapturing] = useState(false)
  const [backendReviewTargets, setBackendReviewTargets] = useState<BackendReviewTargets>(() =>
    emptyBackendReviewTargets(),
  )
  const [limitsFailureResult, setLimitsFailureResult] = useState<SolveLimitsFailure | undefined>()
  const [lastSessionResult, setLastSessionResult] = useState<ScanSessionResult | undefined>()
  const [message, setMessage] = useState<string | undefined>()
  const confirmedFaces = useMemo(() => scanFacesFromDrafts(drafts), [drafts])
  const completePayload = scanFacesToPayload(confirmedFaces)
  const sessionFaces = scanSessionFacesFromDrafts(drafts)
  const scanSessionReadiness = scanSessionReadinessMessage(
    t,
    drafts,
    apiReady,
    solveDisabledReason,
  )
  const draftValidation = validateScanFaceDraft(confirmedFaces, currentFace.symbol, stickers)
  const draftValidationMessage = scanFaceDraftValidationMessage(t, draftValidation)
  const centerValidation = scanAnalysis?.centerMismatch
    ? centerMismatchMessage(t, scanAnalysis)
    : undefined
  const faceValidation = draftValidationMessage
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
          validateScanFaceDraft(confirmedFaces, symbol, drafts[symbol].stickers),
        )

        if (status === 'invalid' || status === 'pending') {
          return status
        }

        return isBackendReviewFace(backendReviewTargets, symbol) ? 'needsReview' : status
      }),
    [backendReviewTargets, confirmedFaces, drafts],
  )
  const knownCenters = useMemo(() => knownCenterReferencesFromFaces(confirmedFaces), [confirmedFaces])
  const liveScan = useLiveScanPreview({
    enabled: autoScanEnabled && photoDataUrl === undefined && camera.status === 'ready' && !capturing,
    expectedCenter: currentFace.symbol,
    knownCenters,
    videoRef,
  })
  const {
    latestAnalysis: liveAnalysis,
    message: liveMessage,
    resetAutoCapture: resetLiveAutoCapture,
    shouldAutoCapture,
    stableFrameCount: liveStableFrameCount,
    status: liveStatus,
    temporalConsensus: liveTemporalConsensus,
  } = liveScan
  const cameraAnalysis = photoDataUrl === undefined ? liveAnalysis : scanAnalysis
  const liveDetectedAnalysis =
    photoDataUrl === undefined && cameraAnalysis?.detectionMode === 'guide_fallback'
      ? undefined
      : cameraAnalysis
  const scannerMessage =
    photoDataUrl === undefined
      ? autoScanEnabled
        ? liveMessage
        : t('scan.messages.autoPaused')
      : faceValidation
  const canClearPhoto =
    photoDataUrl !== undefined ||
    scanAnalysis !== undefined ||
    stickers.some((sticker, index) => index !== 4 && sticker.symbol !== undefined)
  const sessionSolving = solveScanSession.isPending
  const reviewTargetIndexes = backendReviewTargets.manualTargets[currentFace.symbol] ?? []
  const exportEnabled = scanExportEnabled()
  const canExportScanSession = hasExportableScanSession(drafts)
  const cameraStream = camera.status === 'ready' ? camera.stream : undefined

  useEffect(() => {
    if (cameraStream === undefined || videoRef.current === null) {
      return
    }

    videoRef.current.srcObject = cameraStream
    void videoRef.current.play().catch(() => undefined)
  }, [cameraStream, currentFaceIndex, photoDataUrl])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  useEffect(() => {
    if (!shouldAutoCapture || capturing || photoDataUrl !== undefined) {
      return
    }

    resetLiveAutoCapture()
    void takePhotoRef.current?.('auto')
  }, [capturing, photoDataUrl, resetLiveAutoCapture, shouldAutoCapture])

  async function handleTakePhoto(source: 'auto' | 'manual' = 'manual') {
    if (videoRef.current === null || camera.status !== 'ready') {
      setMessage(t('scan.messages.cameraNotReady'))
      return
    }

    const temporalConsensusSnapshot = liveTemporalConsensus.framesSeen > 0 ? liveTemporalConsensus : undefined
    resetLiveAutoCapture()
    setCapturing(true)
    clearBackendReviewForFace(currentFace.symbol)
    setLastSessionResult(undefined)
    setCurrentDraft({
      analysis: undefined,
      autoCapture: undefined,
      captureMode: undefined,
      centerOverrideConfirmed: false,
      lastRejectedCapture: undefined,
      temporalConsensus: undefined,
    })
    setMessage(source === 'auto' ? t('scan.messages.autoCapturing') : t('scan.messages.capturingPhoto'))

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
        image: capture.photoDataUrl,
        knownCenters,
      })
      setCurrentDraft({ analysis })
      const captureMode = source
      const autoCapture = source === 'auto' ? scanAutoCaptureMetadata(temporalConsensusSnapshot, analysis) : undefined

      if (analysis.stickers.length === 0 || isGuideFallbackAnalysis(analysis)) {
        const rejectedReason = isGuideFallbackAnalysis(analysis) ? 'guide_fallback' : 'empty_stickers'
        setCurrentDraft({
          autoCapture,
          capture: undefined,
          captureMode,
          centerOverrideConfirmed: false,
          confirmed: false,
          lastRejectedCapture: {
            analysis,
            capture: captureMetadata,
            photoDataUrl: capture.photoDataUrl,
            reason: rejectedReason,
          },
          photoDataUrl: undefined,
          stickers: createEmptyScanStickers(currentFace.symbol),
          temporalConsensus: temporalConsensusSnapshot,
        })
        setMessage(
          isGuideFallbackAnalysis(analysis)
            ? t('scan.messages.stillLooking')
            : scanAnalysisMessage(t, analysis) ?? t('scan.messages.manualDetectionFailed'),
        )
        return
      }

      const nextStickers = scanStickersFromAnalysis(analysis, currentFace.symbol)
      setCurrentDraft({
        autoCapture,
        capture: captureMetadata,
        captureMode,
        centerOverrideConfirmed: false,
        confirmed: false,
        lastRejectedCapture: undefined,
        photoDataUrl: capture.photoDataUrl,
        stickers: nextStickers,
        temporalConsensus: temporalConsensusSnapshot,
      })
      const uncertain = lowConfidenceCount(nextStickers)
      const centerMessage = analysis.centerMismatch ? centerMismatchMessage(t, analysis) : undefined
      const qualityMessage = scanQualityMessage(t, analysis)
      const captureMessage =
        source === 'auto'
          ? t('scan.messages.autoCaptured')
          : t('scan.messages.captured')
      const detectionMessage =
        uncertain > 0
          ? t('scan.messages.detectedUncertain', { count: uncertain })
          : captureMessage
      setMessage(
        [centerMessage, qualityMessage, detectionMessage].filter(Boolean).join(' '),
      )
    } catch (error) {
      setCurrentDraft({
        analysis: undefined,
        autoCapture: undefined,
        capture: undefined,
        captureMode: undefined,
        confirmed: false,
        photoDataUrl: undefined,
        stickers: createEmptyScanStickers(currentFace.symbol),
        temporalConsensus: undefined,
      })
      setMessage(error instanceof Error ? error.message : t('scan.messages.analysisFailed'))
    } finally {
      setCapturing(false)
    }
  }

  takePhotoRef.current = handleTakePhoto

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
    setMessage(undefined)
    resetLiveAutoCapture()
    analyzeScanFace.reset()
  }

  function handleStickerColorChange(index: number, symbol: ScanSticker['symbol']) {
    if (symbol === undefined) {
      return
    }

    setDrafts((currentDrafts) =>
      replaceScanFaceDraftSticker(
        currentDrafts,
        currentFace.symbol,
        index,
        index === 4 ? currentFace.symbol : symbol,
      ),
    )
    clearBackendManualTarget(currentFace.symbol, index)
    setLastSessionResult(undefined)
  }

  function handleClearPhoto() {
    setDrafts((currentDrafts) => clearScanFaceDraft(currentDrafts, currentFace.symbol))
    clearBackendReviewForFace(currentFace.symbol)
    setLastSessionResult(undefined)
    setMessage(undefined)
    resetLiveAutoCapture()
    analyzeScanFace.reset()
  }

  function handleAutoScanToggle() {
    setAutoScanEnabled((enabled) => !enabled)
    resetLiveAutoCapture()
    setMessage(undefined)
  }

  function clearBackendReviewForFace(symbol: ScanFaceSymbol) {
    setBackendReviewTargets((targets) => removeBackendReviewFace(targets, symbol))
  }

  function clearBackendManualTarget(symbol: ScanFaceSymbol, index: number) {
    setBackendReviewTargets((targets) => removeBackendManualTarget(targets, symbol, index))
  }

  function handleConfirmFace() {
    if (draftValidationMessage !== undefined) {
      setMessage(draftValidationMessage)
      return
    }

    const centerOverrideConfirmed = centerValidation !== undefined
    if (centerOverrideConfirmed && currentDraft.centerOverrideConfirmed !== true) {
      const confirmed = window.confirm(
        `${centerValidation} ${t('scan.messages.centerMismatchConfirmQuestion')}`,
      )
      if (!confirmed) {
        setMessage(centerValidation)
        return
      }
    }

    const nextDrafts = confirmScanFaceDraft(drafts, currentFace.symbol, {
      centerOverrideConfirmed:
        centerOverrideConfirmed || currentDraft.centerOverrideConfirmed === true,
    })
    const nextFaceIndex = nextUnconfirmedFaceIndex(nextDrafts, currentFaceIndex)
    setDrafts(nextDrafts)
    clearBackendReviewForFace(currentFace.symbol)
    setLastSessionResult(undefined)

    if (nextFaceIndex !== undefined) {
      handleFaceIndexChange(nextFaceIndex)
      return
    }

    setMessage(
      currentDraft.confirmed ? t('scan.messages.faceUpdated') : t('scan.messages.allFacesConfirmed'),
    )
  }

  async function handleSolveScan() {
    if (scanSessionReadiness !== undefined) {
      setMessage(scanSessionReadiness)
      return
    }

    const faces = sessionFaces
    if (faces === undefined) {
      setMessage(t('scan.messages.confirmAllFaces'))
      return
    }

    if (!apiReady) {
      setMessage(t('scan.messages.apiNotReady'))
      return
    }

    if (solveDisabledReason !== undefined) {
      setMessage(solveDisabledReason)
      return
    }

    try {
      setLimitsFailureResult(undefined)
      setMessage(t('scan.messages.submittingSession'))
      const result = await solveScanSession.mutateAsync({
        faces,
        maxDepth,
        maxNodes,
        strategyId,
      })

      setLastSessionResult(result)
      handleScanSessionResult(result)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('scan.messages.solveFailed'))
    }
  }

  async function handleFallbackSolveScan() {
    const payload = scanFacesToPayload(confirmedFaces)
    if (payload === undefined) {
      setMessage(t('scan.messages.confirmAllFaces'))
      return
    }

    if (!apiReady) {
      setMessage(t('scan.messages.apiNotReady'))
      return
    }

    if (solveDisabledReason !== undefined) {
      setMessage(solveDisabledReason)
      return
    }

    await solveScanPayload(payload)
  }

  async function handleRetrySolveScan() {
    const payload = scanFacesToPayload(confirmedFaces)
    if (payload === undefined) {
      setLimitsFailureResult(undefined)
      setMessage(t('scan.messages.confirmAllFaces'))
      return
    }

    if (!apiReady) {
      setMessage(t('scan.messages.apiNotReady'))
      return
    }

    if (solveDisabledReason !== undefined) {
      setMessage(solveDisabledReason)
      return
    }

    await solveScanPayload(payload)
  }

  async function solveScanPayload(payload: ScanFacesPayload) {
    try {
      setLimitsFailureResult(undefined)
      const result = await onSolve(payload)
      if (result?.ok) {
        onClose()
        return
      }

      if (isSolveLimitsFailure(result)) {
        setLimitsFailureResult(result)
        setMessage(solveErrorMessage(result, t))
        return
      }

      setMessage(
        result === undefined
          ? t('scan.messages.genericRejected')
          : solveErrorDetail(result, t) ?? solveErrorMessage(result, t),
      )
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('scan.messages.solveFailed'))
    }
  }

  function handleScanSessionResult(result: ScanSessionResult) {
    if (result.ok && result.solve?.ok) {
      onSessionAccepted?.(result.solve)
      onClose()
      return
    }

    const nextTargets = backendReviewTargetsFromSessionResult(result)
    setBackendReviewTargets(nextTargets)
    const targetFace = firstBackendReviewFace(nextTargets)
    if (targetFace !== undefined) {
      const targetIndex = scanFaceOrder.findIndex(({ symbol }) => symbol === targetFace)
      if (targetIndex !== -1) {
        setCurrentFaceIndex(targetIndex)
      }
    }

    setMessage(scanSessionMessage(t, result))
  }

  function handleExportScanSession() {
    if (!canExportScanSession) {
      setMessage(t('scan.messages.exportRequiresPhoto'))
      return
    }

    const filename = downloadScanSessionExport(
      buildScanSessionExport({ drafts, sessionResult: lastSessionResult }),
    )
    setMessage(t('scan.messages.exportedSession', { filename }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-3 py-6 sm:px-6">
      <button
        aria-label={t('scan.modal.dismiss')}
        className="absolute inset-0 bg-[#070707]/90"
        type="button"
        onClick={onClose}
      />
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className="relative max-h-[calc(100vh-3rem)] w-full max-w-4xl overflow-auto border border-[#2b2b2b] bg-[#101010] p-4 text-left text-[#f7f7f7] shadow-2xl sm:p-6"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="grid gap-1">
            <h2 className="text-lg font-extrabold uppercase tracking-[0.16em]" id={titleId}>
              {t('scan.modal.title')}
            </h2>
            <p className="text-sm font-semibold text-[#a8a8a8]">
              {t('scan.modal.description')}
            </p>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#a8a8a8]">
              {scanCnnStatusMessage(t, visionOk, visionCnnAvailable, visionCnnReason)}
            </p>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#a8a8a8]">
              {scanTileDetectorStatusMessage(
                t,
                visionOk,
                visionTileDetectorAvailable,
                visionTileDetectorReason,
              )}
            </p>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#a8a8a8]">
              {scanFaceDetectorStatusMessage(
                t,
                visionOk,
                visionFaceDetectorAvailable,
                visionFaceDetectorReason,
              )}
            </p>
          </div>
          <Button className="min-h-10 px-4 py-2" type="button" variant="secondary" onClick={onClose}>
            {t('common.close')}
          </Button>
        </div>

        <ScanFaceCarousel
          currentFaceIndex={currentFaceIndex}
          faceStatuses={faceStatuses}
          onFaceIndexChange={handleFaceIndexChange}
        >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
          <div className="grid gap-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#a8a8a8]">
                  {t('scan.modal.faceProgress', {
                    current: currentFaceIndex + 1,
                    total: scanFaceOrder.length,
                  })}
                </p>
                <h3 className="mt-1 text-xl font-extrabold">{scanFaceLabel(t, currentFace.symbol)}</h3>
                <p className="mt-1 text-sm font-semibold leading-relaxed text-[#a8a8a8]">
                  {scanFaceInstruction(t, currentFace.symbol)}
                </p>
                <p className="mt-1 text-xs font-extrabold uppercase tracking-[0.16em] text-[#f7f7f7]">
                  {t('scan.modal.expectedCenter', {
                    color: scanColorLabel(t, currentFace.symbol),
                  })}
                </p>
                <p className="mt-1 text-xs font-extrabold uppercase tracking-[0.16em] text-[#f7f7f7]">
                  {t('scan.modal.keepAtTop', {
                    color: scanFaceTopLabel(t, currentFace.symbol),
                  })}
                </p>
              </div>
              <span className="border border-[#2b2b2b] bg-[#171717] px-3 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-[#a8a8a8]">
                {t('scan.modal.confirmed', { count: confirmedDraftCount(drafts) })}
              </span>
            </div>

            <ScanCameraFrame
              cameraMessage={camera.status === 'error' ? camera.message : undefined}
              cameraStatus={camera.status}
              centerMismatch={liveDetectedAnalysis?.centerMismatch}
              detectionMode={cameraAnalysis?.detectionMode}
              faceQuad={liveDetectedAnalysis?.faceQuad}
              faceConfidence={cameraAnalysis?.faceConfidence}
              gridConfidence={cameraAnalysis?.gridConfidence}
              gridDetections={cameraAnalysis?.gridDetections}
              gridStatus={cameraAnalysis?.gridStatus}
              photoDataUrl={photoDataUrl}
              stableFrameCount={liveStableFrameCount}
              stickerPolygons={liveDetectedAnalysis?.stickers}
              temporalConsensus={photoDataUrl === undefined ? liveTemporalConsensus : currentDraft.temporalConsensus}
              tileDetections={cameraAnalysis?.tileDetections}
              trackingStatus={liveStatus}
              videoRef={videoRef}
            />

            <div className="flex flex-wrap gap-2">
              <Button
                className="min-h-10 px-4 py-2"
                type="button"
                variant="ghost"
                aria-pressed={autoScanEnabled}
                disabled={photoDataUrl !== undefined || capturing || camera.status !== 'ready'}
                onClick={handleAutoScanToggle}
              >
                {autoScanEnabled ? t('scan.actions.autoScanOn') : t('scan.actions.autoScanOff')}
              </Button>
              <Button
                className="min-h-10 px-4 py-2"
                type="button"
                variant="secondary"
                disabled={camera.status !== 'ready' || capturing}
                onClick={() => void handleTakePhoto('manual')}
              >
                {capturing
                  ? t('scan.actions.analyzing')
                  : photoDataUrl === undefined
                    ? t('scan.actions.takePhoto')
                    : t('scan.actions.retakePhoto')}
              </Button>
              <Button
                className="min-h-10 px-4 py-2"
                type="button"
                variant="ghost"
                disabled={!canClearPhoto || capturing}
                onClick={handleClearPhoto}
              >
                {t('scan.actions.clearPhoto')}
              </Button>
              <Button
                className="min-h-10 px-4 py-2"
                type="button"
                variant="secondary"
                disabled={faceValidation !== undefined}
                onClick={handleConfirmFace}
              >
                {currentDraft.confirmed ? t('scan.actions.updateFace') : t('scan.actions.confirmFace')}
              </Button>
            </div>
          </div>

          <div className="grid content-start gap-4">
            <ScanFaceColorEditor
              centerSymbol={currentFace.symbol}
              key={currentFace.symbol}
              reviewTargetIndexes={reviewTargetIndexes}
              stickers={stickers}
              onStickerColorChange={handleStickerColorChange}
            />
            <div className="grid gap-2 border border-[#2b2b2b] bg-[#171717] p-3 text-sm font-semibold text-[#a8a8a8]">
              <span className="text-xs font-extrabold uppercase tracking-[0.16em]">{t('scan.editor.colorCount')}</span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {scanSymbols.map((symbol) => {
                  const details = scanSymbolDetails[symbol]

                  return (
                    <span className="flex items-center gap-2" key={symbol}>
                      <span
                        className="size-3 border border-[#2b2b2b]"
                        style={{ backgroundColor: details.background }}
                      />
                      {scanColorLabel(t, symbol)}: {previewCounts[symbol]}/9
                    </span>
                  )
                })}
              </div>
            </div>
            <p className="min-h-10 text-sm font-semibold leading-relaxed text-[#a8a8a8]" aria-live="polite">
              {message ??
                solveDisabledReason ??
                scannerMessage ??
                scanSessionReadiness ??
                t('scan.editor.selectSquareHint')}
            </p>
            <Button
              aria-label={solving || sessionSolving ? t('common.loading') : undefined}
              type="button"
              disabled={solving || sessionSolving}
              onClick={handleSolveScan}
            >
              {solving || sessionSolving ? <Loader3x3 decorative className="size-8" registerDelayMs={150} /> : t('scan.actions.solveScannedCube')}
            </Button>
            <Button
              className="min-h-10 px-4 py-2"
              type="button"
              variant="ghost"
              disabled={
                completePayload === undefined || !apiReady || solving || sessionSolving || solveDisabledReason !== undefined
              }
              onClick={handleFallbackSolveScan}
            >
              {t('scan.actions.solveReviewedColors')}
            </Button>
            {exportEnabled ? (
              <Button
                className="min-h-10 px-4 py-2"
                type="button"
                variant="ghost"
                disabled={!canExportScanSession}
                onClick={handleExportScanSession}
              >
                {t('scan.actions.exportSession')}
              </Button>
            ) : null}
          </div>
        </div>
        </ScanFaceCarousel>
      </section>
      {limitsFailureResult === undefined ? null : (
        <ScanSolveSettingsModal
          result={limitsFailureResult}
          solving={solving}
          onClose={() => setLimitsFailureResult(undefined)}
          onRetry={handleRetrySolveScan}
        />
      )}
    </div>
  )
}

function isSolveLimitsFailure(result: SolveResult | undefined): result is SolveLimitsFailure {
  return (
    result?.ok === false &&
    (result.status === 'not_found_within_limits' || result.status === 'invalid_limits')
  )
}

function emptyBackendReviewTargets(): BackendReviewTargets {
  return { manualTargets: {}, rescanFaces: [] }
}

function isBackendReviewFace(targets: BackendReviewTargets, symbol: ScanFaceSymbol): boolean {
  return targets.rescanFaces.includes(symbol) || (targets.manualTargets[symbol]?.length ?? 0) > 0
}

function removeBackendReviewFace(
  targets: BackendReviewTargets,
  symbol: ScanFaceSymbol,
): BackendReviewTargets {
  const manualTargets = { ...targets.manualTargets }
  delete manualTargets[symbol]

  return {
    manualTargets,
    rescanFaces: targets.rescanFaces.filter((face) => face !== symbol),
  }
}

function removeBackendManualTarget(
  targets: BackendReviewTargets,
  symbol: ScanFaceSymbol,
  index: number,
): BackendReviewTargets {
  const currentTargets = targets.manualTargets[symbol]
  if (currentTargets === undefined) {
    return targets
  }

  const nextTargets = currentTargets.filter((targetIndex) => targetIndex !== index)
  if (nextTargets.length === currentTargets.length) {
    return targets
  }

  const manualTargets = { ...targets.manualTargets }
  if (nextTargets.length === 0) {
    delete manualTargets[symbol]
  } else {
    manualTargets[symbol] = nextTargets
  }

  return { ...targets, manualTargets }
}

function backendReviewTargetsFromSessionResult(result: ScanSessionResult): BackendReviewTargets {
  const manualTargets: BackendReviewTargets['manualTargets'] = {}

  for (const target of result.manualTargets) {
    manualTargets[target.face] = target.stickers
  }

  return {
    manualTargets,
    rescanFaces: result.rescanFaces,
  }
}

function firstBackendReviewFace(targets: BackendReviewTargets): ScanFaceSymbol | undefined {
  return targets.rescanFaces[0] ?? scanFaceOrder.find(({ symbol }) => isBackendReviewFace(targets, symbol))?.symbol
}

function scanSessionMessage(
  t: ReturnType<typeof useTranslation>['t'],
  result: ScanSessionResult,
): string {
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
      return t('scan.messages.sessionInvalidCubeState')
    case 'vision_unavailable':
    case 'vision_error':
      return t('scan.messages.sessionVisionUnavailable')
    default:
      return t('scan.messages.sessionRejected')
  }
}

function scanSessionReadinessMessage(
  t: ReturnType<typeof useTranslation>['t'],
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
  const incompleteStickerFaces: ScanFaceSymbol[] = []

  for (const { symbol } of scanFaceOrder) {
    const draft = drafts[symbol]

    if (!draft.confirmed) {
      unconfirmedFaces.push(symbol)
      continue
    }

    if (draft.photoDataUrl === undefined) {
      missingPhotoFaces.push(symbol)
      continue
    }

    if (!isScanFaceComplete(draft.stickers)) {
      incompleteStickerFaces.push(symbol)
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

  if (incompleteStickerFaces.length > 0) {
    return t('scan.messages.sessionIncompleteStickers', {
      faces: scanColorCodes(incompleteStickerFaces),
    })
  }

  return undefined
}

function scanSessionQualityMessage(
  t: ReturnType<typeof useTranslation>['t'],
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

function qualityReasonFaces(reasons: readonly string[], reasonKind: string): ScanFaceSymbol[] {
  return scanFaceOrder
    .map(({ symbol }) => symbol)
    .filter((symbol) => reasons.includes(`${reasonKind}:${symbol}`))
}

function scanColorCodes(symbols: readonly ScanFaceSymbol[]): string {
  return symbols.map((symbol) => scanColorCode(symbol)).join(', ')
}

function scanCnnStatusMessage(
  t: ReturnType<typeof useTranslation>['t'],
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

function scanFaceDetectorStatusMessage(
  t: ReturnType<typeof useTranslation>['t'],
  visionOk: boolean | undefined,
  visionFaceDetectorAvailable: boolean | undefined,
  visionFaceDetectorReason: string | undefined,
): string {
  if (visionOk === false) {
    return t('scan.modal.visionStatusUnavailable')
  }

  if (visionFaceDetectorAvailable === true) {
    return t('scan.modal.faceDetectorActive')
  }

  return t('scan.modal.faceDetectorFallbackActive', {
    reason: visionFaceDetectorReason ?? t('scan.modal.faceDetectorReasonUnknown'),
  })
}

function scanTileDetectorStatusMessage(
  t: ReturnType<typeof useTranslation>['t'],
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

function nextUnconfirmedFaceIndex(
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

function scanCaptureMetadata(capture: CapturedScanImage): ScanCaptureMetadata {
  return {
    capturedAt: capture.capturedAt,
    height: capture.height,
    source: capture.source,
    width: capture.width,
  }
}

function scanAutoCaptureMetadata(
  consensus: TemporalFaceConsensus | undefined,
  analysis: AnalyzeScanFaceResponse,
): ScanAutoCaptureMetadata {
  return {
    bboxStability: consensus?.bboxStability,
    detectionMode: analysis.detectionMode,
    faceConfidence: analysis.faceConfidence,
    gridConfidence: analysis.gridConfidence,
    gridDetections: analysis.gridDetections?.length ?? 0,
    gridStatus: analysis.gridStatus,
    stableFrameCount: consensus?.framesUsed ?? 0,
    temporalAgreement: consensus?.temporalAgreement,
    triggeredAt: new Date().toISOString(),
  }
}

function isGuideFallbackAnalysis(analysis: AnalyzeScanFaceResponse): boolean {
  return analysis.detectionMode === 'guide_fallback' || analysis.detectionMode === 'rejected'
}

function centerMismatchMessage(
  t: ReturnType<typeof useTranslation>['t'],
  analysis: AnalyzeScanFaceResponse,
): string {
  const detectedSymbol = analysis.detectedCenter
  const expectedSymbol = analysis.expectedCenter
  const confidence =
    analysis.detectedCenterConfidence > 0
      ? t('scan.messages.confidenceSuffix', {
          confidence: Math.round(analysis.detectedCenterConfidence * 100),
        })
      : ''

  if (detectedSymbol === undefined || expectedSymbol === undefined) {
    return t('scan.messages.centerMismatchFallback')
  }

  return t('scan.messages.centerMismatchWithColors', {
    confidence,
    detectedColor: `${scanColorCode(detectedSymbol)} / ${scanColorLabel(t, detectedSymbol)}`,
    expectedColor: `${scanColorCode(expectedSymbol)} / ${scanColorLabel(t, expectedSymbol)}`,
  })
}

function scanQualityMessage(
  t: ReturnType<typeof useTranslation>['t'],
  analysis: AnalyzeScanFaceResponse,
): string | undefined {
  const warnings = new Set([...(analysis.qualityWarnings ?? []), ...(analysis.warnings ?? [])])
  const messages: string[] = []

  if (analysis.detectionMode === 'guide_fallback') {
    messages.push(t('scan.messages.faceOutlineWeak'))
  }

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

function scanAnalysisMessage(
  t: ReturnType<typeof useTranslation>['t'],
  analysis: AnalyzeScanFaceResponse,
): string | undefined {
  if (analysis.centerMismatch) {
    return centerMismatchMessage(t, analysis)
  }

  const qualityMessage = scanQualityMessage(t, analysis)
  if (qualityMessage !== undefined) {
    return qualityMessage
  }

  if (analysis.status === 'face_not_found') {
    return t('scan.messages.manualDetectionFailed')
  }

  if (analysis.status === 'invalid_image') {
    return t('scan.messages.analysisFailed')
  }

  return undefined
}

function knownCenterReferencesFromFaces(faces: ScanFaces): Partial<Record<ScanFaceSymbol, RgbColor>> {
  const references: Partial<Record<ScanFaceSymbol, RgbColor>> = {}

  for (const face of Object.values(faces)) {
    const center = face?.stickers[4]
    if (face !== undefined && center?.rgb !== undefined) {
      references[face.symbol] = center.rgb
    }
  }

  return references
}
