import { expect, test, type Locator, type Page } from '@playwright/test'
import { chooseRadixSelectOption } from './select-helpers'

type PersistedTimerSolve = {
  eventId: string
  finalTimeMs: number | null
  penalty: 'dnf' | 'ok' | 'plus2'
  rawTimeMs: number
  scramble: string
}

const timerPath = '/en/timer'

test.describe('timer flow', () => {
  test.describe.configure({ timeout: 60_000 })

  test.beforeEach(async ({ page }) => {
    await seedTimerSettings(page)
  })

  test('records a solve with keyboard start and stop', async ({ page }) => {
    await page.goto(timerPath)

    await expect(page.getByRole('timer', { name: 'Speedsolve timer' })).toBeVisible()
    await expect(page.getByText('No solves yet')).toBeVisible()

    await recordKeyboardSolve(page)

    const solves = await persistedTimerSolves(page)
    expect(solves).toHaveLength(1)
    expect(solves[0]?.eventId).toBe('333')
    expect(solves[0]?.penalty).toBe('ok')
    expect(solves[0]?.rawTimeMs ?? -1).toBeGreaterThanOrEqual(0)
    expect(solves[0]?.finalTimeMs ?? -1).toBeGreaterThanOrEqual(0)
    expect(solves[0]?.scramble).toEqual(expect.any(String))
    await expect(page.getByRole('table')).toContainText('OK')
  })

  test('updates latest solve penalty between +2, DNF, and OK', async ({ page }) => {
    await page.goto(timerPath)
    await recordKeyboardSolve(page)

    const rawTimeMs = (await persistedTimerSolves(page))[0]!.rawTimeMs

    await dispatchClick(page.getByRole('button', { name: '+2' }))
    await expect(page.getByRole('table')).toContainText('+2')
    await expect.poll(() => persistedTimerSolves(page)).toMatchObject([
      { finalTimeMs: rawTimeMs + 2_000, penalty: 'plus2' },
    ])

    await dispatchClick(page.getByRole('button', { name: 'DNF' }))
    await expect(page.getByRole('table')).toContainText('DNF')
    await expect.poll(() => persistedTimerSolves(page)).toMatchObject([
      { finalTimeMs: null, penalty: 'dnf' },
    ])

    await dispatchClick(page.getByRole('button', { name: 'OK' }))
    await expect(page.getByRole('table')).toContainText('OK')
    await expect.poll(() => persistedTimerSolves(page)).toMatchObject([
      { finalTimeMs: rawTimeMs, penalty: 'ok' },
    ])
  })

  test('uses the selected event for the next recorded solve', async ({ page }) => {
    await page.goto(timerPath)

    await chooseRadixSelectOption(page, 'Event', 'Pyraminx')
    await expect(page.getByText(/Pyraminx/)).toBeVisible()

    await recordKeyboardSolve(page)

    const state = await persistedTimerState(page)
    expect(state.sessions[0]?.eventId).toBe('pyraminx')
    expect(state.sessions[0]?.solves.at(-1)?.eventId).toBe('pyraminx')
  })

  test('supports inspection and millisecond display settings', async ({ page }) => {
    await page.goto(timerPath)

    await dispatchClick(page.getByRole('switch', { name: 'Inspection' }))
    await expect(page.getByText('WCA inspection')).toBeVisible()
    await expectTimerReady(page)

    await dispatchKeyboardEvent(page, 'keydown', 'Space', ' ')
    await dispatchKeyboardEvent(page, 'keyup', 'Space', ' ')
    await expect(page.getByText('Inspection', { exact: true })).toHaveCount(2)

    await dispatchKeyboardEvent(page, 'keydown', 'Space', ' ')
    await dispatchKeyboardEvent(page, 'keyup', 'Space', ' ')
    await expect(page.getByText('Solving')).toBeVisible()
    await dispatchKeyboardEvent(page, 'keydown', 'KeyA', 'a')
    await expect(page.getByRole('table')).toBeVisible()

    await dispatchClick(page.getByRole('switch', { name: 'Milliseconds' }))
    await expect(page.getByRole('table')).toContainText(/\d+\.\d{3}/)

    const settings = await persistedTimerSettings(page)
    expect(settings.inspectionEnabled).toBe(true)
    expect(settings.showMilliseconds).toBe(true)
  })

  test('copies scrambles, navigates scramble history, and deletes solves', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: (text: string) => {
            window.localStorage.setItem('rubiks-test-copied-scramble', text)

            return Promise.resolve()
          },
        },
      })
    })
    await page.goto(timerPath)

    await expect(page.getByRole('button', { name: 'Previous scramble' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Copy scramble' })).toBeEnabled()
    await dispatchClick(page.getByRole('button', { name: 'Copy scramble' }))
    await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible()
    await expect.poll(() => page.evaluate(() => localStorage.getItem('rubiks-test-copied-scramble'))).not.toBeNull()

    await dispatchClick(page.getByRole('button', { name: 'Next scramble' }))
    await expect(page.getByRole('button', { name: 'Copy scramble' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Previous scramble' })).toBeEnabled()

    await dispatchClick(page.getByRole('button', { name: 'Previous scramble' }))
    await expect(page.getByRole('button', { name: 'Previous scramble' })).toBeDisabled()

    await recordKeyboardSolve(page)
    await dispatchClick(page.getByRole('button', { name: 'Delete' }))
    await expect(page.getByText('No solves yet')).toBeVisible()
    await expect.poll(() => persistedTimerSolves(page)).toHaveLength(0)
  })
})

async function seedTimerSettings(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.clear()
    window.localStorage.setItem(
      'rubiks-timer-settings',
      JSON.stringify({
        state: {
          holdToStartMs: 0,
          inspectionEnabled: false,
          selectedEventId: '333',
          showMilliseconds: false,
        },
        version: 0,
      }),
    )
  })
}

