import { postJsonResponse } from '@api/client'
import type { ScanSessionResult, SolveScanSessionVariables } from '../types'

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
  const result = await postJsonResponse<ScanSessionResult>(path, {
    faces,
    maxDepth,
    maxNodes,
    strategyId,
  })

  if (result.payload !== undefined) {
    return result.payload
  }

  return {
    ok: false,
    status: result.httpOk ? 'api_error' : 'vision_unavailable',
    message: result.statusText || 'The scan session request failed.',
    manualTargets: [],
    rescanFaces: [],
  }
}
