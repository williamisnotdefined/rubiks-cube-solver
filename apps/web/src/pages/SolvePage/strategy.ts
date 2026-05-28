import type { SolverStrategyOption } from '@api/solver/types'
import { fallbackStrategyId, preferredQualityStrategyId } from './constants'

export function preferredStrategyId(
  strategyOptions: readonly SolverStrategyOption[] | undefined,
): string {
  if (
    strategyOptions?.some((option) => option.id === preferredQualityStrategyId) === true
  ) {
    return preferredQualityStrategyId
  }

  return fallbackStrategyId
}