async function recordKeyboardSolve(page: Page) {
  await expectTimerReady(page)
  await dispatchKeyboardEvent(page, 'keydown', 'Space', ' ')
  await dispatchKeyboardEvent(page, 'keyup', 'Space', ' ')
  await expect(page.getByText('Solving')).toBeVisible()
  await dispatchKeyboardEvent(page, 'keydown', 'KeyA', 'a')
  await expect(page.getByText('Stopped')).toBeVisible()
  await expect(page.getByRole('table')).toBeVisible()
}

async function expectTimerReady(page: Page) {
  await expect(page.getByRole('timer', { name: 'Speedsolve timer' })).toHaveAttribute('aria-disabled', 'false')
}

async function dispatchKeyboardEvent(page: Page, type: 'keydown' | 'keyup', code: string, key: string) {
  // Real Playwright keyboard/click actions can hang on this page while the timer
  // updates through RAF. Dispatching browser events keeps the test on the app's
  // actual window listeners while avoiding actionability waits unrelated to the
  // timer behavior under test.
  await page.evaluate(
    ({ code, key, type }) => {
      window.dispatchEvent(new KeyboardEvent(type, { bubbles: true, cancelable: true, code, key }))
    },
    { code, key, type },
  )
}

async function dispatchClick(locator: Locator) {
  // See dispatchKeyboardEvent: timer E2E asserts observable state changes, while
  // synthetic click dispatch avoids Playwright actionability deadlocks here.
  await locator.dispatchEvent('click')
}

async function persistedTimerState(page: Page): Promise<{ sessions: Array<{ eventId: string, solves: PersistedTimerSolve[] }> }> {
  return page.evaluate(() => JSON.parse(window.localStorage.getItem('rubiks-timer-sessions') ?? '{"state":{"sessions":[]}}').state)
}

async function persistedTimerSolves(page: Page): Promise<PersistedTimerSolve[]> {
  const state = await persistedTimerState(page)

  return state.sessions[0]?.solves ?? []
}

async function persistedTimerSettings(page: Page): Promise<{ inspectionEnabled: boolean, showMilliseconds: boolean }> {
  return page.evaluate(() => JSON.parse(window.localStorage.getItem('rubiks-timer-settings') ?? '{"state":{}}').state)
}
