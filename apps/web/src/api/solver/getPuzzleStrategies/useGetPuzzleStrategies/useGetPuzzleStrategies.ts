import { useQuery } from '@tanstack/react-query'
import { solverQueryKeys } from '../../queryKeys'
import type { PuzzleSlug } from '../../types'
import { getPuzzleStrategies } from '../getPuzzleStrategies'

type UseGetPuzzleStrategiesOptions = {
  enabled?: boolean
  puzzleSlug: PuzzleSlug | undefined
}

export function useGetPuzzleStrategies({
  enabled = true,
  puzzleSlug,
}: UseGetPuzzleStrategiesOptions) {
  return useQuery({
    enabled: enabled && puzzleSlug !== undefined,
    queryFn: ({ signal }) => getPuzzleStrategies(puzzleSlug ?? '', signal),
    queryKey: solverQueryKeys.puzzleStrategies(puzzleSlug ?? ''),
    retry: false,
  })
}
