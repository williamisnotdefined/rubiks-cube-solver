import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import type { RubiksCubeElement } from '@rubiks-cube-solver/rubiks-cube/view'
import type { SolveSuccessResult } from '@api/solver/types'
import { isVisualizationRegistered } from '@components/VisualizationRegistration'
import type { CubeStageCubeType } from '../../visualization/CubeStage'
import { useCubeVisualization } from '../../visualization/hooks/useCubeVisualization'
import type { SolveSource } from '../useSolveResultFlow/useSolveResultFlow'

const visualizationAutoLoadDelayMs = 3000

type UseSolveVisualizationControllerInput = {
  activeSolveSource: SolveSource
  notation: string
  successResult?: SolveSuccessResult
  visibleSolutionMoves: readonly string[]
  visualizationCubeType?: CubeStageCubeType
  visualizationSupported: boolean
}

export function useSolveVisualizationController({
  activeSolveSource,
  notation,
  successResult,
  visibleSolutionMoves,
  visualizationCubeType,
  visualizationSupported,
}: UseSolveVisualizationControllerInput) {
  const cubeRef = useRef<RubiksCubeElement | null>(null)
  const [cubeReadyRevision, markCubeReady] = useReducer((revision: number) => revision + 1, 0)
  const [visualizationRequested, setVisualizationRequested] = useState(() =>
    isVisualizationRegistered('cube'),
  )
  const visualizationState = successResult?.visualState
  const visualizationStateKind = successResult?.visualStateKind
  const useInverseSolutionVisualization =
    activeSolveSource === 'scan' && visualizationCubeType === 'Two' && successResult !== undefined
  const visualizationNotation = buildVisualizationNotation({
    activeSolveSource,
    notation,
    successResult,
    useInverseSolutionVisualization,
    visibleSolutionMoves,
    visualizationState,
    visualizationSupported,
  })
  const visualizationStateForCube = useInverseSolutionVisualization ? undefined : visualizationState
  const visualizationStateKindForCube = useInverseSolutionVisualization
    ? undefined
    : visualizationStateKind
  const shouldLoadForInteraction =
    visualizationSupported && (notation.trim().length > 0 || successResult !== undefined)
  useCubeVisualization(
    cubeRef,
    visualizationNotation,
    cubeReadyRevision,
    visualizationSupported ? visualizationStateForCube : undefined,
    visualizationSupported ? visualizationStateKindForCube : undefined,
    visualizationCubeType,
    visualizationSupported && visualizationRequested,
  )

  const requestVisualization = useCallback(() => {
    setVisualizationRequested(true)
  }, [])

  useEffect(() => {
    if (shouldLoadForInteraction) {
      requestVisualization()
    }
  }, [requestVisualization, shouldLoadForInteraction])

  useEffect(() => {
    if (!visualizationSupported || visualizationRequested) {
      return undefined
    }

    const timeout = window.setTimeout(requestVisualization, visualizationAutoLoadDelayMs)

    return () => window.clearTimeout(timeout)
  }, [requestVisualization, visualizationRequested, visualizationSupported])

  return {
    cubeRef,
    cubeType: visualizationCubeType,
    loadRequested: visualizationRequested,
    onLoadRequest: requestVisualization,
    onReady: markCubeReady,
  }
}

type BuildVisualizationNotationInput = {
  activeSolveSource: SolveSource
  notation: string
  successResult?: SolveSuccessResult
  useInverseSolutionVisualization: boolean
  visibleSolutionMoves: readonly string[]
  visualizationState?: string
  visualizationSupported: boolean
}

function buildVisualizationNotation({
  activeSolveSource,
  notation,
  successResult,
  useInverseSolutionVisualization,
  visibleSolutionMoves,
  visualizationState,
  visualizationSupported,
}: BuildVisualizationNotationInput): string {
  if (!visualizationSupported) {
    return ''
  }

  if (useInverseSolutionVisualization && successResult !== undefined) {
    return notationWithSolutionPrefix(
      invertMoveSequence(successResult.moves).join(' '),
      visibleSolutionMoves,
    )
  }

  if (visualizationState === undefined) {
    const solutionMoves = activeSolveSource === 'notation' ? visibleSolutionMoves : []
    return notationWithSolutionPrefix(notation, solutionMoves)
  }

  return visibleSolutionMoves.join(' ')
}

function notationWithSolutionPrefix(notation: string, solutionMoves: readonly string[]): string {
  return [notation.trim(), ...solutionMoves].filter(Boolean).join(' ')
}

function invertMoveSequence(moves: readonly string[]): string[] {
  return moves.slice().reverse().map(invertMoveToken)
}

function invertMoveToken(move: string): string {
  if (move.endsWith('2')) {
    return move
  }

  return move.endsWith("'") ? move.slice(0, -1) : `${move}'`
}
