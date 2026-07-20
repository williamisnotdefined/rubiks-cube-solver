import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useEffect } from 'react'
import { MemoryRouter, useNavigate } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RouteTransitionStage } from '../RouteTransitionStage'

const motionState = { reduceMotion: false }

beforeEach(() => {
  vi.useFakeTimers()
  motionState.reduceMotion = false
  vi.mocked(window.matchMedia).mockImplementation((query) => createMediaQuery(query))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('RouteTransitionStage', () => {
  it('animates pathname changes without animating the initial route', async () => {
    renderStage()

    expect(screen.getAllByTestId('route-transition-content')).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: 'Open timer' }))

    expect(screen.getByTestId('route-transition-curtain')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByTestId('current-location')).toHaveTextContent('/solve/')
    await advanceTimers(480)
    expect(screen.getByTestId('current-location')).toHaveTextContent('/timer/')
  })

  it('does not restart the transition for search parameter changes', async () => {
    renderStage()
    const content = screen.getByTestId('route-transition-content')

    fireEvent.click(screen.getByRole('button', { name: 'Add filter' }))

    expect(screen.getByTestId('route-transition-content')).toBe(content)
    expect(screen.getByTestId('current-location')).toHaveTextContent('/solve/?event=333')
  })

  it('skips route motion when reduced motion is requested', async () => {
    motionState.reduceMotion = true
    renderStage()

    fireEvent.click(screen.getByRole('button', { name: 'Open timer' }))

    expect(screen.queryByTestId('route-transition-curtain')).not.toBeInTheDocument()
    expect(screen.getByTestId('current-location')).toHaveTextContent('/timer/')
  })

  it('keeps the curtain closed until the destination is ready', async () => {
    renderStage(false)

    fireEvent.click(screen.getByRole('button', { name: 'Open timer' }))
    await advanceTimers(480)
    expect(screen.getByTestId('current-location')).toHaveTextContent('/timer/')

    expect(screen.getByTestId('route-transition-curtain')).toHaveAttribute('data-ready', 'false')

    fireEvent.click(screen.getByRole('button', { name: 'Mark route ready' }))

    expect(screen.getByTestId('route-transition-curtain')).toHaveAttribute('data-ready', 'true')
  })

  it('switches to the latest destination while the curtain is closed', async () => {
    renderStage(false)

    fireEvent.click(screen.getByRole('button', { name: 'Open timer' }))
    await advanceTimers(480)
    expect(screen.getByTestId('current-location')).toHaveTextContent('/timer/')

    fireEvent.click(screen.getByRole('button', { name: 'Open solver' }))

    expect(screen.getByTestId('current-location')).toHaveTextContent('/solve/')
    expect(screen.getByTestId('route-transition-curtain')).toHaveAttribute('data-ready', 'false')

    fireEvent.click(screen.getByRole('button', { name: 'Mark route ready' }))
    expect(screen.getByTestId('route-transition-curtain')).toHaveAttribute('data-ready', 'true')
  })

  it('uses the latest destination selected before the curtain closes', async () => {
    renderStage(false)

    fireEvent.click(screen.getByRole('button', { name: 'Open timer' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open solver' }))
    await advanceTimers(480)

    expect(screen.getByTestId('current-location')).toHaveTextContent('/solve/')
  })

  it('keeps a single page container after repeated route changes', async () => {
    vi.useRealTimers()
    renderStage()

    fireEvent.click(screen.getByRole('button', { name: 'Open timer' }))
    await waitFor(() => expect(screen.queryByTestId('route-transition-curtain')).toBeNull(), {
      timeout: 1500,
    })
    expect(screen.getByTestId('current-location')).toHaveTextContent('/timer/')

    fireEvent.click(screen.getByRole('button', { name: 'Open solver' }))
    await waitFor(() => expect(screen.queryByTestId('route-transition-curtain')).toBeNull(), {
      timeout: 1500,
    })
    expect(screen.getByTestId('current-location')).toHaveTextContent('/solve/')

    expect(screen.getAllByTestId('route-transition-content')).toHaveLength(1)
    expect(screen.getAllByRole('main')).toHaveLength(1)
    expect(screen.getByTestId('current-location')).toHaveTextContent('/solve/')
  })
})

function createMediaQuery(query: string): MediaQueryList {
  return {
    addEventListener: vi.fn(),
    addListener: vi.fn(),
    dispatchEvent: vi.fn(),
    matches: motionState.reduceMotion,
    media: query,
    onchange: null,
    removeEventListener: vi.fn(),
    removeListener: vi.fn(),
  }
}

async function advanceTimers(duration: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(duration)
  })
}

function renderStage(autoReady = true) {
  return render(
    <MemoryRouter initialEntries={['/solve/']}>
      <NavigationHarness autoReady={autoReady} />
    </MemoryRouter>,
  )
}

function NavigationHarness({ autoReady }: { autoReady: boolean }) {
  const navigate = useNavigate()

  return (
    <RouteTransitionStage>
      {(displayedLocation, markReady) => (
        <main>
          {autoReady ? <ReadySignal onReady={markReady} /> : null}
          <p data-testid='current-location'>
            {displayedLocation.pathname}
            {displayedLocation.search}
          </p>
          <button type='button' onClick={() => navigate('/timer/')}>
            Open timer
          </button>
          <button type='button' onClick={() => navigate('/solve/')}>
            Open solver
          </button>
          <button type='button' onClick={() => navigate({ search: '?event=333' })}>
            Add filter
          </button>
          <button type='button' onClick={markReady}>
            Mark route ready
          </button>
        </main>
      )}
    </RouteTransitionStage>
  )
}

function ReadySignal({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    onReady()
  }, [onReady])

  return null
}
