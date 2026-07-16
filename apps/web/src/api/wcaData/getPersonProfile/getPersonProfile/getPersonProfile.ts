import { wcaDataApiRequest } from '@api/client'
import { parseWcaPersonProfileResponse } from '../../validation'

export async function getWcaPersonProfile(personId: string, signal?: AbortSignal) {
  return parseWcaPersonProfileResponse(
    await wcaDataApiRequest<unknown>(`/persons/${encodeURIComponent(personId)}/profile`, {
      signal,
    }),
  )
}
