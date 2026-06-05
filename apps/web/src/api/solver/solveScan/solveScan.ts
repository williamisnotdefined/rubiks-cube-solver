import { postJsonResponse } from '@api/client'
import type { ApiSolveResponse, SolveScanVariables } from '../types'
import { normalizeSolveResponse } from '../solveNotation/normalizeSolveResponse'

export async function solveScan({ faces, limits }: SolveScanVariables) {
  const result = await postJsonResponse<ApiSolveResponse>('/solve-scan', {
    faces,
    maxDepth: limits.maxDepth,
    maxNodes: limits.maxNodes,
    strategyId: limits.strategyId,
  })

  return normalizeSolveResponse(result.payload, result.httpOk, result.requestElapsedMs)
}
