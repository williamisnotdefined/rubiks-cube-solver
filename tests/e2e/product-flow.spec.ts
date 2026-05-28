import { expect, test } from '@playwright/test'

const defaultNotation = "R2 D2 F2 D L2 F2 U' R2 D B2 L2 U' B' R' B' R2 B2 L B U'"
const realNotation = "B U L U D B' U' R' U' B U2 F' L2 B2 R2 D2 L2 D2 R2 F D2"

test.describe('product solve flow', () => {
  test('renders notation-only controls and caps the cube size', async ({ page }) => {
    await page.goto('/')

    await expect(page.locator('rubiks-cube')).toBeVisible()
    await expect(page.getByText(/facelets/i)).toHaveCount(0)

    const cubeBox = await page.locator('.cube-stage').boundingBox()
    expect(cubeBox?.width ?? 0).toBeLessThanOrEqual(350)
    expect(cubeBox?.height ?? 0).toBeLessThanOrEqual(350)

    const input = page.getByLabel('Move notation')
    await expect(input).toBeEnabled({ timeout: 15_000 })
    await expect(input).toHaveValue(defaultNotation)
    const maxMoves = page.getByLabel('Max solution moves')
    await expect(maxMoves).toHaveValue('30')
    const maxNodes = page.getByLabel('Max nodes')
    await expect(maxNodes).toHaveValue('10000000')
    await expect(page.locator('.api-status')).toContainText('API connected')
    await expect(page.locator('.api-status')).toContainText('Generated two-phase solver')
  })

  test('solves shallow move notation', async ({ page }) => {
    await page.goto('/')

    const input = page.getByLabel('Move notation')
    await expect(input).toBeEnabled({ timeout: 15_000 })
    await expect(input).toHaveValue(defaultNotation)
    const maxMoves = page.getByLabel('Max solution moves')

    await input.fill('R U')
    await maxMoves.fill('2')
    await page.getByRole('button', { name: 'Solve' }).click()

    await expect(page.locator('.result code')).toHaveText("U' R'", {
      timeout: 30_000,
    })
    await expect(page.locator('.result')).toContainText('Generated two-phase solver')
    await expect(page.locator('.result')).toContainText('replay verified')
  })

  test('solves real notation through the API', async ({ page }) => {
    await page.goto('/')

    const input = page.getByLabel('Move notation')
    await expect(input).toBeEnabled({ timeout: 15_000 })

    await input.fill(realNotation)
    await page.getByLabel('Max solution moves').fill('30')
    await page.getByLabel('Max nodes').fill('10000000')
    await page.getByRole('button', { name: 'Solve' }).click()

    await expect(page.locator('.result code')).toHaveText(/\S/, { timeout: 60_000 })
    await expect(page.locator('.result')).toContainText('Generated two-phase solver')
    await expect(page.locator('.result')).toContainText('replay verified')
  })

  test('shows a short invalid notation error', async ({ page }) => {
    await page.goto('/')

    const input = page.getByLabel('Move notation')
    await expect(input).toBeEnabled({ timeout: 15_000 })

    await input.fill('R Q')
    await page.getByRole('button', { name: 'Solve' }).click()

    await expect(page.locator('.result')).toContainText('Invalid move notation')
  })
})
