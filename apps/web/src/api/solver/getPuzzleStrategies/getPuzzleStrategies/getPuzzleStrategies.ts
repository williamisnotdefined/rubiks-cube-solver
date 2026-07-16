import { apiRequest } from '@api/client'
import type { PuzzleSlug } from '../../types'
import { parsePuzzleStrategies } from '../../types/validation'

export async function getPuzzleStrategies(puzzleSlug: PuzzleSlug, signal?: AbortSignal) {
  return parsePuzzleStrategies(
    await apiRequest<unknown>(`/puzzles/${encodeURIComponent(puzzleSlug)}/strategies`, {
      signal,
    }),
  )
}
