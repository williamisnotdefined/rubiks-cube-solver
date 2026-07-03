import { wcaDataApiRequest } from '@api/client'
import type { WcaDataItemResponse, WcaPersonProfile } from '../../types'

export function getWcaPersonProfile(personId: string) {
  return wcaDataApiRequest<WcaDataItemResponse<WcaPersonProfile>>(`/persons/${encodeURIComponent(personId)}/profile`)
}
