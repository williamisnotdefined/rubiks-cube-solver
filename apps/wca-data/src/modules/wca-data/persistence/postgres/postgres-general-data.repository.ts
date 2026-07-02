import type {
  GeneralDataRepository,
  ListWcaChampionshipEligibleCountriesReadInput,
  ListWcaCompetitionsReadInput,
  ListWcaPersonsReadInput,
  ListWcaRankingsReadInput,
  ListWcaResultsReadInput,
  ListWcaScramblesReadInput,
  WcaCompetitionPage,
  WcaPersonPage,
  WcaRankPage,
  WcaResultPage,
  WcaScramblePage,
} from '../../application/read-models/general-data.repository.js'
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
} from '../../domain/general-records.js'
import type { Queryable } from './queryable.js'

type ContinentRow = { id: string; name: string }
type ChampionshipRow = { championship_type: string; competition_id: string | null; id: number | string }
type ChampionshipEligibleCountryRow = { championship_type: string; eligible_country_iso2: string }
type CompetitionRow = {
  cancelled: boolean
  cell_name: string
  city: string
  country_id: string | null
  day: number | string
  end_day: number | string
  end_month: number | string
  event_specs: string
  external_website: string
  id: string
  information: string
  latitude: string
  longitude: string
  month: number | string
  name: string
  organisers: string
  venue: string
  venue_address: string
  venue_details: string
  wca_delegates: string
  year: number | string
}
type CountryRow = { continent_id: string | null; iso2_code: string; name: string }
type EventRow = { format: 'multi' | 'number' | 'time'; id: string; name: string }
type FormatRow = {
  expected_solve_count: number | string
  id: string
  name: string
  short_name: string
  sort_by: string
  sort_by_second: string
  trim_fastest_n: number | string
  trim_slowest_n: number | string
}
type PersonRow = { country_id: string | null; gender: string; id: string; name: string; sub_id: number | string }
type RankDocumentRow = {
  best: number | string
  continent_id: string | null
  continent_rank: number | string
  country_id: string | null
  country_rank: number | string
  event_id: string
  person_id: string
  rank_type: 'average' | 'single'
  world_rank: number | string
}
type ResultDocumentRow = {
  average: number | string
  best: number | string
  competition_id: string
  event_id: string
  format_name: string
  is_final_round: boolean
  person_id: string
  pos: number | string
  regional_average_record: string | null
  regional_single_record: string | null
  round_name: string
  solves: number[] | string | null
}
type CountRow = { total: number | string }
type RoundTypeRow = { cell_name: string; id: string; is_final: boolean; name: string }
type ScrambleRow = {
  competition_id: string
  event_id: string
  group_id: string
  id: number | string
  is_extra: boolean
  round_type_id: string
  scramble: string
  scramble_num: number | string
}

export class PostgresGeneralDataRepository implements GeneralDataRepository {
  constructor(private readonly db: Queryable) {}

  async listChampionships(datasetId: string): Promise<WcaChampionshipRecord[]> {
    const result = await this.db.query<ChampionshipRow>(`
      select id, competition_id, championship_type
      from wca_championships
      where dataset_id = $1
      order by championship_type, id
    `, [datasetId])

    return result.rows.map((row) => ({
      championshipType: row.championship_type,
      competitionId: row.competition_id,
      id: numberLikeToNumber(row.id),
    }))
  }

  async listChampionshipEligibleCountries(
    datasetId: string,
    input: ListWcaChampionshipEligibleCountriesReadInput,
  ): Promise<WcaChampionshipEligibleCountryRecord[]> {
    const filters = championshipEligibleCountryFilters(datasetId, input)
    const result = await this.db.query<ChampionshipEligibleCountryRow>(`
      select championship_type, eligible_country_iso2
      from wca_championship_eligible_countries e
      where ${filters.whereSql}
      order by championship_type, eligible_country_iso2
    `, filters.params)

    return result.rows.map((row) => ({
      championshipType: row.championship_type,
      eligibleCountryIso2: row.eligible_country_iso2,
    }))
  }

