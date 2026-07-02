import type {
  GeneralCanonicalTransformer,
  GeneralCanonicalTransformCounts,
  TransformGeneralCanonicalInput,
} from '../../application/import/transform-general-canonical.service.js'
import type { Queryable } from './queryable.js'

type CountRow = {
  count: number | string
}

export class PostgresGeneralCanonicalTransformer implements GeneralCanonicalTransformer {
  constructor(private readonly db: Queryable) {}

  async replaceGeneralTables(input: TransformGeneralCanonicalInput): Promise<GeneralCanonicalTransformCounts> {
    await this.deleteExistingGeneralRows(input.datasetId)

    const counts = {
      continents: await this.insertContinents(input),
      countries: await this.insertCountries(input),
      events: await this.insertEvents(input),
      formats: await this.insertFormats(input),
      roundTypes: await this.insertRoundTypes(input),
      competitions: await this.insertCompetitions(input),
      championships: await this.insertChampionships(input),
      championshipEligibleCountries: await this.insertChampionshipEligibleCountries(input),
      scrambles: await this.insertScrambles(input),
      persons: await this.insertPersons(input),
      results: await this.insertResults(input),
      resultAttempts: await this.insertResultAttempts(input),
      ranksSingle: await this.insertRanks(input, 'single'),
      ranksAverage: await this.insertRanks(input, 'average'),
    }

    await this.analyzeGeneralTables()

    return counts
  }

  private async deleteExistingGeneralRows(datasetId: string): Promise<void> {
    await this.db.query('delete from wca_ranks_average where dataset_id = $1', [datasetId])
    await this.db.query('delete from wca_ranks_single where dataset_id = $1', [datasetId])
    await this.db.query('delete from wca_result_attempts where dataset_id = $1', [datasetId])
    await this.db.query('delete from wca_results where dataset_id = $1', [datasetId])
    await this.db.query('delete from wca_scrambles where dataset_id = $1', [datasetId])
    await this.db.query('delete from wca_persons where dataset_id = $1', [datasetId])
    await this.db.query('delete from wca_championship_eligible_countries where dataset_id = $1', [datasetId])
    await this.db.query('delete from wca_championships where dataset_id = $1', [datasetId])
    await this.db.query('delete from wca_competitions where dataset_id = $1', [datasetId])
    await this.db.query('delete from wca_formats where dataset_id = $1', [datasetId])
    await this.db.query('delete from wca_round_types where dataset_id = $1', [datasetId])
    await this.db.query('delete from wca_events where dataset_id = $1', [datasetId])
    await this.db.query('delete from wca_countries where dataset_id = $1', [datasetId])
    await this.db.query('delete from wca_continents where dataset_id = $1', [datasetId])
  }

  private async analyzeGeneralTables(): Promise<void> {
    await this.db.query(`
      analyze
        wca_continents,
        wca_countries,
        wca_events,
        wca_formats,
        wca_round_types,
        wca_competitions,
        wca_championships,
        wca_championship_eligible_countries,
        wca_scrambles,
        wca_persons,
        wca_results,
        wca_result_attempts,
        wca_ranks_single,
        wca_ranks_average
    `)
  }

  private async insertCompetitions(input: TransformGeneralCanonicalInput): Promise<number> {
    const result = await this.db.query<CountRow>(`
      with inserted as (
        insert into wca_competitions (
          dataset_id,
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
        )
        select
          $1,
          competitions.id,
          coalesce(competitions.name, ''),
          coalesce(competitions.city, ''),
          countries.iso2_code,
          coalesce(competitions.information, ''),
          coalesce(competitions.year, 0),
          coalesce(competitions.month, 0),
          coalesce(competitions.day, 0),
          coalesce(competitions.end_month, 0),
          coalesce(competitions.end_day, 0),
          coalesce(competitions.event_specs, ''),
          coalesce(competitions.wca_delegates, ''),
          coalesce(competitions.organisers, ''),
          coalesce(competitions.venue, ''),
          coalesce(competitions.venue_address, ''),
          coalesce(competitions.venue_details, ''),
          coalesce(competitions.external_website, ''),
          coalesce(competitions.cell_name, ''),
          coalesce(competitions.latitude, ''),
          coalesce(competitions.longitude, ''),
          coalesce(nullif(competitions.cancelled, ''), '0') <> '0'
        from wca_staging_competitions competitions
        left join wca_countries countries
          on countries.dataset_id = $1
          and (countries.id = nullif(competitions.country_id, '') or countries.iso2_code = nullif(competitions.country_id, ''))
        where competitions.import_run_id = $2
        order by competitions.year desc nulls last, competitions.month desc nulls last, competitions.day desc nulls last, competitions.id
        returning 1
      )
      select count(*)::integer as count from inserted
    `, [input.datasetId, input.importRunId])

    return countFromResult(result.rows[0])
  }

