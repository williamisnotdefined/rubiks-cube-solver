import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  canonicalStickerIndexToVisual,
  type AnalyzeScanFaceResponse,
  type ScanSessionInvalidCorner,
  type ScanSessionResult,
} from '@api/scan'
import type { ScanFaceSymbol, SolveResult } from '@api/solver/types'
import { EvenCubeReviewStep } from '../EvenCubeReviewStep'
import {
  NoSolutionLimitsModal,
  type NoSolutionRetryLimits,
} from '../../solve/NoSolutionLimitsModal'
import {
  isNoSolutionLimitFailure,
  type NoSolutionLimitFailureResult,
} from '../../solve/noSolutionLimits'
import {
  allEvenCubeFacesConfirmed,
  createDefaultEvenCubeFaceRotations,
  createDefaultEvenCubeNetAssignments,
  findEvenCubeFullFit,
  evenCubeScanSessionFacesFromDrafts,
  findEvenCubeRotationFit,
  swapEvenCubeNetAssignments,
  validateEvenCubeScan,
  type EvenCubeFaceRotation,
  type EvenCubeFitSolution,
  type EvenCubeInvalidCorner,
  type EvenCubeNetAssignments,
  type EvenCubeFaceRotations,
} from '../evenCubeScan'
import { ScanFaceCaptureStep } from '../ScanFaceCaptureStep'
import { ScanModalShell } from '../ScanModalShell'
import { scanFaceOrder, scan2StickersPerFace } from '../scanState'
import { scanConfirmAllFacesMessage, scanFaceDraftValidationMessage } from '../scanTranslations'
import { scanDraftsHaveProgress, scanQualityMessage } from '../scanCaptureWorkflowHelpers'
import {
  backendReviewTargetsFromSessionResult,
  emptyBackendReviewTargets,
  firstBackendReviewFace,
  isBackendReviewFace,
  removeBackendManualTarget,
  removeBackendReviewFace,
  type BackendReviewTargets,
} from '../scanSessionReview'
import { scanSessionMessage, scanSessionReadinessMessage } from '../scanSessionMessages'
import { useScanCaptureWorkflow } from '../hooks/useScanCaptureWorkflow'
import { useAbortableScanSession } from '../hooks/useAbortableScanSession'

export type ScanCubeModalProps = {
  apiReady: boolean
  maxDepth?: number
  maxNodes?: number
  solveDisabledReason?: string
  solving: boolean
  puzzleSlug?: string
  strategyId?: string
  visionTileDetectorAvailable?: boolean
  visionTileDetectorReason?: string
  visionOk?: boolean
  onClose: () => void
  onSessionSolvingChange?: (solving: boolean) => void
  onSessionSolveResult?: (solve: SolveResult) => void
}

