import { useMutation } from '@tanstack/react-query'
import type { AnalyzeScanFaceVariables } from '../types'
import { analyzeScanFace } from './analyzeFace'

export function useAnalyzeScanFace() {
  return useMutation({
    mutationFn: (variables: AnalyzeScanFaceVariables) => analyzeScanFace(variables),
  })
}
