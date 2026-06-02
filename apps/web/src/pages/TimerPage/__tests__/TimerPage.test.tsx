import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { TimerPage } from '../TimerPage'
import { useTimerSettingsStore } from '../timerSettingsStore'
import { useTimerStore } from '../timerStore'

describe('TimerPage', () => {
  beforeEach(() => {
    localStorage.clear()
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
})
