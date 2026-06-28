import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '@components/Toast'
import { scrambleEventById, scrambleEvents } from '@core/scramble/catalog'
import { TimerPage } from '../TimerPage'
import { useTimerSettingsStore } from '../timerSettingsStore'
import { useTimerStore } from '../timerStore'

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
    highQualityMocks.generateHighQualityScrambleForEvent.mockImplementation(async (eventId: string) => {
      const event = scrambleEventById(eventId)
      scrambleCount += 1

      return {
        event,
        scramble: event.id === '333mbld'
          ? Array.from({ length: event.defaultLength }, (_, index) => `${index + 1}. MBLD scramble ${index + 1}`).join('\n')
          : `${event.label} high-quality scramble ${scrambleCount}`,
      }
    })
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

  it('falls back to the first timer session when the active id is stale', async () => {
    useTimerStore.getState().setActiveSessionId('missing-session')

    renderTimerPage()
    await waitForScrambleReady()

    expect(screen.getByRole('timer', { name: 'Speedsolve timer' })).toBeInTheDocument()
    expect(screen.getByText('No solves yet')).toBeInTheDocument()
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

  it('toggles the latest solve penalty between +2, DNF, and OK', async () => {
    const user = userEvent.setup()
    renderTimerPage()
    await waitForScrambleReady()

    fireEvent.keyDown(window, { code: 'Space', key: ' ' })
    fireEvent.keyUp(window, { code: 'Space', key: ' ' })
    await waitFor(() => expect(screen.getByText('Solving')).toBeInTheDocument())
    fireEvent.keyDown(window, { code: 'KeyA', key: 'a' })
    await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument())
    const timer = screen.getByRole('timer', { name: 'Speedsolve timer' })

    expect(screen.queryByRole('button', { name: 'OK' })).not.toBeInTheDocument()
    expect(within(timer).getByRole('button', { name: '+2' })).toBeInTheDocument()
    expect(within(timer).getByRole('button', { name: 'DNF' })).toBeInTheDocument()

    await user.click(within(timer).getByRole('button', { name: '+2' }))

    expect(within(screen.getByRole('table')).getByText('+2')).toBeInTheDocument()
    expect(document.activeElement).toBe(timer)

    await user.click(within(timer).getByRole('button', { name: '+2' }))

    expect(within(screen.getByRole('table')).getByText('OK')).toBeInTheDocument()

    await user.click(within(timer).getByRole('button', { name: 'DNF' }))

    expect(within(screen.getByRole('table')).getAllByText('DNF').length).toBeGreaterThan(0)

    await user.click(within(timer).getByRole('button', { name: 'DNF' }))

    expect(within(screen.getByRole('table')).getByText('OK')).toBeInTheDocument()
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
      expect(screen.getByText('Could not generate a competition-quality scramble. Try again.')).toBeInTheDocument()
    })
    expect(screen.getByRole('timer', { name: 'Speedsolve timer' })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('button', { name: 'Copy scramble' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Next scramble' }))
    await waitForScrambleReady()

    expect(screen.getByText('retry high-quality scramble')).toBeInTheDocument()
    expect(screen.getByRole('timer', { name: 'Speedsolve timer' })).toHaveAttribute('aria-disabled', 'false')
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

    await user.click(screen.getByRole('switch', { name: 'Inspection' }))
    expect(screen.getByText('WCA inspection')).toBeInTheDocument()

    await user.click(screen.getByRole('switch', { name: 'Milliseconds' }))
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
    renderTimerPage()
    await waitForScrambleReady()

    fireEvent.keyDown(window, { code: 'Space', key: ' ' })
    fireEvent.keyUp(window, { code: 'Space', key: ' ' })
    await waitFor(() => expect(screen.getByText('Solving')).toBeInTheDocument())
    fireEvent.keyDown(window, { code: 'KeyA', key: 'a' })
    await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(screen.getByText('No solves yet')).toBeInTheDocument())
  })

  it('lists every WCA event in a scrollable event selector', async () => {
    const user = userEvent.setup()
    renderTimerPage()
    await waitForScrambleReady()

    await user.click(screen.getByRole('combobox', { name: 'Event' }))

    const listbox = await screen.findByRole('listbox')
    const selectViewport = listbox.querySelector('[data-radix-select-viewport]')

    expect(selectViewport).toHaveClass('overflow-y-scroll')
    for (const event of scrambleEvents) {
      expect(screen.getByRole('option', { name: event.label })).toBeInTheDocument()
    }
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument())
  })
})

function renderTimerPage() {
  return render(
    <ToastProvider>
      <TimerPage />
    </ToastProvider>,
  )
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
