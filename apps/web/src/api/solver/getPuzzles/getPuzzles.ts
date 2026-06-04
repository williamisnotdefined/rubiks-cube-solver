import { apiRequest } from '@api/client'
import type { PuzzleDefinition } from '../types'

export function getPuzzles() {
  return apiRequest<PuzzleDefinition[]>('/puzzles')
}
