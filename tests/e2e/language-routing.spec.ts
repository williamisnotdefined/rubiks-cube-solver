import { expect, type Page, test } from '@playwright/test'

async function openMobileNavigation(page: Page) {
  const openMenuButton = page.getByRole('button', { name: 'Open menu' })
  if (await openMenuButton.isVisible()) {
    await openMenuButton.click()
  }
}

test.describe('browser language routing', () => {
  test.use({ locale: 'pt-BR' })

  test('keeps explicit English URLs canonical and persists a manual selection', async ({ page }) => {
    await page.goto('/timer/')

    await expect(page).toHaveURL(/\/timer\/$/)
    await openMobileNavigation(page)
    await page.getByRole('button', { name: 'Language' }).click()
    await page.getByRole('menuitemradio', { name: 'Português (Brasil)', exact: true }).click()

    await expect(page).toHaveURL(/\/pt-BR\/timer\/$/)
    await expect.poll(() => page.evaluate(() => window.localStorage.getItem('rubiks-cube-solver-language'))).toBe('pt-BR')

    await page.reload()
    await expect(page).toHaveURL(/\/pt-BR\/timer\/$/)
  })
})

test.describe('unsupported browser language routing', () => {
  test.use({ locale: 'nl-NL' })

  test('falls back to unprefixed en-US', async ({ page }) => {
    await page.goto('/')

    await expect(page).toHaveURL(/\/solve\/$/)
    await openMobileNavigation(page)
    await expect(page.getByRole('button', { name: 'Language' })).toBeVisible()
  })
})
