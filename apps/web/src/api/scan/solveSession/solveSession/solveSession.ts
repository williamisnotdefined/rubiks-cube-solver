import { ApiRequestError, postJsonResponse } from '@api/client'
import { normalizeSolveResponse } from '@api/solver/solveNotation/normalizeSolveResponse'
import type { ScanSessionResult, SolveScanSessionVariables } from '../../types'
import {
  assertSolveScanSessionVariables,
  genericApiErrorMessage,
  parseScanSessionResult,
  type RawScanSessionResult,
} from '../../validation'

export async function solveScanSession({
  faces,
  maxDepth,
  maxNodes,
  puzzleSlug,
  signal,
  strategyId,
}: SolveScanSessionVariables): Promise<ScanSessionResult> {
  assertSolveScanSessionVariables({
    faces,
    maxDepth,
    maxNodes,
    puzzleSlug,
    signal,
    strategyId,
  })

  const path =
    puzzleSlug === undefined
      ? '/scan/solve-session'
      : `/puzzles/${encodeURIComponent(puzzleSlug)}/scan/solve-session`
  const result = await postJsonResponse<unknown>(
    path,
    {
      faces,
      maxDepth,
      maxNodes,
      strategyId,
    },
    { signal },
  )

  const errorMessage = genericApiErrorMessage(result.payload)
  if (!result.httpOk && errorMessage !== undefined) {
    throw new ApiRequestError(errorMessage, result.status, result.payload)
  }

  if (!result.httpOk && payloadClaimsSuccess(result.payload)) {
    throw new ApiRequestError(
      result.statusText || 'The scan session request failed.',
      result.status,
      result.payload,
    )
  }

  const payload = parseScanSessionResult(result.payload, puzzleSlug)

  return normalizeScanSessionResult(payload, result.requestElapsedMs)
}

function payloadClaimsSuccess(payload: unknown): boolean {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    !Array.isArray(payload) &&
    'ok' in payload &&
    payload.ok === true
  )
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
