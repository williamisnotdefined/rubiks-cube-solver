import { apiRequest } from '@api/client'
import type { SolverStrategyOption } from '../../types'

export function getStrategies() {
  return apiRequest<SolverStrategyOption[]>('/strategies')
}
