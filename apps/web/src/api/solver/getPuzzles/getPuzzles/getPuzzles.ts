import { apiRequest } from '@api/client'
import { parsePuzzleDefinitions } from '../../types/validation'

export async function getPuzzles(signal?: AbortSignal) {
  return parsePuzzleDefinitions(await apiRequest<unknown>('/puzzles', { signal }))
}
