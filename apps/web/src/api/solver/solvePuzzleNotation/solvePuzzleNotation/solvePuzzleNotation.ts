import { postJsonResponse } from '@api/client'
import type { ApiSolveResponse, SolvePuzzleNotationVariables } from '../../types'
import { normalizeSolveResponse } from '../../solveNotation/normalizeSolveResponse'

export async function solvePuzzleNotation({
  limits,
  notation,
  puzzleSlug,
}: SolvePuzzleNotationVariables) {
  const result = await postJsonResponse<ApiSolveResponse>(
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

  return normalizeSolveResponse(result.payload, result.httpOk, result.requestElapsedMs)
}
