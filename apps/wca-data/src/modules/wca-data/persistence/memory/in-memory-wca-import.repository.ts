import { readFile } from 'node:fs/promises'
import type {
  GeneralDataRepository,
  ListWcaChampionshipEligibleCountriesReadInput,
  ListWcaCompetitionsReadInput,
  ListWcaPersonsReadInput,
  ListWcaRankingsReadInput,
  ListWcaResultsReadInput,
  ListWcaScramblesReadInput,
  ListWcaWorldRecordsReadInput,
  WcaCompetitionPage,
  WcaPersonPage,
  WcaRankPage,
  WcaResultPage,
  WcaScramblePage,
  WcaWorldRecordPage,
} from '../../repositories/general-data.repository.js'
import type {
  GeneralCanonicalTransformer,
  GeneralCanonicalTransformCounts,
  TransformGeneralCanonicalInput,
} from '../../import/transform-general-canonical.service.js'
import type { WcaStagingFileLoadResult, WcaStagingLoader } from '../../import/load-wca-staging.service.js'
import {
  createValidateWcaTsvHeadersService,
  type ValidatedWcaTsvHeaders,
} from '../../import/validate-wca-tsv-headers.service.js'
import type { WcaTsvFileDefinition } from '../../import/wca-tsv-registry.js'
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
  WcaResultDocument,
  WcaRoundTypeRecord,
  WcaScrambleRecord,
  WcaWorldRecordEntry,
  WcaWorldRecordType,
} from '../../domain/wca-records.js'

type StagingGeneralRows = {
  championships: WcaChampionshipRecord[]
  championshipEligibleCountries: WcaChampionshipEligibleCountryRecord[]
  competitions: WcaCompetitionRecord[]
  continents: WcaContinentRecord[]
  countries: WcaCountryRecord[]
  events: InMemoryEventRecord[]
  formats: WcaFormatRecord[]
  persons: WcaPersonRecord[]
  ranksAverage: InMemoryRankRecord[]
  ranksSingle: InMemoryRankRecord[]
  resultAttempts: InMemoryResultAttemptRecord[]
  results: InMemoryResultRecord[]
  roundTypes: InMemoryRoundTypeRecord[]
  scrambles: WcaScrambleRecord[]
}

type InMemoryEventRecord = WcaEventRecord & { rank: number | null }
type InMemoryResultAttemptRecord = {
  attemptNumber: number
  result: number
  resultId: number
}
type InMemoryResultRecord = {
  average: number
  best: number
  competitionId: string
  eventId: string
  formatId: string
  id: number
  personId: string
  position: number
  regionalAverageRecord: string | null
  regionalSingleRecord: string | null
  roundTypeId: string
}
type InMemoryRankRecord = {
  best: number
  continentRank: number
  countryRank: number
  eventId: string
  personId: string
  worldRank: number
}
type InMemoryRoundTypeRecord = WcaRoundTypeRecord & { rank: number | null }

export class InMemoryWcaImportRepository implements WcaStagingLoader, GeneralCanonicalTransformer, GeneralDataRepository {
  private readonly canonical = new Map<string, StagingGeneralRows>()
  private readonly staging = new Map<string, StagingGeneralRows>()
  private readonly validateHeaders = createValidateWcaTsvHeadersService()

  async loadFile(input: {
    definition: WcaTsvFileDefinition
    importRunId: string
    localPath: string
  }): Promise<WcaStagingFileLoadResult> {
    const content = await readFile(input.localPath, 'utf8')
    const lines = content.split('\n')
    const headerLine = lines[0]

    if (headerLine === undefined) {
      throw new Error(`${input.definition.fileName} does not contain a TSV header`)
    }

    const headers = this.validateHeaders.execute({ definition: input.definition, headerLine })
    const rows = this.stagingRows(input.importRunId)
    let rowCount = 0

    for (const rawLine of lines.slice(1)) {
      const line = rawLine.replace(/\r$/, '')

      if (line.length === 0) {
        continue
      }

      rowCount += 1
      this.addGeneralRow(rows, input.definition, headers, line)
    }

    return {
      fileName: input.definition.fileName,
      rowCount,
      stagingTable: input.definition.stagingTable,
    }
  }

