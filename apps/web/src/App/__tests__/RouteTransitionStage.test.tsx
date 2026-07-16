import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect } from 'react'
import { MemoryRouter, useNavigate } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RouteTransitionStage } from '../RouteTransitionStage'

const motionState = vi.hoisted(() => ({ reduceMotion: false }))

vi.mock('motion/react', async (importOriginal) => {
  const original = await importOriginal<typeof import('motion/react')>()

  return {
    ...original,
    useReducedMotion: () => motionState.reduceMotion,
  }
})

beforeEach(() => {
  motionState.reduceMotion = false
})

describe('RouteTransitionStage', () => {
  it('animates pathname changes without animating the initial route', async () => {
    const user = userEvent.setup()
    renderStage()

    expect(screen.getAllByTestId('route-transition-content')).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Open timer' }))

    expect(screen.getByTestId('route-transition-curtain')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByTestId('current-location')).toHaveTextContent('/solve/')
    await waitFor(() => {
      expect(screen.getByTestId('current-location')).toHaveTextContent('/timer/')
    })
  })

  it('does not restart the transition for search parameter changes', async () => {
    const user = userEvent.setup()
    renderStage()
    const content = screen.getByTestId('route-transition-content')

    await user.click(screen.getByRole('button', { name: 'Add filter' }))

    expect(screen.getByTestId('route-transition-content')).toBe(content)
    expect(screen.getByTestId('current-location')).toHaveTextContent('/solve/?event=333')
  })

  it('skips route motion when reduced motion is requested', async () => {
    motionState.reduceMotion = true
    const user = userEvent.setup()
    renderStage()

    await user.click(screen.getByRole('button', { name: 'Open timer' }))

    expect(screen.queryByTestId('route-transition-curtain')).not.toBeInTheDocument()
    expect(screen.getByTestId('current-location')).toHaveTextContent('/timer/')
  })

  it('keeps the curtain closed until the destination is ready', async () => {
    const user = userEvent.setup()
    renderStage(false)

    await user.click(screen.getByRole('button', { name: 'Open timer' }))
    await waitFor(() => {
      expect(screen.getByTestId('current-location')).toHaveTextContent('/timer/')
    })

    expect(screen.getByTestId('route-transition-curtain')).toHaveAttribute('data-ready', 'false')

    await user.click(screen.getByRole('button', { name: 'Mark route ready' }))

    expect(screen.getByTestId('route-transition-curtain')).toHaveAttribute('data-ready', 'true')
  })

  it('keeps a single page container after repeated route changes', async () => {
    const user = userEvent.setup()
    renderStage()

    for (let index = 0; index < 3; index += 1) {
      await user.click(screen.getByRole('button', { name: 'Open timer' }))
      await waitFor(() => {
        expect(screen.getByTestId('current-location')).toHaveTextContent('/timer/')
      })
      await user.click(screen.getByRole('button', { name: 'Open solver' }))
      await waitFor(() => {
        expect(screen.getByTestId('current-location')).toHaveTextContent('/solve/')
      })
    }

    expect(screen.getAllByTestId('route-transition-content')).toHaveLength(1)
    expect(screen.getAllByRole('main')).toHaveLength(1)
    expect(screen.getByTestId('current-location')).toHaveTextContent('/solve/')
  })
})

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
