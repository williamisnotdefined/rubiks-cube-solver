import { useQuery } from '@tanstack/react-query'
import { wcaDataQueryKeys } from '../../queryKeys'
import { getWcaPersonProfile } from '../getPersonProfile'

export function useGetWcaPersonProfile(personId: string | null) {
  return useQuery({
    enabled: personId !== null,
    queryFn: ({ signal }) => getWcaPersonProfile(personId ?? '', signal),
    queryKey: wcaDataQueryKeys.personProfile(personId ?? 'none'),
    retry: false,
    staleTime: 6 * 60 * 60 * 1000,
  })
}