  async replaceGeneralTables(input: TransformGeneralCanonicalInput): Promise<GeneralCanonicalTransformCounts> {
    const rows = this.stagingRows(input.importRunId)
    const canonicalRows = cloneRows(rows)
    this.canonical.set(input.datasetId, canonicalRows)

    return {
      championships: canonicalRows.championships.length,
      championshipEligibleCountries: canonicalRows.championshipEligibleCountries.length,
      competitions: canonicalRows.competitions.length,
      continents: canonicalRows.continents.length,
      countries: canonicalRows.countries.length,
      events: canonicalRows.events.length,
      formats: canonicalRows.formats.length,
      persons: canonicalRows.persons.length,
      ranksAverage: canonicalRows.ranksAverage.length,
      ranksSingle: canonicalRows.ranksSingle.length,
      resultAttempts: canonicalRows.resultAttempts.length,
      results: canonicalRows.results.length,
      roundTypes: canonicalRows.roundTypes.length,
      scrambles: canonicalRows.scrambles.length,
    }
  }

  async listContinents(datasetId: string): Promise<WcaContinentRecord[]> {
    return [...(this.canonical.get(datasetId)?.continents ?? [])]
      .sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id))
  }

  async listChampionships(datasetId: string): Promise<WcaChampionshipRecord[]> {
    return [...(this.canonical.get(datasetId)?.championships ?? [])]
      .sort((left, right) => left.championshipType.localeCompare(right.championshipType) || left.id - right.id)
  }

  async listChampionshipEligibleCountries(
    datasetId: string,
    input: ListWcaChampionshipEligibleCountriesReadInput,
  ): Promise<WcaChampionshipEligibleCountryRecord[]> {
    return [...(this.canonical.get(datasetId)?.championshipEligibleCountries ?? [])]
      .filter((record) => input.championshipType === undefined || record.championshipType === input.championshipType)
      .filter((record) => input.countryIso2 === undefined || record.eligibleCountryIso2 === input.countryIso2)
      .sort(compareChampionshipEligibleCountries)
  }

  async getCompetition(datasetId: string, id: string): Promise<WcaCompetitionRecord | null> {
    return (this.canonical.get(datasetId)?.competitions ?? []).find((competition) => competition.id === id) ?? null
  }

  async listCompetitions(datasetId: string): Promise<WcaCompetitionRecord[]> {
    return [...(this.canonical.get(datasetId)?.competitions ?? [])]
      .sort((left, right) => compareCompetitionDateDesc(left, right) || left.id.localeCompare(right.id))
  }

  async listCompetitionsPage(datasetId: string, input: ListWcaCompetitionsReadInput): Promise<WcaCompetitionPage> {
    const competitions = (await this.listCompetitions(datasetId))
      .filter((competition) => input.countryIso2 === undefined || competition.countryId === input.countryIso2)
      .filter((competition) => input.year === undefined || competition.year === input.year)
      .filter((competition) => input.eventId === undefined || competitionEventIds(competition).includes(input.eventId))
    const start = (input.page - 1) * input.pageSize

    return {
      items: competitions.slice(start, start + input.pageSize),
      total: competitions.length,
    }
  }

  async listCountries(datasetId: string): Promise<WcaCountryRecord[]> {
    return [...(this.canonical.get(datasetId)?.countries ?? [])]
      .sort((left, right) => left.iso2Code.localeCompare(right.iso2Code))
  }

  async listEvents(datasetId: string): Promise<WcaEventRecord[]> {
    return [...(this.canonical.get(datasetId)?.events ?? [])]
      .sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id))
      .map(({ format, id, name }) => ({ format, id, name }))
  }

  async listFormats(datasetId: string): Promise<WcaFormatRecord[]> {
    return [...(this.canonical.get(datasetId)?.formats ?? [])]
      .sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id))
  }

  async getPerson(datasetId: string, id: string): Promise<WcaPersonRecord | null> {
    return (this.canonical.get(datasetId)?.persons ?? []).find((person) => person.id === id && person.subId === 1) ?? null
  }

  async listPersons(datasetId: string): Promise<WcaPersonRecord[]> {
    return [...(this.canonical.get(datasetId)?.persons ?? [])]
      .filter((person) => person.subId === 1)
      .sort((left, right) => left.id.localeCompare(right.id))
  }

  async listPersonsPage(datasetId: string, input: ListWcaPersonsReadInput): Promise<WcaPersonPage> {
    const search = input.search?.trim().toLocaleLowerCase()
    const persons = (await this.listPersons(datasetId))
      .filter((person) => input.countryIso2 === undefined || person.countryId === input.countryIso2)
      .filter((person) => search === undefined || person.id.toLocaleLowerCase().includes(search) || person.name.toLocaleLowerCase().includes(search))
    const start = (input.page - 1) * input.pageSize

    return {
      items: persons.slice(start, start + input.pageSize),
      total: persons.length,
    }
  }

  async listRankDocuments(datasetId: string): Promise<WcaRankDocument[]> {
    const rows = this.canonical.get(datasetId) ?? emptyRows()
    const countriesByIso2 = new Map(rows.countries.map((country) => [country.iso2Code, country]))
    const personsById = new Map(rows.persons.map((person) => [person.id, person]))

    return [
      ...rankDocuments('single', rows.ranksSingle, personsById, countriesByIso2),
      ...rankDocuments('average', rows.ranksAverage, personsById, countriesByIso2),
    ]
  }

  async listRankings(datasetId: string, input: ListWcaRankingsReadInput): Promise<WcaRankPage> {
    const ranks = (await this.listRankDocuments(datasetId))
      .find((document) => document.path === `rank/world/${input.type}/${input.eventId}.json`)
      ?.items ?? []
    const filtered = ranks
      .filter((rank) => rankMatchesRegion(rank, input))
      .sort((left, right) => rankValue(left, input.region) - rankValue(right, input.region) || left.personId.localeCompare(right.personId))
    const start = (input.page - 1) * input.pageSize

    return {
      items: filtered.slice(start, start + input.pageSize),
      total: filtered.length,
    }
  }

  async listResultDocuments(datasetId: string): Promise<WcaResultDocument[]> {
    const rows = this.canonical.get(datasetId) ?? emptyRows()
    const formatNames = new Map(rows.formats.map((format) => [format.id, format.name]))
    const roundTypesById = new Map(rows.roundTypes.map((roundType) => [roundType.id, roundType]))
    const attemptsByResultId = new Map<number, InMemoryResultAttemptRecord[]>()

    for (const attempt of rows.resultAttempts) {
      const existing = attemptsByResultId.get(attempt.resultId) ?? []
      existing.push(attempt)
      attemptsByResultId.set(attempt.resultId, existing)
    }

    const groups = new Map<string, WcaResultDocument>()
    const results = [...rows.results].sort((left, right) => (
      left.competitionId.localeCompare(right.competitionId)
      || left.eventId.localeCompare(right.eventId)
      || left.position - right.position
      || left.id - right.id
    ))

    for (const result of results) {
      const path = `results/${result.competitionId}/${result.eventId}.json`
      const group = groups.get(path) ?? { items: [], path }
      const attempts = [...(attemptsByResultId.get(result.id) ?? [])].sort((left, right) => left.attemptNumber - right.attemptNumber)

      group.items.push({
        average: result.average,
        best: result.best,
        competitionId: result.competitionId,
        eventId: result.eventId,
        format: formatNames.get(result.formatId) ?? result.formatId,
        isFinalRound: roundTypesById.get(result.roundTypeId)?.final ?? false,
        personId: result.personId,
        position: result.position,
        regionalAverageRecord: result.regionalAverageRecord,
        regionalSingleRecord: result.regionalSingleRecord,
        round: roundTypesById.get(result.roundTypeId)?.name ?? result.roundTypeId,
        solves: padSolves(attempts.map((attempt) => attempt.result)),
      })
      groups.set(path, group)
    }

    return [...groups.values()]
  }

  async listResults(datasetId: string, input: ListWcaResultsReadInput): Promise<WcaResultPage> {
    const results = (await this.listResultDocuments(datasetId))
      .flatMap((document) => document.items)
      .filter((result) => input.competitionId === undefined || result.competitionId === input.competitionId)
      .filter((result) => input.eventId === undefined || result.eventId === input.eventId)
      .filter((result) => input.personId === undefined || result.personId === input.personId)
    const start = (input.page - 1) * input.pageSize

    return {
      items: results.slice(start, start + input.pageSize),
      total: results.length,
    }
  }

  async listRoundTypes(datasetId: string): Promise<WcaRoundTypeRecord[]> {
    return [...(this.canonical.get(datasetId)?.roundTypes ?? [])]
      .sort((left, right) => compareRank(left.rank, right.rank) || left.id.localeCompare(right.id))
      .map(({ cellName, final, id, name }) => ({ cellName, final, id, name }))
  }

  async listScrambles(datasetId: string, input: ListWcaScramblesReadInput): Promise<WcaScramblePage> {
    const scrambles = [...(this.canonical.get(datasetId)?.scrambles ?? [])]
      .filter((scramble) => input.competitionId === undefined || scramble.competitionId === input.competitionId)
      .filter((scramble) => input.eventId === undefined || scramble.eventId === input.eventId)
      .filter((scramble) => input.roundTypeId === undefined || scramble.roundTypeId === input.roundTypeId)
      .filter((scramble) => input.groupId === undefined || scramble.groupId === input.groupId)
      .filter((scramble) => input.isExtra === undefined || scramble.isExtra === input.isExtra)
      .sort(compareScrambles)
    const start = (input.page - 1) * input.pageSize

    return {
      items: scrambles.slice(start, start + input.pageSize),
      total: scrambles.length,
    }
  }

  async listWorldRecords(datasetId: string, input: ListWcaWorldRecordsReadInput): Promise<WcaWorldRecordPage> {
    const rows = this.canonical.get(datasetId) ?? emptyRows()
    const records = worldRecordRanks(rows, input)
      .map((record) => worldRecordEntry(rows, record))
      .filter((record): record is WcaWorldRecordEntry => record !== null)
      .filter((record) => worldRecordMatchesSearch(record, input.search))
      .sort(compareWorldRecords)
    const start = (input.page - 1) * input.pageSize

    return {
      items: records.slice(start, start + input.pageSize),
      total: records.length,
    }
  }

  private addGeneralRow(
    rows: StagingGeneralRows,
    definition: WcaTsvFileDefinition,
    headers: ValidatedWcaTsvHeaders,
    line: string,
  ): void {
    const record = selectedRecord(definition, headers, line)

    switch (definition.key) {
      case 'championships':
        if ((record.id ?? '') === '') {
          break
        }

        rows.championships.push({
          championshipType: record.championship_type ?? '',
          competitionId: nullIfEmpty(record.competition_id ?? ''),
          id: integer(record.id ?? ''),
        })
        break
      case 'eligibleCountryIso2sForChampionship':
        rows.championshipEligibleCountries.push({
          championshipType: record.championship_type ?? '',
          eligibleCountryIso2: record.eligible_country_iso2 ?? '',
        })
        break
      case 'competitions':
        rows.competitions.push({
          cancelled: integer(record.cancelled ?? '0') !== 0,
          cellName: record.cell_name ?? '',
          city: record.city ?? '',
          countryId: nullIfEmpty(record.country_id ?? ''),
          day: integer(record.day ?? '0'),
          endDay: integer(record.end_day ?? '0'),
          endMonth: integer(record.end_month ?? '0'),
          eventSpecs: record.event_specs ?? '',
          externalWebsite: record.external_website ?? '',
          id: record.id ?? '',
          information: record.information ?? '',
          latitude: record.latitude ?? '',
          longitude: record.longitude ?? '',
          month: integer(record.month ?? '0'),
          name: record.name ?? '',
          organisers: record.organisers ?? '',
          venue: record.venue ?? '',
          venueAddress: record.venue_address ?? '',
          venueDetails: record.venue_details ?? '',
          wcaDelegates: record.wca_delegates ?? '',
          year: integer(record.year ?? '0'),
        })
        break
      case 'continents':
        rows.continents.push({ id: record.id ?? '', name: record.name ?? '' })
        break
      case 'countries':
        rows.countries.push({ continentId: nullIfEmpty(record.continent_id ?? ''), iso2Code: nullIfEmpty(record.iso2 ?? '') ?? record.id ?? '', name: record.name ?? '' })
        break
      case 'events':
        rows.events.push({
          format: eventFormat(record.format ?? ''),
          id: record.id ?? '',
          name: record.name ?? '',
          rank: nullableInteger(record.rank ?? ''),
        })
        break
      case 'formats':
        rows.formats.push({
          expectedSolveCount: integer(record.expected_solve_count ?? ''),
          id: record.id ?? '',
          name: record.name ?? '',
          shortName: record.short_name ?? '',
          sortBy: record.sort_by ?? '',
          sortBySecond: record.sort_by_second ?? '',
          trimFastestN: integer(record.trim_fastest_n ?? ''),
          trimSlowestN: integer(record.trim_slowest_n ?? ''),
        })
        break
      case 'persons':
        rows.persons.push({
          countryId: nullIfEmpty(record.country_id ?? ''),
          gender: record.gender ?? '',
          id: record.id ?? '',
          name: record.name ?? '',
          subId: integer(record.sub_id ?? '1'),
        })
        break
      case 'ranksAverage':
        rows.ranksAverage.push(rankRecord(record))
        break
      case 'ranksSingle':
        rows.ranksSingle.push(rankRecord(record))
        break
      case 'resultAttempts':
        rows.resultAttempts.push({
          attemptNumber: integer(record.attempt_number ?? ''),
          result: integer(record.result ?? ''),
          resultId: integer(record.result_id ?? ''),
        })
        break
      case 'results':
        rows.results.push({
          average: integer(record.average ?? '0'),
          best: integer(record.best ?? '0'),
          competitionId: record.competition_id ?? '',
          eventId: record.event_id ?? '',
          formatId: record.format_id ?? '',
          id: integer(record.id ?? ''),
          personId: record.person_id ?? '',
          position: integer(record.pos ?? '0'),
          regionalAverageRecord: nullIfEmpty(record.regional_average_record ?? ''),
          regionalSingleRecord: nullIfEmpty(record.regional_single_record ?? ''),
          roundTypeId: record.round_type_id ?? '',
        })
        break
      case 'roundTypes':
        rows.roundTypes.push({
          cellName: record.cell_name ?? '',
          final: integer(record.final ?? '') !== 0,
          id: record.id ?? '',
          name: record.name ?? '',
          rank: nullableInteger(record.rank ?? ''),
        })
        break
      case 'scrambles':
        rows.scrambles.push({
          competitionId: record.competition_id ?? '',
          eventId: record.event_id ?? '',
          groupId: record.group_id ?? '',
          id: integer(record.id ?? ''),
          isExtra: booleanFlag(record.is_extra ?? ''),
          roundTypeId: record.round_type_id ?? '',
          scramble: record.scramble ?? '',
          scrambleNumber: integer(record.scramble_num ?? ''),
        })
        break
      default:
        break
    }
  }

  private stagingRows(importRunId: string): StagingGeneralRows {
    const existing = this.staging.get(importRunId)

    if (existing !== undefined) {
      return existing
    }

    const rows = emptyRows()
    this.staging.set(importRunId, rows)
    return rows
  }
}

