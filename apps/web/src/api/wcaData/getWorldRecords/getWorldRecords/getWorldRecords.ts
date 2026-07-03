import { wcaDataApiRequest } from '@api/client'
import type { WcaDataListResponse, WcaWorldRecord, WcaWorldRecordsQuery } from '../../types'

export function getWorldRecords(query: WcaWorldRecordsQuery) {
  return wcaDataApiRequest<WcaDataListResponse<WcaWorldRecord>>(`/records/world?${worldRecordsSearchParams(query)}`)
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
