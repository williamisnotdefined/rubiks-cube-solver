import { useQuery } from '@tanstack/react-query'
import { solverQueryKeys } from '../../queryKeys'
import { getPuzzles } from '../getPuzzles'

type UseGetPuzzlesOptions = {
  enabled?: boolean
}

export function useGetPuzzles({ enabled = true }: UseGetPuzzlesOptions = {}) {
  return useQuery({
    enabled,
    queryFn: ({ signal }) => getPuzzles(signal),
    queryKey: solverQueryKeys.puzzles(),
    retry: false,
  })
}
