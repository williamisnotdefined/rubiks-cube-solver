import type {
  WcaContinentRecord,
  WcaChampionshipRecord,
  WcaChampionshipEligibleCountryRecord,
  WcaCompetitionRecord,
  WcaCountryRecord,
  WcaEventRecord,
  WcaFormatRecord,
  WcaPersonRecord,
  WcaRankDocument,
  WcaRankRecord,
  WcaResultDocument,
  WcaResultRecord,
  WcaRoundTypeRecord,
  WcaScrambleRecord,
} from '../../domain/general-records.js'

export type ListWcaRankingsReadInput = {
  continentId?: string | undefined
  countryIso2?: string | undefined
  eventId: string
  page: number
  pageSize: number
  region: 'continent' | 'country' | 'world'
  type: 'average' | 'single'
}

export type WcaRankPage = {
  items: WcaRankRecord[]
  total: number
}

export type ListWcaCompetitionsReadInput = {
  countryIso2?: string | undefined
  eventId?: string | undefined
  page: number
  pageSize: number
  year?: number | undefined
}

export type WcaCompetitionPage = {
  items: WcaCompetitionRecord[]
  total: number
}

export type ListWcaPersonsReadInput = {
  countryIso2?: string | undefined
  page: number
  pageSize: number
  search?: string | undefined
}

export type WcaPersonPage = {
  items: WcaPersonRecord[]
  total: number
}

export type ListWcaResultsReadInput = {
  competitionId?: string | undefined
  eventId?: string | undefined
  page: number
  pageSize: number
  personId?: string | undefined
}

export type WcaResultPage = {
  items: WcaResultRecord[]
  total: number
}

export type ListWcaScramblesReadInput = {
  competitionId?: string | undefined
  eventId?: string | undefined
  groupId?: string | undefined
  isExtra?: boolean | undefined
  page: number
  pageSize: number
  roundTypeId?: string | undefined
}

export type WcaScramblePage = {
  items: WcaScrambleRecord[]
  total: number
}

export type ListWcaChampionshipEligibleCountriesReadInput = {
  championshipType?: string | undefined
  countryIso2?: string | undefined
}

export type GeneralDataRepository = {
  getCompetition: (datasetId: string, id: string) => Promise<WcaCompetitionRecord | null>
  getPerson: (datasetId: string, id: string) => Promise<WcaPersonRecord | null>
  listChampionshipEligibleCountries: (datasetId: string, input: ListWcaChampionshipEligibleCountriesReadInput) => Promise<WcaChampionshipEligibleCountryRecord[]>
  listChampionships: (datasetId: string) => Promise<WcaChampionshipRecord[]>
  listCompetitionsPage: (datasetId: string, input: ListWcaCompetitionsReadInput) => Promise<WcaCompetitionPage>
  listCompetitions: (datasetId: string) => Promise<WcaCompetitionRecord[]>
  listContinents: (datasetId: string) => Promise<WcaContinentRecord[]>
  listCountries: (datasetId: string) => Promise<WcaCountryRecord[]>
  listEvents: (datasetId: string) => Promise<WcaEventRecord[]>
  listFormats: (datasetId: string) => Promise<WcaFormatRecord[]>
  listPersonsPage: (datasetId: string, input: ListWcaPersonsReadInput) => Promise<WcaPersonPage>
  listPersons: (datasetId: string) => Promise<WcaPersonRecord[]>
  listRankings: (datasetId: string, input: ListWcaRankingsReadInput) => Promise<WcaRankPage>
  listRankDocuments: (datasetId: string) => Promise<WcaRankDocument[]>
  listResults: (datasetId: string, input: ListWcaResultsReadInput) => Promise<WcaResultPage>
  listResultDocuments: (datasetId: string) => Promise<WcaResultDocument[]>
  listRoundTypes: (datasetId: string) => Promise<WcaRoundTypeRecord[]>
  listScrambles: (datasetId: string, input: ListWcaScramblesReadInput) => Promise<WcaScramblePage>
}
