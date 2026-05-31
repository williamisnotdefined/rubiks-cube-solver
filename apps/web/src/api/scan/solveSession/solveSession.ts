import { postJsonResponse } from '@api/client'
import type { ScanSessionResult, SolveScanSessionVariables } from '../types'

export async function solveScanSession({
  faces,
  maxDepth,
  maxNodes,
  strategyId,
}: SolveScanSessionVariables): Promise<ScanSessionResult> {
  const result = await postJsonResponse<ScanSessionResult>('/scan/solve-session', {
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
