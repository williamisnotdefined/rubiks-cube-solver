import { postJsonResponse } from '@api/client'
import type { AnalyzeScanFaceResponse, AnalyzeScanFaceVariables } from '../types'

export async function analyzeScanFace({
  expectedCenter,
  gridSize,
  image,
  signal,
}: AnalyzeScanFaceVariables): Promise<AnalyzeScanFaceResponse> {
  const result = await postJsonResponse<AnalyzeScanFaceResponse>('/scan/analyze-face', {
    expectedCenter,
    gridSize,
    image,
  }, {
    signal,
  })

  if (result.payload !== undefined) {
    return result.payload
  }

  return {
    ok: false,
    status: result.httpOk ? 'vision_error' : 'vision_unavailable',
    message: result.statusText || 'The scan analysis request failed.',
    centerMismatch: false,
    confidence: 0,
    detectedCenterConfidence: 0,
    faceConfidence: 0,
    detectionMode: 'rejected',
    stickers: [],
    tileDetections: [],
    qualityWarnings: [],
    warnings: [],
  }
}
