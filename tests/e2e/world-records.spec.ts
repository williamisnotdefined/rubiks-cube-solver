import { expect, test, type Page } from '@playwright/test'
import { gotoHydratedApp } from './app-helpers'
import { chooseRadixSelectOption } from './select-helpers'

const worldRecordsPath = '/records/world/'

test.describe('world records flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockWcaDataApi(page)
  })

  test('paginates world records with numbered controls', async ({ page }) => {
    await gotoHydratedApp(page, worldRecordsPath)

    await expect(page.getByRole('table')).toContainText('Yiheng Wang')
    await expect(page.getByRole('button', { name: 'Page 10' })).toBeVisible()

    await page.getByRole('button', { name: 'Page 2' }).click()

    await expect(page).toHaveURL(/page=2/)
    await expect(page.getByRole('table')).toContainText('Second Page Solver')
    await expect(page.getByRole('button', { name: 'Page 2' })).toHaveAttribute('aria-current', 'page')

    await page.getByRole('button', { name: 'Last page' }).click()

    await expect(page).toHaveURL(/page=10/)
    await expect(page.getByRole('table')).toContainText('Last Page Solver')
  })

  test('filters by search, event, and result type', async ({ page }) => {
    await gotoHydratedApp(page, worldRecordsPath)

    await page.getByLabel('Search').fill('Max')

    await expect(page).toHaveURL(/search=Max/)
    await expect(page).not.toHaveURL(/page=2/)
    await expect(page.getByRole('table')).toContainText('Max Park')
    await expect(page.getByRole('table')).not.toContainText('Yiheng Wang')

    await page.getByRole('button', { name: 'Reset' }).click()
    await chooseRadixSelectOption(page, 'Event', '2x2x2 Cube')

    await expect(page).toHaveURL(/eventId=222/)
    await expect(page.getByRole('table')).toContainText('2x2 Single Holder')
    await expect(page.getByRole('table')).not.toContainText('Yiheng Wang')

    await chooseRadixSelectOption(page, 'Type', 'Average')

    await expect(page).toHaveURL(/type=average/)
    await expect(page.getByRole('table')).toContainText('2x2 Average Holder')
    await expect(page.getByRole('table')).not.toContainText('2x2 Single Holder')
  })

  test('opens athlete details from a world record row', async ({ page }) => {
    await gotoHydratedApp(page, worldRecordsPath)

    await page.getByRole('button', { name: /Yiheng Wang/ }).click()

    const sheet = page.getByRole('dialog')
    await expect(sheet).toContainText('Yiheng Wang')
    await expect(sheet).toContainText('Selected leaderboard result')
    await expect(sheet).toContainText('Open WCA profile')
  })
})

async function mockWcaDataApi(page: Page) {
  await page.route('**/api/wca-data/v1/**', async (route) => {
    const url = new URL(route.request().url())

    if (url.pathname.endsWith('/events')) {
      await route.fulfill({ json: listResponse(wcaEvents, { page: 1, pageSize: 100, total: wcaEvents.length }) })
      return
    }

    if (url.pathname.endsWith('/records/world')) {
      await route.fulfill({ json: worldRecordsResponse(url.searchParams) })
      return
    }

    if (url.pathname.includes('/persons/') && url.pathname.endsWith('/profile')) {
      await route.fulfill({ json: personProfileResponse(decodeURIComponent(url.pathname.split('/').at(-2) ?? '')) })
      return
    }

    await route.fulfill({ json: { message: 'Unhandled WCA Data mock route' }, status: 404 })
  })
}

function worldRecordsResponse(searchParams: URLSearchParams) {
  const eventId = searchParams.get('eventId') ?? '333'
  const page = positiveInteger(searchParams.get('page'), 1)
  const pageSize = positiveInteger(searchParams.get('pageSize'), 25)
  const search = searchParams.get('search')?.toLocaleLowerCase()
  const type = searchParams.get('type')
  let data = worldRecords.filter((record) => record.event.id === eventId)
  let total = eventId === '333' && search === undefined && type === null ? 250 : data.length

  if (type === 'single' || type === 'average') {
    data = data.filter((record) => record.type === type)
    total = data.length
  }

  if (search !== undefined && search.length > 0) {
    data = data.filter((record) => (
      record.athlete.name.toLocaleLowerCase().includes(search) ||
      record.athlete.id.toLocaleLowerCase().includes(search) ||
      (record.athlete.countryName ?? '').toLocaleLowerCase().includes(search)
    ))
    total = data.length
  } else if (eventId === '333' && type === null && page === 2) {
    data = [record('333', 'single', '2019PAGE02', 'Second Page Solver', 411, 2)]
  } else if (eventId === '333' && type === null && page === 10) {
    data = [record('333', 'single', '2019PAGE10', 'Last Page Solver', 489, 10)]
  }

  return listResponse(data, { page, pageSize, total })
}

