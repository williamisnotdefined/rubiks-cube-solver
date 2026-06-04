import { useEffect, useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useSolveScanSession,
  type AnalyzeScanFaceResponse,
  type ScanSessionInvalidCorner,
  type ScanSessionResult,
} from '@api/scan'
import type { ScanFaceSymbol, SolveResult } from '@api/solver/types'
import { EvenCubeReviewStep } from './EvenCubeReviewStep'
import {
  allEvenCubeFacesConfirmed,
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
} from './evenCubeScan'
import { ScanFaceCaptureStep } from './ScanFaceCaptureStep'
import { ScanModalShell } from './ScanModalShell'
import {
  scanFaceOrder,
  scan2StickersPerFace,
  scan3StickersPerFace,
  scanSessionFacesFromDrafts,
} from './scanState'
import { scanFaceDraftValidationMessage } from './scanTranslations'
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
import { ScanExitConfirmationModal } from './ScanExitConfirmationModal'
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
  onSessionSolveResult?: (solve: SolveResult) => void
}

export function EvenCubeScanModal({
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
  onSessionSolveResult,
}: ScanCubeModalProps) {
  const { t } = useTranslation()
  const puzzleSlug: string = 'cube-2x2x2'
  const titleId = useId()
  const solveScanSession = useSolveScanSession()
  const stickersPerFace = puzzleSlug === 'cube-2x2x2' ? scan2StickersPerFace : scan3StickersPerFace
  const isEvenCubeScan = stickersPerFace === scan2StickersPerFace
  const gridSize = stickersPerFace === scan2StickersPerFace ? 2 : 3
  const [backendReviewTargets, setBackendReviewTargets] = useState<BackendReviewTargets>(() =>
    emptyBackendReviewTargets(),
  )
  const [evenReviewVisible, setEvenReviewVisible] = useState(false)
  const [evenFaceRotations, setEvenFaceRotations] = useState<EvenCubeFaceRotations>({})
  const [exitConfirmationVisible, setExitConfirmationVisible] = useState(false)
  const [evenNetAssignments, setEvenNetAssignments] = useState<EvenCubeNetAssignments>(() =>
    createDefaultEvenCubeNetAssignments(),
  )
  const [evenAutoFitSuggestion, setEvenAutoFitSuggestion] = useState<EvenCubeFitSolution | undefined>()
  const [backendEvenInvalidCorners, setBackendEvenInvalidCorners] = useState<EvenCubeInvalidCorner[]>([])
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
    gridSize,
    stickersPerFace,
    getAnalysisMessage: (analysis) => scanAnalysisMessage(t, analysis),
    isReviewFace: (symbol) => isBackendReviewFace(backendReviewTargets, symbol),
    onDraftCleared: resetEvenReviewState,
    onDraftEdited: (symbol, index) => {
      resetEvenReviewState()
      clearBackendManualTarget(symbol, index)
    },
    onFaceChanged: resetEvenReviewState,
    onFaceCleared: (symbol) => clearBackendReviewForFace(symbol),
  })
  const sessionFaces = isEvenCubeScan
    ? evenCubeScanSessionFacesFromDrafts(drafts, evenFaceRotations, evenNetAssignments, stickersPerFace)
    : scanSessionFacesFromDrafts(drafts, stickersPerFace)
  const evenValidation = useMemo(
    () => validateEvenCubeScan(drafts, evenFaceRotations, evenNetAssignments, stickersPerFace),
    [drafts, evenFaceRotations, evenNetAssignments, stickersPerFace],
  )
  const evenInvalidCorners = backendEvenInvalidCorners.length > 0
    ? backendEvenInvalidCorners
    : evenValidation.invalidCorners
  const scanSessionReadiness = scanSessionReadinessMessage(
    t,
    drafts,
    apiReady,
    solveDisabledReason,
  )
  const draftValidationMessage = scanFaceDraftValidationMessage(t, draftValidation)
  const faceValidation = draftValidationMessage
  const sessionSolving = solveScanSession.isPending
  const solveScanDisabledReason = evenReviewVisible && isEvenCubeScan && evenInvalidCorners.length > 0
    ? t('scan.evenReview.invalidSolveDisabled')
    : scanSessionReadiness
  const solveScanDisabled = solving || sessionSolving || solveScanDisabledReason !== undefined
  const reviewTargetIndexes = backendReviewTargets.manualTargets[currentFace.symbol] ?? []
  const hasScanProgress = scanDraftsHaveProgress(drafts, undefined)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (exitConfirmationVisible) {
          setExitConfirmationVisible(false)
          return
        }

        if (hasScanProgress) {
          setExitConfirmationVisible(true)
          return
        }

        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [exitConfirmationVisible, hasScanProgress, onClose])

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

  function resetEvenReviewState() {
    setEvenReviewVisible(false)
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

    if (isEvenCubeScan && !evenReviewVisible) {
      if (!allEvenCubeFacesConfirmed(drafts)) {
        setMessage(t('scan.messages.confirmAllFaces'))
        return
      }

      setEvenReviewVisible(true)
      setMessage(undefined)
      return
    }

    if (isEvenCubeScan && evenInvalidCorners.length > 0) {
      setMessage(t('scan.evenReview.invalidSolveDisabled'))
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

  function handleEvenFaceRotation(face: ScanFaceSymbol, rotation: EvenCubeFaceRotation) {
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
    setBackendEvenInvalidCorners([])
    setEvenAutoFitSuggestion(undefined)
    setEvenNetAssignments((assignments) => swapEvenCubeNetAssignments(assignments, sourceSlot, targetSlot))
  }

  function handleEvenAutoFit(): 'ambiguous' | 'none' | 'suggested' | 'unique' {
    setEvenAutoFitSuggestion(undefined)
    const rotationOnlyResult = findEvenCubeRotationFit(drafts, evenNetAssignments, stickersPerFace)
    const result = rotationOnlyResult.status === 'none' ? findEvenCubeFullFit(drafts, stickersPerFace) : rotationOnlyResult
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
    if (evenAutoFitSuggestion === undefined) {
      return
    }

    setBackendEvenInvalidCorners([])
    setEvenFaceRotations(evenAutoFitSuggestion.rotations)
    setEvenNetAssignments(evenAutoFitSuggestion.assignments)
    setEvenAutoFitSuggestion(undefined)
  }

  function handleScanSessionResult(result: ScanSessionResult) {
    if (result.solve !== undefined) {
      onSessionSolveResult?.(result.solve)
      onClose()
      return
    }

    const nextTargets = backendReviewTargetsFromSessionResult(result)
    setBackendReviewTargets(nextTargets)
    const nextInvalidCorners = evenInvalidCornersFromSessionResult(result)
    if (isEvenCubeScan && nextInvalidCorners.length > 0) {
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

  return (
    <>
      <ScanModalShell
        titleId={titleId}
        visionOk={visionOk}
        visionCnnAvailable={visionCnnAvailable}
        visionCnnReason={visionCnnReason}
        visionTileDetectorAvailable={visionTileDetectorAvailable}
        visionTileDetectorReason={visionTileDetectorReason}
        onClose={onClose}
        onOverlayClose={handleProtectedClose}
      >

        {evenReviewVisible && isEvenCubeScan ? (
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
            finalActionLabel={isEvenCubeScan ? t('scan.evenReview.reviewAction') : t('scan.actions.solveScannedCube')}
            finalActionLoading={solving || sessionSolving}
            liveStableFrameCount={liveStableFrameCount}
            liveStatus={liveStatus}
            message={message ?? (hasReviewContent ? faceValidation : undefined)}
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
      </ScanModalShell>
      {exitConfirmationVisible ? (
        <ScanExitConfirmationModal
          onCancel={() => setExitConfirmationVisible(false)}
          onConfirm={onClose}
        />
      ) : null}
    </>
  )
}

function evenInvalidCornersFromSessionResult(result: ScanSessionResult): EvenCubeInvalidCorner[] {
  return (result.invalidCorners ?? [])
    .map(evenInvalidCornerFromApi)
    .filter((corner): corner is EvenCubeInvalidCorner => corner !== undefined)
}

function evenInvalidCornerFromApi(corner: ScanSessionInvalidCorner): EvenCubeInvalidCorner | undefined {
  if (corner.faces.length !== 3 || corner.stickers.length !== 3 || (corner.targets?.length ?? 0) !== 3) {
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
