import type {
  WcaDataListResponse,
  WcaDataMeta,
  WcaEvent,
  WcaPersonProfile,
  WcaWorldRecord,
  WcaWorldRecordScrambleCandidate,
} from '@api/wcaData'

export const wcaMeta: WcaDataMeta = {
  datasetId: 'wca-export-2026-01-02',
  exportDate: '2026-01-02T00:00:00.000Z',
  exportVersion: '2026-01-02',
  source: 'World Cube Association Results Export',
}

export const timeEvent: WcaEvent = {
  format: 'time',
  id: '333',
  name: '3x3x3 Cube',
}

export const numberEvent: WcaEvent = {
  format: 'number',
  id: '333fm',
  name: '3x3x3 Fewest Moves',
}

export function createScrambleCandidate(index = 1): WcaWorldRecordScrambleCandidate {
  return {
    competitionId: 'MelbourneOpen2026',
    eventId: '333',
    groupId: 'A',
    id: index,
    isExtra: false,
    roundTypeId: 'f',
    scramble: `R U R' U' ${index}`,
    scrambleNumber: index,
  }
}

export function createWorldRecord(overrides: Partial<WcaWorldRecord> = {}): WcaWorldRecord {
  return {
    athlete: {
      avatarUrl: '/athletes/feliks.jpg',
      countryIso2: 'AU',
      countryName: 'Australia',
      gender: 'm',
      id: '2009ZEMD01',
      name: 'Feliks Zemdegs',
      wcaUrl: 'https://www.worldcubeassociation.org/persons/2009ZEMD01',
    },
    competition: {
      city: 'Melbourne',
      countryIso2: 'AU',
      date: {
        end: '2026-01-04',
        numberOfDays: 3,
        start: '2026-01-02',
      },
      id: 'MelbourneOpen2026',
      name: 'Melbourne Open 2026',
    },
    event: timeEvent,
    rank: {
      continent: 1,
      country: 1,
      world: 1,
    },
    result: {
      attemptNumbers: [1, 3],
      average: { raw: 521 },
      best: { raw: 490 },
      format: 'Average of 5',
      id: 42,
      position: 1,
      regionalAverageRecord: null,
      regionalSingleRecord: 'WR',
      round: 'Final',
      roundTypeId: 'f',
      solves: [{ raw: 490 }, { raw: 510 }, { raw: -1 }, { raw: -2 }, { raw: 563 }],
    },
    scramble: {
      candidates: [createScrambleCandidate()],
      status: 'exact',
    },
    type: 'single',
    value: { raw: 490 },
    ...overrides,
  }
}

export function createSparseWorldRecord(overrides: Partial<WcaWorldRecord> = {}): WcaWorldRecord {
  return createWorldRecord({
    athlete: {
      avatarUrl: null,
      countryIso2: null,
      countryName: null,
      gender: 'f',
      id: '2020LOVE01',
      name: 'Ada Lovelace Byron',
      wcaUrl: 'https://www.worldcubeassociation.org/persons/2020LOVE01',
    },
    competition: null,
    rank: {
      continent: 8,
      country: 3,
      world: 12,
    },
    result: null,
    scramble: {
      candidates: [],
      status: 'unavailable',
    },
    value: { raw: -1 },
    ...overrides,
  })
}

export function createPersonProfile(overrides: Partial<WcaPersonProfile> = {}): WcaPersonProfile {
  return {
    avatarThumbUrl: '/athletes/feliks-thumb.jpg',
    avatarUrl: '/athletes/feliks-large.jpg',
    competitionCount: 1_234,
    countryIso2: 'AU',
    countryName: 'Australia',
    gender: 'm',
    id: '2009ZEMD01',
    medals: {
      bronze: 5,
      gold: 12,
      silver: 7,
      total: 24,
    },
    name: 'Feliks Alexander Zemdegs',
    records: {
      continental: 9,
      national: 22,
      total: 40,
      world: 9,
    },
    totalSolves: 98_765,
    wcaUrl: 'https://www.worldcubeassociation.org/persons/2009ZEMD01',
    ...overrides,
  }
}

export function createWorldRecordsResponse(
  records: WcaWorldRecord[] = [createWorldRecord()],
  pagination: Partial<WcaDataListResponse<WcaWorldRecord>['pagination']> = {},
): WcaDataListResponse<WcaWorldRecord> {
  return {
    data: records,
    meta: wcaMeta,
    pagination: {
      hasNextPage: false,
      page: 1,
      pageSize: 25,
      total: records.length,
      ...pagination,
    },
  }
}
