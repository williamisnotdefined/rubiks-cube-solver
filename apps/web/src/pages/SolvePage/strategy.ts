import type { PuzzleDefinition, PuzzleStrategyOption, SolverStrategyOption } from '@api/solver/types'
import { fallbackStrategyId, preferredQualityStrategyId } from './constants'

export function preferredStrategyId(
  strategyOptions: readonly (PuzzleStrategyOption | SolverStrategyOption)[] | undefined,
  puzzle?: PuzzleDefinition,
): string {
  if (
    puzzle?.slug === 'cube-3x3x3' &&
    strategyOptions?.some((option) => option.id === preferredQualityStrategyId) === true
  ) {
    return preferredQualityStrategyId
  }

  if (
    puzzle?.defaultStrategyId !== undefined &&
    strategyOptions?.some((option) => option.id === puzzle.defaultStrategyId) === true
  ) {
    return puzzle.defaultStrategyId
  }

  if (strategyOptions !== undefined && strategyOptions.length > 0) {
    return strategyOptions[0].id
  }

  return fallbackStrategyId
}
