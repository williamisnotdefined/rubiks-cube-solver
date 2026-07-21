import { expect, test, type Page } from '@playwright/test'
import { gotoHydratedApp } from './app-helpers'
import { chooseRadixSelectOption } from './select-helpers'

type PersistedTimerSolve = {
  eventId: string
  finalTimeMs: number | null
  penalty: 'dnf' | 'ok' | 'plus2'
  rawTimeMs: number
  scramble: string
}

const timerPath = '/timer/'

test.describe('timer flow', () => {
  test.describe.configure({ timeout: 60_000 })

  test.beforeEach(async ({ page }) => {
    await seedTimerSettings(page)
  })

  test('records a solve with keyboard start and stop', async ({ page }) => {
    await gotoHydratedApp(page, timerPath)

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
    await expect(page.getByRole('table')).toContainText('-')
  })

  test('clears navigation and event selection focus before keyboard timing', async ({ page }) => {
    await gotoHydratedApp(page, '/solve/')

    await page.getByRole('link', { name: 'Timer' }).click()
    await expectTimerReady(page)
    await recordKeyboardSolve(page)

    await chooseRadixSelectOption(page, 'Event', '2x2x2')
    await expectTimerReady(page)
    await recordKeyboardSolve(page)
  })

  test('toggles latest solve penalty between +2, DNF, and no penalty', async ({ page }) => {
    await gotoHydratedApp(page, timerPath)
    await recordKeyboardSolve(page)

    const rawTimeMs = (await persistedTimerSolves(page))[0]!.rawTimeMs
    const timer = page.getByRole('timer', { name: 'Speedsolve timer' })

    await expect(page.getByRole('button', { name: '-' })).toHaveCount(0)
    await expect(timer.getByRole('button', { name: '+2' })).toBeVisible()
    await expect(timer.getByRole('button', { name: 'DNF' })).toBeVisible()

    await timer.getByRole('button', { name: '+2' }).click()
    await expect(page.getByRole('table')).toContainText('+2')
    await expect.poll(() => persistedTimerSolves(page)).toMatchObject([
      { finalTimeMs: rawTimeMs + 2_000, penalty: 'plus2' },
    ])

    await timer.getByRole('button', { name: '+2' }).click()
    await expect(page.getByRole('table')).toContainText('-')
    await expect.poll(() => persistedTimerSolves(page)).toMatchObject([
      { finalTimeMs: rawTimeMs, penalty: 'ok' },
    ])

    await timer.getByRole('button', { name: 'DNF' }).click()
    await expect(page.getByRole('table')).toContainText('DNF')
    await expect.poll(() => persistedTimerSolves(page)).toMatchObject([
      { finalTimeMs: null, penalty: 'dnf' },
    ])

    await timer.getByRole('button', { name: 'DNF' }).click()
    await expect(page.getByRole('table')).toContainText('-')
    await expect.poll(() => persistedTimerSolves(page)).toMatchObject([
      { finalTimeMs: rawTimeMs, penalty: 'ok' },
    ])
  })

  test('updates the active session from the selected event', async ({ page }) => {
    await gotoHydratedApp(page, timerPath)
    await expect(page.getByRole('timer', { name: 'Speedsolve timer' })).toHaveAttribute(
      'aria-disabled',
      'false',
      { timeout: 15_000 },
    )

    await chooseRadixSelectOption(page, 'Event', '2x2x2')
    await expect(page.getByText(/2x2x2/)).toBeVisible()

    await expect.poll(() => persistedTimerState(page)).toMatchObject({
      sessions: [{ eventId: '222' }],
    })
  })

  test('supports inspection and millisecond display settings', async ({ page }) => {
    await gotoHydratedApp(page, timerPath)

    await page.getByRole('button', { name: 'Timer settings' }).click()
    const settingsDialog = page.getByRole('dialog', { name: 'Timer settings' })

    await settingsDialog.getByRole('switch', { name: 'Inspection' }).click()
    await expect(page.getByText('WCA inspection')).toBeVisible()
    await settingsDialog.getByRole('switch', { name: 'Milliseconds' }).click()
    await expect.poll(() => persistedTimerSettings(page)).toMatchObject({ showMilliseconds: true })
    await settingsDialog.getByRole('button', { name: 'Close' }).click()
    await expect(settingsDialog).toHaveCount(0)
    await expect(page.locator('body')).toBeFocused()
    await expectTimerReady(page)

    const timer = page.getByRole('timer', { name: 'Speedsolve timer' })
    await timer.click()
    await expect(page.getByText('Inspection', { exact: true })).toBeVisible()

    await timer.click()
    await expect(page.getByText('Solving')).toBeVisible()
    await page.keyboard.press('a')
    await expect(page.getByRole('table')).toBeVisible()

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
    await gotoHydratedApp(page, timerPath)

    await expect(page.getByRole('button', { name: 'Previous scramble' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Copy scramble' })).toBeEnabled()
    await page.getByRole('button', { name: 'Copy scramble' }).click()
    await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible()
    await expect.poll(() => page.evaluate(() => localStorage.getItem('rubiks-test-copied-scramble'))).not.toBeNull()

    await page.getByRole('button', { name: 'Next scramble' }).click()
    await expect(page.getByRole('button', { name: 'Copy scramble' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Previous scramble' })).toBeEnabled()

    await page.getByRole('button', { name: 'Previous scramble' }).click()
    await expect(page.getByRole('button', { name: 'Previous scramble' })).toBeDisabled()

    await recordKeyboardSolve(page)
    await page.getByRole('table').getByRole('button', { name: 'Delete' }).click()
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
  await holdAndReleaseTimer(page)
  await expect(page.getByText('Solving')).toBeVisible()
  await page.keyboard.press('a')
  await expect(page.getByText('Stopped')).toBeVisible()
  await expect(page.getByRole('table')).toBeVisible()
}

async function holdAndReleaseTimer(page: Page) {
  await page.keyboard.down('Space')
  await expect(page.getByText('Ready', { exact: true })).toBeVisible()
  await page.keyboard.up('Space')
}

async function expectTimerReady(page: Page) {
  const timer = page.getByRole('timer', { name: 'Speedsolve timer' })
  await expect(page.locator('body')).toBeFocused()
  await expect(timer).toHaveAttribute('aria-disabled', 'false', { timeout: 15_000 })
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