function selectedRecord(
  definition: WcaTsvFileDefinition,
  headers: ValidatedWcaTsvHeaders,
  line: string,
): Record<string, string> {
  const fields = line.split('\t')
  const record: Record<string, string> = {}

  for (let index = 0; index < definition.stagingColumns.length; index += 1) {
    const columnName = definition.stagingColumns[index]
    const sourceIndex = headers.sourceColumnIndexes[index]

    if (columnName === undefined || sourceIndex === undefined) {
      continue
    }

    record[columnName] = sourceIndex === null ? '' : fields[sourceIndex] ?? ''
  }

  return record
}

function eventFormat(value: string): WcaEventRecord['format'] {
  switch (value) {
    case 'multi':
    case 'number':
    case 'time':
      return value
    default:
      throw new Error(`Unknown WCA event format: ${value}`)
  }
}

function nullableInteger(value: string): number | null {
  if (value === '') {
    return null
  }

  const parsed = Number(value)
  return Number.isInteger(parsed) ? parsed : null
}

function integer(value: string): number {
  const parsed = Number(value)

  if (!Number.isInteger(parsed)) {
    throw new Error(`Expected integer WCA TSV value, got: ${value}`)
  }

  return parsed
}

function emptyRows(): StagingGeneralRows {
  return {
    championships: [],
    championshipEligibleCountries: [],
    competitions: [],
    continents: [],
    countries: [],
    events: [],
    formats: [],
    persons: [],
    ranksAverage: [],
    ranksSingle: [],
    resultAttempts: [],
    results: [],
    roundTypes: [],
    scrambles: [],
  }
}

