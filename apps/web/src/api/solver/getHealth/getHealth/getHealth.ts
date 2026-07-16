import { apiRequest } from '@api/client'
import { parseHealthResponse } from '../../types/validation'

export async function getHealth(signal?: AbortSignal) {
  return parseHealthResponse(await apiRequest<unknown>('/health', { signal }))
}
