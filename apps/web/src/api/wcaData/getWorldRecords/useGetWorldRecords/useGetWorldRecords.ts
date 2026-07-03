import { useQuery } from '@tanstack/react-query'
import type { WcaWorldRecordsQuery } from '../../types'
import { wcaDataQueryKeys } from '../../queryKeys'
import { getWorldRecords } from '../getWorldRecords'

export function useGetWorldRecords(query: WcaWorldRecordsQuery) {
  return useQuery({
    queryFn: () => getWorldRecords(query),
    queryKey: wcaDataQueryKeys.worldRecords(query),
    retry: false,
  })
}
