import { lazy, Suspense, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SolveResult as ApiSolveResult } from '@api/solver/types'
import { titleRevealDelay, useRouteTitleReveal } from '@src/motion/routeReveal'
import { useSplitReveal } from '@src/motion/useSplitReveal'
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
  const heroRef = useRef<HTMLElement>(null)
  const titleReveal = useRouteTitleReveal()
  useSplitReveal(heroRef, {
    delay: titleRevealDelay,
    enabled: titleReveal,
  })
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
    <main
      className='h-full min-h-0 flex-1 overflow-y-auto bg-background px-4 py-8 text-foreground md:px-8 md:py-10'
      data-route-scroll='true'
    >
      <section className='mx-auto grid w-full max-w-7xl content-start gap-8'>
        <header ref={heroRef} className='border-b-2 border-foreground pb-6'>
          <div className='mb-5 flex items-center gap-3'>
            <span className='label-mono bg-cube-blue px-2 py-1 text-cube-white'>01 / SOLVER</span>
            <span className='h-0.5 flex-1 bg-foreground' />
            <span className='label-mono opacity-55'>
              {metadata.apiReady ? 'API ONLINE' : 'API OFFLINE'}
            </span>
          </div>
          <h1
            className='font-display text-[clamp(3rem,7vw,6.5rem)] font-extrabold uppercase leading-[0.82] tracking-[-0.055em]'
            data-split='true'
          >
            {t('solve.heroTitle')}
            <span className='text-cube-blue'>.</span>
          </h1>
          <p className='mt-5 max-w-xl text-sm leading-6 text-muted-foreground md:text-base'>
            {t('solve.heroSubtitle')}
          </p>
        </header>
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
