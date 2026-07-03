import type { FastifyInstance } from 'fastify'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadEnv } from '../../config/env.js'
import type { WcaDataApiDatabase } from '../create-wca-data-api.js'
import { createWcaDataApi } from '../create-wca-data-api.js'

type TestWcaDataApi = {
  close: () => Promise<void>
  inject: FastifyInstance['inject']
}

let app: TestWcaDataApi | undefined

afterEach(async () => {
  await app?.close()
  app = undefined
  vi.unstubAllGlobals()
})

describe('WCA Data API', () => {
  it('serves health status', async () => {
    app = await testApp()

    const response = await app.inject({ method: 'GET', url: '/health' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ status: 'ok' })
  })

  it('serves WCA Data API status', async () => {
    app = await testApp()

    const response = await app.inject({ method: 'GET', url: '/api/wca-data/v1/status' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      activeDataset: {
        exportDate: '2026-06-30T00:00:16Z',
        exportVersion: 'v2.0.2',
        id: 'fixture-wca-data-v1',
      },
      lastImportRun: null,
      metrics: {
        activeDataset: {
          counts: { totalRows: 37, results: 3, resultAttempts: 13, scrambles: 1, championshipEligibleCountries: 2 },
        },
      },
      scheduler: { cron: '30 4 * * *', enabled: true, timezone: 'UTC' },
      source: { official: false, provider: 'World Cube Association Results Export' },
      status: 'ok',
    })
    expect(response.json()).not.toHaveProperty('documents')
  })

  it('serves the OpenAPI YAML document', async () => {
    app = await testApp()

    const yamlResponse = await app.inject({ method: 'GET', url: '/api/wca-data/v1/openapi.yaml' })
    const jsonResponse = await app.inject({ method: 'GET', url: '/api/wca-data/v1/openapi.json' })
    const docsResponse = await app.inject({ method: 'GET', url: '/api/wca-data/v1/docs' })

    expect(yamlResponse.statusCode).toBe(200)
    expect(yamlResponse.headers['cache-control']).toBe('public, max-age=300')
    expect(yamlResponse.headers['content-type']).toContain('application/yaml')
    expect(yamlResponse.body).toContain('openapi: 3.0.3')
    expect(yamlResponse.body).toContain('/wca-data/v1/status:')
    expect(jsonResponse.statusCode).toBe(200)
    expect(jsonResponse.json()).toMatchObject({ openapi: '3.0.3', paths: { '/wca-data/v1/events': expect.any(Object) } })
    expect(docsResponse.statusCode).toBe(200)
    expect(docsResponse.headers['content-type']).toContain('text/html')
    expect(docsResponse.body).toContain('WCA Data API Reference')
    expect(docsResponse.body).toContain('cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js')
    expect(docsResponse.body).toContain("Redoc.init('./openapi.yaml'")
  })

  it('does not use bundled fixture data in production', async () => {
    await expect(createWcaDataApi({ env: loadEnv({ WCA_DATA_NODE_ENV: 'production' }) }))
      .rejects.toThrow('WCA_DATA_DATABASE_URL is required for WCA Data API production runtime')
  })

  it('lists events and countries with pagination and dataset metadata', async () => {
    app = await testApp()

    const eventsResponse = await app.inject({ method: 'GET', url: '/api/wca-data/v1/events?pageSize=1' })
    const countriesResponse = await app.inject({ method: 'GET', url: '/api/wca-data/v1/countries' })

    expect(eventsResponse.statusCode).toBe(200)
    expect(eventsResponse.json()).toMatchObject({
      data: [{ format: 'time', id: '333', name: '3x3x3 Cube' }],
      meta: { datasetId: 'fixture-wca-data-v1', source: 'World Cube Association Results Export' },
      pagination: { hasNextPage: true, page: 1, pageSize: 1, total: 2 },
    })
    expect(countriesResponse.statusCode).toBe(200)
    expect(countriesResponse.json()).toMatchObject({
      data: [
        { continentId: 'europe', iso2Code: 'PL', name: 'Poland' },
        { continentId: 'north-america', iso2Code: 'US', name: 'United States' },
      ],
      pagination: { total: 2 },
    })
  })

  it('lists reference data for continents, formats, round types, and championships', async () => {
    app = await testApp()

    const eligibleCountriesResponse = await app.inject({ method: 'GET', url: '/api/wca-data/v1/championship-eligible-countries?championshipType=world&countryIso2=PL' })
    const continentsResponse = await app.inject({ method: 'GET', url: '/api/wca-data/v1/continents?pageSize=1' })
    const formatsResponse = await app.inject({ method: 'GET', url: '/api/wca-data/v1/formats' })
    const roundTypesResponse = await app.inject({ method: 'GET', url: '/api/wca-data/v1/round-types' })
    const championshipsResponse = await app.inject({ method: 'GET', url: '/api/wca-data/v1/championships?championshipType=world' })

    expect(eligibleCountriesResponse.statusCode).toBe(200)
    expect(eligibleCountriesResponse.json()).toMatchObject({
      data: [{ championshipType: 'world', eligibleCountryIso2: 'PL' }],
      pagination: { total: 1 },
    })
    expect(continentsResponse.statusCode).toBe(200)
    expect(continentsResponse.json()).toMatchObject({
      data: [{ id: 'europe', name: 'Europe' }],
      meta: { datasetId: 'fixture-wca-data-v1' },
      pagination: { hasNextPage: true, page: 1, pageSize: 1, total: 2 },
    })
    expect(formatsResponse.statusCode).toBe(200)
    expect(formatsResponse.json()).toMatchObject({
      data: [{ expectedSolveCount: 5, id: 'a', name: 'Average of 5', shortName: 'Ao5' }],
      pagination: { total: 1 },
    })
    expect(roundTypesResponse.statusCode).toBe(200)
    expect(roundTypesResponse.json()).toMatchObject({
      data: [{ cellName: 'Final', id: 'f', isFinal: true, name: 'Final' }],
      pagination: { total: 1 },
    })
    expect(championshipsResponse.statusCode).toBe(200)
    expect(championshipsResponse.json()).toMatchObject({
      data: [{ championshipType: 'world', competitionId: 'WorldChampionship2023', id: 1 }],
      pagination: { total: 1 },
    })
  })

  it('lists and fetches competitions', async () => {
    app = await testApp()

    const listResponse = await app.inject({ method: 'GET', url: '/api/wca-data/v1/competitions?countryIso2=PL&eventId=clock' })
    const itemResponse = await app.inject({ method: 'GET', url: '/api/wca-data/v1/competitions/FixtureOpen2026' })

    expect(listResponse.statusCode).toBe(200)
    expect(listResponse.json()).toMatchObject({
      data: [
        { countryIso2: 'PL', events: ['333', 'clock'], id: 'FixtureOpen2026', name: 'Fixture Open 2026' },
        { countryIso2: 'PL', events: ['clock'], id: 'BrizZonSylwesterOpen2022', name: 'BrizZon Sylwester Open 2022' },
      ],
      pagination: { total: 2 },
    })
    expect(itemResponse.statusCode).toBe(200)
    expect(itemResponse.json()).toMatchObject({
      data: {
        city: 'Warsaw',
        countryIso2: 'PL',
        date: { end: '2026-06-30', numberOfDays: 1, start: '2026-06-30' },
        id: 'FixtureOpen2026',
        venue: { coordinates: { latitude: 52.123456, longitude: 21.012345 } },
      },
      meta: { datasetId: 'fixture-wca-data-v1' },
    })
  })

  it('lists and fetches persons', async () => {
    app = await testApp()

    const listResponse = await app.inject({ method: 'GET', url: '/api/wca-data/v1/persons?search=park' })
    const itemResponse = await app.inject({ method: 'GET', url: '/api/wca-data/v1/persons/2012PARK03' })

    expect(listResponse.statusCode).toBe(200)
    expect(listResponse.json()).toMatchObject({
      data: [{ countryIso2: 'US', gender: 'm', id: '2012PARK03', name: 'Max Park' }],
      pagination: { total: 1 },
    })
    expect(itemResponse.statusCode).toBe(200)
    expect(itemResponse.json()).toMatchObject({
      data: { countryIso2: 'US', id: '2012PARK03', name: 'Max Park' },
    })
  })

  it('fetches enriched WCA person profiles with approved avatars', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      competition_count: 80,
      medals: { bronze: 34, gold: 88, silver: 59, total: 181 },
      person: {
        avatar: {
          is_default: false,
          thumb_url: 'https://avatars.worldcubeassociation.org/thumb',
          url: 'https://avatars.worldcubeassociation.org/full',
        },
        country: { name: 'Poland' },
        country_iso2: 'PL',
        gender: 'o',
        name: 'Fixture Solver',
        url: 'https://www.worldcubeassociation.org/persons/2026FIXT01',
        wca_id: '2026FIXT01',
      },
      records: { continental: 4, national: 4, total: 10, world: 2 },
      total_solves: 5373,
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })))
    app = await testApp()

    const response = await app.inject({ method: 'GET', url: '/api/wca-data/v1/persons/2026FIXT01/profile' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      data: {
        avatarThumbUrl: 'https://avatars.worldcubeassociation.org/thumb',
        avatarUrl: 'https://avatars.worldcubeassociation.org/full',
        competitionCount: 80,
        id: '2026FIXT01',
        medals: { total: 181 },
        records: { world: 2 },
        totalSolves: 5373,
      },
    })
  })

  it('lists rankings and top speedcubers', async () => {
    app = await testApp()

    const rankingsResponse = await app.inject({ method: 'GET', url: '/api/wca-data/v1/rankings?eventId=333&type=single' })
    const topResponse = await app.inject({ method: 'GET', url: '/api/wca-data/v1/speedcubers/top?eventId=333&type=average' })

    expect(rankingsResponse.statusCode).toBe(200)
    expect(rankingsResponse.json()).toMatchObject({
      data: [{ best: { raw: 1000 }, eventId: '333', personId: '2026FIXT01', rank: { selected: 1, world: 1 }, region: 'world', type: 'single' }],
      pagination: { total: 1 },
    })
    expect(topResponse.statusCode).toBe(200)
    expect(topResponse.json()).toMatchObject({
      data: [{ best: { raw: 1200 }, eventId: '333', personId: '2026FIXT01', type: 'average' }],
      pagination: { total: 1 },
    })
  })

  it('lists enriched current world records with scramble candidates', async () => {
    app = await testApp()

    const response = await app.inject({ method: 'GET', url: '/api/wca-data/v1/records/world?eventId=333&type=single&search=fixture' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      data: [{
        athlete: {
          countryIso2: 'PL',
          countryName: 'Poland',
          id: '2026FIXT01',
          name: 'Fixture Solver',
          wcaUrl: 'https://www.worldcubeassociation.org/persons/2026FIXT01',
        },
        competition: {
          date: { start: '2026-06-30' },
          id: 'FixtureOpen2026',
          name: 'Fixture Open 2026',
        },
        event: { id: '333', name: '3x3x3 Cube' },
        result: {
          attemptNumbers: [1],
          best: { raw: 1000 },
          solves: [{ raw: 1000 }, { raw: 1200 }, { raw: 1400 }, { raw: 0 }, { raw: 0 }],
        },
        scramble: {
          candidates: [{ groupId: 'A', scramble: "R U R' U'", scrambleNumber: 1 }],
          status: 'exact',
        },
        type: 'single',
        value: { raw: 1000 },
      }],
      pagination: { total: 1 },
    })
  })

  it('lists results by competition, event, and person filters', async () => {
    app = await testApp()

    const response = await app.inject({
      method: 'GET',
      url: '/api/wca-data/v1/results?competitionId=BrizZonSylwesterOpen2022&eventId=clock&personId=2013ROGA02',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      data: [{
        average: { raw: 564 },
        best: { raw: 539 },
        competitionId: 'BrizZonSylwesterOpen2022',
        eventId: 'clock',
        personId: '2013ROGA02',
        position: 1,
        round: 'Final',
        solves: [{ raw: 587 }, { raw: 615 }, { raw: 543 }, { raw: 539 }, { raw: 561 }],
      }],
      pagination: { total: 1 },
    })
  })

  it('lists scrambles by competition, event, round, group, and extra filters', async () => {
    app = await testApp()

    const response = await app.inject({
      method: 'GET',
      url: '/api/wca-data/v1/scrambles?competitionId=FixtureOpen2026&eventId=333&roundTypeId=f&groupId=A&isExtra=false',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      data: [{
        competitionId: 'FixtureOpen2026',
        eventId: '333',
        groupId: 'A',
        id: 1,
        isExtra: false,
        roundTypeId: 'f',
        scramble: "R U R' U'",
        scrambleNumber: 1,
      }],
      pagination: { total: 1 },
    })
  })

  it('returns API errors for missing items and invalid query parameters', async () => {
    app = await testApp()

    const missingResponse = await app.inject({ method: 'GET', url: '/api/wca-data/v1/persons/MISSING' })
    const invalidResponse = await app.inject({ method: 'GET', url: '/api/wca-data/v1/rankings?eventId=333&type=best' })
    const missingEventResponse = await app.inject({ method: 'GET', url: '/api/wca-data/v1/records/world' })

    expect(missingResponse.statusCode).toBe(404)
    expect(missingResponse.json()).toMatchObject({ error: { code: 'not_found', message: 'WCA person not found' } })
    expect(invalidResponse.statusCode).toBe(400)
    expect(invalidResponse.json()).toMatchObject({ error: { code: 'invalid_request' } })
    expect(missingEventResponse.statusCode).toBe(400)
    expect(missingEventResponse.json()).toMatchObject({ error: { code: 'invalid_request' } })
  })

  it('uses Postgres-backed repositories when database URL is configured', async () => {
    const database = new FakeWcaDataApiDatabase()
    app = await testApi(await createWcaDataApi({
      env: loadEnv({
        WCA_DATA_DATABASE_URL: 'postgres://localhost/wca',
        WCA_DATA_NODE_ENV: 'test',
      }),
      pgPoolFactory: () => database,
    }))

    const statusResponse = await app.inject({ method: 'GET', url: '/api/wca-data/v1/status' })
    const eventsResponse = await app.inject({ method: 'GET', url: '/api/wca-data/v1/events' })

    expect(statusResponse.statusCode).toBe(200)
    expect(statusResponse.json()).toMatchObject({
      activeDataset: { id: 'dataset-1' },
      lastImportRun: { id: 'run-1', status: 'published' },
      scheduler: { cron: '30 4 * * *', enabled: true, timezone: 'UTC' },
      status: 'ok',
    })
    expect(eventsResponse.statusCode).toBe(200)
    expect(eventsResponse.json()).toMatchObject({
      data: [{ format: 'time', id: '333', name: '3x3x3 Cube' }],
      meta: { datasetId: 'dataset-1' },
    })

    await app.close()
    app = undefined
    expect(database.endCalls).toBe(1)
  })
})