  async getCompetition(datasetId: string, id: string): Promise<WcaCompetitionRecord | null> {
    const result = await this.db.query<CompetitionRow>(`
      select
        id,
        name,
        city,
        country_id,
        information,
        year,
        month,
        day,
        end_month,
        end_day,
        event_specs,
        wca_delegates,
        organisers,
        venue,
        venue_address,
        venue_details,
        external_website,
        cell_name,
        latitude,
        longitude,
        cancelled
      from wca_competitions
      where dataset_id = $1 and id = $2
      limit 1
    `, [datasetId, id])

    return result.rows[0] === undefined ? null : competitionRecord(result.rows[0])
  }

  async listCompetitions(datasetId: string): Promise<WcaCompetitionRecord[]> {
    const result = await this.db.query<CompetitionRow>(`
      select
        id,
        name,
        city,
        country_id,
        information,
        year,
        month,
        day,
        end_month,
        end_day,
        event_specs,
        wca_delegates,
        organisers,
        venue,
        venue_address,
        venue_details,
        external_website,
        cell_name,
        latitude,
        longitude,
        cancelled
      from wca_competitions
      where dataset_id = $1
      order by year desc, month desc, day desc, id
    `, [datasetId])

    return result.rows.map(competitionRecord)
  }

  async listCompetitionsPage(datasetId: string, input: ListWcaCompetitionsReadInput): Promise<WcaCompetitionPage> {
    const filters = competitionFilters(datasetId, input)
    const count = await this.db.query<CountRow>(`
      select count(*) as total
      from wca_competitions c
      where ${filters.whereSql}
    `, filters.params)
    const total = numberLikeToNumber(count.rows[0]?.total ?? 0)
    const limitParam = filters.params.length + 1
    const offsetParam = filters.params.length + 2
    const result = await this.db.query<CompetitionRow>(`
      select
        id,
        name,
        city,
        country_id,
        information,
        year,
        month,
        day,
        end_month,
        end_day,
        event_specs,
        wca_delegates,
        organisers,
        venue,
        venue_address,
        venue_details,
        external_website,
        cell_name,
        latitude,
        longitude,
        cancelled
      from wca_competitions c
      where ${filters.whereSql}
      order by year desc, month desc, day desc, id
      limit $${limitParam}
      offset $${offsetParam}
    `, [...filters.params, input.pageSize, (input.page - 1) * input.pageSize])

    return { items: result.rows.map(competitionRecord), total }
  }

  async listContinents(datasetId: string): Promise<WcaContinentRecord[]> {
    const result = await this.db.query<ContinentRow>(`
      select id, name
      from wca_continents
      where dataset_id = $1
      order by sort_order, id
    `, [datasetId])

    return result.rows.map((row) => ({ id: row.id, name: row.name }))
  }

  async listCountries(datasetId: string): Promise<WcaCountryRecord[]> {
    const result = await this.db.query<CountryRow>(`
      select iso2_code, name, continent_id
      from wca_countries
      where dataset_id = $1
      order by iso2_code
    `, [datasetId])

    return result.rows.map((row) => ({ continentId: row.continent_id, iso2Code: row.iso2_code, name: row.name }))
  }

  async listEvents(datasetId: string): Promise<WcaEventRecord[]> {
    const result = await this.db.query<EventRow>(`
      select id, name, format
      from wca_events
      where dataset_id = $1
      order by name, id
    `, [datasetId])

    return result.rows.map((row) => ({ format: row.format, id: row.id, name: row.name }))
  }

  async listFormats(datasetId: string): Promise<WcaFormatRecord[]> {
    const result = await this.db.query<FormatRow>(`
      select id, sort_by, sort_by_second, expected_solve_count, trim_fastest_n, trim_slowest_n, name, short_name
      from wca_formats
      where dataset_id = $1
      order by name, id
    `, [datasetId])

    return result.rows.map((row) => ({
      expectedSolveCount: numberLikeToNumber(row.expected_solve_count),
      id: row.id,
      name: row.name,
      shortName: row.short_name,
      sortBy: row.sort_by,
      sortBySecond: row.sort_by_second,
      trimFastestN: numberLikeToNumber(row.trim_fastest_n),
      trimSlowestN: numberLikeToNumber(row.trim_slowest_n),
    }))
  }

  async getPerson(datasetId: string, id: string): Promise<WcaPersonRecord | null> {
    const result = await this.db.query<PersonRow>(`
      select id, sub_id, name, country_id, gender
      from wca_persons
      where dataset_id = $1 and id = $2 and sub_id = 1
      limit 1
    `, [datasetId, id])

    return result.rows[0] === undefined ? null : personRecord(result.rows[0])
  }

