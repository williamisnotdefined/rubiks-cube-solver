import { useEffect, useRef, type RefObject } from 'react'
import type { Movement } from '@houstonp/rubiks-cube/core'
import type { RubiksCubeElement } from '@houstonp/rubiks-cube/view'
import type { PuzzleVisualizationKind } from '@api/solver/types'

const visualizationMoveTokens = [
  'U',
  'U2',
  "U'",
  'D',
  'D2',
  "D'",
  'L',
  'L2',
  "L'",
  'R',
  'R2',
  "R'",
  'F',
  'F2',
  "F'",
  'B',
  'B2',
  "B'",
] as const satisfies readonly Movement[]
const visualizationMoveTokenSet = new Set<string>(visualizationMoveTokens)

type VisualizationNotationParseResult =
  | { status: 'valid'; moves: Movement[] }
  | { status: 'invalid' }

export function useCubeVisualization(
  cubeRef: RefObject<RubiksCubeElement | null>,
  notation: string,
  readyRevision: number,
  visualState?: string,
  visualStateKind?: PuzzleVisualizationKind,
  cubeType?: 'Two' | 'Three',
  enabled = true,
) {
  const visualMovesRef = useRef<Movement[]>([])
  const visualStateRef = useRef<string | undefined>(undefined)
  const visualSyncIdRef = useRef(0)
  const visualHasSyncedRef = useRef(false)

  useEffect(() => {
    if (!enabled) {
      visualSyncIdRef.current += 1
      return undefined
    }

    const syncId = visualSyncIdRef.current + 1
    visualSyncIdRef.current = syncId
    const parsed = parseVisualizationNotation(notation)
    if (parsed.status !== 'valid') {
      return
    }
    const compatibleVisualState = compatibleVisualizationState(visualState, visualStateKind, cubeType)
    if (compatibleVisualState.status === 'invalid') {
      return
    }

    const timeout = window.setTimeout(() => {
      void syncCubeVisualization({
        cube: cubeRef.current,
        nextMoves: parsed.moves,
        nextState: compatibleVisualState.value,
        previousMoves: visualMovesRef.current,
        previousState: visualStateRef.current,
        hasSynced: visualHasSyncedRef.current,
        shouldContinue: () => visualSyncIdRef.current === syncId,
        onSynced: (moves, state) => {
          visualMovesRef.current = moves
          visualStateRef.current = state
          visualHasSyncedRef.current = true
        },
      })
    }, 0)

    return () => {
      visualSyncIdRef.current += 1
      window.clearTimeout(timeout)
    }
  }, [cubeRef, cubeType, enabled, notation, readyRevision, visualState, visualStateKind])
}

type CompatibleVisualizationStateResult =
  | { status: 'valid'; value: string | undefined }
  | { status: 'invalid' }

function compatibleVisualizationState(
  visualState: string | undefined,
  visualStateKind: PuzzleVisualizationKind | undefined,
  cubeType: 'Two' | 'Three' | undefined,
): CompatibleVisualizationStateResult {
  if (visualState === undefined) {
    return { status: 'valid', value: undefined }
  }

  if (visualStateKind === 'cube2-facelets-v1') {
    return cubeType === 'Two' && visualState.length === 24
      ? { status: 'valid', value: visualState }
      : { status: 'invalid' }
  }

  if (visualStateKind === 'cube3-facelets-v1') {
    return cubeType === 'Three' && visualState.length === 54
      ? { status: 'valid', value: visualState }
      : { status: 'invalid' }
  }

  return { status: 'invalid' }
}

function parseVisualizationNotation(input: string): VisualizationNotationParseResult {
  const trimmed = input.trim()
  if (trimmed.length === 0) {
    return { status: 'valid', moves: [] }
  }

  const moves: Movement[] = []
  for (const token of trimmed.split(/\s+/)) {
    if (!visualizationMoveTokenSet.has(token)) {
      return { status: 'invalid' }
    }

    moves.push(token as Movement)
  }

  return { status: 'valid', moves }
}

type SyncCubeVisualizationInput = {
  cube: RubiksCubeElement | null
  nextMoves: Movement[]
  nextState: string | undefined
  previousMoves: Movement[]
  previousState: string | undefined
  hasSynced: boolean
  shouldContinue: () => boolean
  onSynced: (moves: Movement[], state: string | undefined) => void
}

async function syncCubeVisualization({
  cube,
  nextMoves,
  nextState,
  previousMoves,
  previousState,
  hasSynced,
  shouldContinue,
  onSynced,
}: SyncCubeVisualizationInput): Promise<void> {
  if (cube === null || !shouldContinue()) {
    return
  }

  const animateNewMoves =
    hasSynced &&
    nextState === previousState &&
    startsWithMoves(nextMoves, previousMoves) &&
    nextMoves.length > previousMoves.length
  const movesToApply = animateNewMoves
    ? nextMoves.slice(previousMoves.length)
    : nextMoves

  try {
    if (!animateNewMoves) {
      if (nextState === undefined) {
        cube.reset()
      } else if (!cube.setState(nextState)) {
        return
      }
    }

    onSynced(nextMoves, nextState)

    for (const move of movesToApply) {
      if (!shouldContinue()) {
        return
      }

      await cube.move(move, animateNewMoves ? undefined : { animationSpeedMs: 0 })
    }
  } catch {
    // The custom element may still be finishing its first connection pass.
  }
}

function startsWithMoves(moves: readonly Movement[], prefix: readonly Movement[]): boolean {
  return prefix.every((move, index) => moves[index] === move)
}
