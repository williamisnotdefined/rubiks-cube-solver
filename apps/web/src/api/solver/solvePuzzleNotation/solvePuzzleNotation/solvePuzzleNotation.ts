import { postJsonResponse } from '@api/client'
import type { SolvePuzzleNotationVariables } from '../../types'
import { parseApiSolveResponse } from '../../types/validation'
import { normalizeSolveResponse } from '../../solveNotation/normalizeSolveResponse'

export async function solvePuzzleNotation({
  limits,
  notation,
  puzzleSlug,
}: SolvePuzzleNotationVariables) {
  const result = await postJsonResponse<unknown>(
    `/puzzles/${encodeURIComponent(puzzleSlug)}/solve`,
    {
      input: {
        kind: 'notation',
        value: notation,
      },
      limits: {
        maxDepth: limits.maxDepth,
        maxNodes: limits.maxNodes,
      },
      metric: 'htm',
      strategyId: limits.strategyId,
    },
  )

  return normalizeSolveResponse(
    parseApiSolveResponse(result.payload),
    result.httpOk,
    result.requestElapsedMs,
  )
}