function cloneRows(rows: StagingGeneralRows): StagingGeneralRows {
  return {
    championships: rows.championships.map((championship) => ({ ...championship })),
    championshipEligibleCountries: rows.championshipEligibleCountries.map((record) => ({ ...record })),
    competitions: rows.competitions.map((competition) => ({ ...competition })),
    continents: rows.continents.map((continent) => ({ ...continent })),
    countries: rows.countries.map((country) => ({ ...country })),
    events: rows.events.map((event) => ({ ...event })),
    formats: rows.formats.map((format) => ({ ...format })),
    persons: rows.persons.map((person) => ({ ...person })),
    ranksAverage: rows.ranksAverage.map((rank) => ({ ...rank })),
    ranksSingle: rows.ranksSingle.map((rank) => ({ ...rank })),
    resultAttempts: rows.resultAttempts.map((attempt) => ({ ...attempt })),
    results: rows.results.map((result) => ({ ...result })),
    roundTypes: rows.roundTypes.map((roundType) => ({ ...roundType })),
    scrambles: rows.scrambles.map((scramble) => ({ ...scramble })),
  }
}

function booleanFlag(value: string): boolean {
  return value === '1' || value.toLocaleLowerCase() === 'true'
}

function compareScrambles(left: WcaScrambleRecord, right: WcaScrambleRecord): number {
  return left.competitionId.localeCompare(right.competitionId)
    || left.eventId.localeCompare(right.eventId)
    || left.roundTypeId.localeCompare(right.roundTypeId)
    || left.groupId.localeCompare(right.groupId)
    || Number(left.isExtra) - Number(right.isExtra)
    || left.scrambleNumber - right.scrambleNumber
    || left.id - right.id
}

