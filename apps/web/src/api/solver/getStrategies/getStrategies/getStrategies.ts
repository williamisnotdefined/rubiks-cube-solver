import { apiRequest } from '@api/client'
import { parseSolverStrategies } from '../../types/validation'

export async function getStrategies(signal?: AbortSignal) {
  return parseSolverStrategies(await apiRequest<unknown>('/strategies', { signal }))
}
