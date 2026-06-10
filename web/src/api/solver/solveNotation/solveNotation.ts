import { postJsonResponse } from '@api/client'
import type { ApiSolveResponse, SolveNotationVariables } from '../types'
import { normalizeSolveResponse } from './normalizeSolveResponse'

export async function solveNotation({ notation, limits }: SolveNotationVariables) {
  const result = await postJsonResponse<ApiSolveResponse>('/solve-notation', {
    moves: notation,
    maxDepth: limits.maxDepth,
    maxNodes: limits.maxNodes,
    strategyId: limits.strategyId,
  })

  return normalizeSolveResponse(result.payload, result.httpOk, result.requestElapsedMs)
}
