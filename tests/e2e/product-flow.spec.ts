import { expect, test, type Locator } from '@playwright/test'
import { gotoHydratedApp } from './app-helpers'
import { chooseRadixSelectOption, expectRadixSelectOptions, expectRadixSelectValue } from './select-helpers'

const scramblePlaceholder = "R2 D2 F2 D L2 F2 U' R2 D B2 L2 U' B' R' B' R2 B2 L B U'"
const realNotation = "U' F2 U2 B2 F2 D' F2 D' F2 L2 U' B' L' D B L' R B2 D2 F'"
const solvePath = '/solve/'
const timerPath = '/timer/'
const cubeActivationTimeout = 15_000

test.describe('product solve flow', () => {
  test('renders notation-only controls and caps the cube size', async ({ page }) => {
    await gotoHydratedApp(page, solvePath)

    await expect(page.getByRole('button', { name: 'Preparing cube' })).toBeVisible()
    const cube = page.locator('.cube-stage rubiks-cube')
    await expect(cube).toHaveCount(0)
    await expect(page.getByText(/facelets/i)).toHaveCount(0)

    const cubeBox = await page.locator('.cube-stage').boundingBox()
    expect(cubeBox).not.toBeNull()
    expect(cubeBox!.width).toBeLessThanOrEqual(300)
    expect(cubeBox!.height).toBeLessThanOrEqual(300)
    await expect
      .poll(() => page.locator('.cube-stage').evaluate((element) => getComputedStyle(element).borderRadius))
      .toBe('0px')

    const input = page.getByLabel('Scramble')
    await expect(input).toBeEnabled({ timeout: 15_000 })
    await expect(input).toHaveValue('')
    await expect(input).toHaveAttribute('placeholder', scramblePlaceholder)
    await expect(page.getByRole('button', { name: 'Solve' })).toBeDisabled()
    const maxMoves = page.getByLabel('Max moves')
    await expect(maxMoves).toHaveValue('20')
    await expectRadixSelectValue(page, 'Max nodes (M)', '10')
    await expectRadixSelectOptions(page, 'Max nodes (M)', ['10', '15', '20', '25'])
    await expect(page.getByText('API connected')).toHaveCount(0)
    await expect(page.getByText(/Generated-table solver/i)).toHaveCount(0)
    await expect(cube).toBeVisible({ timeout: cubeActivationTimeout })
  })

  test('keeps solve button loading while the API is not ready', async ({ page }) => {
    await page.route('http://127.0.0.1:8787/health', (route) => route.abort())

    await gotoHydratedApp(page, solvePath)

    await expect(page.getByRole('button', { name: 'Loading' })).toBeDisabled({
      timeout: 15_000,
    })
    await expect(page.getByText('API unavailable')).toHaveCount(0)
    await expect(page.getByText(/Run npm run dev/i)).toHaveCount(0)
  })

  test('updates cube visualization while editing the scramble', async ({ page }) => {
    let solveRequests = 0
    page.on('request', (request) => {
      if (request.url().endsWith('/solve-notation')) {
        solveRequests += 1
      }
    })

    await gotoHydratedApp(page, solvePath)

    const input = page.getByLabel('Scramble')
    const cube = page.locator('.cube-stage rubiks-cube')
    await expect(input).toBeEnabled({ timeout: 15_000 })
    await expect(cube).toBeVisible({ timeout: cubeActivationTimeout })
    await expect.poll(() => cubeState(cube)).not.toBe('')
    const initialState = await cubeState(cube)

    await input.fill('R')

    await expect.poll(() => cubeState(cube)).not.toBe(initialState)
    expect(solveRequests).toBe(0)
  })

  test('solves shallow scramble', async ({ page }) => {
    await gotoHydratedApp(page, solvePath)

    const input = page.getByLabel('Scramble')
    await expect(input).toBeEnabled({ timeout: 15_000 })
    const maxMoves = page.getByLabel('Max moves')
    const cube = page.locator('.cube-stage rubiks-cube')

    await expect(cube).toBeVisible({ timeout: cubeActivationTimeout })

    await input.fill('R U')
    await maxMoves.fill('2')
    await page.getByRole('button', { name: 'Solve' }).click()

    await expect(page.locator('.result code')).toHaveText("U' R'", {
      timeout: 30_000,
    })
    await expect(page.locator('.result')).toContainText(/2 moves - response in/)
    await page.getByRole('button', { name: 'see more' }).click()
    const details = page.getByRole('dialog', { name: 'Solver details' })
    await expect(details).toContainText(/Generated two-phase (quality )?solver/)
    await expect(details).toContainText('replay verified')
    await page.getByRole('button', { name: 'Close' }).click()

    const step0State = await cubeState(cube)
    const range = page.getByLabel('Solution step')
    await expect(range).toHaveAttribute('type', 'range')
    await expect(range).toHaveValue('0')

    await page.getByRole('button', { name: 'Next move' }).click()

    await expect(range).toHaveValue('1')
    await expect.poll(() => cubeState(cube)).not.toBe(step0State)
    const step1State = await cubeState(cube)

    await page.getByRole('button', { name: 'Previous move' }).click()

    await expect(range).toHaveValue('0')
    await expect.poll(() => cubeState(cube)).not.toBe(step1State)
  })

  test('solves real scramble through the API', async ({ page }) => {
    test.setTimeout(90_000)

    await gotoHydratedApp(page, solvePath)

    const input = page.getByLabel('Scramble')
    await expect(input).toBeEnabled({ timeout: 15_000 })

    await input.fill(realNotation)
    await page.getByLabel('Max moves').fill('20')
    await chooseRadixSelectOption(page, 'Max nodes (M)', '25')
    await page.getByRole('button', { name: 'Solve' }).click()

    await expect(page.locator('.result code')).toHaveText(/\S/, { timeout: 60_000 })
    await page.getByRole('button', { name: 'see more' }).click()
    const details = page.getByRole('dialog', { name: 'Solver details' })
    await expect(details).toContainText(/Generated two-phase (quality )?solver/)
    await expect(details).toContainText('replay verified')
  })

  test('shows a short invalid scramble error', async ({ page }) => {
    await gotoHydratedApp(page, solvePath)

    const input = page.getByLabel('Scramble')
    await expect(input).toBeEnabled({ timeout: 15_000 })

    await input.fill('R Q')
    await page.getByRole('button', { name: 'Solve' }).click()

    await expect(page.locator('.result')).toContainText('Invalid scramble')
  })

  test('validates solver limits locally before API requests', async ({ page }) => {
    let solveRequests = 0
    page.on('request', (request) => {
      if (request.url().endsWith('/solve-notation')) {
        solveRequests += 1
      }
    })

    await gotoHydratedApp(page, solvePath)

    await expect(page.getByLabel('Scramble')).toBeEnabled({ timeout: 15_000 })
    await page.getByLabel('Scramble').fill('R')
    await page.getByLabel('Max moves').fill('46')

    await expect(page.getByRole('button', { name: 'Solve' })).toBeDisabled()
    await expect(page.locator('.result')).toContainText('Max moves must be 23 or less')
    expect(solveRequests).toBe(0)

    await page.getByLabel('Max moves').fill('23')
    await chooseRadixSelectOption(page, 'Max nodes (M)', '25')

    await expect(page.getByRole('button', { name: 'Solve' })).toBeEnabled()
    expect(solveRequests).toBe(0)
  })
})

