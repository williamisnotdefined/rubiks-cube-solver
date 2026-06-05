import { expect, test, type Locator } from '@playwright/test'

const scramblePlaceholder = "R2 D2 F2 D L2 F2 U' R2 D B2 L2 U' B' R' B' R2 B2 L B U'"
const realNotation = "U' F2 U2 B2 F2 D' F2 D' F2 L2 U' B' L' D B L' R B2 D2 F'"

test.describe('product solve flow', () => {
  test('renders notation-only controls and caps the cube size', async ({ page }) => {
    await page.goto('/')

    await expect(page.locator('.cube-stage rubiks-cube')).toBeVisible()
    await expect(page.getByText(/facelets/i)).toHaveCount(0)

    const cubeBox = await page.locator('.cube-stage').boundingBox()
    expect(cubeBox?.width ?? 0).toBeLessThanOrEqual(300)
    expect(cubeBox?.height ?? 0).toBeLessThanOrEqual(300)
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
    const maxNodes = page.getByLabel('Max nodes (M)')
    await expect(maxNodes).toHaveValue('10')
    await expect(maxNodes.locator('option')).toHaveText(['10', '15', '20', '25'])
    await expect(page.getByText('API connected')).toHaveCount(0)
    await expect(page.getByText(/Generated-table solver/i)).toHaveCount(0)
  })

  test('keeps solve button loading while the API is not ready', async ({ page }) => {
    await page.route('http://127.0.0.1:8787/health', (route) => route.abort())

    await page.goto('/')

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

    await page.goto('/')

    const input = page.getByLabel('Scramble')
    const cube = page.locator('.cube-stage rubiks-cube')
    await expect(input).toBeEnabled({ timeout: 15_000 })
    await expect.poll(() => cubeState(cube)).not.toBe('')
    const initialState = await cubeState(cube)

    await input.fill('R')

    await expect.poll(() => cubeState(cube)).not.toBe(initialState)
    expect(solveRequests).toBe(0)
  })

  test('solves shallow scramble', async ({ page }) => {
    await page.goto('/')

    const input = page.getByLabel('Scramble')
    await expect(input).toBeEnabled({ timeout: 15_000 })
    const maxMoves = page.getByLabel('Max moves')

    await input.fill('R U')
    await maxMoves.fill('2')
    await page.getByRole('button', { name: 'Solve' }).click()

    await expect(page.locator('.result code')).toHaveText("U' R'", {
      timeout: 30_000,
    })
    await expect(page.locator('.result')).toContainText(/found in/)
    await page.getByRole('button', { name: 'see more' }).click()
    const details = page.getByRole('dialog', { name: 'Solver details' })
    await expect(details).toContainText(/Generated two-phase (quality )?solver/)
    await expect(details).toContainText('replay verified')
    await page.getByRole('button', { name: 'Close' }).click()

    const cube = page.locator('.cube-stage rubiks-cube')
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

    await page.goto('/')

    const input = page.getByLabel('Scramble')
    await expect(input).toBeEnabled({ timeout: 15_000 })

    await input.fill(realNotation)
    await page.getByLabel('Max moves').fill('20')
    await page.getByLabel('Max nodes (M)').selectOption('25')
    await page.getByRole('button', { name: 'Solve' }).click()

    await expect(page.locator('.result code')).toHaveText(/\S/, { timeout: 60_000 })
    await page.getByRole('button', { name: 'see more' }).click()
    const details = page.getByRole('dialog', { name: 'Solver details' })
    await expect(details).toContainText(/Generated two-phase (quality )?solver/)
    await expect(details).toContainText('replay verified')
  })

  test('shows a short invalid scramble error', async ({ page }) => {
    await page.goto('/')

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

    await page.goto('/')

    await expect(page.getByLabel('Scramble')).toBeEnabled({ timeout: 15_000 })
    await page.getByLabel('Scramble').fill('R')
    await page.getByLabel('Max moves').fill('46')

    await expect(page.getByRole('button', { name: 'Solve' })).toBeDisabled()
    await expect(page.locator('.result')).toContainText('Max moves must be 20 or less')
    expect(solveRequests).toBe(0)

    await page.getByLabel('Max moves').fill('20')
    await page.getByLabel('Max nodes (M)').selectOption('25')

    await expect(page.getByRole('button', { name: 'Solve' })).toBeEnabled()
    expect(solveRequests).toBe(0)
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
