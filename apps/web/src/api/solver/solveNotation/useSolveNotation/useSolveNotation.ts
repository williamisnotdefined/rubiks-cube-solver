import { useMutation } from '@tanstack/react-query'
import type { SolveNotationVariables } from '../../types'
import { solveNotation } from '../solveNotation'

export function useSolveNotation() {
  return useMutation({
    mutationFn: (variables: SolveNotationVariables) => solveNotation(variables),
  })
}
