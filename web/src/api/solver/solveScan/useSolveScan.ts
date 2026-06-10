import { useMutation } from '@tanstack/react-query'
import type { SolveScanVariables } from '../types'
import { solveScan } from './solveScan'

export function useSolveScan() {
  return useMutation({
    mutationFn: (variables: SolveScanVariables) => solveScan(variables),
  })
}
