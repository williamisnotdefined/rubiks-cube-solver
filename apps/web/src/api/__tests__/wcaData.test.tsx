import { waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { mockApiError, mockApiSuccess } from '@src/test/api'
import { renderHookWithProviders } from '@src/test/render'
import { getWcaEvents } from '../wcaData/getEvents/getEvents'
import { useGetWcaEvents } from '../wcaData/getEvents'
import { getWcaPersonProfile } from '../wcaData/getPersonProfile/getPersonProfile'
import { useGetWcaPersonProfile } from '../wcaData/getPersonProfile'
import { getWorldRecords } from '../wcaData/getWorldRecords/getWorldRecords'
import { useGetWorldRecords } from '../wcaData/getWorldRecords'
import { wcaDataQueryKeys } from '../wcaData/queryKeys'
import type {
  WcaDataListResponse,
  WcaEvent,
  WcaPersonProfile,
  WcaWorldRecord,
  WcaWorldRecordsQuery,
} from '../wcaData/types'

const meta = {
  datasetId: 'wca-export-2026-01-02',
  exportDate: '2026-01-02T00:00:00.000Z',
  exportVersion: '2026-01-02',
  source: 'World Cube Association Results Export' as const,
}

const eventsResponse: WcaDataListResponse<WcaEvent> = {
  data: [{ format: 'time', id: '333', name: '3x3x3 Cube' }],
  meta,
  pagination: { hasNextPage: false, page: 1, pageSize: 100, total: 1 },
}

const emptyRecordsResponse: WcaDataListResponse<WcaWorldRecord> = {
  data: [],
  meta,
  pagination: { hasNextPage: false, page: 2, pageSize: 50, total: 0 },
}

const worldRecord: WcaWorldRecord = {
  athlete: {
    avatarUrl: 'http://avatars.worldcubeassociation.org/athlete.jpg',
    countryIso2: 'BR',
    countryName: 'Brazil',
    gender: 'm',
    id: '2015TEST01',
    name: 'Test Athlete',
    wcaUrl: 'https://www.worldcubeassociation.org/persons/2015TEST01',
  },
  competition: {
    city: 'Sao Paulo',
    countryIso2: 'BR',
    date: { end: '2026-01-02', numberOfDays: 2, start: '2026-01-01' },
    id: 'TestOpen2026',
    name: 'Test Open 2026',
  },
  event: eventsResponse.data[0],
  rank: { continent: 1, country: 1, world: 1 },
  result: {
    attemptNumbers: [1],
    average: { raw: 550 },
    best: { raw: 500 },
    format: 'Average of 5',
    id: 42,
    position: 1,
    regionalAverageRecord: null,
    regionalSingleRecord: 'WR',
    round: 'Final',
    roundTypeId: 'f',
    solves: [{ raw: 500 }],
  },
  scramble: {
    candidates: [
      {
        competitionId: 'TestOpen2026',
        eventId: '333',
        groupId: 'A',
        id: 7,
        isExtra: false,
        roundTypeId: 'f',
        scramble: "R U R'",
        scrambleNumber: 1,
      },
    ],
    status: 'exact',
  },
  type: 'single',
  value: { raw: 500 },
}

const recordsResponse: WcaDataListResponse<WcaWorldRecord> = {
  data: [worldRecord],
  meta,
  pagination: { hasNextPage: false, page: 1, pageSize: 25, total: 1 },
}

const profile: WcaPersonProfile = {
  avatarThumbUrl: 'https://avatars.worldcubeassociation.org/athlete-thumb.jpg',
  avatarUrl: 'http://avatars.worldcubeassociation.org/athlete.jpg',
  competitionCount: 20,
  countryIso2: 'BR',
  countryName: 'Brazil',
  gender: 'm',
  id: '2015 TEST/01',
  medals: null,
  name: 'Test Athlete',
  records: { continental: 2, national: 3, total: 6, world: 1 },
  totalSolves: 500,
  wcaUrl: 'https://www.worldcubeassociation.org/persons/2015TEST01',
}

describe('WCA Data requests', () => {
  it('requests the complete event catalog with the service page size', async () => {
    const fetchMock = mockApiSuccess(eventsResponse)

    await expect(getWcaEvents()).resolves.toEqual(eventsResponse)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/wca-data/v1/events?pageSize=100',
      expect.objectContaining({ headers: expect.any(Headers) }),
    )
  })

  it('encodes person IDs as path segments', async () => {
    const response = { data: profile, meta }
    const fetchMock = mockApiSuccess(response)

    await expect(getWcaPersonProfile('2015 TEST/01')).resolves.toEqual(response)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/wca-data/v1/persons/2015%20TEST%2F01/profile',
      expect.objectContaining({ headers: expect.any(Headers) }),
    )
  })

  it('serializes every supported world-record filter and trims search text', async () => {
    const fetchMock = mockApiSuccess(emptyRecordsResponse)
    const query: WcaWorldRecordsQuery = {
      eventId: '333fm',
      page: 2,
      pageSize: 50,
      search: '  Max Park & Team  ',
      type: 'average',
    }

    await expect(getWorldRecords(query)).resolves.toEqual(emptyRecordsResponse)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/wca-data/v1/records/world?eventId=333fm&type=average&search=Max+Park+%26+Team&page=2&pageSize=50',
      expect.objectContaining({ headers: expect.any(Headers) }),
    )
  })

  it('canonicalizes equivalent queries and clamps unsupported page sizes', async () => {
    const fetchMock = mockApiSuccess(emptyRecordsResponse)
    const query = {
      eventId: ' 333 ',
      page: 0,
      pageSize: 500,
      search: '   ',
    }

    await getWorldRecords(query)

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/wca-data/v1/records/world?eventId=333&page=1&pageSize=100',
      expect.any(Object),
    )
    expect(wcaDataQueryKeys.worldRecords(query)).toEqual(
      wcaDataQueryKeys.worldRecords({ eventId: '333', page: 1, pageSize: 100 }),
    )
  })

  it('omits blank and unspecified optional world-record filters', async () => {
    const fetchMock = mockApiSuccess(emptyRecordsResponse)

    await getWorldRecords({ eventId: '333', search: '   ' })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/wca-data/v1/records/world?eventId=333',
      expect.objectContaining({ headers: expect.any(Headers) }),
    )
  })

  it('accepts valid ISO dates and HTTP(S) public URLs', async () => {
    mockApiSuccess(recordsResponse)

    await expect(getWorldRecords({ eventId: '333' })).resolves.toEqual(recordsResponse)
  })

  it.each([
    [
      'events with an invalid export date',
      { ...eventsResponse, meta: { ...meta, exportDate: '2026-02-30T00:00:00Z' } },
      getWcaEvents,
    ],
    [
      'events with a non-string export date',
      { ...eventsResponse, meta: { ...meta, exportDate: 0 } },
      getWcaEvents,
    ],
    [
      'events without the data array',
      { meta, pagination: eventsResponse.pagination },
      getWcaEvents,
    ],
    [
      'events with an invalid nested field',
      {
        ...eventsResponse,
        data: [{ ...eventsResponse.data[0], name: 42 }],
      },
      getWcaEvents,
    ],
    [
      'events with a non-finite pagination value',
      {
        ...eventsResponse,
        pagination: { ...eventsResponse.pagination, total: 'many' },
      },
      getWcaEvents,
    ],
    [
      'records without rank data',
      {
        ...recordsResponse,
        data: [{ ...worldRecord, rank: undefined }],
      },
      () => getWorldRecords({ eventId: '333' }),
    ],
    [
      'records without result solves',
      {
        ...recordsResponse,
        data: [{ ...worldRecord, result: { ...worldRecord.result, solves: undefined } }],
      },
      () => getWorldRecords({ eventId: '333' }),
    ],
    [
      'records with an invalid competition start date',
      {
        ...recordsResponse,
        data: [
          {
            ...worldRecord,
            competition: {
              ...worldRecord.competition,
              date: { ...worldRecord.competition?.date, start: '2026-02-30' },
            },
          },
        ],
      },
      () => getWorldRecords({ eventId: '333' }),
    ],
    [
      'records with missing competition date data',
      {
        ...recordsResponse,
        data: [{ ...worldRecord, competition: { ...worldRecord.competition, date: null } }],
      },
      () => getWorldRecords({ eventId: '333' }),
    ],
    [
      'records with a non-string competition date',
      {
        ...recordsResponse,
        data: [
          {
            ...worldRecord,
            competition: {
              ...worldRecord.competition,
              date: { ...worldRecord.competition?.date, start: 0 },
            },
          },
        ],
      },
      () => getWorldRecords({ eventId: '333' }),
    ],
    [
      'records with an invalid competition end date',
      {
        ...recordsResponse,
        data: [
          {
            ...worldRecord,
            competition: {
              ...worldRecord.competition,
              date: { ...worldRecord.competition?.date, end: 'not-a-date' },
            },
          },
        ],
      },
      () => getWorldRecords({ eventId: '333' }),
    ],
    [
      'records with competition dates in impossible order',
      {
        ...recordsResponse,
        data: [
          {
            ...worldRecord,
            competition: {
              ...worldRecord.competition,
              date: { end: '2026-01-01', numberOfDays: 2, start: '2026-01-02' },
            },
          },
        ],
      },
      () => getWorldRecords({ eventId: '333' }),
    ],
    [
      'records with an invalid athlete WCA URL',
      {
        ...recordsResponse,
        data: [
          { ...worldRecord, athlete: { ...worldRecord.athlete, wcaUrl: 'javascript:alert(1)' } },
        ],
      },
      () => getWorldRecords({ eventId: '333' }),
    ],
    [
      'records with an invalid athlete avatar URL',
      {
        ...recordsResponse,
        data: [{ ...worldRecord, athlete: { ...worldRecord.athlete, avatarUrl: '/avatar.jpg' } }],
      },
      () => getWorldRecords({ eventId: '333' }),
    ],
    [
      'records with an invalid candidate field',
      {
        ...recordsResponse,
        data: [
          {
            ...worldRecord,
            scramble: {
              ...worldRecord.scramble,
              candidates: [{ ...worldRecord.scramble.candidates[0], isExtra: 'false' }],
            },
          },
        ],
      },
      () => getWorldRecords({ eventId: '333' }),
    ],
    [
      'profiles with an invalid nullable field',
      {
        data: { ...profile, competitionCount: '20' },
        meta,
      },
      () => getWcaPersonProfile(profile.id),
    ],
    [
      'profiles with an invalid WCA URL',
      { data: { ...profile, wcaUrl: 'www.worldcubeassociation.org/persons/2015TEST01' }, meta },
      () => getWcaPersonProfile(profile.id),
    ],
    [
      'profiles with an invalid avatar URL',
      {
        data: { ...profile, avatarUrl: 'ftp://avatars.worldcubeassociation.org/athlete.jpg' },
        meta,
      },
      () => getWcaPersonProfile(profile.id),
    ],
    [
      'profiles with an invalid avatar thumbnail URL',
      { data: { ...profile, avatarThumbUrl: 'https://' }, meta },
      () => getWcaPersonProfile(profile.id),
    ],
    [
      'profiles with a non-string avatar URL',
      { data: { ...profile, avatarUrl: 42 }, meta },
      () => getWcaPersonProfile(profile.id),
    ],
    [
      'profiles with incomplete nested totals',
      {
        data: { ...profile, medals: { bronze: 1, gold: 2, silver: 3 } },
        meta,
      },
      () => getWcaPersonProfile(profile.id),
    ],
  ])('rejects invalid %s', async (_label, payload, request) => {
    mockApiSuccess(payload)

    await expect(request()).rejects.toMatchObject({ name: 'ApiResponseValidationError' })
  })

  it.each([400, 503])('maps WCA HTTP %s responses to ApiRequestError', async (status) => {
    mockApiError({ message: 'WCA request failed' }, status)

    await expect(getWcaEvents()).rejects.toMatchObject({
      message: 'WCA request failed',
      name: 'ApiRequestError',
      status,
    })
  })

  it('provides domain-scoped query keys for every resource', () => {
    const query: WcaWorldRecordsQuery = { eventId: '333', page: 3, type: 'single' }

    expect(wcaDataQueryKeys.all).toEqual(['wcaData'])
    expect(wcaDataQueryKeys.events()).toEqual(['wcaData', 'events'])
    expect(wcaDataQueryKeys.personProfile('2009ZEMD01')).toEqual([
      'wcaData',
      'persons',
      '2009ZEMD01',
      'profile',
    ])
    expect(wcaDataQueryKeys.worldRecords(query)).toEqual(['wcaData', 'records', 'world', query])
  })
})

