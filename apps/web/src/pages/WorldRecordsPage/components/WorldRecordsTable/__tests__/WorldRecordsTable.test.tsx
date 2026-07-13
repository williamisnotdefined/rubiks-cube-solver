import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import {
  createScrambleCandidate,
  createSparseWorldRecord,
  createWorldRecord,
  numberEvent,
} from '../../../__tests__/wcaDataFixtures'
import { WorldRecordsTable } from '../WorldRecordsTable'

describe('WorldRecordsTable', () => {
  it('shows an accessible loading layout instead of an empty result', () => {
    render(
      <WorldRecordsTable
        isLoading
        records={[]}
        onSelectRecord={vi.fn()}
      />,
    )

    expect(screen.getAllByRole('row')).toHaveLength(9)
    expect(screen.queryByText('No world records matched these filters.')).not.toBeInTheDocument()
  })

  it('shows the empty-state message after loading completes', () => {
    render(
      <WorldRecordsTable
        isLoading={false}
        records={[]}
        onSelectRecord={vi.fn()}
      />,
    )

    const message = screen.getByText('No world records matched these filters.')

    expect(message).toBeVisible()
    expect(message.closest('td')).toHaveAttribute('colspan', '6')
  })

  it('renders record details and selects an athlete from the leaderboard', async () => {
    const user = userEvent.setup()
    const onSelectRecord = vi.fn()
    const record = createWorldRecord()

    render(
      <WorldRecordsTable
        isLoading={false}
        records={[record]}
        onSelectRecord={onSelectRecord}
      />,
    )

    const athleteButton = screen.getByRole('button', { name: /Feliks Zemdegs/ })
    const row = athleteButton.closest('tr')

    expect(row).not.toBeNull()
    expect(within(row as HTMLTableRowElement).getByText('#1')).toBeVisible()
    expect(within(row as HTMLTableRowElement).getByText('4.90')).toBeVisible()
    expect(within(row as HTMLTableRowElement).getByText('Single')).toBeVisible()
    expect(within(row as HTMLTableRowElement).getByText('Melbourne Open 2026')).toBeVisible()
    expect(within(row as HTMLTableRowElement).getByTitle("R U R' U' 1")).toBeVisible()

    await user.click(athleteButton)
    expect(onSelectRecord).toHaveBeenCalledWith(record)
  })

  it('renders competition and scramble fallbacks for sparse records', () => {
    const unavailable = createSparseWorldRecord()
    const ambiguous = createWorldRecord({
      athlete: {
        ...createWorldRecord().athlete,
        id: '2012PARK03',
        name: 'Max Park',
      },
      result: {
        ...createWorldRecord().result!,
        id: 43,
      },
      scramble: {
        candidates: [createScrambleCandidate(1), createScrambleCandidate(2)],
        status: 'ambiguous',
      },
    })
    const exactWithoutCandidate = createWorldRecord({
      athlete: {
        ...createWorldRecord().athlete,
        id: '2017SEUN01',
        name: 'Yiheng Wang',
      },
      event: numberEvent,
      result: null,
      scramble: {
        candidates: [],
        status: 'exact',
      },
      type: 'average',
      value: { raw: 2_754 },
    })

    render(
      <WorldRecordsTable
        isLoading={false}
        records={[unavailable, ambiguous, exactWithoutCandidate]}
        onSelectRecord={vi.fn()}
      />,
    )

    expect(screen.getByText('Unknown')).toBeVisible()
    expect(screen.getAllByText('Unavailable')).toHaveLength(2)
    expect(screen.getByText('2 candidates')).toBeVisible()
    expect(screen.getByText('27.54 moves')).toBeVisible()
  })
})
