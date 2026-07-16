import { useQuery } from '@tanstack/react-query'
import { solverQueryKeys } from '../../queryKeys'
import { getHealth } from '../getHealth'

export function useGetHealth() {
  return useQuery({
    queryFn: ({ signal }) => getHealth(signal),
    queryKey: solverQueryKeys.health(),
    retry: false,
  })
}
