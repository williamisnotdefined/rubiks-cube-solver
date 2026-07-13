import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WcaPersonProfile } from '@api/wcaData'
import {
  createPersonProfile,
  createScrambleCandidate,
  createSparseWorldRecord,
  createWorldRecord,
} from '../../../__tests__/wcaDataFixtures'
import { AthleteRecordSheet } from '../AthleteRecordSheet'

const apiMocks = vi.hoisted(() => ({
  useGetWcaPersonProfile: vi.fn(),
}))

vi.mock('@api/wcaData', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@api/wcaData')>()

  return {
    ...actual,
    useGetWcaPersonProfile: apiMocks.useGetWcaPersonProfile,
  }
})

describe('AthleteRecordSheet', () => {
  beforeEach(() => {
    apiMocks.useGetWcaPersonProfile.mockReset()
    apiMocks.useGetWcaPersonProfile.mockReturnValue({ data: undefined })
  })

  it('stays closed and disables profile lookup when no record is selected', () => {
    render(<AthleteRecordSheet record={null} onOpenChange={vi.fn()} />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(apiMocks.useGetWcaPersonProfile).toHaveBeenCalledWith(null)
  })

  it('shows enriched athlete, competition, solve, and exact scramble details', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    const profile = createPersonProfile()
    const record = createWorldRecord({
      scramble: {
        candidates: Array.from({ length: 9 }, (_, index) => createScrambleCandidate(index + 1)),
        status: 'exact',
      },
    })
    apiMocks.useGetWcaPersonProfile.mockReturnValue({ data: { data: profile } })

    render(<AthleteRecordSheet record={record} onOpenChange={onOpenChange} />)

    const dialog = screen.getByRole('dialog', { name: 'Feliks Alexander Zemdegs' })
    const avatar = dialog.querySelector('img')

    expect(avatar).toHaveAttribute('src', '/athletes/feliks-thumb.jpg')
    expect(dialog).toHaveTextContent('2009ZEMD01 · Australia')
    expect(stat('Competitions')).toHaveTextContent('1,234')
    expect(stat('Solves')).toHaveTextContent('98,765')
    expect(stat('Records')).toHaveTextContent('40')
    expect(stat('Medals')).toHaveTextContent('24')
    expect(within(dialog).getByText('World #1 · Single · 3x3x3 Cube')).toBeVisible()
    expect(within(dialog).getByText('Melbourne Open 2026')).toBeVisible()
    expect(within(dialog).getByText('Melbourne, AU · 2026-01-02')).toBeVisible()
    expect(within(dialog).getByText('Final · Average of 5')).toBeVisible()
    expect(within(dialog).getByText('1: 4.90')).toBeVisible()
    expect(within(dialog).getByText('3: DNF')).toBeVisible()
    expect(within(dialog).getByText('4: DNS')).toBeVisible()
    expect(within(dialog).getByText('This result maps to one official scramble in the WCA export.')).toBeVisible()
    expect(within(dialog).getByText("R U R' U' 8")).toBeVisible()
    expect(within(dialog).queryByText("R U R' U' 9")).not.toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: 'Open WCA profile' })).toHaveAttribute(
      'href',
      profile.wcaUrl,
    )

    await user.click(within(dialog).getByRole('button', { name: 'Close' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('uses record fallbacks for a sparse athlete profile', () => {
    const record = createSparseWorldRecord()

    render(<AthleteRecordSheet record={record} onOpenChange={vi.fn()} />)

    const dialog = screen.getByRole('dialog', { name: 'Ada Lovelace Byron' })

    expect(within(dialog).getByText('AL')).toBeVisible()
    expect(dialog.querySelector('img')).toBeNull()
    expect(dialog).toHaveTextContent('2020LOVE01 · Unknown country')
    expect(stat('Competitions')).toHaveTextContent('-')
    expect(stat('Solves')).toHaveTextContent('-')
    expect(stat('Records')).toHaveTextContent('-')
    expect(stat('Medals')).toHaveTextContent('-')
    expect(within(dialog).getByText('Competition details are unavailable.')).toBeVisible()
    expect(within(dialog).getByText('Attempt details are unavailable.')).toBeVisible()
    expect(within(dialog).getByText('No official scramble candidate could be linked from the export.')).toBeVisible()
    expect(within(dialog).getByRole('link', { name: 'Open WCA profile' })).toHaveAttribute(
      'href',
      record.athlete.wcaUrl,
    )
  })

  it('explains ambiguous scramble candidates and uses the full profile avatar fallback', () => {
    const profile: WcaPersonProfile = createPersonProfile({
      avatarThumbUrl: null,
      avatarUrl: '/athletes/full-profile.jpg',
      countryName: null,
      name: 'Max Park',
    })
    const record = createWorldRecord({
      athlete: {
        ...createWorldRecord().athlete,
        countryName: 'United States',
        id: '2012PARK03',
        name: 'Maxwell Park',
      },
      competition: {
        ...createWorldRecord().competition!,
        countryIso2: null,
      },
      result: null,
      scramble: {
        candidates: [createScrambleCandidate(1), createScrambleCandidate(2)],
        status: 'ambiguous',
      },
    })
    apiMocks.useGetWcaPersonProfile.mockReturnValue({ data: { data: profile } })

    render(<AthleteRecordSheet record={record} onOpenChange={vi.fn()} />)

    const dialog = screen.getByRole('dialog', { name: 'Max Park' })

    expect(dialog.querySelector('img')).toHaveAttribute('src', '/athletes/full-profile.jpg')
    expect(dialog).toHaveTextContent('2009ZEMD01 · United States')
    expect(within(dialog).getByText('Melbourne · 2026-01-02')).toBeVisible()
    expect(within(dialog).getByText('Unknown round · Unknown format')).toBeVisible()
    expect(within(dialog).getByText('Attempt details are unavailable.')).toBeVisible()
    expect(within(dialog).getByText(/candidate scrambles for the selected result/)).toBeVisible()
    expect(within(dialog).getByText('Group A · Scramble 2')).toBeVisible()
  })

  it('uses the record avatar when profile data is unavailable', () => {
    const record = createWorldRecord({
      athlete: {
        ...createWorldRecord().athlete,
        countryName: null,
        name: 'Record Athlete',
      },
    })

    render(<AthleteRecordSheet record={record} onOpenChange={vi.fn()} />)

    const dialog = screen.getByRole('dialog', { name: 'Record Athlete' })

    expect(dialog.querySelector('img')).toHaveAttribute('src', '/athletes/feliks.jpg')
    expect(dialog).toHaveTextContent('2009ZEMD01 · AU')
  })
})

function stat(label: string): HTMLElement {
  const [labelElement] = screen.getAllByText(label)

  if (labelElement === undefined || labelElement.parentElement === null) {
    throw new Error(`Missing container for ${label}`)
  }

  return labelElement.parentElement
}