test.describe('timer layout', () => {
  test('keeps the document fixed and scrolls solves internally', async ({ page }) => {
    await page.addInitScript(() => {
      const solves = Array.from({ length: 40 }, (_, index) => ({
        comment: '',
        endedAt: 1_700_000_000_000 + index,
        eventId: '333',
        finalTimeMs: 12_000 + index,
        id: `solve-${index}`,
        penalty: 'ok',
        rawTimeMs: 12_000 + index,
        scramble: "R U R' U' F2 D2 L B' R2 U2",
        startedAt: 1_700_000_000_000 + index - 12_000,
      }))

      window.localStorage.setItem(
        'rubiks-timer-sessions',
        JSON.stringify({
          state: {
            activeSessionId: 'timer-session-default',
            sessions: [
              {
                eventId: '333',
                id: 'timer-session-default',
                name: 'Default Session',
                solves,
              },
            ],
          },
          version: 0,
        }),
      )
    })

    await gotoHydratedApp(page, timerPath)

    await expect(page.getByRole('timer', { name: 'Speedsolve timer' })).toBeVisible()

    const pageScroll = await page.evaluate(() => ({
      clientHeight: document.scrollingElement?.clientHeight ?? 0,
      scrollHeight: document.scrollingElement?.scrollHeight ?? 0,
    }))
    expect(pageScroll.scrollHeight).toBeLessThanOrEqual(pageScroll.clientHeight + 1)

    const solveList = page.getByLabel('Solves')
    await expect.poll(() => solveList.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true)
  })
})

async function cubeState(cube: Locator): Promise<string> {
  return cube.evaluate((element) => {
    try {
      return (element as HTMLElement & { getState: () => string }).getState()
    } catch {
      return ''
    }
  })
}
