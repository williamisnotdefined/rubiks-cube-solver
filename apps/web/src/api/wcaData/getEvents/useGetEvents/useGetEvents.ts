import { useQuery } from '@tanstack/react-query'
import { wcaDataQueryKeys } from '../../queryKeys'
import { getWcaEvents } from '../getEvents'

export function useGetWcaEvents() {
  return useQuery({
    queryFn: getWcaEvents,
    queryKey: wcaDataQueryKeys.events(),
    retry: false,
  })
}
