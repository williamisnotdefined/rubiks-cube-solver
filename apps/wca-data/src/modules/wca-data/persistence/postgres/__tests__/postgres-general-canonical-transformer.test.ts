import { describe, expect, it } from 'vitest'
import { PostgresGeneralCanonicalTransformer } from '../postgres-general-canonical-transformer.js'
import type { Queryable } from '../queryable.js'

describe('PostgresGeneralCanonicalTransformer', () => {
  it('deletes old dataset rows and inserts general canonical rows from staging', async () => {
    const calls: Array<{ params?: unknown[]; sql: string }> = []
    const counts = ['7', '200', '21', '9', '1', '1', '0', '3', '400', '800', '900', '50', '50']
    const db: Queryable = {
      async query(sql, params) {
        calls.push({ params, sql })

        if (sql.includes('select count(*)')) {
          return { rows: [{ count: counts.shift() ?? '0' }] }
        }

        return { rows: [] }
      },
    }
    const transformer = new PostgresGeneralCanonicalTransformer(db)

    await expect(transformer.replaceGeneralTables({
      datasetId: '11111111-1111-4111-8111-111111111111',
      importRunId: '22222222-2222-4222-8222-222222222222',
    })).resolves.toEqual({
      championships: 0,
      competitions: 1,
      continents: 7,
      countries: 200,
      events: 21,
      formats: 9,
      persons: 400,
      ranksAverage: 50,
      ranksSingle: 50,
      resultAttempts: 900,
      results: 800,
      roundTypes: 1,
      scrambles: 3,
    })

    expect(calls).toHaveLength(27)
    expect(calls.slice(0, 13).map((call) => call.params)).toEqual(Array.from({ length: 13 }, () => [
      '11111111-1111-4111-8111-111111111111',
    ]))
    expect(calls.slice(13, 26).map((call) => call.params)).toEqual(Array.from({ length: 13 }, () => [
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
    ]))
    expect(calls[13]?.sql).toContain('insert into wca_continents')
    expect(calls[13]?.sql).toContain('(row_number() over (order by name, id))::integer')
    expect(calls[14]?.sql).toContain('insert into wca_countries')
    expect(calls[14]?.sql).toContain("coalesce(nullif(iso2, ''), id)")
    expect(calls[15]?.sql).toContain('insert into wca_events')
    expect(calls[16]?.sql).toContain('insert into wca_formats')
    expect(calls[16]?.sql).toContain("coalesce(short_name, '')")
    expect(calls[17]?.sql).toContain('insert into wca_round_types')
    expect(calls[17]?.sql).toContain("coalesce(nullif(final, ''), '0') <> '0'")
    expect(calls[18]?.sql).toContain('insert into wca_competitions')
    expect(calls[18]?.sql).toContain('left join wca_countries countries')
    expect(calls[18]?.sql).toContain('countries.id = nullif(competitions.country_id')
    expect(calls[19]?.sql).toContain('insert into wca_championships')
    expect(calls[20]?.sql).toContain('insert into wca_scrambles')
    expect(calls[20]?.sql).toContain("coalesce(nullif(is_extra, ''), '0') <> '0'")
    expect(calls[21]?.sql).toContain('insert into wca_persons')
    expect(calls[21]?.sql).toContain('left join wca_countries countries')
    expect(calls[21]?.sql).toContain('countries.id = nullif(persons.country_id')
    expect(calls[22]?.sql).toContain('insert into wca_results')
    expect(calls[23]?.sql).toContain('insert into wca_result_attempts')
    expect(calls[24]?.sql).toContain('insert into wca_ranks_single')
    expect(calls[25]?.sql).toContain('insert into wca_ranks_average')
    expect(calls[26]?.sql).toContain('analyze')
    expect(calls[26]?.sql).toContain('wca_scrambles')
  })
})
