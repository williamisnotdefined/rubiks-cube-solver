import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLocation, useNavigate, MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  WcaDataListResponse,
  WcaEvent,
  WcaWorldRecord,
  WcaWorldRecordsQuery,
} from '@api/wcaData'
import { WorldRecordsPage } from '../WorldRecordsPage'
import { WorldRecordsPageRoute } from '../WorldRecordsPageRoute'
import {
  createWorldRecord,
  createWorldRecordsResponse,
  numberEvent,
  timeEvent,
  wcaMeta,
} from './wcaDataFixtures'

const apiMocks = vi.hoisted(() => ({
  useGetWcaEvents: vi.fn(),
  useGetWcaPersonProfile: vi.fn(),
  useGetWorldRecords: vi.fn(),
}))

vi.mock('@api/wcaData', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@api/wcaData')>()

  return {
    ...actual,
    useGetWcaEvents: apiMocks.useGetWcaEvents,
    useGetWcaPersonProfile: apiMocks.useGetWcaPersonProfile,
    useGetWorldRecords: apiMocks.useGetWorldRecords,
  }
})

const eventsResponse: WcaDataListResponse<WcaEvent> = {
  data: [timeEvent, numberEvent],
  meta: wcaMeta,
  pagination: {
    hasNextPage: false,
    page: 1,
    pageSize: 100,
    total: 2,
  },
}

