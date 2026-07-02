import { apiRequest } from '@api/client'
import type { HealthResponse } from '../../types'

export function getHealth() {
  return apiRequest<HealthResponse>('/health')
}
