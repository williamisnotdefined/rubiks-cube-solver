import { expect, test } from '@playwright/test'

test.describe('scramble solve flow', () => {
  test('renders the cube and solves a shallow scramble', async ({ page }) => {
    await page.goto('/')

    await expect(page.locator('rubiks-cube')).toBeVisible()

    const input = page.getByLabel('Scramble')
    await expect(input).toBeEnabled({ timeout: 15_000 })
    const maxMoves = page.getByLabel('Max solution moves')
    await expect(maxMoves).toHaveValue('20')
    const maxNodes = page.getByLabel('Max nodes')
    await expect(maxNodes).toHaveValue('10000000')

    await input.fill('R U')
    await maxMoves.fill('1')
    await maxNodes.fill('1000000')
    await page.getByRole('button', { name: 'Solve' }).click()
    await expect(page.locator('.result')).toHaveText('No solution', {
      timeout: 30_000,
    })

    await maxMoves.fill('2')
    await page.getByRole('button', { name: 'Solve' }).click()

    await expect(page.locator('.result code')).toHaveText("U' R'", {
      timeout: 30_000,
    })
  })

  test('shows a short invalid scramble error', async ({ page }) => {
    await page.goto('/')

    const input = page.getByLabel('Scramble')
    await expect(input).toBeEnabled({ timeout: 15_000 })

    await input.fill('R Q')
    await page.getByRole('button', { name: 'Solve' }).click()

    await expect(page.locator('.result')).toHaveText('Invalid scramble')
  })
})