export function EvenCubeScanModal({
  apiReady,
  maxDepth = 30,
  maxNodes,
  solveDisabledReason,
  solving,
  strategyId,
  visionTileDetectorAvailable,
  visionTileDetectorReason,
  visionOk,
  onClose,
  onSessionSolvingChange,
  onSessionSolveResult,
}: ScanCubeModalProps) {
  const { t } = useTranslation()
  const puzzleSlug: string = 'cube-2x2x2'
  const scanSession = useAbortableScanSession()
  const closingRef = useRef(false)
  const stickersPerFace = scan2StickersPerFace
  const gridSize = 2
  const [backendReviewTargets, setBackendReviewTargets] = useState<BackendReviewTargets>(() =>
    emptyBackendReviewTargets(),
  )
  const [evenReviewVisible, setEvenReviewVisible] = useState(false)
  const [evenFaceRotations, setEvenFaceRotations] = useState<EvenCubeFaceRotations>(() =>
    createDefaultEvenCubeFaceRotations(),
  )
  const [limitFailureResult, setLimitFailureResult] = useState<
    NoSolutionLimitFailureResult | undefined
  >()
  const [evenNetAssignments, setEvenNetAssignments] = useState<EvenCubeNetAssignments>(() =>
    createDefaultEvenCubeNetAssignments(),
  )
  const [evenAutoFitSuggestion, setEvenAutoFitSuggestion] = useState<
    EvenCubeFitSolution | undefined
  >()
  const [backendEvenInvalidCorners, setBackendEvenInvalidCorners] = useState<
    EvenCubeInvalidCorner[]
  >([])
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
    invalidateCapture,
    previewCounts,
    scannerMessage,
    setCurrentFaceIndex,
    setMessage,
    videoRef,
  } = useScanCaptureWorkflow({
    cameraActive: !evenReviewVisible,
    gridSize,
    stickersPerFace,
    getAnalysisMessage: (analysis) => scanAnalysisMessage(t, analysis),
    isReviewFace: (symbol) => isBackendReviewFace(backendReviewTargets, symbol),
    onDraftCleared: resetEvenReviewState,
    onDraftEdited: (symbol, index) => {
      scanSession.invalidate()
      resetEvenReviewState()
      clearBackendManualTarget(symbol, index)
    },
    onFaceChanged: () => {
      scanSession.invalidate()
      resetEvenReviewState()
    },
    onFaceCleared: (symbol) => {
      scanSession.invalidate()
      clearBackendReviewForFace(symbol)
    },
  })
  const sessionFaces = evenCubeScanSessionFacesFromDrafts(
    drafts,
    evenFaceRotations,
    evenNetAssignments,
    stickersPerFace,
  )
  const evenValidation = useMemo(
    () => validateEvenCubeScan(drafts, evenFaceRotations, evenNetAssignments, stickersPerFace),
    [drafts, evenFaceRotations, evenNetAssignments, stickersPerFace],
  )
  const evenInvalidCorners =
    backendEvenInvalidCorners.length > 0 ? backendEvenInvalidCorners : evenValidation.invalidCorners
  const scanSessionReadiness = scanSessionReadinessMessage(
    t,
    drafts,
    apiReady,
    solveDisabledReason,
    { requirePhotos: false },
  )
  const draftValidationMessage = scanFaceDraftValidationMessage(t, draftValidation, stickersPerFace)
  // Local color-count/corner checks are advisory; the scan API owns cube validity.
  const faceValidation =
    draftValidation?.key === 'confirmAllColors' ? draftValidationMessage : undefined
  const sessionSolving = scanSession.pending
  const solveScanDisabledReason = scanSessionReadiness
  const solveScanDisabled = solving || sessionSolving || solveScanDisabledReason !== undefined
  const reviewTargetIndexes = backendReviewTargets.manualTargets[currentFace.symbol] ?? []
  const hasScanProgress = scanDraftsHaveProgress(drafts, undefined)

  useEffect(() => {
    onSessionSolvingChange?.(sessionSolving)

    return () => onSessionSolvingChange?.(false)
  }, [onSessionSolvingChange, sessionSolving])

  useEffect(() => {
    closingRef.current = false
  })

  function clearBackendReviewForFace(symbol: ScanFaceSymbol) {
    setBackendReviewTargets((targets) => removeBackendReviewFace(targets, symbol))
  }

  function clearBackendManualTarget(symbol: ScanFaceSymbol, index: number) {
    setBackendReviewTargets((targets) => removeBackendManualTarget(targets, symbol, index))
  }

  function resetEvenReviewState() {
    setEvenReviewVisible(false)
    setEvenFaceRotations(createDefaultEvenCubeFaceRotations())
    setEvenNetAssignments(createDefaultEvenCubeNetAssignments())
    setBackendEvenInvalidCorners([])
    setEvenAutoFitSuggestion(undefined)
  }

  function handleConfirmFace() {
    confirmCurrentFace()
  }

  async function handleSolveScan() {
    if (scanSessionReadiness !== undefined) {
      setMessage(scanSessionReadiness)
      return
    }

    if (!evenReviewVisible) {
      if (!allEvenCubeFacesConfirmed(drafts)) {
        setMessage(scanConfirmAllFacesMessage(t, stickersPerFace))
        return
      }

      setEvenReviewVisible(true)
      setMessage(undefined)
      return
    }

    await submitScanSession()
  }

  async function submitScanSession(limits?: NoSolutionRetryLimits) {
    if (sessionFaces === undefined) {
      setMessage(scanConfirmAllFacesMessage(t, stickersPerFace))
      return
    }

    const faces = sessionFaces!

    try {
      invalidateCapture()
      setMessage(t('scan.messages.submittingSession'))
      const result = await scanSession.submit({
        faces,
        maxDepth: limits?.maxDepth ?? maxDepth,
        maxNodes: limits?.maxNodes ?? maxNodes,
        puzzleSlug,
        strategyId,
      })

      if (result !== undefined) {
        handleScanSessionResult(result)
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('scan.messages.solveFailed'))
    }
  }

  function handleEvenFaceRotation(face: ScanFaceSymbol, rotation: EvenCubeFaceRotation) {
    if (sessionSolving) {
      return
    }
    scanSession.invalidate()
    setBackendEvenInvalidCorners([])
    setEvenAutoFitSuggestion(undefined)
    setEvenFaceRotations((currentRotations) => {
      const currentRotation = currentRotations[face] ?? 0
      const nextRotation = ((currentRotation + rotation) % 360) as EvenCubeFaceRotation

      return {
        ...currentRotations,
        [face]: nextRotation,
      }
    })
  }

  function handleEvenFaceSwap(sourceSlot: ScanFaceSymbol, targetSlot: ScanFaceSymbol) {
    if (sessionSolving) {
      return
    }
    scanSession.invalidate()
    setBackendEvenInvalidCorners([])
    setEvenAutoFitSuggestion(undefined)
    setEvenNetAssignments((assignments) =>
      swapEvenCubeNetAssignments(assignments, sourceSlot, targetSlot),
    )
  }

  function handleEvenAutoFit(): 'ambiguous' | 'none' | 'suggested' | 'unique' {
    if (sessionSolving) {
      return 'none'
    }
    scanSession.invalidate()
    setEvenAutoFitSuggestion(undefined)
    const rotationOnlyResult = findEvenCubeRotationFit(drafts, evenNetAssignments, stickersPerFace)
    const result =
      rotationOnlyResult.status === 'none'
        ? findEvenCubeFullFit(drafts, stickersPerFace)
        : rotationOnlyResult
    if (result.status === 'unique') {
      setBackendEvenInvalidCorners([])
      setEvenFaceRotations(result.solution.rotations)
      setEvenNetAssignments(result.solution.assignments)
    } else if (result.status === 'suggested') {
      setEvenAutoFitSuggestion(result.solution)
    }

    return result.status
  }

  function handleEvenApplyAutoFitSuggestion() {
    if (evenAutoFitSuggestion === undefined || sessionSolving) {
      return
    }

    scanSession.invalidate()
    setBackendEvenInvalidCorners([])
    setEvenFaceRotations(evenAutoFitSuggestion.rotations)
    setEvenNetAssignments(evenAutoFitSuggestion.assignments)
    setEvenAutoFitSuggestion(undefined)
  }

  function handleScanSessionResult(result: ScanSessionResult) {
    if (result.solve?.ok === true) {
      setLimitFailureResult(undefined)
      onSessionSolveResult?.(result.solve)
      handleClose()
      return
    }

    if (isNoSolutionLimitFailure(result.solve)) {
      setLimitFailureResult(result.solve)
      setMessage(scanSessionMessage(t, result))
      return
    }

    if (result.solve !== undefined) {
      setMessage(scanSessionMessage(t, result))
      return
    }

    const nextTargets = backendReviewTargetsFromSessionResult(result, (face, index) => {
      const capturedFace = evenNetAssignments[face]
      return {
        face: capturedFace,
        index: canonicalStickerIndexToVisual(index, gridSize, evenFaceRotations[capturedFace] ?? 0),
      }
    })
    setBackendReviewTargets(nextTargets)
    const nextInvalidCorners = evenInvalidCornersFromSessionResult(result)
    if (nextInvalidCorners.length > 0) {
      setBackendEvenInvalidCorners(nextInvalidCorners)
      setEvenReviewVisible(true)
      setMessage(scanSessionMessage(t, result))
      return
    }

    setBackendEvenInvalidCorners([])
    const targetFace = firstBackendReviewFace(nextTargets)
    if (targetFace !== undefined) {
      const targetIndex = scanFaceOrder.findIndex(({ symbol }) => symbol === targetFace)
      setEvenReviewVisible(false)
      setCurrentFaceIndex(targetIndex)
    }

    setMessage(scanSessionMessage(t, result))
  }

  async function handleLimitFailureRetry(limits: NoSolutionRetryLimits) {
    setLimitFailureResult(undefined)
    await submitScanSession(limits)
  }

  function handleClose() {
    if (closingRef.current) {
      return
    }
    closingRef.current = true
    scanSession.invalidate()
    onClose()
  }

  return (
    <ScanModalShell
      visionOk={visionOk}
      visionTileDetectorAvailable={visionTileDetectorAvailable}
      visionTileDetectorReason={visionTileDetectorReason}
      hasProgress={hasScanProgress}
      onClose={handleClose}
    >
      {evenReviewVisible ? (
        <EvenCubeReviewStep
          drafts={drafts}
          assignments={evenNetAssignments}
          gridSize={gridSize}
          invalidCorners={evenInvalidCorners}
          rotations={evenFaceRotations}
          stickersPerFace={stickersPerFace}
          solving={solving || sessionSolving}
          onBack={() => setEvenReviewVisible(false)}
          onRotateFace={handleEvenFaceRotation}
          onSolve={() => void handleSolveScan()}
          onSwapFaces={handleEvenFaceSwap}
          onAutoFit={handleEvenAutoFit}
          onApplyAutoFitSuggestion={handleEvenApplyAutoFitSuggestion}
          autoFitSuggestion={evenAutoFitSuggestion}
        />
      ) : (
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
          finalActionLabel={t('scan.evenReview.reviewAction')}
          finalActionLoading={solving || sessionSolving}
          interactionDisabled={sessionSolving}
          liveStableFrameCount={liveStableFrameCount}
          liveStatus={liveStatus}
          message={message ?? (hasReviewContent ? draftValidationMessage : undefined)}
          messageFallback={solveDisabledReason}
          previewCounts={previewCounts}
          reviewTargetIndexes={reviewTargetIndexes}
          scannerMessage={scannerMessage}
          showExpectedCenter={false}
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
      )}
      {limitFailureResult === undefined ? null : (
        <NoSolutionLimitsModal
          puzzleSlug={puzzleSlug}
          result={limitFailureResult}
          solving={solving || sessionSolving}
          onClose={() => setLimitFailureResult(undefined)}
          onRetry={handleLimitFailureRetry}
        />
      )}
    </ScanModalShell>
  )
}

function evenInvalidCornersFromSessionResult(result: ScanSessionResult): EvenCubeInvalidCorner[] {
  return (result.invalidCorners ?? [])
    .map(evenInvalidCornerFromApi)
    .filter((corner): corner is EvenCubeInvalidCorner => corner !== undefined)
}

function evenInvalidCornerFromApi(
  corner: ScanSessionInvalidCorner,
): EvenCubeInvalidCorner | undefined {
  if (
    corner.faces.length !== 3 ||
    corner.stickers.length !== 3 ||
    (corner.targets?.length ?? 0) !== 3
  ) {
    return undefined
  }

  const targets = corner.targets!
  return {
    faces: [corner.faces[0], corner.faces[1], corner.faces[2]],
    position: corner.position,
    stickers: [corner.stickers[0], corner.stickers[1], corner.stickers[2]],
    targets: [
      { index: targets[0].index, slot: targets[0].face },
      { index: targets[1].index, slot: targets[1].face },
      { index: targets[2].index, slot: targets[2].face },
    ],
  }
}

function scanAnalysisMessage(
  t: ReturnType<typeof useTranslation>['t'],
  analysis: AnalyzeScanFaceResponse,
): string | undefined {
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
