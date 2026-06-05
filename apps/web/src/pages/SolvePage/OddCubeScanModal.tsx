import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useSolveScanSession,
  type AnalyzeScanFaceResponse,
  type ScanSessionResult,
} from '@api/scan'
import type { ScanFaceSymbol, SolveResult } from '@api/solver/types'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@components/AlertDialog'
import { Button } from '@components/Button'
import { ScanExitConfirmationModal } from './ScanExitConfirmationModal'
import { ScanFaceCaptureStep } from './ScanFaceCaptureStep'
import { ScanModalShell } from './ScanModalShell'
import {
  scanFaceOrder,
  scan3StickersPerFace,
  scanCenterIndex,
  scanSessionFacesFromDrafts,
} from './scanState'
import { scanColorLabel, scanFaceDraftValidationMessage } from './scanTranslations'
import { scanColorCode } from './scanColorSymbols'
import { scanDraftsHaveProgress, scanQualityMessage } from './scanCaptureWorkflowHelpers'
import {
  backendReviewTargetsFromSessionResult,
  emptyBackendReviewTargets,
  firstBackendReviewFace,
  isBackendReviewFace,
  removeBackendManualTarget,
  removeBackendReviewFace,
  type BackendReviewTargets,
} from './scanSessionReview'
import {
  scanSessionMessage,
  scanSessionReadinessMessage,
} from './scanSessionMessages'
import { useScanCaptureWorkflow } from './hooks/useScanCaptureWorkflow'

export type ScanCubeModalProps = {
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
  onSessionSolvingChange?: (solving: boolean) => void
  onSessionSolveResult?: (solve: SolveResult) => void
}

type CenterMismatchConfirmation = {
  faceSymbol: ScanFaceSymbol
  message: string
}