describe('WorldRecordsPage', () => {
  beforeEach(() => {
    apiMocks.useGetWcaEvents.mockReset()
    apiMocks.useGetWcaPersonProfile.mockReset()
    apiMocks.useGetWorldRecords.mockReset()
    apiMocks.useGetWcaEvents.mockReturnValue({ data: eventsResponse })
    apiMocks.useGetWcaPersonProfile.mockReturnValue({ data: undefined })
    apiMocks.useGetWorldRecords.mockReturnValue(loadedRecordsQuery())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders its route through the shared React Query provider', () => {
    render(
      <MemoryRouter>
        <WorldRecordsPageRoute />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'World Records' })).toBeVisible()
    expect(screen.getByText('Feliks Zemdegs')).toBeVisible()
  })

  it('shows loading rows while records are pending', () => {
    apiMocks.useGetWcaEvents.mockReturnValue({ data: undefined })
    apiMocks.useGetWorldRecords.mockReturnValue({
      data: undefined,
      isError: false,
      isFetching: true,
      isLoading: true,
    })

    renderPage('/world-records')

    expect(screen.getByRole('heading', { name: 'World Records' })).toBeVisible()
    expect(screen.getByRole('combobox', { name: 'Event' })).toBeVisible()
    expect(screen.getAllByRole('row')).toHaveLength(9)
    expect(screen.queryByText('No world records matched these filters.')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
  })

  it('shows an API error without hiding the empty leaderboard fallback', () => {
    apiMocks.useGetWorldRecords.mockReturnValue({
      data: undefined,
      isError: true,
      isFetching: false,
      isLoading: false,
    })

    renderPage('/world-records')

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Could not load world records from the WCA Data API.',
    )
    expect(screen.getByText('No world records matched these filters.')).toBeVisible()
  })

  it('shows an empty loaded state and terminal pagination controls', () => {
    apiMocks.useGetWorldRecords.mockReturnValue(loadedRecordsQuery({ records: [] }))

    renderPage('/world-records')

    expect(screen.getByText('No world records matched these filters.')).toBeVisible()
    expect(screen.getByText('Page 1 of 1')).toBeVisible()
    expect(screen.getByRole('button', { name: 'First page' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Last page' })).toBeDisabled()
  })

  it('renders dataset and record data, then opens and closes the selected athlete', async () => {
    const user = userEvent.setup()

    renderPage('/world-records')

    expect(screen.getByText(/Dataset:.*2026/)).toBeVisible()
    expect(screen.getByText('Feliks Zemdegs')).toBeVisible()
    expect(screen.getByText('Melbourne Open 2026')).toBeVisible()

    await user.click(screen.getByRole('button', { name: /Feliks Zemdegs/ }))
    const dialog = screen.getByRole('dialog', { name: 'Feliks Zemdegs' })

    expect(within(dialog).getByText('Selected leaderboard result')).toBeVisible()
    await user.click(within(dialog).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('falls back from invalid URL filters before requesting records', () => {
    renderPage('/world-records?eventId=&page=0&pageSize=invalid&type=regional&search=')

    expect(apiMocks.useGetWorldRecords).toHaveBeenLastCalledWith({
      eventId: '333',
      page: 1,
      pageSize: 25,
    })
    expect(screen.getByRole('textbox', { name: 'Search' })).toHaveValue('')
  })

  it('synchronizes event, type, and page-size filters into the URL and resets them', async () => {
    const user = userEvent.setup()

    renderPage('/world-records?eventId=333&page=4')

    const filters = screen.getByRole('search')
    await user.click(within(filters).getByRole('combobox', { name: 'Event' }))
    await user.click(screen.getByRole('option', { name: '3x3x3 Fewest Moves' }))
    expectCurrentSearch({ eventId: '333fm' })

    await user.click(within(filters).getByRole('combobox', { name: 'Type' }))
    await user.click(screen.getByRole('option', { name: 'Average' }))
    expectCurrentSearch({ eventId: '333fm', type: 'average' })

    const pageSizeGroup = screen.getByText('Rows per page').parentElement
    expect(pageSizeGroup).not.toBeNull()
    await user.click(within(pageSizeGroup as HTMLElement).getByRole('combobox'))
    await user.click(screen.getByRole('option', { name: '50 rows' }))
    expectCurrentSearch({ eventId: '333fm', pageSize: '50', type: 'average' })

    await user.click(within(filters).getByRole('combobox', { name: 'Type' }))
    await user.click(screen.getByRole('option', { name: 'All types' }))
    expectCurrentSearch({ eventId: '333fm', pageSize: '50' })

    await user.click(within(filters).getByRole('button', { name: 'Reset' }))
    expectCurrentSearch({ eventId: '333' })
    expect(screen.getByRole('textbox', { name: 'Search' })).toHaveValue('')
  })

  it('debounces trimmed search input, preserves other filters, and clears the current page', () => {
    vi.useFakeTimers()

    renderPage('/world-records?eventId=333&search=Feliks&page=3&type=single')

    const input = screen.getByRole('textbox', { name: 'Search' })
    fireEvent.change(input, { target: { value: '  Max Park  ' } })

    expectCurrentSearch({ eventId: '333', page: '3', search: 'Feliks', type: 'single' })
    act(() => vi.advanceTimersByTime(299))
    expectCurrentSearch({ eventId: '333', page: '3', search: 'Feliks', type: 'single' })

    act(() => vi.advanceTimersByTime(1))
    expectCurrentSearch({ eventId: '333', search: 'Max Park', type: 'single' })
  })

  it('removes a debounced search parameter when the input is blank', () => {
    vi.useFakeTimers()

    renderPage('/world-records?eventId=333&search=Feliks&page=2')

    fireEvent.change(screen.getByRole('textbox', { name: 'Search' }), {
      target: { value: '' },
    })
    act(() => vi.advanceTimersByTime(300))

    expectCurrentSearch({ eventId: '333' })
  })

  it('updates the search field when browser navigation changes the URL', async () => {
    const user = userEvent.setup()

    renderPage('/world-records?eventId=333&search=Old&page=2')
    await user.click(screen.getByRole('button', { name: 'Load saved world-record search' }))

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'Search' })).toHaveValue('New Athlete')
    })
    expectCurrentSearch({ eventId: '333fm', page: '6', search: 'New Athlete' })
    expect(apiMocks.useGetWorldRecords).toHaveBeenLastCalledWith({
      eventId: '333fm',
      page: 6,
      pageSize: 25,
      search: 'New Athlete',
    })
  })

  it.each([
    { ellipses: 0, page: 2, pages: [1, 2, 3, 4], totalPages: 4 },
    { ellipses: 1, page: 2, pages: [1, 2, 3, 4, 10], totalPages: 10 },
    { ellipses: 2, page: 5, pages: [1, 4, 5, 6, 10], totalPages: 10 },
    { ellipses: 1, page: 9, pages: [1, 7, 8, 9, 10], totalPages: 10 },
  ])(
    'renders the compact pagination layout for page $page of $totalPages',
    ({ ellipses, page, pages, totalPages }) => {
      apiMocks.useGetWorldRecords.mockImplementation((query: WcaWorldRecordsQuery) =>
        loadedRecordsQuery({
          page: query.page,
          total: totalPages * 25,
        }),
      )

      renderPage(`/world-records?eventId=333&page=${page}`)

      const pagination = screen.getByLabelText('World records pagination')
      const numberedButtons = within(pagination)
        .getAllByRole('button')
        .filter((button) => /^Page \d+$/.test(button.getAttribute('aria-label') ?? ''))

      expect(numberedButtons.map((button) => button.textContent)).toEqual(
        pages.map(String),
      )
      expect(within(pagination).queryAllByText('...')).toHaveLength(ellipses)
      expect(within(pagination).getByRole('button', { current: 'page' })).toHaveTextContent(
        String(page),
      )
    },
  )

  it('navigates with numbered, adjacent, first, and last-page actions', async () => {
    const user = userEvent.setup()
    apiMocks.useGetWorldRecords.mockImplementation((query: WcaWorldRecordsQuery) =>
      loadedRecordsQuery({
        hasNextPage: (query.page ?? 1) < 10,
        page: query.page,
        total: 250,
      }),
    )

    renderPage('/world-records?eventId=333&page=5&search=Feliks')

    await user.click(screen.getByRole('button', { name: 'Page 4' }))
    expectCurrentSearch({ eventId: '333', page: '4', search: 'Feliks' })

    await user.click(screen.getByRole('button', { name: 'Next page' }))
    expectCurrentSearch({ eventId: '333', page: '5', search: 'Feliks' })

    await user.click(screen.getByRole('button', { name: 'Previous page' }))
    expectCurrentSearch({ eventId: '333', page: '4', search: 'Feliks' })

    await user.click(screen.getByRole('button', { name: 'Last page' }))
    expectCurrentSearch({ eventId: '333', page: '10', search: 'Feliks' })
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'First page' }))
    expectCurrentSearch({ eventId: '333', page: '1', search: 'Feliks' })
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
  })

  it('disables every pagination action while refreshed records are fetching', () => {
    apiMocks.useGetWorldRecords.mockReturnValue(
      loadedRecordsQuery({ isFetching: true, page: 5, total: 250 }),
    )

    renderPage('/world-records?eventId=333&page=5')

    const pagination = screen.getByLabelText('World records pagination')
    for (const button of within(pagination).getAllByRole('button')) {
      expect(button).toBeDisabled()
    }
  })
})

type RecordsQueryOptions = {
  hasNextPage?: boolean
  isFetching?: boolean
  page?: number
  records?: WcaWorldRecord[]
  total?: number
}

function loadedRecordsQuery({
  hasNextPage = false,
  isFetching = false,
  page = 1,
  records = [createWorldRecord()],
  total = records.length,
}: RecordsQueryOptions = {}) {
  return {
    data: createWorldRecordsResponse(records, {
      hasNextPage,
      page,
      total,
    }),
    isError: false,
    isFetching,
    isLoading: false,
  }
}

function renderPage(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <WorldRecordsPage />
      <LocationControls />
    </MemoryRouter>,
  )
}

function LocationControls() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <aside aria-label="Test navigation controls">
      <div aria-label="Current URL" role="status">{location.search}</div>
      <button
        type="button"
        onClick={() => navigate('/world-records?eventId=333fm&search=New+Athlete&page=6')}
      >
        Load saved world-record search
      </button>
    </aside>
  )
}

function expectCurrentSearch(expected: Record<string, string>) {
  const search = screen.getByRole('status', { name: 'Current URL' }).textContent ?? ''
  const params = new URLSearchParams(search)

  expect(Object.fromEntries(params.entries())).toEqual(expected)
}