  async listPersons(datasetId: string): Promise<WcaPersonRecord[]> {
    const result = await this.db.query<PersonRow>(`
      select id, sub_id, name, country_id, gender
      from wca_persons
      where dataset_id = $1 and sub_id = 1
      order by id
    `, [datasetId])

    return result.rows.map(personRecord)
  }

  async listPersonsPage(datasetId: string, input: ListWcaPersonsReadInput): Promise<WcaPersonPage> {
    const filters = personFilters(datasetId, input)
    const count = await this.db.query<CountRow>(`
      select count(*) as total
      from wca_persons p
      where ${filters.whereSql}
    `, filters.params)
    const total = numberLikeToNumber(count.rows[0]?.total ?? 0)
    const limitParam = filters.params.length + 1
    const offsetParam = filters.params.length + 2
    const result = await this.db.query<PersonRow>(`
      select id, sub_id, name, country_id, gender
      from wca_persons p
      where ${filters.whereSql}
      order by id
      limit $${limitParam}
      offset $${offsetParam}
    `, [...filters.params, input.pageSize, (input.page - 1) * input.pageSize])

    return { items: result.rows.map(personRecord), total }
  }

  async listRankDocuments(datasetId: string): Promise<WcaRankDocument[]> {
    const result = await this.db.query<RankDocumentRow>(`
      select 'single' as rank_type, r.person_id, r.event_id, r.best, r.world_rank, r.continent_rank, r.country_rank, p.country_id, c.continent_id
      from wca_ranks_single r
      left join wca_persons p on p.dataset_id = r.dataset_id and p.id = r.person_id and p.sub_id = 1
      left join wca_countries c on c.dataset_id = r.dataset_id and c.iso2_code = p.country_id
      where r.dataset_id = $1 and r.event_id is not null
      union all
      select 'average' as rank_type, r.person_id, r.event_id, r.best, r.world_rank, r.continent_rank, r.country_rank, p.country_id, c.continent_id
      from wca_ranks_average r
      left join wca_persons p on p.dataset_id = r.dataset_id and p.id = r.person_id and p.sub_id = 1
      left join wca_countries c on c.dataset_id = r.dataset_id and c.iso2_code = p.country_id
      where r.dataset_id = $1 and r.event_id is not null
      order by event_id, rank_type desc, world_rank, person_id
    `, [datasetId])

    const documents = new Map<string, WcaRankDocument>()

    for (const row of result.rows) {
      const path = `rank/world/${row.rank_type}/${row.event_id}.json`
      const document = documents.get(path) ?? { items: [], path }

      document.items.push({
        best: numberLikeToNumber(row.best),
        continentId: row.continent_id,
        continentRank: numberLikeToNumber(row.continent_rank),
        countryId: row.country_id,
        countryRank: numberLikeToNumber(row.country_rank),
        eventId: row.event_id,
        personId: row.person_id,
        worldRank: numberLikeToNumber(row.world_rank),
      })
      documents.set(path, document)
    }

    return [...documents.values()]
  }

  async listRankings(datasetId: string, input: ListWcaRankingsReadInput): Promise<WcaRankPage> {
    const rankSource = rankTableAndColumn(input)
    const filters = rankFilters(datasetId, input)
    const total = await this.rankSummaryTotal(datasetId, input) ?? await this.rankCountTotal(rankSource.tableName, filters)
    const limitParam = filters.params.length + 1
    const offsetParam = filters.params.length + 2
    const result = await this.db.query<RankDocumentRow>(`
      select r.person_id, r.event_id, r.best, r.world_rank, r.continent_rank, r.country_rank, p.country_id, c.continent_id
      from ${rankSource.tableName} r
      left join wca_persons p on p.dataset_id = r.dataset_id and p.id = r.person_id and p.sub_id = 1
      left join wca_countries c on c.dataset_id = r.dataset_id and c.iso2_code = p.country_id
      where ${filters.whereSql}
      order by ${rankSource.rankColumn}, r.person_id
      limit $${limitParam}
      offset $${offsetParam}
    `, [...filters.params, input.pageSize, (input.page - 1) * input.pageSize])

    return {
      items: result.rows.map((row) => ({
        best: numberLikeToNumber(row.best),
        continentId: row.continent_id,
        continentRank: numberLikeToNumber(row.continent_rank),
        countryId: row.country_id,
        countryRank: numberLikeToNumber(row.country_rank),
        eventId: row.event_id,
        personId: row.person_id,
        worldRank: numberLikeToNumber(row.world_rank),
      })),
      total,
    }
  }

