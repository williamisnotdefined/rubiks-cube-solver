import type { WcaWorldRecordsQuery } from '../types'
import { canonicalizeWcaWorldRecordsQuery } from '../query'

export const wcaDataQueryKeys = {
  all: ['wcaData'] as const,
  events: () => [...wcaDataQueryKeys.all, 'events'] as const,
  personProfile: (personId: string) =>
    [...wcaDataQueryKeys.all, 'persons', personId, 'profile'] as const,
  worldRecords: (query: WcaWorldRecordsQuery) =>
    [...wcaDataQueryKeys.all, 'records', 'world', canonicalizeWcaWorldRecordsQuery(query)] as const,
}