  private async insertChampionships(input: TransformGeneralCanonicalInput): Promise<number> {
    const result = await this.db.query<CountRow>(`
      with inserted as (
        insert into wca_championships (dataset_id, id, competition_id, championship_type)
        select
          $1,
          id,
          nullif(competition_id, ''),
          coalesce(championship_type, '')
        from wca_staging_championships
        where import_run_id = $2 and id is not null
        order by id
        returning 1
      )
      select count(*)::integer as count from inserted
    `, [input.datasetId, input.importRunId])

    return countFromResult(result.rows[0])
  }

  private async insertChampionshipEligibleCountries(input: TransformGeneralCanonicalInput): Promise<number> {
    const result = await this.db.query<CountRow>(`
      with inserted as (
        insert into wca_championship_eligible_countries (dataset_id, championship_type, eligible_country_iso2)
        select distinct
          $1::uuid,
          coalesce(championship_type, ''),
          coalesce(eligible_country_iso2, '')
        from wca_staging_eligible_country_iso2s_for_championship
        where import_run_id = $2
          and championship_type is not null
          and championship_type <> ''
          and eligible_country_iso2 is not null
          and eligible_country_iso2 <> ''
        order by 2, 3
        returning 1
      )
      select count(*)::integer as count from inserted
    `, [input.datasetId, input.importRunId])

    return countFromResult(result.rows[0])
  }

  private async insertScrambles(input: TransformGeneralCanonicalInput): Promise<number> {
    const result = await this.db.query<CountRow>(`
      with inserted as (
        insert into wca_scrambles (dataset_id, id, competition_id, event_id, round_type_id, group_id, is_extra, scramble_num, scramble)
        select
          $1,
          id,
          coalesce(competition_id, ''),
          coalesce(event_id, ''),
          coalesce(round_type_id, ''),
          coalesce(group_id, ''),
          coalesce(nullif(is_extra, ''), '0') <> '0',
          coalesce(scramble_num, 0),
          coalesce(scramble, '')
        from wca_staging_scrambles
        where import_run_id = $2
          and id is not null
          and competition_id is not null
          and event_id is not null
          and round_type_id is not null
        order by competition_id, event_id, round_type_id, group_id, is_extra, scramble_num, id
        returning 1
      )
      select count(*)::integer as count from inserted
    `, [input.datasetId, input.importRunId])

    return countFromResult(result.rows[0])
  }

  private async insertContinents(input: TransformGeneralCanonicalInput): Promise<number> {
    const result = await this.db.query<CountRow>(`
      with inserted as (
        insert into wca_continents (dataset_id, id, name, sort_order)
        select
          $1,
          id,
          name,
          (row_number() over (order by name, id))::integer
        from wca_staging_continents
        where import_run_id = $2
        order by name, id
        returning 1
      )
      select count(*)::integer as count from inserted
    `, [input.datasetId, input.importRunId])

    return countFromResult(result.rows[0])
  }

  private async insertCountries(input: TransformGeneralCanonicalInput): Promise<number> {
    const result = await this.db.query<CountRow>(`
      with inserted as (
        insert into wca_countries (dataset_id, id, iso2_code, name, continent_id)
        select
          $1,
          id,
          coalesce(nullif(iso2, ''), id),
          name,
          nullif(continent_id, '')
        from wca_staging_countries
        where import_run_id = $2
        order by name, id
        returning 1
      )
      select count(*)::integer as count from inserted
    `, [input.datasetId, input.importRunId])

    return countFromResult(result.rows[0])
  }

  private async insertEvents(input: TransformGeneralCanonicalInput): Promise<number> {
    const result = await this.db.query<CountRow>(`
      with inserted as (
        insert into wca_events (dataset_id, id, name, rank, format)
        select
          $1,
          id,
          name,
          rank,
          format
        from wca_staging_events
        where import_run_id = $2
        order by rank nulls last, id
        returning 1
      )
      select count(*)::integer as count from inserted
    `, [input.datasetId, input.importRunId])

    return countFromResult(result.rows[0])
  }

  private async insertRoundTypes(input: TransformGeneralCanonicalInput): Promise<number> {
    const result = await this.db.query<CountRow>(`
      with inserted as (
        insert into wca_round_types (dataset_id, id, rank, name, cell_name, is_final)
        select
          $1,
          id,
          rank,
          name,
          cell_name,
          coalesce(nullif(final, ''), '0') <> '0'
        from wca_staging_round_types
        where import_run_id = $2
        order by rank nulls last, id
        returning 1
      )
      select count(*)::integer as count from inserted
    `, [input.datasetId, input.importRunId])

    return countFromResult(result.rows[0])
  }

