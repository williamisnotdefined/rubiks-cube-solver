import { AppError } from '../../../../shared/errors/app-error.js'
import type { DatasetMetadata } from '../../domain/dataset-metadata.js'
import type {
  WcaChampionshipRecord,
  WcaContinentRecord,
  WcaCompetitionRecord,
  WcaCountryRecord,
  WcaEventRecord,
  WcaFormatRecord,
  WcaPersonRecord,
  WcaRankRecord,
  WcaResultRecord,
  WcaRoundTypeRecord,
  WcaScrambleRecord,
} from '../../domain/general-records.js'
import type { GeneralDataRepository } from '../read-models/general-data.repository.js'
import type { DatasetRepository } from '../../persistence/repositories.js'

const defaultPage = 1
const defaultPageSize = 50
const maxPageSize = 100

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

export type WcaDataApiService = ReturnType<typeof createWcaDataApiService>

type WcaDataApiServiceDeps = {
  data: GeneralDataRepository
  datasets: DatasetRepository
}

type ActiveDatasetContext = {
  dataset: DatasetMetadata
  meta: WcaDataMeta
}

export function createWcaDataApiService({ data, datasets }: WcaDataApiServiceDeps) {
  async function activeDatasetContext(): Promise<ActiveDatasetContext> {
    const dataset = await datasets.getActiveDataset()

    if (dataset === null) {
      throw new AppError('dataset_unavailable', 'No active WCA dataset is available', 503)
    }

    return {
      dataset,
      meta: {
        datasetId: dataset.id,
        exportDate: dataset.exportDate,
        exportVersion: dataset.exportVersion,
        source: 'World Cube Association Results Export',
      },
    }
  }

  async function listRankings(input: ListRankingsInput): Promise<WcaDataListResponse<PublicRank>> {
    const { dataset, meta } = await activeDatasetContext()
    const region = input.region ?? 'world'
    const page = normalizedPage(input.page)
    const pageSize = normalizedPageSize(input.pageSize)
    const rankings = await data.listRankings(dataset.id, { ...input, page, pageSize, region })

    return listResponse(rankings.items.map((rank) => publicRank(rank, input.type, region)), { page, pageSize, total: rankings.total }, meta)
  }

  return {
    async getCompetition(id: string): Promise<WcaDataItemResponse<PublicCompetition>> {
      const { dataset, meta } = await activeDatasetContext()
      const competition = await data.getCompetition(dataset.id, id)

      if (competition === null) {
        throw new AppError('not_found', 'WCA competition not found', 404)
      }

      return { data: publicCompetition(competition), meta }
    },

    async getPerson(id: string): Promise<WcaDataItemResponse<PublicPerson>> {
      const { dataset, meta } = await activeDatasetContext()
      const person = await data.getPerson(dataset.id, id)

      if (person === null) {
        throw new AppError('not_found', 'WCA person not found', 404)
      }

      return { data: publicPerson(person), meta }
    },

    async listCompetitions(input: ListCompetitionsInput = {}): Promise<WcaDataListResponse<PublicCompetition>> {
      const { dataset, meta } = await activeDatasetContext()
      const page = normalizedPage(input.page)
      const pageSize = normalizedPageSize(input.pageSize)
      const competitions = await data.listCompetitionsPage(dataset.id, { ...input, page, pageSize })

      return listResponse(competitions.items.map(publicCompetition), { page, pageSize, total: competitions.total }, meta)
    },

    async listChampionships(input: ListChampionshipsInput = {}): Promise<WcaDataListResponse<PublicChampionship>> {
      const { dataset, meta } = await activeDatasetContext()
      const championships = (await data.listChampionships(dataset.id))
        .filter((championship) => input.championshipType === undefined || championship.championshipType === input.championshipType)
        .filter((championship) => input.competitionId === undefined || championship.competitionId === input.competitionId)
        .map(publicChampionship)

      return pageResponse(championships, input, meta)
    },

    async listContinents(input: WcaDataListInput = {}): Promise<WcaDataListResponse<WcaContinentRecord>> {
      const { dataset, meta } = await activeDatasetContext()
      return pageResponse(await data.listContinents(dataset.id), input, meta)
    },

    async listCountries(input: WcaDataListInput = {}): Promise<WcaDataListResponse<WcaCountryRecord>> {
      const { dataset, meta } = await activeDatasetContext()
      return pageResponse(await data.listCountries(dataset.id), input, meta)
    },

    async listEvents(input: WcaDataListInput = {}): Promise<WcaDataListResponse<WcaEventRecord>> {
      const { dataset, meta } = await activeDatasetContext()
      return pageResponse(await data.listEvents(dataset.id), input, meta)
    },

    async listFormats(input: WcaDataListInput = {}): Promise<WcaDataListResponse<WcaFormatRecord>> {
      const { dataset, meta } = await activeDatasetContext()
      return pageResponse(await data.listFormats(dataset.id), input, meta)
    },

    async listPersons(input: ListPersonsInput = {}): Promise<WcaDataListResponse<PublicPerson>> {
      const { dataset, meta } = await activeDatasetContext()
      const page = normalizedPage(input.page)
      const pageSize = normalizedPageSize(input.pageSize)
      const persons = await data.listPersonsPage(dataset.id, { ...input, page, pageSize })

      return listResponse(persons.items.map(publicPerson), { page, pageSize, total: persons.total }, meta)
    },

    listRankings,

    async listResults(input: ListResultsInput = {}): Promise<WcaDataListResponse<PublicResult>> {
      const { dataset, meta } = await activeDatasetContext()
      const page = normalizedPage(input.page)
      const pageSize = normalizedPageSize(input.pageSize)
      const results = await data.listResults(dataset.id, { ...input, page, pageSize })

      return listResponse(results.items.map(publicResult), { page, pageSize, total: results.total }, meta)
    },

    async listRoundTypes(input: WcaDataListInput = {}): Promise<WcaDataListResponse<PublicRoundType>> {
      const { dataset, meta } = await activeDatasetContext()
      return pageResponse((await data.listRoundTypes(dataset.id)).map(publicRoundType), input, meta)
    },

    async listScrambles(input: ListScramblesInput = {}): Promise<WcaDataListResponse<PublicScramble>> {
      const { dataset, meta } = await activeDatasetContext()
      const page = normalizedPage(input.page)
      const pageSize = normalizedPageSize(input.pageSize)
      const scrambles = await data.listScrambles(dataset.id, { ...input, page, pageSize })

      return listResponse(scrambles.items.map(publicScramble), { page, pageSize, total: scrambles.total }, meta)
    },

    async listTopSpeedcubers(input: Omit<ListRankingsInput, 'region'>): Promise<WcaDataListResponse<PublicRank>> {
      return listRankings({ ...input, region: 'world' })
    },
  }
}

