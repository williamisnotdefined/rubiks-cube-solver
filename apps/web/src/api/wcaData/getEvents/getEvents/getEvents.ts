import { wcaDataApiRequest } from '@api/client'
import type { WcaDataListResponse, WcaEvent } from '../../types'

export function getWcaEvents() {
  return wcaDataApiRequest<WcaDataListResponse<WcaEvent>>('/events?pageSize=100')
}
