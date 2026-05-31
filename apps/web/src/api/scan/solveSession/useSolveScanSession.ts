import { useMutation } from '@tanstack/react-query'
import type { SolveScanSessionVariables } from '../types'
import { solveScanSession } from './solveSession'

export function useSolveScanSession() {
  return useMutation({
    mutationFn: (variables: SolveScanSessionVariables) => solveScanSession(variables),
  })
}
