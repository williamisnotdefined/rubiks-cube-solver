import { wcaDataApiRequest } from '@api/client'
import { parseWcaEventsResponse } from '../../validation'

export async function getWcaEvents(signal?: AbortSignal) {
  return parseWcaEventsResponse(
    await wcaDataApiRequest<unknown>('/events?pageSize=100', { signal }),
  )
}
