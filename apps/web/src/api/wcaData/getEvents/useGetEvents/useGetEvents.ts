import { useQuery } from '@tanstack/react-query'
import { wcaDataQueryKeys } from '../../queryKeys'
import { getWcaEvents } from '../getEvents'

export function useGetWcaEvents() {
  return useQuery({
    queryFn: ({ signal }) => getWcaEvents(signal),
    queryKey: wcaDataQueryKeys.events(),
    retry: false,
  })
}