function personProfileResponse(personId: string) {
  return {
    data: {
      avatarThumbUrl: null,
      avatarUrl: null,
      competitionCount: 42,
      countryIso2: 'CN',
      countryName: 'China',
      gender: 'm',
      id: personId,
      medals: { bronze: 3, gold: 5, silver: 4, total: 12 },
      name: personId === '2019WANY36' ? 'Yiheng Wang' : 'Mock Athlete',
      records: { continental: 2, national: 4, total: 6, world: 1 },
      totalSolves: 512,
      wcaUrl: `https://www.worldcubeassociation.org/persons/${personId}`,
    },
    meta: wcaMeta,
  }
}

function listResponse<TItem>(data: TItem[], pagination: { page: number; pageSize: number; total: number }) {
  return {
    data,
    meta: wcaMeta,
    pagination: {
      ...pagination,
      hasNextPage: pagination.page * pagination.pageSize < pagination.total,
    },
  }
}

function record(eventId: '222' | '333', type: 'average' | 'single', athleteId: string, athleteName: string, raw: number, worldRank: number) {
  const event = wcaEvents.find((entry) => entry.id === eventId)!

  return {
    athlete: {
      avatarUrl: 'https://avatars.worldcubeassociation.org/example-thumb',
      countryIso2: eventId === '333' ? 'CN' : 'US',
      countryName: eventId === '333' ? 'China' : 'United States',
      gender: 'm',
      id: athleteId,
      name: athleteName,
      wcaUrl: `https://www.worldcubeassociation.org/persons/${athleteId}`,
    },
    competition: {
      city: 'Mock City',
      countryIso2: 'BR',
      date: {
        end: '2026-01-02',
        numberOfDays: 2,
        start: '2026-01-01',
      },
      id: 'MockOpen2026',
      name: 'Mock Open 2026',
    },
    event,
    rank: {
      continent: worldRank,
      country: worldRank,
      world: worldRank,
    },
    result: {
      attemptNumbers: [1],
      average: { raw },
      best: { raw },
      format: 'a',
      id: worldRank,
      position: 1,
      regionalAverageRecord: null,
      regionalSingleRecord: null,
      round: 'Final',
      roundTypeId: 'f',
      solves: [{ raw }, { raw: raw + 1 }, { raw: raw + 2 }, { raw: raw + 3 }, { raw: raw + 4 }],
    },
    scramble: {
      candidates: [
        {
          competitionId: 'MockOpen2026',
          eventId,
          groupId: '1',
          id: worldRank,
          isExtra: false,
          roundTypeId: 'f',
          scramble: "R U R' U' F2 D2",
          scrambleNumber: 1,
        },
      ],
      status: 'exact' as const,
    },
    type,
    value: { raw },
  }
}

function positiveInteger(value: string | null, fallback: number): number {
  const parsed = Number(value)

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

const wcaMeta = {
  datasetId: 'mock-dataset',
  exportDate: '2026-01-03',
  exportVersion: 'mock-v1',
  source: 'World Cube Association Results Export' as const,
}

const wcaEvents = [
  { format: 'time' as const, id: '333', name: '3x3x3 Cube' },
  { format: 'time' as const, id: '222', name: '2x2x2 Cube' },
]

const worldRecords = [
  record('333', 'single', '2019WANY36', 'Yiheng Wang', 409, 1),
  record('333', 'single', '2012PARK03', 'Max Park', 425, 2),
  record('222', 'single', '2020TWO01', '2x2 Single Holder', 47, 1),
  record('222', 'average', '2020TWO02', '2x2 Average Holder', 92, 1),
]
