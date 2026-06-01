import { useReducer, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { RubiksCubeElement } from '@houstonp/rubiks-cube/view'
import { useGetHealth, useGetStrategies, useSolveNotation, useSolveScan } from '@api/solver'
import type { ScanFacesPayload, SolveResult as ApiSolveResult } from '@api/solver/types'
import { waitForPaint } from '@core/timing/waitForPaint'
import { CubeStage } from './CubeStage'
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
import { useSolveSettingsStore } from './solveSettingsStore'
import { preferredStrategyId } from './strategy'
import {
  validateMaxNodesMillionOption,
  validateWholeNumberLimit,
  validationErrorMessage,
} from './validation'

export function SolvePage() {
  const { t } = useTranslation()
  const cubeRef = useRef<RubiksCubeElement | null>(null)
  const healthQuery = useGetHealth()
  const strategiesQuery = useGetStrategies({ enabled: healthQuery.data?.ok === true })
  const solveMutation = useSolveNotation()
  const scanMutation = useSolveScan()
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
  const [activeSolveSource, setActiveSolveSource] = useState<'notation' | 'scan'>('notation')
  const [scanSessionSolveResult, setScanSessionSolveResult] = useState<ApiSolveResult | undefined>()
  const activeSolveResult =
    activeSolveSource === 'scan' ? scanSessionSolveResult ?? scanMutation.data : solveMutation.data
  const activeSolveError = activeSolveSource === 'scan' ? scanMutation.error : solveMutation.error
  const successResult =
    activeSolveResult?.status === 'success' ? activeSolveResult : undefined
  const visibleSolutionStep = clampSolutionStep(
    solutionStep,
    successResult?.moves.length ?? 0,
  )
  const visibleSolutionMoves = successResult?.moves.slice(0, visibleSolutionStep) ?? []
  const visualizationState = successResult?.visualState
  const visualizationNotation =
    visualizationState === undefined
      ? notationWithSolutionPrefix(
          notation,
          activeSolveSource === 'notation' ? visibleSolutionMoves : [],
        )
      : visibleSolutionMoves.join(' ')

  useCubeVisualization(cubeRef, visualizationNotation, cubeReadyRevision, visualizationState)

  const strategyOptions = strategiesQuery.data ?? []
  const apiReady = healthQuery.data?.ok === true && strategiesQuery.isSuccess
  const solving = solveMutation.isPending || scanMutation.isPending
  const buttonLoading = !apiReady || solving
  const strategyId = preferredStrategyId(strategyOptions)
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
    localValidationMessage !== undefined

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!apiReady || localValidationMessage !== undefined) {
      return
    }

    setSolutionStep(0)
    setActiveSolveSource('notation')
    scanMutation.reset()
    setScanSessionSolveResult(undefined)

    try {
      const solvePromise = solveMutation.mutateAsync({
        notation: notation.trim(),
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
    scanMutation.reset()
    setScanSessionSolveResult(undefined)
  }

  function handleSolutionStepChange(nextStep: number) {
    setSolutionStep(clampSolutionStep(nextStep, successResult?.moves.length ?? 0))
  }

  function handleNotationChange(nextNotation: string) {
    setNotation(nextNotation)
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

  async function handleScanSolve(faces: ScanFacesPayload) {
    setSolutionStep(0)
    setActiveSolveSource('scan')
    solveMutation.reset()
    setScanSessionSolveResult(undefined)

    const solvePromise = scanMutation.mutateAsync({
      faces,
      limits: {
        maxDepth: maxMoves,
        maxNodes,
        strategyId,
      },
    })
    await waitForPaint()

    return solvePromise
  }

  function handleScanSessionAccepted(solve: ApiSolveResult) {
    setSolutionStep(0)
    setActiveSolveSource('scan')
    solveMutation.reset()
    scanMutation.reset()
    setScanSessionSolveResult(solve)
  }

  return (
    <main className="app-shell min-h-screen w-full bg-[#070707] px-3 py-4 text-[#f7f7f7] sm:px-5 sm:py-6">
      <section className="mx-auto grid w-full max-w-4xl content-start justify-items-center gap-4">
        <CubeStage cubeRef={cubeRef} onReady={markCubeReady} />
        <SolveForm
          notation={notation}
          maxMovesInput={maxMovesInput}
          maxNodesMillionInput={maxNodesMillionInput}
          buttonLoading={buttonLoading}
          disabled={disabled}
          maxMovesInvalid={maxMovesValidation !== undefined}
          maxNodesInvalid={maxNodesValidation !== undefined}
          scramblePlaceholder={scramblePlaceholder}
          onScanClick={() => setScanModalOpen(true)}
          onNotationChange={handleNotationChange}
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
        {successResult !== undefined ? (
          <SolutionPlayback
            moves={successResult?.moves ?? []}
            step={visibleSolutionStep}
            onStepChange={handleSolutionStepChange}
          />
        ) : null}
        {scanModalOpen ? (
          <ScanCubeModal
            apiReady={apiReady}
            maxDepth={maxMoves}
            maxNodes={maxNodes}
            solveDisabledReason={localValidationMessage}
            solving={scanMutation.isPending}
            strategyId={strategyId}
            visionCnnAvailable={healthQuery.data?.visionCnnAvailable}
            visionCnnReason={healthQuery.data?.visionCnnReason}
            visionTileDetectorAvailable={healthQuery.data?.visionTileDetectorAvailable}
            visionTileDetectorReason={healthQuery.data?.visionTileDetectorReason}
            visionOk={healthQuery.data?.visionOk}
            onClose={() => setScanModalOpen(false)}
            onSolve={handleScanSolve}
            onSessionAccepted={handleScanSessionAccepted}
          />
        ) : null}
      </section>
    </main>
  )
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