describe('WCA Data React Query hooks', () => {
  it('loads the event catalog', async () => {
    mockApiSuccess(eventsResponse)
    const { result } = renderHookWithProviders(() => useGetWcaEvents())

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(eventsResponse)
  })

  it('loads world records for the supplied query', async () => {
    const fetchMock = mockApiSuccess(emptyRecordsResponse)
    const query: WcaWorldRecordsQuery = {
      eventId: '333',
      page: 2,
      pageSize: 50,
      type: 'single',
    }
    const { result } = renderHookWithProviders(() => useGetWorldRecords(query))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(emptyRecordsResponse)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/wca-data/v1/records/world?eventId=333&type=single&page=2&pageSize=50',
      expect.any(Object),
    )
  })

  it('does not request a person profile without an athlete ID', () => {
    const fetchMock = mockApiSuccess({ data: profile, meta })
    const { result } = renderHookWithProviders(() => useGetWcaPersonProfile(null))

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('loads and caches an identified athlete profile', async () => {
    const response = { data: profile, meta }
    const fetchMock = mockApiSuccess(response)
    const { queryClient, result } = renderHookWithProviders(() =>
      useGetWcaPersonProfile('2015 TEST/01'),
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(response)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(queryClient.getQueryData(wcaDataQueryKeys.personProfile('2015 TEST/01'))).toEqual(
      response,
    )
  })

  it('surfaces WCA transport failures through query error state', async () => {
    mockApiError({ message: 'WCA export is unavailable' }, 503)
    const { result } = renderHookWithProviders(() => useGetWorldRecords({ eventId: '333' }))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toMatchObject({
      message: 'WCA export is unavailable',
      status: 503,
    })
  })

  it('surfaces parse failures through query error state', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{invalid json', { status: 200 }))
    const { result } = renderHookWithProviders(() => useGetWcaEvents())

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toMatchObject({ name: 'ApiResponseParseError', status: 200 })
  })

  it('passes the React Query abort signal to WCA GET requests', async () => {
    let requestSignal: AbortSignal | null | undefined
    vi.spyOn(globalThis, 'fetch').mockImplementation((_input, init) => {
      requestSignal = init?.signal
      return new Promise<Response>(() => undefined)
    })
    const { unmount } = renderHookWithProviders(() => useGetWcaEvents())

    await waitFor(() => expect(requestSignal).toBeInstanceOf(AbortSignal))
    unmount()
    expect(requestSignal?.aborted).toBe(true)
  })
})