function listResponse<TItem>(
  data: TItem[],
  pagination: { page: number; pageSize: number; total: number },
  meta: WcaDataMeta,
): WcaDataListResponse<TItem> {
  return {
    data,
    meta,
    pagination: {
      ...pagination,
      hasNextPage: pagination.page * pagination.pageSize < pagination.total,
    },
  }
}

type PublicChampionship = {
  championshipType: string
  competitionId: string | null
  id: number
}

type PublicRoundType = {
  cellName: string
  id: string
  isFinal: boolean
  name: string
}

type PublicCompetition = {
  cancelled: boolean
  city: string
  countryIso2: string | null
  date: {
    end: string
    numberOfDays: number
    start: string
  }
  delegates: PublicPersonName[]
  events: string[]
  externalWebsite: string | null
  id: string
  information: string
  name: string
  organizers: PublicPersonName[]
  venue: {
    address: string
    coordinates: {
      latitude: number | null
      longitude: number | null
    }
    details: string
    name: string
  }
}

function publicChampionship(championship: WcaChampionshipRecord): PublicChampionship {
  return {
    championshipType: championship.championshipType,
    competitionId: championship.competitionId,
    id: championship.id,
  }
}

type PublicPerson = {
  countryIso2: string | null
  gender: string
  id: string
  name: string
}

type PublicPersonName = {
  email: string | null
  name: string
}

type PublicRank = {
  best: PublicResultValue
  eventId: string
  personId: string
  rank: {
    continent: number
    country: number
    selected: number
    world: number
  }
  region: 'continent' | 'country' | 'world'
  type: 'average' | 'single'
}

type PublicResult = {
  average: PublicResultValue
  best: PublicResultValue
  competitionId: string
  eventId: string
  format: string
  personId: string
  position: number
  regionalAverageRecord: string | null
  regionalSingleRecord: string | null
  round: string
  solves: PublicResultValue[]
}

type PublicScramble = {
  competitionId: string
  eventId: string
  groupId: string
  id: number
  isExtra: boolean
  roundTypeId: string
  scramble: string
  scrambleNumber: number
}

type PublicResultValue = {
  raw: number
}

