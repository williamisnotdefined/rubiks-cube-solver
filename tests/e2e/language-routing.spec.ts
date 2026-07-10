import { expect, test } from '@playwright/test'

test.describe('browser language routing', () => {
  test.use({ locale: 'pt-BR' })

  test('uses the browser language and persists a manual selection', async ({ page }) => {
    await page.goto('/timer/')

    await expect(page).toHaveURL(/\/pt-BR\/timer\/$/)
    await page.getByRole('button', { name: 'Idioma' }).click()
    await page.getByRole('menuitemradio', { name: 'English (United States)' }).click()

    await expect(page).toHaveURL(/\/timer\/$/)
    await expect.poll(() => page.evaluate(() => window.localStorage.getItem('rubiks-cube-solver-language'))).toBe('en-US')

    await page.goto('/timer/')
    await expect(page).toHaveURL(/\/timer\/$/)
  })
})

test.describe('unsupported browser language routing', () => {
  test.use({ locale: 'nl-NL' })

  test('falls back to unprefixed en-US', async ({ page }) => {
    await page.goto('/')

    await expect(page).toHaveURL(/\/solve\/$/)
    await expect(page.getByRole('button', { name: 'Language' })).toBeVisible()
  })
})
