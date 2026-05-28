import { useReducer, useRef, useState, type FormEvent } from 'react'
import type { RubiksCubeElement } from '@houstonp/rubiks-cube/view'
import { useGetHealth, useGetStrategies, useSolveNotation } from '@api/solver'
import { CubeStage } from './CubeStage'
import { SolveForm } from './SolveForm'
import { SolveResult } from './SolveResult'
import './SolvePage.css'
import {
  defaultMaxMoves,
  defaultMaxNodesMillion,
  defaultNotation,
  maxMovesLimit,
  nodesPerMillion,
} from './constants'
import { useCubeVisualization } from './hooks/useCubeVisualization'
import { preferredStrategyId } from './strategy'
import { waitForPaint } from './timing'
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

  useCubeVisualization(cubeRef, notation, cubeReadyRevision)

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
    solveMutation.reset()
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
    <main className="app-shell">
      <CubeStage cubeRef={cubeRef} onReady={markCubeReady} />
      <SolveForm
        notation={notation}
        maxMovesInput={maxMovesInput}
        maxNodesMillionInput={maxNodesMillionInput}
        buttonLoading={buttonLoading}
        disabled={disabled}
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
    </main>
  )
}