  async listResultDocuments(datasetId: string): Promise<WcaResultDocument[]> {
    const result = await this.db.query<ResultDocumentRow>(`
      select
        r.competition_id,
        r.event_id,
        r.person_id,
        r.pos,
        r.best,
        r.average,
        r.regional_single_record,
        r.regional_average_record,
        coalesce(rt.name, r.round_type_id, '') as round_name,
        coalesce(rt.is_final, false) as is_final_round,
        coalesce(f.name, r.format_id, '') as format_name,
        coalesce(array_agg(a.result order by a.attempt_number) filter (where a.attempt_number is not null), '{}') as solves
      from wca_results r
      left join wca_round_types rt on rt.dataset_id = r.dataset_id and rt.id = r.round_type_id
      left join wca_formats f on f.dataset_id = r.dataset_id and f.id = r.format_id
      left join wca_result_attempts a on a.dataset_id = r.dataset_id and a.result_id = r.id
      where r.dataset_id = $1 and r.competition_id is not null and r.event_id is not null
      group by r.id, r.competition_id, r.event_id, r.person_id, r.pos, r.best, r.average, r.regional_single_record, r.regional_average_record, rt.name, rt.is_final, r.round_type_id, f.name, r.format_id
      order by r.competition_id, r.event_id, r.pos, r.id
    `, [datasetId])

    const documents = new Map<string, WcaResultDocument>()

    for (const row of result.rows) {
      const path = `results/${row.competition_id}/${row.event_id}.json`
      const document = documents.get(path) ?? { items: [], path }

      document.items.push({
        average: numberLikeToNumber(row.average),
        best: numberLikeToNumber(row.best),
        competitionId: row.competition_id,
        eventId: row.event_id,
        format: row.format_name,
        isFinalRound: row.is_final_round ?? false,
        personId: row.person_id,
        position: numberLikeToNumber(row.pos),
        regionalAverageRecord: row.regional_average_record ?? null,
        regionalSingleRecord: row.regional_single_record ?? null,
        round: row.round_name,
        solves: padSolves(integerArray(row.solves)),
      })
      documents.set(path, document)
    }

    return [...documents.values()]
  }

  async listResults(datasetId: string, input: ListWcaResultsReadInput): Promise<WcaResultPage> {
    const filters = resultFilters(datasetId, input)
    const total = await this.resultSummaryTotal(datasetId, input) ?? await this.resultCountTotal(filters)
    const limitParam = filters.params.length + 1
    const offsetParam = filters.params.length + 2
    const result = await this.db.query<ResultDocumentRow>(`
      with selected_results as (
        select
          r.id,
          r.competition_id,
          r.event_id,
          r.person_id,
          r.pos,
          r.best,
          r.average,
          r.regional_single_record,
          r.regional_average_record,
          r.round_type_id,
          r.format_id
        from wca_results r
        where ${filters.whereSql}
        order by r.competition_id, r.event_id, r.pos, r.id
        limit $${limitParam}
        offset $${offsetParam}
      )
      select
        r.competition_id,
        r.event_id,
        r.person_id,
        r.pos,
        r.best,
        r.average,
        r.regional_single_record,
        r.regional_average_record,
        coalesce(rt.name, r.round_type_id, '') as round_name,
        coalesce(rt.is_final, false) as is_final_round,
        coalesce(f.name, r.format_id, '') as format_name,
        coalesce(array_agg(a.result order by a.attempt_number) filter (where a.attempt_number is not null), '{}') as solves
      from selected_results r
      left join wca_round_types rt on rt.dataset_id = $1 and rt.id = r.round_type_id
      left join wca_formats f on f.dataset_id = $1 and f.id = r.format_id
      left join wca_result_attempts a on a.dataset_id = $1 and a.result_id = r.id
      group by r.id, r.competition_id, r.event_id, r.person_id, r.pos, r.best, r.average, r.regional_single_record, r.regional_average_record, rt.name, rt.is_final, r.round_type_id, f.name, r.format_id
      order by r.competition_id, r.event_id, r.pos, r.id
    `, [...filters.params, input.pageSize, (input.page - 1) * input.pageSize])

    return {
      items: result.rows.map(resultRecord),
      total,
    }
  }

