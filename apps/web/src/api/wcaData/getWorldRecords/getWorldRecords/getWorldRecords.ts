import { wcaDataApiRequest } from '@api/client'
import { canonicalizeWcaWorldRecordsQuery } from '../../query'
import type { WcaWorldRecordsQuery } from '../../types'
import { parseWcaWorldRecordsResponse } from '../../validation'

export async function getWorldRecords(query: WcaWorldRecordsQuery, signal?: AbortSignal) {
  const canonicalQuery = canonicalizeWcaWorldRecordsQuery(query)
  return parseWcaWorldRecordsResponse(
    await wcaDataApiRequest<unknown>(`/records/world?${worldRecordsSearchParams(canonicalQuery)}`, {
      signal,
    }),
  )
}

function worldRecordsSearchParams(query: WcaWorldRecordsQuery): URLSearchParams {
  const params = new URLSearchParams()

  params.set('eventId', query.eventId)

  if (query.type !== undefined) {
    params.set('type', query.type)
  }

  if (query.search !== undefined && query.search.trim().length > 0) {
    params.set('search', query.search.trim())
  }

  if (query.page !== undefined) {
    params.set('page', String(query.page))
  }

  if (query.pageSize !== undefined) {
    params.set('pageSize', String(query.pageSize))
  }

  return params
}