async function testApp(): Promise<TestWcaDataApi> {
  return testApi(await createWcaDataApi({ env: loadEnv({ WCA_DATA_NODE_ENV: 'test' }) }))
}

function testApi(app: Awaited<ReturnType<typeof createWcaDataApi>>): TestWcaDataApi {
  const fastify = app.getHttpAdapter().getInstance()

  return {
    close: () => app.close(),
    inject: fastify.inject.bind(fastify) as FastifyInstance['inject'],
  }
}

class FakeWcaDataApiDatabase implements WcaDataApiDatabase {
  endCalls = 0

  async end(): Promise<void> {
    this.endCalls += 1
  }

  async query<TRow = Record<string, unknown>>(sql: string, _params?: unknown[]): Promise<{ rows: TRow[] }> {
    if (sql.includes('from wca_dataset_versions')) {
      return {
        rows: [{
            export_date: new Date('2026-06-30T00:00:16Z'),
            export_version: 'v2.0.2',
            id: 'dataset-1',
            metadata: { transform: { championships: 1, championshipEligibleCountries: 1, competitions: 1, continents: 1, countries: 1, events: 1, formats: 1, persons: 1, ranksAverage: 1, ranksSingle: 1, resultAttempts: 1, results: 1, roundTypes: 1, scrambles: 1 } },
            published_at: new Date('2026-06-30T04:58:00Z'),
          } as TRow],
      }
    }

    if (sql.includes('from wca_import_runs')) {
      return {
        rows: [{
          dataset_id: 'dataset-1',
          error_code: null,
          error_message: null,
          finished_at: new Date('2026-06-30T12:05:00Z'),
          id: 'run-1',
          log: { stagingRows: 4 },
          reason: 'manual',
          remote_export_date: new Date('2026-06-30T00:00:16Z'),
          remote_export_version: 'v2.0.2',
          started_at: new Date('2026-06-30T12:00:00Z'),
          status: 'published',
        } as TRow],
      }
    }

    if (sql.includes('from wca_events')) {
      return {
        rows: [{
          format: 'time',
          id: '333',
          name: '3x3x3 Cube',
        } as TRow],
      }
    }

    return { rows: [] }
  }
}
