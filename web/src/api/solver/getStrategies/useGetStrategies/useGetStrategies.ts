import { useQuery } from '@tanstack/react-query'
import { solverQueryKeys } from '../../queryKeys'
import { getStrategies } from '../getStrategies'

type UseGetStrategiesOptions = {
  enabled?: boolean
}

export function useGetStrategies({ enabled = true }: UseGetStrategiesOptions = {}) {
  return useQuery({
    enabled,
    queryFn: getStrategies,
    queryKey: solverQueryKeys.strategies(),
    retry: false,
  })
}