  async listRoundTypes(datasetId: string): Promise<WcaRoundTypeRecord[]> {
    const result = await this.db.query<RoundTypeRow>(`
      select id, name, cell_name, is_final
      from wca_round_types
      where dataset_id = $1
      order by rank nulls last, id
    `, [datasetId])

    return result.rows.map((row) => ({
      cellName: row.cell_name,
      final: row.is_final,
      id: row.id,
      name: row.name,
    }))
  }

  async listScrambles(datasetId: string, input: ListWcaScramblesReadInput): Promise<WcaScramblePage> {
    const filters = scrambleFilters(datasetId, input)
    const total = await this.scrambleSummaryTotal(datasetId, input) ?? await this.scrambleCountTotal(filters)
    const limitParam = filters.params.length + 1
    const offsetParam = filters.params.length + 2
    const result = await this.db.query<ScrambleRow>(`
      select id, competition_id, event_id, round_type_id, group_id, is_extra, scramble_num, scramble
      from wca_scrambles s
      where ${filters.whereSql}
      order by competition_id, event_id, round_type_id, group_id, is_extra, scramble_num, id
      limit $${limitParam}
      offset $${offsetParam}
    `, [...filters.params, input.pageSize, (input.page - 1) * input.pageSize])

    return {
      items: result.rows.map(scrambleRecord),
      total,
    }
  }

  private async rankSummaryTotal(datasetId: string, input: ListWcaRankingsReadInput): Promise<number | null> {
    const regionId = rankSummaryRegionId(input)
    const result = await this.db.query<CountRow>(`
      select total
      from wca_rank_count_summaries
      where dataset_id = $1 and rank_type = $2 and event_id = $3 and region = $4 and region_id = $5
      limit 1
    `, [datasetId, input.type, input.eventId, input.region, regionId])

    return countRowTotal(result.rows[0])
  }

  private async rankCountTotal(tableName: string, filters: { params: unknown[]; whereSql: string }): Promise<number> {
    const count = await this.db.query<CountRow>(`
      select count(*) as total
      from ${tableName} r
      left join wca_persons p on p.dataset_id = r.dataset_id and p.id = r.person_id and p.sub_id = 1
      left join wca_countries c on c.dataset_id = r.dataset_id and c.iso2_code = p.country_id
      where ${filters.whereSql}
    `, filters.params)

    return countRowTotal(count.rows[0]) ?? 0
  }

  private async resultSummaryTotal(datasetId: string, input: ListWcaResultsReadInput): Promise<number | null> {
    if (input.eventId === undefined || input.competitionId !== undefined || input.personId !== undefined) {
      return null
    }

    const result = await this.db.query<CountRow>(`
      select total
      from wca_result_count_summaries
      where dataset_id = $1 and event_id = $2
      limit 1
    `, [datasetId, input.eventId])

    return countRowTotal(result.rows[0])
  }

  private async resultCountTotal(filters: { params: unknown[]; whereSql: string }): Promise<number> {
    const count = await this.db.query<CountRow>(`
      select count(*) as total
      from wca_results r
      where ${filters.whereSql}
    `, filters.params)

    return countRowTotal(count.rows[0]) ?? 0
  }

  private async scrambleSummaryTotal(datasetId: string, input: ListWcaScramblesReadInput): Promise<number | null> {
    if (
      input.eventId === undefined
      || input.competitionId !== undefined
      || input.roundTypeId !== undefined
      || input.groupId !== undefined
      || input.isExtra !== undefined
    ) {
      return null
    }

    const result = await this.db.query<CountRow>(`
      select total
      from wca_scramble_count_summaries
      where dataset_id = $1 and event_id = $2
      limit 1
    `, [datasetId, input.eventId])

    return countRowTotal(result.rows[0])
  }

