import { useCallback, useReducer, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { RubiksCubeElement } from '@houstonp/rubiks-cube/view'
import {
  useGetHealth,
  useGetPuzzleStrategies,
  useGetPuzzles,
  useSolvePuzzleNotation,
} from '@api/solver'
import type { SolveResult as ApiSolveResult } from '@api/solver/types'
import { waitForPaint } from '@core/timing/waitForPaint'
import { CubeStage, type CubeStageCubeType } from './CubeStage'
import { ScanCubeModal } from './ScanCubeModal'
import { SolveForm } from './SolveForm'
import { SolveResult } from './SolveResult'
import { SolutionPlayback } from './SolutionPlayback'
import {
  defaultNotation,
  maxMovesLimit,
  nodesPerMillion,
  scramblePlaceholder,
} from './constants'
import { useCubeVisualization } from './hooks/useCubeVisualization'
import { usePageActivity } from './hooks/usePageActivity'
import { useSolveSettingsStore } from './solveSettingsStore'
import { preferredStrategyId } from './strategy'
import {
  validateMaxNodesMillionOption,
  validateWholeNumberLimit,
  validationErrorMessage,
} from './validation'

const defaultPuzzleSlug = 'cube-3x3x3'
const cube3VisualizationKind = 'cube3-facelets-v1'
const cube2VisualizationKind = 'cube2-facelets-v1'

export function SolvePage() {
  const { t } = useTranslation()
  const cubeRef = useRef<RubiksCubeElement | null>(null)
  const healthQuery = useGetHealth()
  const puzzlesQuery = useGetPuzzles({ enabled: healthQuery.data?.ok === true })
  const [selectedPuzzleSlug, setSelectedPuzzleSlug] = useState(defaultPuzzleSlug)
  const selectedPuzzle = puzzleBySlug(puzzlesQuery.data, selectedPuzzleSlug)
  const strategiesQuery = useGetPuzzleStrategies({
    enabled: healthQuery.data?.ok === true && selectedPuzzle !== undefined,
    puzzleSlug: selectedPuzzleSlug,
  })
  const solveMutation = useSolvePuzzleNotation()
  const cubeActive = usePageActivity()
  const [cubeReadyRevision, markCubeReady] = useReducer(
    (revision: number) => revision + 1,
    0,
  )
  const [notation, setNotation] = useState(defaultNotation)
  const maxMovesInput = useSolveSettingsStore((state) => state.maxMovesInput)
  const maxNodesMillionInput = useSolveSettingsStore((state) => state.maxNodesMillionInput)
  const setMaxMovesInput = useSolveSettingsStore((state) => state.setMaxMovesInput)
  const setMaxNodesMillionInput = useSolveSettingsStore(
    (state) => state.setMaxNodesMillionInput,
  )
  const [solutionStep, setSolutionStep] = useState(0)
  const [scanModalOpen, setScanModalOpen] = useState(false)
  const [scanSessionSolving, setScanSessionSolving] = useState(false)
  const [activeSolveSource, setActiveSolveSource] = useState<'notation' | 'scan'>('notation')
  const [scanSessionSolveResult, setScanSessionSolveResult] = useState<ApiSolveResult | undefined>()
  const activeSolveResult = activeSolveSource === 'scan' ? scanSessionSolveResult : solveMutation.data
  const activeSolveError = activeSolveSource === 'scan' ? null : solveMutation.error
  const successResult =
    activeSolveResult?.status === 'success' ? activeSolveResult : undefined
  const visibleSolutionStep = clampSolutionStep(
    solutionStep,
    successResult?.moves.length ?? 0,
  )
  const visibleSolutionMoves = successResult?.moves.slice(0, visibleSolutionStep) ?? []
  const visualizationState = successResult?.visualState
  const visualizationCubeType: CubeStageCubeType | undefined =
    selectedPuzzle?.supportedVisualizations.includes(cube2VisualizationKind) === true
      ? 'Two'
      : selectedPuzzle?.supportedVisualizations.includes(cube3VisualizationKind) === true
        ? 'Three'
        : undefined
  const visualizationSupported = visualizationCubeType !== undefined
  const visualizationNotation =
    visualizationState === undefined && visualizationSupported
      ? notationWithSolutionPrefix(
          notation,
          activeSolveSource === 'notation' ? visibleSolutionMoves : [],
        )
      : visualizationSupported
        ? visibleSolutionMoves.join(' ')
        : ''

  useCubeVisualization(
    cubeRef,
    visualizationNotation,
    cubeReadyRevision,
    visualizationSupported ? visualizationState : undefined,
    cubeActive && visualizationSupported,
  )

  const strategyOptions = strategiesQuery.data ?? []
  const puzzleOptions = puzzlesQuery.data ?? []
  const strategyId = preferredStrategyId(strategyOptions, selectedPuzzle)
  const scanAvailable = selectedPuzzle?.scannerSupported === true
  const activeScramblePlaceholder =
    selectedPuzzleSlug === 'cube-2x2x2' ? 'R U F' : scramblePlaceholder
  const apiReady =
    healthQuery.data?.ok === true &&
    puzzlesQuery.isSuccess &&
    strategiesQuery.isSuccess &&
    selectedPuzzle !== undefined
  const solving = solveMutation.isPending || scanSessionSolving
  const buttonLoading = !apiReady || solving
  const maxMoves = Number(maxMovesInput)
  const maxNodesMillion = Number(maxNodesMillionInput)
  const maxNodes = maxNodesMillion * nodesPerMillion
  const maxMovesValidation = validateWholeNumberLimit(
    maxMovesInput,
    t('solve.form.maxMoves'),
    maxMovesLimit,
  )
  const maxNodesValidation = validateMaxNodesMillionOption(
    maxNodesMillionInput,
    t('solve.form.maxNodesMillion'),
  )
  const localValidationMessage = validationErrorMessage(
    t,
    maxMovesValidation ?? maxNodesValidation,
  )
  const disabled =
    !apiReady ||
    solving ||
    notation.trim().length === 0 ||
    strategyOptions.length === 0 ||
    strategyId.length === 0 ||
    localValidationMessage !== undefined

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!apiReady || localValidationMessage !== undefined) {
      return
    }

    setSolutionStep(0)
    setActiveSolveSource('notation')
    setScanSessionSolveResult(undefined)

    try {
      const solvePromise = solveMutation.mutateAsync({
        notation: notation.trim(),
        puzzleSlug: selectedPuzzleSlug,
        limits: {
          maxDepth: maxMoves,
          maxNodes,
          strategyId,
        },
      })
      await waitForPaint()
      await solvePromise
    } catch {
      // React Query owns the error state rendered below.
    }
  }

  function resetSolveResult() {
    setSolutionStep(0)
    setActiveSolveSource('notation')
    solveMutation.reset()
    setScanSessionSolveResult(undefined)
  }

  function handleSolutionStepChange(nextStep: number) {
    setSolutionStep(clampSolutionStep(nextStep, successResult!.moves.length))
  }

  function handleNotationChange(nextNotation: string) {
    setNotation(nextNotation)
    resetSolveResult()
  }

  function handlePuzzleChange(nextPuzzleSlug: string) {
    setSelectedPuzzleSlug(nextPuzzleSlug)
    resetSolveResult()
  }

  function handleMaxMovesChange(nextMaxMoves: string) {
    setMaxMovesInput(nextMaxMoves)
    resetSolveResult()
  }

  function handleMaxNodesMillionChange(nextMaxNodesMillion: string) {
    setMaxNodesMillionInput(nextMaxNodesMillion)
    resetSolveResult()
  }

  function handleScanSessionSolveResult(solve: ApiSolveResult) {
    setSolutionStep(0)
    setActiveSolveSource('scan')
    solveMutation.reset()
    setScanSessionSolveResult(solve)
  }

  const handleScanSessionSolvingChange = useCallback((nextSolving: boolean) => {
    setScanSessionSolving(nextSolving)
  }, [])

  function handleScanClick() {
    if (scanAvailable) {
      setScanModalOpen(true)
    }
  }

  return (
    <main className="app-shell min-h-screen w-full bg-app-bg px-3 py-4 text-app-text sm:px-5 sm:py-6">
      <section className="mx-auto grid w-full max-w-4xl content-start justify-items-center gap-4">
        {visualizationCubeType !== undefined ? (
          <CubeStage
            key={visualizationCubeType}
            active={cubeActive}
            cubeType={visualizationCubeType}
            cubeRef={cubeRef}
            onReady={markCubeReady}
          />
        ) : (
          <section
            className="cube-stage flex aspect-square w-[min(280px,calc(100vw-24px))] items-center justify-center border border-app-border bg-app-surface px-5 text-center text-sm font-semibold text-app-muted"
            aria-label={t('cube.visualizationUnavailable')}
          >
            {t('cube.visualizationUnavailable')}
          </section>
        )}
        <SolveForm
          notation={notation}
          puzzleOptions={puzzleOptions}
          selectedPuzzleSlug={selectedPuzzleSlug}
          maxMovesInput={maxMovesInput}
          maxNodesMillionInput={maxNodesMillionInput}
          buttonLoading={buttonLoading}
          disabled={disabled}
          maxMovesInvalid={maxMovesValidation !== undefined}
          maxNodesInvalid={maxNodesValidation !== undefined}
          scanAvailable={scanAvailable}
          scramblePlaceholder={activeScramblePlaceholder}
          onScanClick={handleScanClick}
          onNotationChange={handleNotationChange}
          onPuzzleChange={handlePuzzleChange}
          onMaxMovesChange={handleMaxMovesChange}
          onMaxNodesMillionChange={handleMaxNodesMillionChange}
          onSubmit={handleSubmit}
        />
        <SolveResult
          result={activeSolveResult}
          error={activeSolveError}
          solving={solving}
          localValidationMessage={localValidationMessage}
        />
        {successResult !== undefined && visualizationSupported ? (
          <SolutionPlayback
            moves={successResult.moves}
            step={visibleSolutionStep}
            onStepChange={handleSolutionStepChange}
          />
        ) : null}
        {scanModalOpen && scanAvailable ? (
          <ScanCubeModal
            apiReady={apiReady}
            maxDepth={maxMoves}
            maxNodes={maxNodes}
            solveDisabledReason={localValidationMessage}
            solving={solving}
            puzzleSlug={selectedPuzzleSlug}
            strategyId={strategyId}
            visionCnnAvailable={healthQuery.data?.visionCnnAvailable}
            visionCnnReason={healthQuery.data?.visionCnnReason}
            visionTileDetectorAvailable={healthQuery.data?.visionTileDetectorAvailable}
            visionTileDetectorReason={healthQuery.data?.visionTileDetectorReason}
            visionOk={healthQuery.data?.visionOk}
            onClose={() => setScanModalOpen(false)}
            onSessionSolvingChange={handleScanSessionSolvingChange}
            onSessionSolveResult={handleScanSessionSolveResult}
          />
        ) : null}
      </section>
    </main>
  )
}

function puzzleBySlug<TPuzzle extends { slug: string }>(
  puzzles: readonly TPuzzle[] | undefined,
  slug: string,
): TPuzzle | undefined {
  return puzzles?.find((puzzle) => puzzle.slug === slug)
}

function notationWithSolutionPrefix(
  notation: string,
  solutionMoves: readonly string[],
): string {
  return [notation.trim(), ...solutionMoves].filter(Boolean).join(' ')
}

function clampSolutionStep(step: number, maxStep: number): number {
  return Math.min(Math.max(step, 0), maxStep)
}
