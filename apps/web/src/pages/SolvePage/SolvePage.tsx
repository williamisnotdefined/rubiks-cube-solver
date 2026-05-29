import { useReducer, useRef, useState, type FormEvent } from 'react'
import type { RubiksCubeElement } from '@houstonp/rubiks-cube/view'
import { useGetHealth, useGetStrategies, useSolveNotation } from '@api/solver'
import { waitForPaint } from '@core/timing/waitForPaint'
import { CubeStage } from './CubeStage'
import { SolveForm } from './SolveForm'
import { SolveResult } from './SolveResult'
import { SolutionPlayback } from './SolutionPlayback'
import {
  defaultMaxMoves,
  defaultMaxNodesMillion,
  defaultNotation,
  maxMovesLimit,
  nodesPerMillion,
  scramblePlaceholder,
} from './constants'
import { useCubeVisualization } from './hooks/useCubeVisualization'
import { preferredStrategyId } from './strategy'
import {
  validateMaxNodesMillionOption,
  validateWholeNumberLimit,
} from './validation'

export function SolvePage() {
  const cubeRef = useRef<RubiksCubeElement | null>(null)
  const healthQuery = useGetHealth()
  const strategiesQuery = useGetStrategies({ enabled: healthQuery.data?.ok === true })
  const solveMutation = useSolveNotation()
  const [cubeReadyRevision, markCubeReady] = useReducer(
    (revision: number) => revision + 1,
    0,
  )
  const [notation, setNotation] = useState(defaultNotation)
  const [maxMovesInput, setMaxMovesInput] = useState(String(defaultMaxMoves))
  const [maxNodesMillionInput, setMaxNodesMillionInput] = useState(
    String(defaultMaxNodesMillion),
  )
  const [solutionStep, setSolutionStep] = useState(0)
  const successResult =
    solveMutation.data?.status === 'success' ? solveMutation.data : undefined
  const visibleSolutionStep = clampSolutionStep(
    solutionStep,
    successResult?.moves.length ?? 0,
  )
  const visualizationNotation = notationWithSolutionPrefix(
    notation,
    successResult?.moves.slice(0, visibleSolutionStep) ?? [],
  )

  useCubeVisualization(cubeRef, visualizationNotation, cubeReadyRevision)

  const strategyOptions = strategiesQuery.data ?? []
  const apiReady = healthQuery.data?.ok === true && strategiesQuery.isSuccess
  const solving = solveMutation.isPending
  const buttonLoading = !apiReady || solving
  const strategyId = preferredStrategyId(strategyOptions)
  const maxMoves = Number(maxMovesInput)
  const maxNodesMillion = Number(maxNodesMillionInput)
  const maxNodes = maxNodesMillion * nodesPerMillion
  const maxMovesValidation = validateWholeNumberLimit(
    maxMovesInput,
    'Max moves',
    maxMovesLimit,
  )
  const maxNodesValidation = validateMaxNodesMillionOption(maxNodesMillionInput)
  const localValidationMessage = maxMovesValidation ?? maxNodesValidation
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
    solveMutation.reset()
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

  return (
    <main className="app-shell min-h-screen w-full bg-background px-3 py-4 text-foreground sm:px-5 sm:py-6">
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
          onNotationChange={handleNotationChange}
          onMaxMovesChange={handleMaxMovesChange}
          onMaxNodesMillionChange={handleMaxNodesMillionChange}
          onSubmit={handleSubmit}
        />
        <SolveResult
          result={solveMutation.data}
          error={solveMutation.error}
          solving={solving}
          localValidationMessage={localValidationMessage}
        />
        <SolutionPlayback
          moves={successResult?.moves ?? []}
          step={visibleSolutionStep}
          onStepChange={handleSolutionStepChange}
        />
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
