import { apiRequest } from '@api/client'
import type { PuzzleSlug, PuzzleStrategyOption } from '../types'

export function getPuzzleStrategies(puzzleSlug: PuzzleSlug) {
  return apiRequest<PuzzleStrategyOption[]>(
    `/puzzles/${encodeURIComponent(puzzleSlug)}/strategies`,
  )
}