  private async scrambleCountTotal(filters: { params: unknown[]; whereSql: string }): Promise<number> {
    const count = await this.db.query<CountRow>(`
      select count(*) as total
      from wca_scrambles s
      where ${filters.whereSql}
    `, filters.params)

    return countRowTotal(count.rows[0]) ?? 0
  }
}

function championshipEligibleCountryFilters(
  datasetId: string,
  input: ListWcaChampionshipEligibleCountriesReadInput,
): { params: unknown[]; whereSql: string } {
  const params: unknown[] = [datasetId]
  const clauses = ['e.dataset_id = $1']

  if (input.championshipType !== undefined) {
    params.push(input.championshipType)
    clauses.push(`e.championship_type = $${params.length}`)
  }

  if (input.countryIso2 !== undefined) {
    params.push(input.countryIso2)
    clauses.push(`e.eligible_country_iso2 = $${params.length}`)
  }

  return { params, whereSql: clauses.join(' and ') }
}

function scrambleFilters(datasetId: string, input: ListWcaScramblesReadInput): { params: unknown[]; whereSql: string } {
  const params: unknown[] = [datasetId]
  const clauses = ['s.dataset_id = $1']

  if (input.competitionId !== undefined) {
    params.push(input.competitionId)
    clauses.push(`s.competition_id = $${params.length}`)
  }

  if (input.eventId !== undefined) {
    params.push(input.eventId)
    clauses.push(`s.event_id = $${params.length}`)
  }

  if (input.roundTypeId !== undefined) {
    params.push(input.roundTypeId)
    clauses.push(`s.round_type_id = $${params.length}`)
  }

  if (input.groupId !== undefined) {
    params.push(input.groupId)
    clauses.push(`s.group_id = $${params.length}`)
  }

  if (input.isExtra !== undefined) {
    params.push(input.isExtra)
    clauses.push(`s.is_extra = $${params.length}`)
  }

  return { params, whereSql: clauses.join(' and ') }
}

function scrambleRecord(row: ScrambleRow): WcaScrambleRecord {
  return {
    competitionId: row.competition_id,
    eventId: row.event_id,
    groupId: row.group_id,
    id: numberLikeToNumber(row.id),
    isExtra: row.is_extra,
    roundTypeId: row.round_type_id,
    scramble: row.scramble,
    scrambleNumber: numberLikeToNumber(row.scramble_num),
  }
}

function competitionFilters(datasetId: string, input: ListWcaCompetitionsReadInput): { params: unknown[]; whereSql: string } {
  const params: unknown[] = [datasetId]
  const clauses = ['c.dataset_id = $1']

  if (input.countryIso2 !== undefined) {
    params.push(input.countryIso2)
    clauses.push(`c.country_id = $${params.length}`)
  }

  if (input.year !== undefined) {
    params.push(input.year)
    clauses.push(`c.year = $${params.length}`)
  }

  if (input.eventId !== undefined) {
    params.push(input.eventId)
    clauses.push(`string_to_array(c.event_specs, ' ') @> array[$${params.length}]::text[]`)
  }

  return { params, whereSql: clauses.join(' and ') }
}

function competitionRecord(row: CompetitionRow): WcaCompetitionRecord {
  return {
    cancelled: row.cancelled,
    cellName: row.cell_name,
    city: row.city,
    countryId: row.country_id,
    day: numberLikeToNumber(row.day),
    endDay: numberLikeToNumber(row.end_day),
    endMonth: numberLikeToNumber(row.end_month),
    eventSpecs: row.event_specs,
    externalWebsite: row.external_website,
    id: row.id,
    information: row.information,
    latitude: row.latitude,
    longitude: row.longitude,
    month: numberLikeToNumber(row.month),
    name: row.name,
    organisers: row.organisers,
    venue: row.venue,
    venueAddress: row.venue_address,
    venueDetails: row.venue_details,
    wcaDelegates: row.wca_delegates,
    year: numberLikeToNumber(row.year),
  }
}

