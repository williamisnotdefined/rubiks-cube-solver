import { useQuery } from '@tanstack/react-query'
import { solverQueryKeys } from '../queryKeys'
import { getHealth } from './getHealth'

export function useGetHealth() {
  return useQuery({
    queryFn: getHealth,
    queryKey: solverQueryKeys.health(),
    retry: false,
  })
}
