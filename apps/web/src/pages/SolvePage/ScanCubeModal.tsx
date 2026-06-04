import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useAnalyzeScanFace,
  useSolveScanSession,
  type AnalyzeScanFaceResponse,
  type RgbColor,
  type ScanSessionResult,
} from '@api/scan'
import type { ScanFaceSymbol, SolveResult } from '@api/solver/types'
import { Button } from '@components/Button'
import { Loader3x3 } from '@components/Loader3x3'
import { Tooltip } from '@components/Tooltip'
import { captureScanImage, type CapturedScanImage } from './scanCapture'
import { ScanCameraFrame } from './ScanCameraFrame'
import { ScanFaceCarousel } from './ScanFaceCarousel'
import { ScanFaceColorEditor } from './ScanFaceColorEditor'
import {
  clearScanFaceDraft,
  confirmScanFaceDraft,
  confirmedDraftCount,
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
  scan2StickersPerFace,
  scan3StickersPerFace,
  scanCenterIndex,
  scanStickersFromAnalysis,
  scanStickersFromTemporalConsensus,
  scanSessionFacesFromDrafts,
  scanSymbolDetails,
  scanSymbols,
  validateScanFaceDraft,
  type ScanFaceDraft,
  type ScanFaceDrafts,
  type ScanAutoCaptureMetadata,
  type ScanCaptureMetadata,
  type ScanFaces,
} from './scanState'
import {
  scanColorLabel,
  scanFaceDraftValidationMessage,
  scanFaceInstruction,
  scanFaceLabel,
  scanFaceTopLabel,
} from './scanTranslations'
import { scanColorCode } from './scanColorSymbols'
import { useCameraStream } from './hooks/useCameraStream'
import { useLiveScanPreview } from './hooks/useLiveScanPreview'
import { isTemporalConsensusReady, type TemporalFaceConsensus } from './scanTemporalConsensus'

type ScanCubeModalProps = {
  apiReady: boolean
  maxDepth?: number
  maxNodes?: number
  solveDisabledReason?: string
  solving: boolean
  puzzleSlug?: string
  strategyId?: string
  visionCnnAvailable?: boolean
  visionCnnReason?: string
  visionTileDetectorAvailable?: boolean
  visionTileDetectorReason?: string
  visionOk?: boolean
  onClose: () => void
  onSessionSolveResult?: (solve: SolveResult) => void
}

type BackendReviewTargets = {
  manualTargets: Partial<Record<ScanFaceSymbol, number[]>>
  rescanFaces: ScanFaceSymbol[]
}

type CenterMismatchConfirmation = {
  faceSymbol: ScanFaceSymbol
  message: string
}