function personFilters(datasetId: string, input: ListWcaPersonsReadInput): { params: unknown[]; whereSql: string } {
  const params: unknown[] = [datasetId]
  const clauses = ['p.dataset_id = $1', 'p.sub_id = 1']

  if (input.countryIso2 !== undefined) {
    params.push(input.countryIso2)
    clauses.push(`p.country_id = $${params.length}`)
  }

  const search = input.search?.trim()

  if (search !== undefined && search.length > 0) {
    params.push(search)
    clauses.push(`(lower(p.id) like '%' || lower($${params.length}) || '%' or lower(p.name) like '%' || lower($${params.length}) || '%')`)
  }

  return { params, whereSql: clauses.join(' and ') }
}

function personRecord(row: PersonRow): WcaPersonRecord {
  return {
    countryId: row.country_id,
    gender: row.gender,
    id: row.id,
    name: row.name,
    subId: numberLikeToNumber(row.sub_id),
  }
}

function rankTableAndColumn(input: ListWcaRankingsReadInput): { rankColumn: string; tableName: string } {
  const tableName = input.type === 'single' ? 'wca_ranks_single' : 'wca_ranks_average'

  switch (input.region) {
    case 'continent':
      return { rankColumn: 'r.continent_rank', tableName }
    case 'country':
      return { rankColumn: 'r.country_rank', tableName }
    case 'world':
      return { rankColumn: 'r.world_rank', tableName }
  }
}

function rankSummaryRegionId(input: ListWcaRankingsReadInput): string {
  switch (input.region) {
    case 'continent':
      return input.continentId ?? ''
    case 'country':
      return input.countryIso2 ?? ''
    case 'world':
      return ''
  }
}

function rankFilters(datasetId: string, input: ListWcaRankingsReadInput): { params: unknown[]; whereSql: string } {
  const params: unknown[] = [datasetId, input.eventId]
  const clauses = ['r.dataset_id = $1', 'r.event_id = $2']

  if (input.region === 'continent') {
    if (input.continentId === undefined) {
      clauses.push('r.continent_rank > 0')
    } else {
      params.push(input.continentId)
      clauses.push(`c.continent_id = $${params.length}`)
    }
  }

  if (input.region === 'country') {
    if (input.countryIso2 === undefined) {
      clauses.push('r.country_rank > 0')
    } else {
      params.push(input.countryIso2)
      clauses.push(`p.country_id = $${params.length}`)
    }
  }

  return { params, whereSql: clauses.join(' and ') }
}

function resultFilters(datasetId: string, input: ListWcaResultsReadInput): { params: unknown[]; whereSql: string } {
  const params: unknown[] = [datasetId]
  const clauses = ['r.dataset_id = $1', 'r.competition_id is not null', 'r.event_id is not null']

  if (input.competitionId !== undefined) {
    params.push(input.competitionId)
    clauses.push(`r.competition_id = $${params.length}`)
  }

  if (input.eventId !== undefined) {
    params.push(input.eventId)
    clauses.push(`r.event_id = $${params.length}`)
  }

  if (input.personId !== undefined) {
    params.push(input.personId)
    clauses.push(`r.person_id = $${params.length}`)
  }

  return { params, whereSql: clauses.join(' and ') }
}

function resultRecord(row: ResultDocumentRow) {
  return {
    average: numberLikeToNumber(row.average),
    best: numberLikeToNumber(row.best),
    competitionId: row.competition_id,
    eventId: row.event_id,
    format: row.format_name,
    isFinalRound: row.is_final_round ?? false,
    personId: row.person_id,
    position: numberLikeToNumber(row.pos),
    regionalAverageRecord: row.regional_average_record ?? null,
    regionalSingleRecord: row.regional_single_record ?? null,
    round: row.round_name,
    solves: padSolves(integerArray(row.solves)),
  }
}

function numberLikeToNumber(value: number | string): number {
  return typeof value === 'number' ? value : Number(value)
}

function countRowTotal(row: CountRow | undefined): number | null {
  if (row === undefined || row.total === undefined) {
    return null
  }

  return numberLikeToNumber(row.total)
}

function integerArray(value: number[] | string | null): number[] {
  if (value === null) {
    return []
  }

  if (Array.isArray(value)) {
    return value.map((item) => numberLikeToNumber(item))
  }

  return value
    .replace(/^\{|\}$/g, '')
    .split(',')
    .filter((item) => item !== '')
    .map((item) => Number(item))
}

function padSolves(solves: number[]): number[] {
  return [...solves, ...Array.from({ length: Math.max(0, 5 - solves.length) }, () => 0)]
}
