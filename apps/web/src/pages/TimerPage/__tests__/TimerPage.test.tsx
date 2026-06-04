import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TimerPage } from '../TimerPage'
import { useTimerSettingsStore } from '../timerSettingsStore'
import { useTimerStore } from '../timerStore'

describe('TimerPage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
    useTimerStore.getState().resetTimerStore()
    useTimerSettingsStore.getState().resetTimerSettings()
    useTimerSettingsStore.getState().setHoldToStartMs(0)
  })

  it('renders the timer workspace with a scramble and empty solve list', () => {
    render(<TimerPage />)

    expect(screen.getByRole('timer', { name: 'Speedsolve timer' })).toBeInTheDocument()
    expect(screen.getAllByText(/3x3x3/).length).toBeGreaterThan(0)
    expect(screen.getByText('No solves yet')).toBeInTheDocument()
  })

  it('ignores penalty changes before any solve exists', async () => {
    const user = userEvent.setup()
    render(<TimerPage />)

    await user.click(screen.getByRole('button', { name: '+2' }))

    expect(screen.getByText('No solves yet')).toBeInTheDocument()
  })

  it('falls back to the first timer session when the active id is stale', () => {
    useTimerStore.getState().setActiveSessionId('missing-session')

    render(<TimerPage />)

    expect(screen.getByText('Default Session')).toBeInTheDocument()
  })

  it('records a solve with the keyboard timer', async () => {
    render(<TimerPage />)

    fireEvent.keyDown(window, { code: 'Space', key: ' ' })
    fireEvent.keyUp(window, { code: 'Space', key: ' ' })

    await waitFor(() => expect(screen.getByText('Solving')).toBeInTheDocument())

    fireEvent.keyDown(window, { code: 'KeyA', key: 'a' })

    await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument())
    expect(within(screen.getByRole('table')).getByText('1')).toBeInTheDocument()
  })

  it('updates the latest solve penalty', async () => {
    const user = userEvent.setup()
    render(<TimerPage />)

    fireEvent.keyDown(window, { code: 'Space', key: ' ' })
    fireEvent.keyUp(window, { code: 'Space', key: ' ' })
    await waitFor(() => expect(screen.getByText('Solving')).toBeInTheDocument())
    fireEvent.keyDown(window, { code: 'KeyA', key: 'a' })
    await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: '+2' }))

    expect(within(screen.getByRole('table')).getByText('+2')).toBeInTheDocument()
  })

  it('switches WCA events and stores the selected event on the solve', async () => {
    const user = userEvent.setup()
    render(<TimerPage />)

    await user.selectOptions(screen.getByLabelText('Event'), 'pyraminx')

    await waitFor(() => expect(screen.getAllByText(/Pyraminx/).length).toBeGreaterThan(0))

    fireEvent.keyDown(window, { code: 'Space', key: ' ' })
    fireEvent.keyUp(window, { code: 'Space', key: ' ' })
    await waitFor(() => expect(screen.getByText('Solving')).toBeInTheDocument())
    fireEvent.keyDown(window, { code: 'KeyA', key: 'a' })
    await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument())

    const solve = useTimerStore.getState().sessions[0]?.solves.at(-1)

    expect(solve?.eventId).toBe('pyraminx')
  })

  it('renders multiline MBLD scrambles', async () => {
    const user = userEvent.setup()
    render(<TimerPage />)

    await user.selectOptions(screen.getByLabelText('Event'), '333mbld')

    expect(
      await screen.findByText((content) => content.includes('1. ') && content.includes('5. ')),
    ).toBeInTheDocument()
  })

  it('copies and advances scrambles', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    render(<TimerPage />)

    await user.click(screen.getByRole('button', { name: 'Copy scramble' }))
    expect(writeText).toHaveBeenCalledWith(expect.any(String))
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Next scramble' }))
    expect(screen.getByRole('button', { name: 'Copy scramble' })).toBeInTheDocument()
  })

  it('keeps copy button unchanged when clipboard write fails', async () => {
    const user = userEvent.setup()
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    })
    render(<TimerPage />)

    await user.click(screen.getByRole('button', { name: 'Copy scramble' }))

    expect(screen.getByRole('button', { name: 'Copy scramble' })).toBeInTheDocument()
  })

  it('toggles inspection and millisecond display settings', async () => {
    const user = userEvent.setup()
    render(<TimerPage />)

    await user.click(screen.getByLabelText('Inspection'))
    expect(screen.getByText('WCA inspection')).toBeInTheDocument()

    await user.click(screen.getByLabelText('Milliseconds'))
    fireEvent.keyDown(window, { code: 'Space', key: ' ' })
    fireEvent.keyUp(window, { code: 'Space', key: ' ' })
    await waitFor(() => expect(screen.getAllByText('Inspection').length).toBeGreaterThan(1))
    fireEvent.keyDown(window, { code: 'Space', key: ' ' })
    fireEvent.keyUp(window, { code: 'Space', key: ' ' })
    await waitFor(() => expect(screen.getByText('Solving')).toBeInTheDocument())
    fireEvent.keyDown(window, { code: 'KeyA', key: 'a' })

    await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument())
    expect(within(screen.getByRole('table')).getByText(/\.\d{3}$/)).toBeInTheDocument()
  })

  it('deletes recorded solves from the table', async () => {
    const user = userEvent.setup()
    render(<TimerPage />)

    fireEvent.keyDown(window, { code: 'Space', key: ' ' })
    fireEvent.keyUp(window, { code: 'Space', key: ' ' })
    await waitFor(() => expect(screen.getByText('Solving')).toBeInTheDocument())
    fireEvent.keyDown(window, { code: 'KeyA', key: 'a' })
    await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(screen.getByText('No solves yet')).toBeInTheDocument()
  })
})
