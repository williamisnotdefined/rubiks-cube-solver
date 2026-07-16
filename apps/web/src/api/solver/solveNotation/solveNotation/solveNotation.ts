import { postJsonResponse } from '@api/client'
import type { SolveNotationVariables } from '../../types'
import { parseApiSolveResponse } from '../../types/validation'
import { normalizeSolveResponse } from '../normalizeSolveResponse'

export async function solveNotation({ notation, limits }: SolveNotationVariables) {
  const result = await postJsonResponse<unknown>('/solve-notation', {
    moves: notation,
    maxDepth: limits.maxDepth,
    maxNodes: limits.maxNodes,
    strategyId: limits.strategyId,
  })

  return normalizeSolveResponse(
    parseApiSolveResponse(result.payload),
    result.httpOk,
    result.requestElapsedMs,
  )
}