function pageResponse<TItem>(items: TItem[], input: WcaDataListInput, meta: WcaDataMeta): WcaDataListResponse<TItem> {
  const page = normalizedPage(input.page)
  const pageSize = normalizedPageSize(input.pageSize)
  const start = (page - 1) * pageSize
  const data = items.slice(start, start + pageSize)

  return {
    data,
    meta,
    pagination: {
      hasNextPage: start + pageSize < items.length,
      page,
      pageSize,
      total: items.length,
    },
  }
}

function normalizedPage(value: number | undefined): number {
  return value === undefined || value < 1 ? defaultPage : Math.floor(value)
}

function normalizedPageSize(value: number | undefined): number {
  if (value === undefined || value < 1) {
    return defaultPageSize
  }

  return Math.min(Math.floor(value), maxPageSize)
}

function publicCompetition(competition: WcaCompetitionRecord): PublicCompetition {
  return {
    cancelled: competition.cancelled,
    city: competition.city,
    countryIso2: competition.countryId,
    date: {
      end: dateString(competition.year, competition.endMonth, competition.endDay),
      numberOfDays: daysBetween(
        new Date(Date.UTC(competition.year, competition.month - 1, competition.day)),
        new Date(Date.UTC(competition.year, competition.endMonth - 1, competition.endDay)),
      ) + 1,
      start: dateString(competition.year, competition.month, competition.day),
    },
    delegates: peopleList(competition.wcaDelegates),
    events: eventIds(competition),
    externalWebsite: competition.externalWebsite === '' ? null : competition.externalWebsite,
    id: competition.id,
    information: competition.information,
    name: competition.name,
    organizers: peopleList(competition.organisers),
    venue: {
      address: competition.venueAddress,
      coordinates: {
        latitude: microdegrees(competition.latitude),
        longitude: microdegrees(competition.longitude),
      },
      details: competition.venueDetails,
      name: competition.venue,
    },
  }
}

function publicPerson(person: WcaPersonRecord): PublicPerson {
  return {
    countryIso2: person.countryId,
    gender: person.gender,
    id: person.id,
    name: person.name,
  }
}

function publicRank(rank: WcaRankRecord, type: 'average' | 'single', region: 'continent' | 'country' | 'world'): PublicRank {
  return {
    best: resultValue(rank.best),
    eventId: rank.eventId,
    personId: rank.personId,
    rank: {
      continent: rank.continentRank,
      country: rank.countryRank,
      selected: rankValue(rank, region),
      world: rank.worldRank,
    },
    region,
    type,
  }
}

function publicRoundType(roundType: WcaRoundTypeRecord): PublicRoundType {
  return {
    cellName: roundType.cellName,
    id: roundType.id,
    isFinal: roundType.final,
    name: roundType.name,
  }
}

function publicResult(result: WcaResultRecord): PublicResult {
  return {
    average: resultValue(result.average),
    best: resultValue(result.best),
    competitionId: result.competitionId,
    eventId: result.eventId,
    format: result.format,
    personId: result.personId,
    position: result.position,
    regionalAverageRecord: result.regionalAverageRecord,
    regionalSingleRecord: result.regionalSingleRecord,
    round: result.round,
    solves: result.solves.map(resultValue),
  }
}

function publicScramble(scramble: WcaScrambleRecord): PublicScramble {
  return {
    competitionId: scramble.competitionId,
    eventId: scramble.eventId,
    groupId: scramble.groupId,
    id: scramble.id,
    isExtra: scramble.isExtra,
    roundTypeId: scramble.roundTypeId,
    scramble: scramble.scramble,
    scrambleNumber: scramble.scrambleNumber,
  }
}

function resultValue(raw: number): PublicResultValue {
  return { raw }
}

function eventIds(competition: WcaCompetitionRecord): string[] {
  return competition.eventSpecs.split(/\s+/).filter(Boolean)
}

function dateString(year: number, month: number, day: number): string {
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
}

function daysBetween(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86_400_000))
}

function peopleList(value: string): PublicPersonName[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const match = /^(?<name>.*?)\s*<(?<email>[^>]+)>$/.exec(item)
      return {
        email: match?.groups?.email ?? null,
        name: match?.groups?.name?.trim() ?? item,
      }
    })
}

function microdegrees(value: string): number | null {
  if (value === '') {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed / 1_000_000 : null
}

function rankValue(rank: WcaRankRecord, region: 'continent' | 'country' | 'world'): number {
  switch (region) {
    case 'continent':
      return rank.continentRank
    case 'country':
      return rank.countryRank
    case 'world':
      return rank.worldRank
  }
}