function compareChampionshipEligibleCountries(
  left: WcaChampionshipEligibleCountryRecord,
  right: WcaChampionshipEligibleCountryRecord,
): number {
  return left.championshipType.localeCompare(right.championshipType)
    || left.eligibleCountryIso2.localeCompare(right.eligibleCountryIso2)
}

function rankRecord(record: Record<string, string>): InMemoryRankRecord {
  return {
    best: integer(record.best ?? '0'),
    continentRank: integer(record.continent_rank ?? '0'),
    countryRank: integer(record.country_rank ?? '0'),
    eventId: record.event_id ?? '',
    personId: record.person_id ?? '',
    worldRank: integer(record.world_rank ?? '0'),
  }
}

function rankDocuments(
  rankType: 'average' | 'single',
  ranks: InMemoryRankRecord[],
  personsById: Map<string, WcaPersonRecord>,
  countriesByIso2: Map<string, WcaCountryRecord>,
): WcaRankDocument[] {
  const groups = new Map<string, WcaRankDocument>()
  const sortedRanks = [...ranks].sort((left, right) => (
    left.eventId.localeCompare(right.eventId)
    || left.worldRank - right.worldRank
    || left.personId.localeCompare(right.personId)
  ))

  for (const rank of sortedRanks) {
    const path = `rank/world/${rankType}/${rank.eventId}.json`
    const document = groups.get(path) ?? { items: [], path }
    const countryId = personsById.get(rank.personId)?.countryId ?? null
    const continentId = countryId === null ? null : countriesByIso2.get(countryId)?.continentId ?? null

    document.items.push({ ...rank, continentId, countryId })
    groups.set(path, document)
  }

  return [...groups.values()]
}