export function OddCubeScanModal({
  apiReady,
  maxDepth = 30,
  maxNodes,
  solveDisabledReason,
  solving,
  strategyId,
  visionCnnAvailable,
  visionCnnReason,
  visionTileDetectorAvailable,
  visionTileDetectorReason,
  visionOk,
  onClose,
  onSessionSolvingChange,
  onSessionSolveResult,
}: ScanCubeModalProps) {
  const { t } = useTranslation()
  const puzzleSlug: string = 'cube-3x3x3'
  const solveScanSession = useSolveScanSession()
  const stickersPerFace = scan3StickersPerFace
  const gridSize = 3
  const centerIndex = scanCenterIndex(stickersPerFace)
  const [backendReviewTargets, setBackendReviewTargets] = useState<BackendReviewTargets>(() =>
    emptyBackendReviewTargets(),
  )
  const [exitConfirmationVisible, setExitConfirmationVisible] = useState(false)
  const [centerMismatchConfirmation, setCenterMismatchConfirmation] =
    useState<CenterMismatchConfirmation | undefined>()
  const {
    autoScanEnabled,
    camera,
    cameraAnalysis,
    cameraTemporalConsensus,
    canClearPhoto,
    capturing,
    confirmCurrentFace,
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
    previewCounts,
    scannerMessage,
    setCurrentFaceIndex,
    setMessage,
    videoRef,
  } = useScanCaptureWorkflow({
    centerIndex,
    gridSize,
    stickersPerFace,
    getAnalysisMessage: (analysis) => scanAnalysisMessage(t, analysis),
    isReviewFace: (symbol) => isBackendReviewFace(backendReviewTargets, symbol),
    onDraftEdited: (symbol, index) => clearBackendManualTarget(symbol, index),
    onFaceChanged: () => setCenterMismatchConfirmation(undefined),
    onFaceCleared: (symbol) => {
      clearBackendReviewForFace(symbol)
      setCenterMismatchConfirmation(undefined)
    },
  })
  const sessionFaces = scanSessionFacesFromDrafts(drafts, stickersPerFace)
  const scanSessionReadiness = scanSessionReadinessMessage(
    t,
    drafts,
    apiReady,
    solveDisabledReason,
    { requirePhotos: false },
  )
  const draftValidationMessage = scanFaceDraftValidationMessage(t, draftValidation)
  const centerValidation = currentDraft.analysis?.centerMismatch
    ? centerMismatchMessage(t, currentDraft.analysis)
    : undefined
  const faceValidation = draftValidationMessage
  const sessionSolving = solveScanSession.isPending
  const solveScanDisabledReason = scanSessionReadiness
  const solveScanDisabled = solving || sessionSolving || solveScanDisabledReason !== undefined
  const reviewTargetIndexes = backendReviewTargets.manualTargets[currentFace.symbol] ?? []
  const hasScanProgress = scanDraftsHaveProgress(drafts, centerIndex)

  useEffect(() => {
    onSessionSolvingChange?.(sessionSolving)

    return () => onSessionSolvingChange?.(false)
  }, [onSessionSolvingChange, sessionSolving])

  function handleProtectedClose() {
    if (hasScanProgress) {
      setExitConfirmationVisible(true)
      return
    }

    onClose()
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

    confirmCurrentFace({
      centerOverrideConfirmed:
        centerOverrideConfirmed || currentDraft.centerOverrideConfirmed === true,
    })
  }

  function handleConfirmCenterMismatch() {
    setCenterMismatchConfirmation(undefined)
    confirmCurrentFace({ centerOverrideConfirmed: true })
  }

  async function handleSolveScan() {
    if (scanSessionReadiness !== undefined) {
      setMessage(scanSessionReadiness)
      return
    }

    await submitScanSession()
  }

  async function submitScanSession() {
    if (sessionFaces === undefined) {
      setMessage(t('scan.messages.confirmAllFaces'))
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
    if (result.solve?.ok === true) {
      onSessionSolveResult?.(result.solve)
      onClose()
      return
    }

    if (result.solve !== undefined) {
      setMessage(result.solve.message ?? scanSessionMessage(t, result))
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
    <>
      <ScanModalShell
        visionOk={visionOk}
        visionCnnAvailable={visionCnnAvailable}
        visionCnnReason={visionCnnReason}
        visionTileDetectorAvailable={visionTileDetectorAvailable}
        visionTileDetectorReason={visionTileDetectorReason}
        onClose={onClose}
        onOverlayClose={handleProtectedClose}
      >

        <ScanFaceCaptureStep
          autoScanEnabled={autoScanEnabled}
          cameraAnalysis={cameraAnalysis}
          cameraMessage={camera.status === 'error' ? camera.message : undefined}
          cameraStatus={camera.status}
          cameraTemporalConsensus={cameraTemporalConsensus}
          canClearPhoto={canClearPhoto}
          capturing={capturing}
          currentDraft={currentDraft}
          currentFace={currentFace}
          currentFaceIndex={currentFaceIndex}
          drafts={drafts}
          faceValidation={faceValidation}
          faceStatuses={faceStatuses}
          finalActionDisabled={solveScanDisabled}
          finalActionDisabledReason={solveScanDisabledReason}
          finalActionLabel={t('scan.actions.solveScannedCube')}
          finalActionLoading={solving || sessionSolving}
          liveStableFrameCount={liveStableFrameCount}
          liveStatus={liveStatus}
          message={message ?? (hasReviewContent ? faceValidation : undefined)}
          messageFallback={solveDisabledReason}
          previewCounts={previewCounts}
          reviewTargetIndexes={reviewTargetIndexes}
          scannerMessage={scannerMessage}
          showExpectedCenter={centerIndex !== undefined}
          stickersPerFace={stickersPerFace}
          videoRef={videoRef}
          onAutoScanToggle={handleAutoScanToggle}
          onCapture={() => void handleTakePhoto()}
          onClear={handleClearPhoto}
          onConfirmFace={handleConfirmFace}
          onFaceIndexChange={handleFaceIndexChange}
          onFinalAction={() => void handleSolveScan()}
          onStickerColorChange={handleStickerColorChange}
        />
      </ScanModalShell>
      {centerMismatchConfirmation === undefined ? null : (
        <CenterMismatchConfirmationModal
          message={centerMismatchConfirmation.message}
          onCancel={() => setCenterMismatchConfirmation(undefined)}
          onConfirm={handleConfirmCenterMismatch}
        />
      )}
      {exitConfirmationVisible ? (
        <ScanExitConfirmationModal
          onCancel={() => setExitConfirmationVisible(false)}
          onConfirm={onClose}
        />
      ) : null}
    </>
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

  return (
    <AlertDialog open onOpenChange={(open) => {
      if (!open) {
        onCancel()
      }
    }}>
      <AlertDialogContent
        className="left-1/2 top-1/2 z-[70] grid w-[calc(100vw-1.5rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-5 border border-app-border-strong bg-app-surface p-4 text-left text-app-text shadow-2xl sm:w-[calc(100vw-3rem)] sm:p-6"
        overlayClassName="z-[70] bg-app-bg/85"
        overlayLabel={t('scan.centerMismatch.dismiss')}
        onOverlayClick={onCancel}
      >
        <div className="grid gap-2">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-app-muted">
            {t('scan.centerMismatch.kicker')}
          </p>
          <AlertDialogTitle asChild>
            <h2 className="text-lg font-extrabold uppercase tracking-[0.16em]">
              {t('scan.centerMismatch.title')}
            </h2>
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <p className="text-sm font-semibold leading-relaxed text-app-muted">
              {message}
            </p>
          </AlertDialogDescription>
          <p className="text-sm font-extrabold leading-relaxed text-app-text">
            {t('scan.messages.centerMismatchConfirmQuestion')}
          </p>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <AlertDialogCancel asChild>
            <Button className="min-h-10 px-4 py-2" type="button" variant="secondary" onClick={(event) => {
              event.preventDefault()
              onCancel()
            }}>
              {t('common.cancel')}
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button className="min-h-10 px-4 py-2" type="button" onClick={(event) => {
              event.preventDefault()
              onConfirm()
            }}>
              {t('scan.actions.confirmAnyway')}
            </Button>
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
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