  private async insertFormats(input: TransformGeneralCanonicalInput): Promise<number> {
    const result = await this.db.query<CountRow>(`
      with inserted as (
        insert into wca_formats (
          dataset_id,
          id,
          sort_by,
          sort_by_second,
          expected_solve_count,
          trim_fastest_n,
          trim_slowest_n,
          name,
          short_name
        )
        select
          $1,
          id,
          sort_by,
          sort_by_second,
          expected_solve_count,
          trim_fastest_n,
          trim_slowest_n,
          name,
          coalesce(short_name, '')
        from wca_staging_formats
        where import_run_id = $2
        order by name, id
        returning 1
      )
      select count(*)::integer as count from inserted
    `, [input.datasetId, input.importRunId])

    return countFromResult(result.rows[0])
  }

  private async insertPersons(input: TransformGeneralCanonicalInput): Promise<number> {
    const result = await this.db.query<CountRow>(`
      with inserted as (
        insert into wca_persons (dataset_id, id, sub_id, name, country_id, gender)
        select
          $1,
          persons.id,
          coalesce(persons.sub_id, 1),
          coalesce(persons.name, ''),
          countries.iso2_code,
          coalesce(persons.gender, '')
        from wca_staging_persons persons
        left join wca_countries countries
          on countries.dataset_id = $1
          and (countries.id = nullif(persons.country_id, '') or countries.iso2_code = nullif(persons.country_id, ''))
        where persons.import_run_id = $2
        order by persons.name, persons.id, persons.sub_id
        returning 1
      )
      select count(*)::integer as count from inserted
    `, [input.datasetId, input.importRunId])

    return countFromResult(result.rows[0])
  }

  private async insertResults(input: TransformGeneralCanonicalInput): Promise<number> {
    const result = await this.db.query<CountRow>(`
      with inserted as (
        insert into wca_results (
          dataset_id,
          id,
          competition_id,
          event_id,
          round_type_id,
          pos,
          best,
          average,
          person_name,
          person_id,
          person_country_id,
          format_id,
          regional_single_record,
          regional_average_record
        )
        select
          $1,
          id,
          nullif(competition_id, ''),
          nullif(event_id, ''),
          nullif(round_type_id, ''),
          coalesce(pos, 0),
          coalesce(best, 0),
          coalesce(average, 0),
          coalesce(person_name, ''),
          coalesce(person_id, ''),
          nullif(person_country_id, ''),
          nullif(format_id, ''),
          coalesce(regional_single_record, ''),
          coalesce(regional_average_record, '')
        from wca_staging_results
        where import_run_id = $2 and id is not null
        order by competition_id, event_id, pos, id
        returning 1
      )
      select count(*)::integer as count from inserted
    `, [input.datasetId, input.importRunId])

    return countFromResult(result.rows[0])
  }

  private async insertResultAttempts(input: TransformGeneralCanonicalInput): Promise<number> {
    const result = await this.db.query<CountRow>(`
      with inserted as (
        insert into wca_result_attempts (dataset_id, result_id, attempt_number, result)
        select
          $1,
          result_id,
          attempt_number,
          result
        from wca_staging_result_attempts
        where import_run_id = $2 and result_id is not null and attempt_number is not null and result is not null
        order by result_id, attempt_number
        returning 1
      )
      select count(*)::integer as count from inserted
    `, [input.datasetId, input.importRunId])

    return countFromResult(result.rows[0])
  }

  private async insertRanks(input: TransformGeneralCanonicalInput, rankType: 'average' | 'single'): Promise<number> {
    const stagingTable = rankType === 'single' ? 'wca_staging_ranks_single' : 'wca_staging_ranks_average'
    const canonicalTable = rankType === 'single' ? 'wca_ranks_single' : 'wca_ranks_average'
    const result = await this.db.query<CountRow>(`
      with inserted as (
        insert into ${canonicalTable} (dataset_id, person_id, event_id, best, world_rank, continent_rank, country_rank)
        select
          $1,
          coalesce(person_id, ''),
          event_id,
          coalesce(best, 0),
          coalesce(world_rank, 0),
          coalesce(continent_rank, 0),
          coalesce(country_rank, 0)
        from ${stagingTable}
        where import_run_id = $2 and event_id is not null and event_id <> ''
        order by event_id, world_rank, person_id
        returning 1
      )
      select count(*)::integer as count from inserted
    `, [input.datasetId, input.importRunId])

    return countFromResult(result.rows[0])
  }
}

function countFromResult(row: CountRow | undefined): number {
  if (row === undefined) {
    return 0
  }

  return typeof row.count === 'number' ? row.count : Number(row.count)
}
