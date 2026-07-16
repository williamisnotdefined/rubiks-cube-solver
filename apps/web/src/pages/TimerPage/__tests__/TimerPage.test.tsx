import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { scrambleEventById, scrambleEvents } from '@core/scramble/catalog'
import { TimerPage } from '../TimerPage'
import { useTimerSettingsStore } from '../timerSettingsStore'
import { useTimerStore } from '../timerStore'
import type { TimerSolve } from '../types'

const highQualityMocks = vi.hoisted(() => ({
  generateHighQualityScrambleForEvent: vi.fn(),
}))

vi.mock('@core/scramble/highQuality', () => ({
  generateHighQualityScrambleForEvent: highQualityMocks.generateHighQualityScrambleForEvent,
}))

describe('TimerPage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
    highQualityMocks.generateHighQualityScrambleForEvent.mockReset()
    let scrambleCount = 0
    highQualityMocks.generateHighQualityScrambleForEvent.mockImplementation(
      async (eventId: string) => {
        const event = scrambleEventById(eventId)
        scrambleCount += 1

        return {
          event,
          scramble:
            event.id === '333mbld'
              ? Array.from(
                  { length: event.defaultLength },
                  (_, index) => `${index + 1}. MBLD scramble ${index + 1}`,
                ).join('\n')
              : `${event.label} high-quality scramble ${scrambleCount}`,
        }
      },
    )
    useTimerStore.getState().resetTimerStore()
    useTimerSettingsStore.getState().resetTimerSettings()
    useTimerSettingsStore.getState().setHoldToStartMs(0)
  })

  it('renders the timer workspace with a scramble and empty solve list', async () => {
    renderTimerPage()

    expect(screen.getByRole('timer', { name: 'Speedsolve timer' })).toBeInTheDocument()
    expect(screen.getByText('Generating scramble...')).toBeInTheDocument()
    await waitForScrambleReady()
    expect(screen.getAllByText(/3x3x3/).length).toBeGreaterThan(0)
    expect(screen.getByText('No solves yet')).toBeInTheDocument()
    expect(screen.queryByText('Default Session')).not.toBeInTheDocument()
  })

  it('ignores penalty changes before any solve exists', async () => {
    const user = userEvent.setup()
    renderTimerPage()

    const timer = screen.getByRole('timer', { name: 'Speedsolve timer' })
    await user.click(within(timer).getByRole('button', { name: '+2' }))

    expect(screen.getByText('No solves yet')).toBeInTheDocument()
  })

  it('repairs a stale active session and saves the completed solve in the fallback', async () => {
    useTimerStore.setState({ activeSessionId: 'missing-session' })

    renderTimerPage()
    await waitForScrambleReady()

    fireEvent.keyDown(window, { code: 'Space', key: ' ' })
    fireEvent.keyUp(window, { code: 'Space', key: ' ' })
    await waitFor(() => expect(screen.getByText('Solving')).toBeInTheDocument())
    fireEvent.keyDown(window, { code: 'KeyA', key: 'a' })

    await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument())
    expect(useTimerStore.getState().activeSessionId).toBe('timer-session-default')
    expect(useTimerStore.getState().sessions[0]?.solves).toHaveLength(1)
  })

  it('records a solve with the keyboard timer', async () => {
    renderTimerPage()
    await waitForScrambleReady()

    fireEvent.keyDown(window, { code: 'Space', key: ' ' })
    fireEvent.keyUp(window, { code: 'Space', key: ' ' })

    await waitFor(() => expect(screen.getByText('Solving')).toBeInTheDocument())

    fireEvent.keyDown(window, { code: 'KeyA', key: 'a' })

    await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument())
    expect(within(screen.getByRole('table')).getByText('1')).toBeInTheDocument()
  })

  it('lists the latest solve first', async () => {
    useTimerStore.getState().addSolve({
      comment: '',
      endedAt: 1_000,
      eventId: '333',
      finalTimeMs: 1_000,
      id: 'solve-1',
      penalty: 'ok',
      rawTimeMs: 1_000,
      scramble: 'first scramble',
      startedAt: 0,
    })
    useTimerStore.getState().addSolve({
      comment: '',
      endedAt: 3_000,
      eventId: '333',
      finalTimeMs: 2_000,
      id: 'solve-2',
      penalty: 'ok',
      rawTimeMs: 2_000,
      scramble: 'latest scramble',
      startedAt: 1_000,
    })

    renderTimerPage()
    await waitForScrambleReady()

    const solveRows = within(screen.getByRole('table')).getAllByRole('row').slice(1)
    expect(within(solveRows[0]!).getByText('2')).toBeInTheDocument()
    expect(within(solveRows[0]!).getByText('latest scramble')).toBeInTheDocument()
    expect(within(solveRows[1]!).getByText('1')).toBeInTheDocument()
    expect(within(solveRows[1]!).getByText('first scramble')).toBeInTheDocument()
  })

  it('shows only solves for the selected WCA event', async () => {
    const user = userEvent.setup()
    useTimerStore.getState().addSolve(solve('solve-1', '333', '3x3 scramble', 1_000))
    useTimerStore.getState().addSolve(solve('solve-2', '222', '2x2 scramble', 2_000))
    useTimerSettingsStore.getState().setSelectedEventId('222')

    renderTimerPage()
    await waitForScrambleReady()

    expect(within(screen.getByRole('table')).getByText('2x2 scramble')).toBeInTheDocument()
    expect(within(screen.getByRole('table')).queryByText('3x3 scramble')).not.toBeInTheDocument()
    expect(
      within(screen.getByRole('table')).getByRole('button', { name: 'Delete' }),
    ).toBeInTheDocument()
    expect(
      within(screen.getByRole('timer', { name: 'Speedsolve timer' })).queryByRole('button', {
        name: 'Delete',
      }),
    ).not.toBeInTheDocument()

    await chooseSelectOption(user, 'Event', '3x3x3')

    await waitFor(() =>
      expect(within(screen.getByRole('table')).getByText('3x3 scramble')).toBeInTheDocument(),
    )
    expect(within(screen.getByRole('table')).queryByText('2x2 scramble')).not.toBeInTheDocument()
    expect(
      within(screen.getByRole('table')).getByRole('button', { name: 'Delete' }),
    ).toBeInTheDocument()
    expect(
      within(screen.getByRole('timer', { name: 'Speedsolve timer' })).queryByRole('button', {
        name: 'Delete',
      }),
    ).not.toBeInTheDocument()
    expect(
      within(screen.getByRole('timer', { name: 'Speedsolve timer' })).getByRole('button', {
        name: '+2',
      }),
    ).toBeDisabled()
  })

  it('toggles the latest solve penalty between +2, DNF, and no penalty', async () => {
    const user = userEvent.setup()
    renderTimerPage()
    await waitForScrambleReady()

    fireEvent.keyDown(window, { code: 'Space', key: ' ' })
    fireEvent.keyUp(window, { code: 'Space', key: ' ' })
    await waitFor(() => expect(screen.getByText('Solving')).toBeInTheDocument())
    fireEvent.keyDown(window, { code: 'KeyA', key: 'a' })
    await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument())
    const timer = screen.getByRole('timer', { name: 'Speedsolve timer' })

    expect(screen.queryByRole('button', { name: '-' })).not.toBeInTheDocument()
    expect(within(timer).getByRole('button', { name: '+2' })).toBeInTheDocument()
    expect(within(timer).getByRole('button', { name: 'DNF' })).toBeInTheDocument()

    await user.click(within(timer).getByRole('button', { name: '+2' }))

    expect(within(screen.getByRole('table')).getByText('+2')).toBeInTheDocument()
    expect(document.activeElement).toBe(within(timer).getByRole('button', { name: '+2' }))

    await user.click(within(timer).getByRole('button', { name: '+2' }))

    expect(within(screen.getByRole('table')).getByText('-')).toBeInTheDocument()

    await user.click(within(timer).getByRole('button', { name: 'DNF' }))

    expect(within(screen.getByRole('table')).getAllByText('DNF').length).toBeGreaterThan(0)

    await user.click(within(timer).getByRole('button', { name: 'DNF' }))

    expect(within(screen.getByRole('table')).getByText('-')).toBeInTheDocument()
  })

  it('switches WCA events and stores the selected event on the solve', async () => {
    const user = userEvent.setup()
    renderTimerPage()
    await waitForScrambleReady()

    await chooseSelectOption(user, 'Event', 'Pyraminx')

    await waitForScrambleReady()
    expect(screen.getAllByText(/Pyraminx/).length).toBeGreaterThan(0)

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
    renderTimerPage()
    await waitForScrambleReady()

    await chooseSelectOption(user, 'Event', '3x3 MBLD')

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
    renderTimerPage()
    await waitForScrambleReady()

    expect(screen.getByRole('button', { name: 'Previous scramble' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Copy scramble' }))
    expect(writeText).toHaveBeenCalledWith(expect.any(String))
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument()
    expect(screen.getByText('Copied')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Next scramble' }))
    await waitForScrambleReady()
    expect(screen.getByRole('button', { name: 'Copy scramble' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous scramble' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Previous scramble' }))
    expect(screen.getByRole('button', { name: 'Previous scramble' })).toBeDisabled()
  })

  it('blocks timing and lets the user retry when competition-quality scramble generation fails', async () => {
    const user = userEvent.setup()
    highQualityMocks.generateHighQualityScrambleForEvent
      .mockRejectedValueOnce(new Error('provider unavailable'))
      .mockResolvedValueOnce({
        event: scrambleEventById('333'),
        scramble: 'retry high-quality scramble',
      })

    renderTimerPage()

    await waitFor(() => {
      expect(
        screen.getByText('Could not generate a competition-quality scramble. Try again.'),
      ).toBeInTheDocument()
    })
    expect(screen.getByRole('timer', { name: 'Speedsolve timer' })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Copy scramble' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Next scramble' }))
    await waitForScrambleReady()

    expect(screen.getByText('retry high-quality scramble')).toBeInTheDocument()
    expect(screen.getByRole('timer', { name: 'Speedsolve timer' })).toHaveAttribute(
      'aria-disabled',
      'false',
    )
    expect(screen.getByRole('button', { name: 'Previous scramble' })).toBeDisabled()
  })

  it('keeps copy button unchanged when clipboard write fails', async () => {
    const user = userEvent.setup()
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    })
    renderTimerPage()
    await waitForScrambleReady()

    await user.click(screen.getByRole('button', { name: 'Copy scramble' }))

    expect(screen.getByRole('button', { name: 'Copy scramble' })).toBeInTheDocument()
    expect(screen.getByText('Could not copy scramble')).toBeInTheDocument()
    expect(consoleWarnSpy).toHaveBeenCalled()
  })

  it('toggles inspection and millisecond display settings', async () => {
    const user = userEvent.setup()
    renderTimerPage()
    await waitForScrambleReady()

    await user.click(screen.getByRole('button', { name: 'Timer settings' }))
    const settingsDialog = await screen.findByRole('dialog', { name: 'Timer settings' })

    await user.click(within(settingsDialog).getByRole('switch', { name: 'Inspection' }))
    expect(screen.getByText('WCA inspection')).toBeInTheDocument()

    const updatedSettingsDialog = screen.getByRole('dialog', { name: 'Timer settings' })
    await user.click(within(updatedSettingsDialog).getByRole('switch', { name: 'Milliseconds' }))
    await waitFor(() => expect(useTimerSettingsStore.getState().showMilliseconds).toBe(true))
    await user.click(within(updatedSettingsDialog).getByRole('button', { name: 'Close' }))
    fireEvent.keyDown(window, { code: 'Space', key: ' ' })
    fireEvent.keyUp(window, { code: 'Space', key: ' ' })
    await waitFor(() => expect(screen.getByText('Inspection')).toBeInTheDocument())
    fireEvent.keyDown(window, { code: 'Space', key: ' ' })
    fireEvent.keyUp(window, { code: 'Space', key: ' ' })
    await waitFor(() => expect(screen.getByText('Solving')).toBeInTheDocument())
    fireEvent.keyDown(window, { code: 'KeyA', key: 'a' })

    await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument())
    expect(within(screen.getByRole('table')).getByText(/\.\d{3}$/)).toBeInTheDocument()
  })

  it('deletes recorded solves from the table', async () => {
    const user = userEvent.setup()
    renderTimerPage()
    await waitForScrambleReady()

    fireEvent.keyDown(window, { code: 'Space', key: ' ' })
    fireEvent.keyUp(window, { code: 'Space', key: ' ' })
    await waitFor(() => expect(screen.getByText('Solving')).toBeInTheDocument())
    fireEvent.keyDown(window, { code: 'KeyA', key: 'a' })
    await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument())

    await user.click(within(screen.getByRole('table')).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(screen.getByText('No solves yet')).toBeInTheDocument())
  })

  it('hides the timer delete button after deleting the latest timed solve', async () => {
    const user = userEvent.setup()
    useTimerStore.getState().addSolve(solve('old-solve', '333', 'old scramble', 1_000))
    renderTimerPage()
    await waitForScrambleReady()

    fireEvent.keyDown(window, { code: 'Space', key: ' ' })
    fireEvent.keyUp(window, { code: 'Space', key: ' ' })
    await waitFor(() => expect(screen.getByText('Solving')).toBeInTheDocument())
    fireEvent.keyDown(window, { code: 'KeyA', key: 'a' })
    await waitFor(() =>
      expect(
        within(screen.getByRole('timer', { name: 'Speedsolve timer' })).getByRole('button', {
          name: 'Delete',
        }),
      ).toBeInTheDocument(),
    )

    const timer = screen.getByRole('timer', { name: 'Speedsolve timer' })
    await user.click(within(timer).getByRole('button', { name: 'Delete' }))

    await waitFor(() =>
      expect(within(timer).queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument(),
    )
    expect(within(screen.getByRole('table')).getByText('old scramble')).toBeInTheDocument()
    expect(
      within(screen.getByRole('table')).getByRole('button', { name: 'Delete' }),
    ).toBeInTheDocument()
  })

  it('lists every WCA event in a scrollable event selector', async () => {
    const user = userEvent.setup()
    renderTimerPage()
    await waitForScrambleReady()

    await user.click(screen.getByRole('combobox', { name: 'Event' }))

    const listbox = await screen.findByRole('listbox')
    expect(listbox).toBeInTheDocument()
    for (const event of scrambleEvents) {
      expect(screen.getByRole('option', { name: event.label })).toBeInTheDocument()
    }
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument())
  })

  it('locks event and scramble navigation throughout hold and running', async () => {
    renderTimerPage()
    await waitForScrambleReady()

    fireEvent.keyDown(window, { code: 'Space', key: ' ' })

    expect(screen.getByRole('combobox', { name: 'Event' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next scramble' })).toBeDisabled()

    fireEvent.keyUp(window, { code: 'Space', key: ' ' })
    await waitFor(() => expect(screen.getByText('Solving')).toBeInTheDocument())
    expect(screen.getByRole('combobox', { name: 'Event' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next scramble' })).toBeDisabled()

    fireEvent.keyDown(window, { code: 'KeyA', key: 'a' })
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Event' })).toBeEnabled())
  })
})

function renderTimerPage() {
  return render(<TimerPage />)
}

type TestUser = ReturnType<typeof userEvent.setup>

async function chooseSelectOption(user: TestUser, label: string, optionName: string) {
  await user.click(screen.getByRole('combobox', { name: label }))
  await screen.findByRole('listbox')
  await user.click(screen.getByRole('option', { name: optionName }))
  await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument())
}

async function waitForScrambleReady() {
  await waitFor(() => expect(screen.queryByText('Generating scramble...')).not.toBeInTheDocument())
}

function solve(id: string, eventId: string, scramble: string, endedAt: number): TimerSolve {
  return {
    comment: '',
    endedAt,
    eventId,
    finalTimeMs: endedAt,
    id,
    penalty: 'ok',
    rawTimeMs: endedAt,
    scramble,
    startedAt: 0,
  }
}
