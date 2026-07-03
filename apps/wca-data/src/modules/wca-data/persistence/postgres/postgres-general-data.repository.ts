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
  WcaWorldRecordScrambleStatus,
  WcaWorldRecordType,
} from '../../domain/wca-records.js'
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
type WorldRecordRow = {
  athlete_country_id: string | null
  athlete_gender: string
  athlete_id: string
  athlete_name: string
  average: number | string | null
  best: number | string | null
  competition_city: string | null
  competition_country_id: string | null
  competition_end_day: number | string | null
  competition_end_month: number | string | null
  competition_id: string | null
  competition_name: string | null
  competition_start_day: number | string | null
  competition_start_month: number | string | null
  competition_year: number | string | null
  continent_id: string | null
  continent_rank: number | string
  country_continent_id: string | null
  country_name: string | null
  country_rank: number | string
  event_format: 'multi' | 'number' | 'time'
  event_id: string
  event_name: string
  format_name: string | null
  pos: number | string | null
  record_attempt_numbers: number[] | string | null
  record_type: WcaWorldRecordType
  regional_average_record: string | null
  regional_single_record: string | null
  result_id: number | string | null
  round_name: string | null
  round_type_id: string | null
  scramble_candidates: unknown
  solves: number[] | string | null
  total: number | string
  value: number | string
  world_rank: number | string
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

  async listWorldRecords(datasetId: string, input: ListWcaWorldRecordsReadInput): Promise<WcaWorldRecordPage> {
    const query = worldRecordQuery(datasetId, input)
    const limitParam = query.params.length + 1
    const offsetParam = query.params.length + 2
    const result = await this.db.query<WorldRecordRow>(`
      with rank_rows as (
        ${query.rankSql}
      ), filtered_records as (
        select
          rr.record_type,
          rr.person_id as athlete_id,
          rr.event_id,
          rr.value,
          rr.world_rank,
          rr.continent_rank,
          rr.country_rank,
          e.name as event_name,
          e.format as event_format,
          p.name as athlete_name,
          p.country_id as athlete_country_id,
          p.gender as athlete_gender,
          country.name as country_name,
          country.continent_id as country_continent_id
        from rank_rows rr
        join wca_events e on e.dataset_id = $1 and e.id = rr.event_id
        left join wca_persons p on p.dataset_id = $1 and p.id = rr.person_id and p.sub_id = 1
        left join wca_countries country on country.dataset_id = $1 and country.iso2_code = p.country_id
        where ${query.whereSql}
      ), paged_records as (
        select *, count(*) over() as total
        from filtered_records
        order by record_type desc, world_rank, value, athlete_id
        limit $${limitParam}
        offset $${offsetParam}
      )
      select
        pr.record_type,
        pr.athlete_id,
        pr.event_id,
        pr.value,
        pr.world_rank,
        pr.continent_rank,
        pr.country_rank,
        pr.event_name,
        pr.event_format,
        pr.athlete_name,
        pr.athlete_country_id,
        pr.athlete_gender,
        pr.country_name,
        pr.country_continent_id,
        result.result_id,
        result.competition_id,
        result.competition_name,
        result.competition_city,
        result.competition_country_id,
        result.competition_year,
        result.competition_start_month,
        result.competition_start_day,
        result.competition_end_month,
        result.competition_end_day,
        result.round_type_id,
        result.round_name,
        result.format_name,
        result.pos,
        result.best,
        result.average,
        result.regional_single_record,
        result.regional_average_record,
        result.solves,
        result.record_attempt_numbers,
        scramble.candidates as scramble_candidates,
        pr.total
      from paged_records pr
        left join lateral (
          select
            r.id as result_id,
            r.competition_id,
            c.name as competition_name,
            c.city as competition_city,
            c.country_id as competition_country_id,
            c.year as competition_year,
            c.month as competition_start_month,
            c.day as competition_start_day,
            c.end_month as competition_end_month,
            c.end_day as competition_end_day,
            r.round_type_id,
            coalesce(rt.name, r.round_type_id, '') as round_name,
            coalesce(f.name, r.format_id, '') as format_name,
            r.pos,
            r.best,
            r.average,
            r.regional_single_record,
            r.regional_average_record,
            coalesce(array_agg(a.result order by a.attempt_number) filter (where a.attempt_number is not null), array[]::integer[]) as solves,
            coalesce(array_agg(a.attempt_number order by a.attempt_number) filter (where pr.record_type = 'single' and a.result = pr.value), array[]::integer[]) as record_attempt_numbers
          from wca_results r
          left join wca_competitions c on c.dataset_id = r.dataset_id and c.id = r.competition_id
          left join wca_round_types rt on rt.dataset_id = r.dataset_id and rt.id = r.round_type_id
          left join wca_formats f on f.dataset_id = r.dataset_id and f.id = r.format_id
          left join wca_result_attempts a on a.dataset_id = r.dataset_id and a.result_id = r.id
          where r.dataset_id = $1
            and r.person_id = pr.athlete_id
            and r.event_id = pr.event_id
            and (
              (pr.record_type = 'single' and r.best = pr.value)
              or (pr.record_type = 'average' and r.average = pr.value)
            )
          group by r.id, r.competition_id, c.name, c.city, c.country_id, c.year, c.month, c.day, c.end_month, c.end_day, r.round_type_id, rt.name, r.format_id, f.name, r.pos, r.best, r.average, r.regional_single_record, r.regional_average_record
          order by
            case
              when pr.record_type = 'single' and r.regional_single_record = 'WR' then 0
              when pr.record_type = 'average' and r.regional_average_record = 'WR' then 0
              else 1
            end,
            c.year asc nulls last,
            c.month asc nulls last,
            c.day asc nulls last,
            r.id asc
          limit 1
        ) result on true
        left join lateral (
          select coalesce(jsonb_agg(jsonb_build_object(
            'competitionId', s.competition_id,
            'eventId', s.event_id,
            'groupId', s.group_id,
            'id', s.id,
            'isExtra', s.is_extra,
            'roundTypeId', s.round_type_id,
            'scramble', s.scramble,
            'scrambleNumber', s.scramble_num
          ) order by s.group_id, s.scramble_num, s.id), '[]'::jsonb) as candidates
          from wca_scrambles s
          where s.dataset_id = $1
            and s.competition_id = result.competition_id
            and s.event_id = pr.event_id
            and s.round_type_id = result.round_type_id
            and s.is_extra = false
            and (
              pr.record_type = 'average'
              or s.scramble_num = any(result.record_attempt_numbers)
            )
        ) scramble on true
      order by pr.record_type desc, pr.world_rank, pr.value, pr.athlete_id
    `, [...query.params, input.pageSize, (input.page - 1) * input.pageSize])

    return {
      items: result.rows.map(worldRecordEntry),
      total: countRowTotal(result.rows[0]) ?? 0,
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

type WorldRecordQuery = {
  params: unknown[]
  rankSql: string
  whereSql: string
}

function worldRecordQuery(datasetId: string, input: ListWcaWorldRecordsReadInput): WorldRecordQuery {
  const params: unknown[] = [datasetId, input.eventId]
  const eventParam = params.length

  const rankSources: string[] = []

  if (input.type === undefined || input.type === 'single') {
    rankSources.push(worldRecordRankSource('wca_ranks_single', 'single', eventParam))
  }

  if (input.type === undefined || input.type === 'average') {
    rankSources.push(worldRecordRankSource('wca_ranks_average', 'average', eventParam))
  }

  const clauses = ['true']
  const search = input.search?.trim()

  if (search !== undefined && search.length > 0) {
    params.push(search)
    clauses.push(`(
      lower(rr.person_id) like '%' || lower($${params.length}) || '%'
      or lower(coalesce(p.name, '')) like '%' || lower($${params.length}) || '%'
      or lower(rr.event_id) like '%' || lower($${params.length}) || '%'
      or lower(e.name) like '%' || lower($${params.length}) || '%'
      or lower(coalesce(p.country_id, '')) like '%' || lower($${params.length}) || '%'
      or lower(coalesce(country.name, '')) like '%' || lower($${params.length}) || '%'
    )`)
  }

  return {
    params,
    rankSql: rankSources.join('\n        union all\n        '),
    whereSql: clauses.join(' and '),
  }
}

function worldRecordRankSource(tableName: string, type: WcaWorldRecordType, eventParam: number): string {
  return `
    select '${type}'::text as record_type, r.person_id, r.event_id, r.best as value, r.world_rank, r.continent_rank, r.country_rank
    from ${tableName} r
    where r.dataset_id = $1 and r.event_id = $${eventParam}
  `
}

function worldRecordEntry(row: WorldRecordRow): WcaWorldRecordEntry {
  const type = row.record_type
  const candidates = jsonArray<ScrambleCandidateJson>(row.scramble_candidates).map(scrambleCandidateRecord)

  return {
    athlete: {
      countryId: row.athlete_country_id,
      gender: row.athlete_gender,
      id: row.athlete_id,
      name: row.athlete_name,
      subId: 1,
    },
    competition: worldRecordCompetition(row),
    country: row.athlete_country_id === null
      ? null
      : {
        continentId: row.country_continent_id,
        iso2Code: row.athlete_country_id,
        name: row.country_name ?? row.athlete_country_id,
      },
    event: {
      format: row.event_format,
      id: row.event_id,
      name: row.event_name,
    },
    rank: {
      continent: numberLikeToNumber(row.continent_rank),
      country: numberLikeToNumber(row.country_rank),
      world: numberLikeToNumber(row.world_rank),
    },
    result: worldRecordResult(row),
    scramble: {
      candidates,
      status: worldRecordScrambleStatus(type, candidates),
    },
    type,
    value: numberLikeToNumber(row.value),
  }
}

function worldRecordCompetition(row: WorldRecordRow): WcaWorldRecordEntry['competition'] {
  if (row.competition_id === null) {
    return null
  }

  const year = nullableNumberLikeToNumber(row.competition_year)
  const startMonth = nullableNumberLikeToNumber(row.competition_start_month)
  const startDay = nullableNumberLikeToNumber(row.competition_start_day)
  const endMonth = nullableNumberLikeToNumber(row.competition_end_month)
  const endDay = nullableNumberLikeToNumber(row.competition_end_day)

  return {
    city: row.competition_city ?? '',
    countryIso2: row.competition_country_id,
    date: {
      end: dateString(year, endMonth, endDay),
      numberOfDays: daysBetween(
        new Date(Date.UTC(year, startMonth - 1, startDay)),
        new Date(Date.UTC(year, endMonth - 1, endDay)),
      ) + 1,
      start: dateString(year, startMonth, startDay),
    },
    id: row.competition_id,
    name: row.competition_name ?? row.competition_id,
  }
}

function worldRecordResult(row: WorldRecordRow): WcaWorldRecordEntry['result'] {
  if (row.result_id === null || row.best === null || row.average === null || row.pos === null) {
    return null
  }

  return {
    attemptNumbers: integerArray(row.record_attempt_numbers),
    average: numberLikeToNumber(row.average),
    best: numberLikeToNumber(row.best),
    format: row.format_name ?? '',
    id: numberLikeToNumber(row.result_id),
    position: numberLikeToNumber(row.pos),
    regionalAverageRecord: nullIfEmpty(row.regional_average_record),
    regionalSingleRecord: nullIfEmpty(row.regional_single_record),
    round: row.round_name ?? '',
    roundTypeId: row.round_type_id ?? '',
    solves: padSolves(integerArray(row.solves)),
  }
}

function worldRecordScrambleStatus(type: WcaWorldRecordType, candidates: WcaScrambleRecord[]): WcaWorldRecordScrambleStatus {
  if (candidates.length === 0) {
    return 'unavailable'
  }

  return type === 'single' && candidates.length === 1 ? 'exact' : 'ambiguous'
}

type ScrambleCandidateJson = {
  competitionId?: unknown
  eventId?: unknown
  groupId?: unknown
  id?: unknown
  isExtra?: unknown
  roundTypeId?: unknown
  scramble?: unknown
  scrambleNumber?: unknown
}

function scrambleCandidateRecord(candidate: ScrambleCandidateJson): WcaScrambleRecord {
  return {
    competitionId: stringValue(candidate.competitionId),
    eventId: stringValue(candidate.eventId),
    groupId: stringValue(candidate.groupId),
    id: numberLikeToNumber(numberLikeValue(candidate.id)),
    isExtra: booleanValue(candidate.isExtra),
    roundTypeId: stringValue(candidate.roundTypeId),
    scramble: stringValue(candidate.scramble),
    scrambleNumber: numberLikeToNumber(numberLikeValue(candidate.scrambleNumber)),
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

function dateString(year: number, month: number, day: number): string {
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
}

function daysBetween(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86_400_000))
}

function nullIfEmpty(value: string | null): string | null {
  return value === null || value === '' || value === 'NULL' ? null : value
}

function numberLikeToNumber(value: number | string): number {
  return typeof value === 'number' ? value : Number(value)
}

function nullableNumberLikeToNumber(value: number | string | null): number {
  return value === null ? 0 : numberLikeToNumber(value)
}

function numberLikeValue(value: unknown): number | string {
  return typeof value === 'number' || typeof value === 'string' ? value : 0
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : value === null || value === undefined ? '' : String(value)
}

function booleanValue(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'string') {
    return value === '1' || value.toLocaleLowerCase() === 'true'
  }

  return value === 1
}

function countRowTotal(row: CountRow | undefined): number | null {
  if (row === undefined || row.total === undefined) {
    return null
  }

  return numberLikeToNumber(row.total)
}

function jsonArray<TItem>(value: unknown): TItem[] {
  if (Array.isArray(value)) {
    return value as TItem[]
  }

  if (typeof value !== 'string') {
    return []
  }

  const parsed = JSON.parse(value) as unknown
  return Array.isArray(parsed) ? parsed as TItem[] : []
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
