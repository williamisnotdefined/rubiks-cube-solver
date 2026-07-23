import { lazy, Suspense, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SolveResult as ApiSolveResult } from '@api/solver/types'
import { SolveFormWithScanModal } from './components/SolveFormWithScanModal'
import { SolvePlaybackStage } from './components/SolvePlaybackStage'
import { useSolveFormState } from './hooks/useSolveFormState'
import { useSolvePuzzleMetadata } from './hooks/useSolvePuzzleMetadata'
import { useSolveResultFlow } from './hooks/useSolveResultFlow'
import { nodesPerMillion } from './solve/constants'
import type { NoSolutionRetryLimits } from './solve/NoSolutionLimitsModal'
import { SolveResult } from './solve/SolveResult'
import type { SolveFormSubmit } from './solve/validation'

const NoSolutionLimitsModal = lazy(() =>
  import('./solve/NoSolutionLimitsModal').then((module) => ({
    default: module.NoSolutionLimitsModal,
  })),
)

export function SolvePage() {
  const { t } = useTranslation()
  const formState = useSolveFormState()
  const metadata = useSolvePuzzleMetadata(formState.selectedPuzzleSlug)
  const solveFlow = useSolveResultFlow()
  const [scanSessionSolving, setScanSessionSolving] = useState(false)
  const solving = solveFlow.notationSolving || scanSessionSolving
  const buttonLoading = !metadata.apiReady || solving
  const disabled =
    !metadata.apiReady ||
    solving ||
    formState.notation.trim().length === 0 ||
    metadata.strategyOptions.length === 0 ||
    metadata.strategyId.length === 0 ||
    formState.localValidationMessage !== undefined
  function resetSolveResult() {
    solveFlow.resetSolveResult()
  }

  async function handleSubmit(formValues: SolveFormSubmit) {
    if (!metadata.apiReady || formState.localValidationMessage !== undefined) {
      return
    }

    await solveFlow.submitNotationSolve({
      maxDepth: formValues.maxMoves,
      maxNodes: formValues.maxNodesMillion * nodesPerMillion,
      notation: formValues.notation,
      puzzleSlug: formValues.puzzleSlug,
      strategyId: metadata.strategyId,
    })
  }

  async function handleNoSolutionRetry(limits: NoSolutionRetryLimits) {
    if (
      !metadata.apiReady ||
      formState.localValidationMessage !== undefined ||
      formState.notation.trim().length === 0 ||
      metadata.strategyId.length === 0
    ) {
      return
    }

    await solveFlow.submitNotationSolve({
      maxDepth: limits.maxDepth,
      maxNodes: limits.maxNodes,
      notation: formState.notation.trim(),
      puzzleSlug: formState.selectedPuzzleSlug,
      strategyId: metadata.strategyId,
    })
  }

  function handleNotationChange(nextNotation: string) {
    formState.setNotation(nextNotation)
    resetSolveResult()
  }

  function handlePuzzleChange(nextPuzzleSlug: string) {
    formState.updateSelectedPuzzleSlug(nextPuzzleSlug)
    resetSolveResult()
  }

  function handleMaxMovesChange(nextMaxMoves: string) {
    formState.setMaxMovesInput(nextMaxMoves)
    resetSolveResult()
  }

  function handleMaxNodesMillionChange(nextMaxNodesMillion: string) {
    formState.setMaxNodesMillionInput(nextMaxNodesMillion)
    resetSolveResult()
  }

  function handleScanSessionSolveResult(solve: ApiSolveResult) {
    solveFlow.showScanSolveResult(solve, formState.selectedPuzzleSlug)
  }

  const limitFailureModal =
    solveFlow.notationLimitFailureResult !== undefined && !solveFlow.limitFailureModalDismissed
      ? {
          onClose: () => solveFlow.setLimitFailureModalDismissed(true),
          onRetry: handleNoSolutionRetry,
          puzzleSlug: formState.selectedPuzzleSlug,
          result: solveFlow.notationLimitFailureResult,
          solving,
        }
      : undefined
  const scanModalProps = {
    apiReady: metadata.apiReady,
    maxDepth: formState.maxMoves,
    maxNodes: formState.maxNodes,
    onSessionSolveResult: handleScanSessionSolveResult,
    onSessionSolvingChange: setScanSessionSolving,
    puzzleSlug: formState.selectedPuzzleSlug,
    solveDisabledReason: formState.localValidationMessage,
    solving,
    strategyId: metadata.strategyId,
    visionOk: metadata.health?.visionOk,
    visionTileDetectorAvailable: metadata.health?.visionTileDetectorAvailable,
    visionTileDetectorReason: metadata.health?.visionTileDetectorReason,
  }

  return (
    <main className='app-shell min-h-0 flex-1 overflow-auto bg-background px-4 py-6 text-foreground'>
      <section className='mx-auto grid w-full max-w-4xl content-start justify-items-center gap-4'>
        <h1 className='sr-only'>{t('navigation.solve')}</h1>
        <SolvePlaybackStage
          activeSolveSource={solveFlow.activeSolveSource}
          notation={formState.notation}
          successResult={solveFlow.successResult}
          visualizationCubeType={metadata.visualizationCubeType}
          visualizationSupported={metadata.visualizationSupported}
        >
          <SolveFormWithScanModal
            buttonLoading={buttonLoading}
            disabled={disabled}
            maxMovesInput={formState.maxMovesInput}
            maxMovesInvalid={formState.maxMovesInvalid}
            maxMovesLimit={formState.maxMovesLimit}
            maxNodesMillionInput={formState.maxNodesMillionInput}
            maxNodesMillionInvalid={formState.maxNodesMillionInvalid}
            notation={formState.notation}
            puzzleOptions={metadata.puzzleOptions}
            scanAvailable={metadata.scanAvailable}
            scanModalProps={scanModalProps}
            scramblePlaceholder={formState.activeScramblePlaceholder}
            selectedPuzzleSlug={formState.selectedPuzzleSlug}
            onMaxMovesChange={handleMaxMovesChange}
            onMaxNodesMillionChange={handleMaxNodesMillionChange}
            onNotationChange={handleNotationChange}
            onPuzzleChange={handlePuzzleChange}
            onSubmit={handleSubmit}
          />
          <SolveResult
            error={solveFlow.activeSolveError}
            localValidationMessage={formState.localValidationMessage}
            result={solveFlow.activeSolveResult}
            solving={solving}
          />
        </SolvePlaybackStage>
        {limitFailureModal !== undefined ? (
          <Suspense fallback={null}>
            <NoSolutionLimitsModal {...limitFailureModal} />
          </Suspense>
        ) : null}
      </section>
    </main>
  )
}
