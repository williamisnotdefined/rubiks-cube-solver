import { waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
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

const profile: WcaPersonProfile = {
  avatarThumbUrl: null,
  avatarUrl: null,
  competitionCount: 20,
  countryIso2: 'BR',
  countryName: 'Brazil',
  gender: 'm',
  id: '2015 TEST/01',
  medals: null,
  name: 'Test Athlete',
  records: null,
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

  it('omits blank and unspecified optional world-record filters', async () => {
    const fetchMock = mockApiSuccess(emptyRecordsResponse)

    await getWorldRecords({ eventId: '333', search: '   ' })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/wca-data/v1/records/world?eventId=333',
      expect.objectContaining({ headers: expect.any(Headers) }),
    )
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
    expect(wcaDataQueryKeys.worldRecords(query)).toEqual([
      'wcaData',
      'records',
      'world',
      query,
    ])
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
    expect(queryClient.getQueryData(wcaDataQueryKeys.personProfile('2015 TEST/01'))).toEqual(response)
  })

  it('surfaces WCA transport failures through query error state', async () => {
    mockApiError({ message: 'WCA export is unavailable' }, 503)
    const { result } = renderHookWithProviders(() =>
      useGetWorldRecords({ eventId: '333' }),
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toMatchObject({
      message: 'WCA export is unavailable',
      status: 503,
    })
  })
})
