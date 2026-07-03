import { AppError } from '../../../../shared/errors/app-error.js'
import type { WcaPersonRecord } from '../../domain/wca-records.js'
import type { GeneralDataRepository } from '../../repositories/general-data.repository.js'
import type { ActiveDatasetContextService } from '../support/dataset-context.js'
import type { WcaDataItemResponse } from '../wca-data-public.types.js'

type PersonProfileServiceDeps = {
  data: GeneralDataRepository
  datasetContext: ActiveDatasetContextService
}

export type PublicWcaPersonProfile = {
  avatarThumbUrl: string | null
  avatarUrl: string | null
  competitionCount: number | null
  countryIso2: string | null
  countryName: string | null
  gender: string
  id: string
  medals: {
    bronze: number
    gold: number
    silver: number
    total: number
  } | null
  name: string
  records: {
    continental: number
    national: number
    total: number
    world: number
  } | null
  totalSolves: number | null
  wcaUrl: string
}

type WcaApiPersonProfile = {
  competition_count?: unknown
  medals?: {
    bronze?: unknown
    gold?: unknown
    silver?: unknown
    total?: unknown
  }
  person?: {
    avatar?: {
      is_default?: unknown
      thumb_url?: unknown
      url?: unknown
    }
    country_iso2?: unknown
    country?: {
      name?: unknown
    }
    gender?: unknown
    id?: unknown
    name?: unknown
    url?: unknown
    wca_id?: unknown
  }
  records?: {
    continental?: unknown
    national?: unknown
    total?: unknown
    world?: unknown
  }
  total_solves?: unknown
}

const profileCacheTtlMs = 6 * 60 * 60 * 1000
const profileCache = new Map<string, { expiresAt: number; profile: WcaApiPersonProfile }>()

export function createPersonProfileService({ data, datasetContext }: PersonProfileServiceDeps) {
  return {
    async getPersonProfile(id: string): Promise<WcaDataItemResponse<PublicWcaPersonProfile>> {
      const { dataset, meta } = await datasetContext.get()
      const person = await data.getPerson(dataset.id, id)

      if (person === null) {
        throw new AppError('not_found', 'WCA person not found', 404)
      }

      const externalProfile = await getWcaApiPersonProfile(id)

      return { data: publicWcaPersonProfile(person, externalProfile), meta }
    },
  }
}

async function getWcaApiPersonProfile(id: string): Promise<WcaApiPersonProfile | null> {
  const now = Date.now()
  const cached = profileCache.get(id)

  if (cached !== undefined && cached.expiresAt > now) {
    return cached.profile
  }

  try {
    const response = await fetch(`https://www.worldcubeassociation.org/api/v0/persons/${encodeURIComponent(id)}`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(5_000),
    })

    if (!response.ok) {
      return null
    }

    const payload = await response.json() as WcaApiPersonProfile
    profileCache.set(id, { expiresAt: now + profileCacheTtlMs, profile: payload })
    return payload
  } catch {
    return null
  }
}

function publicWcaPersonProfile(person: WcaPersonRecord, profile: WcaApiPersonProfile | null): PublicWcaPersonProfile {
  const apiPerson = profile?.person
  const avatar = apiPerson?.avatar
  const avatarIsDefault = booleanValue(avatar?.is_default) ?? true

  return {
    avatarThumbUrl: avatarIsDefault ? null : stringOrNull(avatar?.thumb_url),
    avatarUrl: avatarIsDefault ? null : stringOrNull(avatar?.url),
    competitionCount: numberOrNull(profile?.competition_count),
    countryIso2: stringOrNull(apiPerson?.country_iso2) ?? person.countryId,
    countryName: stringOrNull(apiPerson?.country?.name),
    gender: stringOrNull(apiPerson?.gender) ?? person.gender,
    id: stringOrNull(apiPerson?.wca_id) ?? stringOrNull(apiPerson?.id) ?? person.id,
    medals: profile?.medals === undefined ? null : {
      bronze: numberOrZero(profile.medals.bronze),
      gold: numberOrZero(profile.medals.gold),
      silver: numberOrZero(profile.medals.silver),
      total: numberOrZero(profile.medals.total),
    },
    name: stringOrNull(apiPerson?.name) ?? person.name,
    records: profile?.records === undefined ? null : {
      continental: numberOrZero(profile.records.continental),
      national: numberOrZero(profile.records.national),
      total: numberOrZero(profile.records.total),
      world: numberOrZero(profile.records.world),
    },
    totalSolves: numberOrNull(profile?.total_solves),
    wcaUrl: stringOrNull(apiPerson?.url) ?? `https://www.worldcubeassociation.org/persons/${person.id}`,
  }
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function numberOrZero(value: unknown): number {
  return numberOrNull(value) ?? 0
}

function booleanValue(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null
}
