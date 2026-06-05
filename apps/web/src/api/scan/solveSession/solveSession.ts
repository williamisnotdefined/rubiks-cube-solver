import { postJsonResponse } from '@api/client'
import { normalizeSolveResponse } from '@api/solver/solveNotation/normalizeSolveResponse'
import type { ApiSolveResponse } from '@api/solver/types'
import type { ScanSessionResult, SolveScanSessionVariables } from '../types'

type RawScanSessionResult = Omit<ScanSessionResult, 'solve'> & {
  solve?: ApiSolveResponse
}

export async function solveScanSession({
  faces,
  maxDepth,
  maxNodes,
  puzzleSlug,
  strategyId,
}: SolveScanSessionVariables): Promise<ScanSessionResult> {
  const path = puzzleSlug === undefined
    ? '/scan/solve-session'
    : `/puzzles/${encodeURIComponent(puzzleSlug)}/scan/solve-session`
  const result = await postJsonResponse<RawScanSessionResult>(path, {
    faces,
    maxDepth,
    maxNodes,
    strategyId,
  })

  if (result.payload !== undefined) {
    return normalizeScanSessionResult(result.payload, result.requestElapsedMs)
  }

  return {
    ok: false,
    status: result.httpOk ? 'api_error' : 'vision_unavailable',
    message: result.statusText || 'The scan session request failed.',
    manualTargets: [],
    rescanFaces: [],
  }
}

function normalizeScanSessionResult(
  result: RawScanSessionResult,
  requestElapsedMs: number,
): ScanSessionResult {
  const { solve, ...sessionResult } = result

  if (solve === undefined) {
    return sessionResult
  }

  return {
    ...sessionResult,
    solve: normalizeSolveResponse(solve, solve.ok, requestElapsedMs),
  }
}