type InMemoryWorldRecordRank = InMemoryRankRecord & { type: WcaWorldRecordType }

function worldRecordRanks(rows: StagingGeneralRows, input: ListWcaWorldRecordsReadInput): InMemoryWorldRecordRank[] {
  const ranks: InMemoryWorldRecordRank[] = []

  if (input.type === undefined || input.type === 'single') {
    ranks.push(...rows.ranksSingle.map((rank) => ({ ...rank, type: 'single' as const })))
  }

  if (input.type === undefined || input.type === 'average') {
    ranks.push(...rows.ranksAverage.map((rank) => ({ ...rank, type: 'average' as const })))
  }

  return ranks
    .filter((rank) => rank.eventId === input.eventId)
}

function worldRecordEntry(rows: StagingGeneralRows, rank: InMemoryWorldRecordRank): WcaWorldRecordEntry | null {
  const event = rows.events.find((item) => item.id === rank.eventId)
  const athlete = rows.persons.find((person) => person.id === rank.personId && person.subId === 1)

  if (event === undefined || athlete === undefined) {
    return null
  }

  const country = athlete.countryId === null
    ? null
    : rows.countries.find((item) => item.iso2Code === athlete.countryId) ?? null
  const result = worldRecordResult(rows, rank)
  const competition = result === null
    ? null
    : rows.competitions.find((item) => item.id === result.competitionId) ?? null
  const candidates = result === null ? [] : rows.scrambles
    .filter((scramble) => scramble.competitionId === result.competitionId)
    .filter((scramble) => scramble.eventId === rank.eventId)
    .filter((scramble) => scramble.roundTypeId === result.roundTypeId)
    .filter((scramble) => !scramble.isExtra)
    .filter((scramble) => rank.type === 'average' || result.attemptNumbers.includes(scramble.scrambleNumber))
    .sort(compareScrambles)

  return {
    athlete,
    competition: competition === null ? null : {
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
      id: competition.id,
      name: competition.name,
    },
    country,
    event: {
      format: event.format,
      id: event.id,
      name: event.name,
    },
    rank: {
      continent: rank.continentRank,
      country: rank.countryRank,
      world: rank.worldRank,
    },
    result,
    scramble: {
      candidates,
      status: worldRecordScrambleStatus(rank.type, candidates),
    },
    type: rank.type,
    value: rank.best,
  }
}

