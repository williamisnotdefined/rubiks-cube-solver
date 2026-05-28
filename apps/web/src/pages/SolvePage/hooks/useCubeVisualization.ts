import { useEffect, useRef, type RefObject } from 'react'
import type { Movement } from '@houstonp/rubiks-cube/core'
import type { RubiksCubeElement } from '@houstonp/rubiks-cube/view'

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
) {
  const visualMovesRef = useRef<Movement[]>([])
  const visualSyncIdRef = useRef(0)
  const visualHasSyncedRef = useRef(false)

  useEffect(() => {
    const syncId = visualSyncIdRef.current + 1
    visualSyncIdRef.current = syncId
    const parsed = parseVisualizationNotation(notation)
    if (parsed.status !== 'valid') {
      return
    }

    const timeout = window.setTimeout(() => {
      void syncCubeVisualization({
        cube: cubeRef.current,
        nextMoves: parsed.moves,
        previousMoves: visualMovesRef.current,
        hasSynced: visualHasSyncedRef.current,
        shouldContinue: () => visualSyncIdRef.current === syncId,
        onSynced: (moves) => {
          visualMovesRef.current = moves
          visualHasSyncedRef.current = true
        },
      })
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [cubeRef, notation])
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
  previousMoves: Movement[]
  hasSynced: boolean
  shouldContinue: () => boolean
  onSynced: (moves: Movement[]) => void
}

async function syncCubeVisualization({
  cube,
  nextMoves,
  previousMoves,
  hasSynced,
  shouldContinue,
  onSynced,
}: SyncCubeVisualizationInput): Promise<void> {
  if (cube === null || !shouldContinue()) {
    return
  }

  const animateNewMoves =
    hasSynced &&
    startsWithMoves(nextMoves, previousMoves) &&
    nextMoves.length > previousMoves.length
  const movesToApply = animateNewMoves
    ? nextMoves.slice(previousMoves.length)
    : nextMoves

  onSynced(nextMoves)

  try {
    if (!animateNewMoves) {
      cube.reset()
    }

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
