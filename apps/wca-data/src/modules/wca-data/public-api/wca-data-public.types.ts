export type WcaDataListInput = {
  page?: number | undefined
  pageSize?: number | undefined
}

export type ListCompetitionsInput = WcaDataListInput & {
  countryIso2?: string | undefined
  eventId?: string | undefined
  year?: number | undefined
}

export type ListPersonsInput = WcaDataListInput & {
  countryIso2?: string | undefined
  search?: string | undefined
}

export type ListRankingsInput = WcaDataListInput & {
  continentId?: string | undefined
  countryIso2?: string | undefined
  eventId: string
  region?: 'continent' | 'country' | 'world' | undefined
  type: 'average' | 'single'
}

export type ListResultsInput = WcaDataListInput & {
  competitionId?: string | undefined
  eventId?: string | undefined
  personId?: string | undefined
}

export type ListScramblesInput = WcaDataListInput & {
  competitionId?: string | undefined
  eventId?: string | undefined
  groupId?: string | undefined
  isExtra?: boolean | undefined
  roundTypeId?: string | undefined
}

export type ListChampionshipsInput = WcaDataListInput & {
  championshipType?: string | undefined
  competitionId?: string | undefined
}

export type ListChampionshipEligibleCountriesInput = WcaDataListInput & {
  championshipType?: string | undefined
  countryIso2?: string | undefined
}

export type WcaDataMeta = {
  datasetId: string
  exportDate: string
  exportVersion: string
  source: 'World Cube Association Results Export'
}

export type WcaDataPagination = {
  hasNextPage: boolean
  page: number
  pageSize: number
  total: number
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