type InMemoryWorldRecordResult = WcaWorldRecordEntry['result'] & { competitionId: string; roundTypeId: string }

function worldRecordResult(rows: StagingGeneralRows, rank: InMemoryWorldRecordRank): InMemoryWorldRecordResult | null {
  const formatNames = new Map(rows.formats.map((format) => [format.id, format.name]))
  const roundTypesById = new Map(rows.roundTypes.map((roundType) => [roundType.id, roundType]))
  const attemptsByResultId = new Map<number, InMemoryResultAttemptRecord[]>()

  for (const attempt of rows.resultAttempts) {
    const attempts = attemptsByResultId.get(attempt.resultId) ?? []
    attempts.push(attempt)
    attemptsByResultId.set(attempt.resultId, attempts)
  }

  const candidates = rows.results
    .filter((result) => result.personId === rank.personId)
    .filter((result) => result.eventId === rank.eventId)
    .filter((result) => rank.type === 'single' ? result.best === rank.best : result.average === rank.best)
    .sort((left, right) => compareWorldRecordResults(rows, rank.type, left, right))
  const result = candidates[0]

  if (result === undefined) {
    return null
  }

  const attempts = [...(attemptsByResultId.get(result.id) ?? [])].sort((left, right) => left.attemptNumber - right.attemptNumber)

  return {
    attemptNumbers: rank.type === 'single'
      ? attempts.filter((attempt) => attempt.result === rank.best).map((attempt) => attempt.attemptNumber)
      : [],
    average: result.average,
    best: result.best,
    competitionId: result.competitionId,
    format: formatNames.get(result.formatId) ?? result.formatId,
    id: result.id,
    position: result.position,
    regionalAverageRecord: result.regionalAverageRecord,
    regionalSingleRecord: result.regionalSingleRecord,
    round: roundTypesById.get(result.roundTypeId)?.name ?? result.roundTypeId,
    roundTypeId: result.roundTypeId,
    solves: padSolves(attempts.map((attempt) => attempt.result)),
  }
}

function compareWorldRecordResults(rows: StagingGeneralRows, type: WcaWorldRecordType, left: InMemoryResultRecord, right: InMemoryResultRecord): number {
  return recordMarkerPriority(type, left) - recordMarkerPriority(type, right)
    || compareCompetitionDateAsc(competitionForResult(rows, left), competitionForResult(rows, right))
    || left.id - right.id
}

