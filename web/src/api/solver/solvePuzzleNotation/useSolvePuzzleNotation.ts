import { useMutation } from '@tanstack/react-query'
import type { SolvePuzzleNotationVariables } from '../types'
import { solvePuzzleNotation } from './solvePuzzleNotation'

export function useSolvePuzzleNotation() {
  return useMutation({
    mutationFn: (variables: SolvePuzzleNotationVariables) => solvePuzzleNotation(variables),
  })
}
