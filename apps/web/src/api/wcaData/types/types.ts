export type WcaDataResultValue = {
  raw: number
}

export type WcaDataPagination = {
  hasNextPage: boolean
  page: number
  pageSize: number
  total: number
}

export type WcaDataMeta = {
  datasetId: string
  exportDate: string
  exportVersion: string
  source: 'World Cube Association Results Export'
}

export type WcaDataListResponse<TItem> = {
  data: TItem[]
  meta: WcaDataMeta
  pagination: WcaDataPagination
}

export type WcaDataItemResponse<TItem> = {
  data: TItem
  meta: WcaDataMeta
}

export type WcaEvent = {
  format: 'multi' | 'number' | 'time'
  id: string
  name: string
}

export type WcaPersonProfile = {
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

export type WcaWorldRecordType = 'average' | 'single'

export type WcaWorldRecordsQuery = {
  eventId: string
  page?: number
  pageSize?: number
  search?: string
  type?: WcaWorldRecordType
}

export type WcaWorldRecord = {
  athlete: {
    avatarUrl: string | null
    countryIso2: string | null
    countryName: string | null
    gender: string
    id: string
    name: string
    wcaUrl: string
  }
  competition: {
    city: string
    countryIso2: string | null
    date: {
      end: string
      numberOfDays: number
      start: string
    }
    id: string
    name: string
  } | null
  event: WcaEvent
  rank: {
    continent: number
    country: number
    world: number
  }
  result: {
    attemptNumbers: number[]
    average: WcaDataResultValue
    best: WcaDataResultValue
    format: string
    id: number
    position: number
    regionalAverageRecord: string | null
    regionalSingleRecord: string | null
    round: string
    roundTypeId: string
    solves: WcaDataResultValue[]
  } | null
  scramble: {
    candidates: WcaWorldRecordScrambleCandidate[]
    status: 'ambiguous' | 'exact' | 'unavailable'
  }
  type: WcaWorldRecordType
  value: WcaDataResultValue
}

export type WcaWorldRecordScrambleCandidate = {
  competitionId: string
  eventId: string
  groupId: string
  id: number
  isExtra: boolean
  roundTypeId: string
  scramble: string
  scrambleNumber: number
}