function recordMarkerPriority(type: WcaWorldRecordType, result: InMemoryResultRecord): number {
  if (type === 'single') {
    return result.regionalSingleRecord === 'WR' ? 0 : 1
  }

  return result.regionalAverageRecord === 'WR' ? 0 : 1
}

function competitionForResult(rows: StagingGeneralRows, result: InMemoryResultRecord): WcaCompetitionRecord {
  return rows.competitions.find((competition) => competition.id === result.competitionId) ?? emptyCompetition(result.competitionId)
}

function emptyCompetition(id: string): WcaCompetitionRecord {
  return {
    cancelled: false,
    cellName: '',
    city: '',
    countryId: null,
    day: 0,
    endDay: 0,
    endMonth: 0,
    eventSpecs: '',
    externalWebsite: '',
    id,
    information: '',
    latitude: '',
    longitude: '',
    month: 0,
    name: id,
    organisers: '',
    venue: '',
    venueAddress: '',
    venueDetails: '',
    wcaDelegates: '',
    year: 0,
  }
}

function worldRecordMatchesSearch(record: WcaWorldRecordEntry, searchValue: string | undefined): boolean {
  const search = searchValue?.trim().toLocaleLowerCase()

  if (search === undefined || search.length === 0) {
    return true
  }

  return [
    record.athlete.id,
    record.athlete.name,
    record.athlete.countryId ?? '',
    record.country?.name ?? '',
    record.event.id,
    record.event.name,
    record.competition?.id ?? '',
    record.competition?.name ?? '',
  ].some((value) => value.toLocaleLowerCase().includes(search))
}

function compareWorldRecords(left: WcaWorldRecordEntry, right: WcaWorldRecordEntry): number {
  return left.event.name.localeCompare(right.event.name)
    || left.event.id.localeCompare(right.event.id)
    || right.type.localeCompare(left.type)
    || left.value - right.value
    || left.athlete.id.localeCompare(right.athlete.id)
}

function worldRecordScrambleStatus(type: WcaWorldRecordType, candidates: WcaScrambleRecord[]) {
  if (candidates.length === 0) {
    return 'unavailable'
  }

  return type === 'single' && candidates.length === 1 ? 'exact' : 'ambiguous'
}

function rankMatchesRegion(rank: WcaRankDocument['items'][number], input: ListWcaRankingsReadInput): boolean {
  switch (input.region) {
    case 'continent':
      return input.continentId === undefined ? rank.continentRank > 0 : rank.continentId === input.continentId
    case 'country':
      return input.countryIso2 === undefined ? rank.countryRank > 0 : rank.countryId === input.countryIso2
    case 'world':
      return true
  }
}

function rankValue(rank: WcaRankDocument['items'][number], region: ListWcaRankingsReadInput['region']): number {
  switch (region) {
    case 'continent':
      return rank.continentRank
    case 'country':
      return rank.countryRank
    case 'world':
      return rank.worldRank
  }
}

function nullIfEmpty(value: string): string | null {
  return value === '' || value === 'NULL' ? null : value
}

function dateString(year: number, month: number, day: number): string {
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
}

function daysBetween(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86_400_000))
}

function compareCompetitionDateDesc(left: WcaCompetitionRecord, right: WcaCompetitionRecord): number {
  return right.year - left.year || right.month - left.month || right.day - left.day
}

function compareCompetitionDateAsc(left: WcaCompetitionRecord, right: WcaCompetitionRecord): number {
  return left.year - right.year || left.month - right.month || left.day - right.day
}

function competitionEventIds(competition: WcaCompetitionRecord): string[] {
  return competition.eventSpecs.split(/\s+/).filter(Boolean)
}

function padSolves(solves: number[]): number[] {
  return [...solves, ...Array.from({ length: Math.max(0, 5 - solves.length) }, () => 0)]
}

function compareRank(left: number | null, right: number | null): number {
  if (left === null && right === null) {
    return 0
  }

  if (left === null) {
    return 1
  }

  if (right === null) {
    return -1
  }

  return left - right
}
