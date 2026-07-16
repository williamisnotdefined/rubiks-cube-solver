import { useQuery } from '@tanstack/react-query'
import type { WcaWorldRecordsQuery } from '../../types'
import { canonicalizeWcaWorldRecordsQuery } from '../../query'
import { wcaDataQueryKeys } from '../../queryKeys'
import { getWorldRecords } from '../getWorldRecords'

export function useGetWorldRecords(query: WcaWorldRecordsQuery) {
  const canonicalQuery = canonicalizeWcaWorldRecordsQuery(query)

  return useQuery({
    queryFn: ({ signal }) => getWorldRecords(canonicalQuery, signal),
    queryKey: wcaDataQueryKeys.worldRecords(canonicalQuery),
    retry: false,
  })
}