export function ScanCubeModal({
  apiReady,
  maxDepth = 30,
  maxNodes,
  solveDisabledReason,
  solving,
  puzzleSlug = 'cube-3x3x3',
  strategyId,
  visionCnnAvailable,
  visionCnnReason,
  visionTileDetectorAvailable,
  visionTileDetectorReason,
  visionOk,
  onClose,
  onSessionSolveResult,
}: ScanCubeModalProps) {
  const { t } = useTranslation()
  const titleId = useId()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const camera = useCameraStream(true)
  const analyzeScanFace = useAnalyzeScanFace()
  const solveScanSession = useSolveScanSession()
  const stickersPerFace = puzzleSlug === 'cube-2x2x2' ? scan2StickersPerFace : scan3StickersPerFace
  const gridSize = stickersPerFace === scan2StickersPerFace ? 2 : 3
  const centerIndex = scanCenterIndex(stickersPerFace)
  const [drafts, setDrafts] = useState(() => createInitialScanFaceDrafts(stickersPerFace))
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
  const [centerMismatchConfirmation, setCenterMismatchConfirmation] =
    useState<CenterMismatchConfirmation | undefined>()
  const [message, setMessage] = useState<string | undefined>()
  const confirmedFaces = useMemo(() => scanFacesFromDrafts(drafts), [drafts])
  const sessionFaces = scanSessionFacesFromDrafts(drafts, stickersPerFace)
  const scanSessionReadiness = scanSessionReadinessMessage(
    t,
    drafts,
    apiReady,
    solveDisabledReason,
  )
  const draftValidation = validateScanFaceDraft(confirmedFaces, currentFace.symbol, stickers, stickersPerFace)
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
          validateScanFaceDraft(confirmedFaces, symbol, drafts[symbol].stickers, stickersPerFace),
        )

        if (status === 'invalid' || status === 'pending') {
          return status
        }

        return isBackendReviewFace(backendReviewTargets, symbol) ? 'needsReview' : status
      }),
    [backendReviewTargets, confirmedFaces, drafts, stickersPerFace],
  )
  const knownCenters = useMemo(() => knownCenterReferencesFromFaces(confirmedFaces), [confirmedFaces])
  const hasReviewCaptureContent =
    photoDataUrl !== undefined || stickers.some((sticker, index) => index !== centerIndex && sticker.symbol !== undefined)
  const hasReviewContent = currentDraftHasReviewContent(currentDraft, centerIndex)
  const liveScan = useLiveScanPreview({
    enabled: autoScanEnabled && camera.status === 'ready' && !capturing && !hasReviewCaptureContent,
    expectedCenter: currentFace.symbol,
    gridSize,
    knownCenters,
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
  const cameraTemporalConsensus =
    liveTemporalConsensus.framesSeen > 0 ? liveTemporalConsensus : undefined
  const scannerMessage =
    hasReviewContent
      ? faceValidation ?? t('scan.messages.liveReviewReady', { count: stickersPerFace })
      : autoScanEnabled
        ? liveMessage
        : t('scan.messages.autoPaused')
  const canClearPhoto =
    photoDataUrl !== undefined ||
    scanAnalysis !== undefined ||
    stickers.some((sticker, index) => index !== centerIndex && sticker.symbol !== undefined)
  const sessionSolving = solveScanSession.isPending
  const solveScanDisabledReason = scanSessionReadiness
  const solveScanDisabled = solving || sessionSolving || solveScanDisabledReason !== undefined
  const reviewTargetIndexes = backendReviewTargets.manualTargets[currentFace.symbol] ?? []
  const cameraStream = camera.status === 'ready' ? camera.stream : undefined

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
  }, [cameraStream, currentFaceIndex])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (centerMismatchConfirmation !== undefined) {
          setCenterMismatchConfirmation(undefined)
          return
        }

        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [centerMismatchConfirmation, onClose])

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
    setBackendReviewTargets((targets) => removeBackendReviewFace(targets, currentFace.symbol))
    setCenterMismatchConfirmation(undefined)
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
    clearBackendReviewForFace(currentFace.symbol)
    setCenterMismatchConfirmation(undefined)
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
        knownCenters,
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
        setMessage(scanAnalysisMessage(t, analysis) ?? t('scan.messages.manualDetectionFailed'))
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
      const centerMessage = analysis.centerMismatch ? centerMismatchMessage(t, analysis) : undefined
      const qualityMessage = scanQualityMessage(t, analysis)
      const detectionMessage =
        uncertain > 0
          ? t('scan.messages.detectedUncertain', { count: uncertain })
          : t('scan.messages.captured')

      setMessage([centerMessage, qualityMessage, detectionMessage].filter(Boolean).join(' '))
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
    setCenterMismatchConfirmation(undefined)
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
    clearBackendManualTarget(currentFace.symbol, index)
  }

  function handleClearPhoto() {
    setDrafts((currentDrafts) => clearScanFaceDraft(currentDrafts, currentFace.symbol, stickersPerFace))
    clearBackendReviewForFace(currentFace.symbol)
    setCenterMismatchConfirmation(undefined)
    setMessage(undefined)
    resetLiveAutoFill()
    analyzeScanFace.reset()
  }

  function handleAutoScanToggle() {
    setAutoScanEnabled((enabled) => !enabled)
    resetLiveAutoFill()
    setMessage(undefined)
  }

  function clearBackendReviewForFace(symbol: ScanFaceSymbol) {
    setBackendReviewTargets((targets) => removeBackendReviewFace(targets, symbol))
  }

  function clearBackendManualTarget(symbol: ScanFaceSymbol, index: number) {
    setBackendReviewTargets((targets) => removeBackendManualTarget(targets, symbol, index))
  }

  function handleConfirmFace() {
    const centerOverrideConfirmed = centerValidation !== undefined
    if (centerOverrideConfirmed && currentDraft.centerOverrideConfirmed !== true) {
      setCenterMismatchConfirmation({ faceSymbol: currentFace.symbol, message: centerValidation })
      setMessage(centerValidation)
      return
    }

    confirmCurrentFace(centerOverrideConfirmed)
  }

  function handleConfirmCenterMismatch() {
    setCenterMismatchConfirmation(undefined)
    confirmCurrentFace(true)
  }

  function confirmCurrentFace(centerOverrideConfirmed: boolean) {
    const nextDrafts = confirmScanFaceDraft(drafts, currentFace.symbol, {
      centerOverrideConfirmed:
        centerOverrideConfirmed || currentDraft.centerOverrideConfirmed === true,
    })
    const nextFaceIndex = nextUnconfirmedFaceIndex(nextDrafts, currentFaceIndex)
    setDrafts(nextDrafts)
    clearBackendReviewForFace(currentFace.symbol)

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

    const faces = sessionFaces!

    try {
      setMessage(t('scan.messages.submittingSession'))
      const result = await solveScanSession.mutateAsync({
        faces,
        maxDepth,
        maxNodes,
        puzzleSlug,
        strategyId,
      })

      handleScanSessionResult(result)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('scan.messages.solveFailed'))
    }
  }

  function handleScanSessionResult(result: ScanSessionResult) {
    if (result.solve !== undefined) {
      onSessionSolveResult?.(result.solve)
      onClose()
      return
    }

    const nextTargets = backendReviewTargetsFromSessionResult(result)
    setBackendReviewTargets(nextTargets)
    const targetFace = firstBackendReviewFace(nextTargets)
    if (targetFace !== undefined) {
      const targetIndex = scanFaceOrder.findIndex(({ symbol }) => symbol === targetFace)
      setCurrentFaceIndex(targetIndex)
    }

    setMessage(scanSessionMessage(t, result))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-3 py-6 sm:px-6">
      <button
        aria-label={t('scan.modal.dismiss')}
        className="absolute inset-0 bg-app-bg/90"
        type="button"
        onClick={onClose}
      />
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className="relative max-h-[calc(100vh-3rem)] w-full max-w-4xl overflow-auto border border-app-border bg-app-surface p-4 text-left text-app-text shadow-2xl sm:p-6"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="grid gap-1">
            <h2 className="text-lg font-extrabold uppercase tracking-[0.16em]" id={titleId}>
              {t('scan.modal.title')}
            </h2>
            <p className="text-sm font-semibold text-app-muted">
              {t('scan.modal.description')}
            </p>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-app-muted">
              {scanCnnStatusMessage(t, visionOk, visionCnnAvailable, visionCnnReason)}
            </p>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-app-muted">
              {scanTileDetectorStatusMessage(
                t,
                visionOk,
                visionTileDetectorAvailable,
                visionTileDetectorReason,
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
          stickersPerFace={stickersPerFace}
          onFaceIndexChange={handleFaceIndexChange}
        >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
          <div className="grid gap-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-app-muted">
                  {t('scan.modal.faceProgress', {
                    current: currentFaceIndex + 1,
                    total: scanFaceOrder.length,
                  })}
                </p>
                <h3 className="mt-1 text-xl font-extrabold">{scanFaceLabel(t, currentFace.symbol, stickersPerFace)}</h3>
                <p className="mt-1 text-sm font-semibold leading-relaxed text-app-muted">
                  {scanFaceInstruction(t, currentFace.symbol, stickersPerFace)}
                </p>
                {centerIndex !== undefined ? (
                  <>
                    <p className="mt-1 text-xs font-extrabold uppercase tracking-[0.16em] text-app-text">
                      {t('scan.modal.expectedCenter', {
                        color: scanColorLabel(t, currentFace.symbol),
                      })}
                    </p>
                    <p className="mt-1 text-xs font-extrabold uppercase tracking-[0.16em] text-app-text">
                      {t('scan.modal.keepAtTop', {
                        color: scanFaceTopLabel(t, currentFace.symbol, stickersPerFace),
                      })}
                    </p>
                  </>
                ) : null}
              </div>
              <span className="border border-app-border bg-app-surface-raised px-3 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-app-muted">
                {t('scan.modal.confirmed', { count: confirmedDraftCount(drafts) })}
              </span>
            </div>

            <ScanCameraFrame
              cameraMessage={camera.status === 'error' ? camera.message : undefined}
              cameraStatus={camera.status}
              detectionMode={cameraAnalysis?.detectionMode}
              stableFrameCount={liveStableFrameCount}
              targetStickerCount={stickersPerFace}
              temporalConsensus={cameraTemporalConsensus}
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
                disabled={capturing || camera.status !== 'ready'}
                onClick={handleAutoScanToggle}
              >
                {autoScanEnabled ? t('scan.actions.autoScanOn') : t('scan.actions.autoScanOff')}
              </Button>
              <Button
                className="min-h-10 px-4 py-2"
                type="button"
                variant="secondary"
                disabled={camera.status !== 'ready' || capturing}
                onClick={() => void handleTakePhoto()}
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
              stickersPerFace={stickersPerFace}
              stickers={stickers}
              onStickerColorChange={handleStickerColorChange}
            />
            <div className="grid gap-2 border border-app-border bg-app-surface-raised p-3 text-sm font-semibold text-app-muted">
              <span className="text-xs font-extrabold uppercase tracking-[0.16em]">{t('scan.editor.colorCount')}</span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {scanSymbols.map((symbol) => {
                  const details = scanSymbolDetails[symbol]

                  return (
                    <span className="flex items-center gap-2" key={symbol}>
                      <span
                        className="size-3 border border-app-border"
                        style={{ backgroundColor: details.background }}
                      />
                      {scanColorLabel(t, symbol)}: {previewCounts[symbol]}/{stickersPerFace}
                    </span>
                  )
                })}
              </div>
            </div>
            <p className="min-h-10 text-sm font-semibold leading-relaxed text-app-muted" aria-live="polite">
              {message ?? solveDisabledReason ?? scannerMessage}
            </p>
            <Tooltip content={solveScanDisabledReason}>
              <span className="inline-flex" tabIndex={solveScanDisabledReason === undefined ? undefined : 0}>
                <Button
                  aria-label={solving || sessionSolving ? t('common.loading') : undefined}
                  className="w-full"
                  type="button"
                  disabled={solveScanDisabled}
                  onClick={handleSolveScan}
                >
                  {solving || sessionSolving ? <Loader3x3 decorative className="size-8" registerDelayMs={150} /> : t('scan.actions.solveScannedCube')}
                </Button>
              </span>
            </Tooltip>
          </div>
        </div>
        </ScanFaceCarousel>
      </section>
      {centerMismatchConfirmation === undefined ? null : (
        <CenterMismatchConfirmationModal
          message={centerMismatchConfirmation.message}
          onCancel={() => setCenterMismatchConfirmation(undefined)}
          onConfirm={handleConfirmCenterMismatch}
        />
      )}
    </div>
  )
}

type CenterMismatchConfirmationModalProps = {
  message: string
  onCancel: () => void
  onConfirm: () => void
}

function CenterMismatchConfirmationModal({
  message,
  onCancel,
  onConfirm,
}: CenterMismatchConfirmationModalProps) {
  const { t } = useTranslation()
  const titleId = useId()

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-3 py-6 sm:px-6">
      <button
        aria-label={t('scan.centerMismatch.dismiss')}
        className="absolute inset-0 bg-app-bg/85"
        type="button"
        onClick={onCancel}
      />
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className="relative grid w-full max-w-lg gap-5 border border-app-border-strong bg-app-surface p-4 text-left text-app-text shadow-2xl sm:p-6"
        role="dialog"
      >
        <div className="grid gap-2">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-app-muted">
            {t('scan.centerMismatch.kicker')}
          </p>
          <h2 className="text-lg font-extrabold uppercase tracking-[0.16em]" id={titleId}>
            {t('scan.centerMismatch.title')}
          </h2>
          <p className="text-sm font-semibold leading-relaxed text-app-muted">
            {message}
          </p>
          <p className="text-sm font-extrabold leading-relaxed text-app-text">
            {t('scan.messages.centerMismatchConfirmQuestion')}
          </p>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button className="min-h-10 px-4 py-2" type="button" variant="secondary" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button className="min-h-10 px-4 py-2" type="button" onClick={onConfirm}>
            {t('scan.actions.confirmAnyway')}
          </Button>
        </div>
      </section>
    </div>
  )
}

function currentDraftHasReviewContent(draft: ScanFaceDraft, centerIndex: number | undefined): boolean {
  return (
    draft.photoDataUrl !== undefined ||
    draft.analysis !== undefined ||
    draft.stickers.some((sticker, index) => index !== centerIndex && sticker.symbol !== undefined)
  )
}

function canApplyLiveAutofill(draft: ScanFaceDraft): boolean {
  return !draft.confirmed
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

function rejectedCaptureReason(analysis: AnalyzeScanFaceResponse): 'empty_stickers' | 'partial_tiles' {
  return (analysis.tileDetections?.length ?? 0) > 0 || analysis.stickers.length > 0
    ? 'partial_tiles'
    : 'empty_stickers'
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
