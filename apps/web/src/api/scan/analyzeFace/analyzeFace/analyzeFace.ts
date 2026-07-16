import { ApiRequestError, postJsonResponse } from '@api/client'
import type { AnalyzeScanFaceResponse, AnalyzeScanFaceVariables } from '../../types'
import {
  assertAnalyzeScanFaceVariables,
  genericApiErrorMessage,
  parseAnalyzeScanFaceResponse,
} from '../../validation'

export async function analyzeScanFace({
  expectedCenter,
  gridSize,
  image,
  signal,
}: AnalyzeScanFaceVariables): Promise<AnalyzeScanFaceResponse> {
  assertAnalyzeScanFaceVariables({ expectedCenter, gridSize, image, signal })

  const result = await postJsonResponse<unknown>(
    '/scan/analyze-face',
    {
      expectedCenter,
      gridSize,
      image,
    },
    {
      signal,
    },
  )

  const errorMessage = genericApiErrorMessage(result.payload)
  if (!result.httpOk && errorMessage !== undefined) {
    throw new ApiRequestError(errorMessage, result.status, result.payload)
  }

  const payload = parseAnalyzeScanFaceResponse(result.payload, gridSize)
  if (!result.httpOk && payload.ok) {
    throw new ApiRequestError(
      result.statusText || 'The scan analysis request failed.',
      result.status,
      result.payload,
    )
  }

  return payload
}
