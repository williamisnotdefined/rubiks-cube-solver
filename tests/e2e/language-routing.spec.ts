import { expect, type Page, test } from '@playwright/test'
import { gotoHydratedApp } from './app-helpers'

async function openMobileNavigation(page: Page) {
  const openMenuButton = page.getByRole('button', { name: 'Open menu' })
  if (await openMenuButton.isVisible()) {
    await openMenuButton.click()
  }
}

test.describe('browser language routing', () => {
  test.use({ locale: 'pt-BR' })

  test('keeps explicit English URLs canonical and persists a manual selection', async ({ page }) => {
    await gotoHydratedApp(page, '/timer/')

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
    await gotoHydratedApp(page, '/')

    await expect(page).toHaveURL(/\/solve\/$/)
    await openMobileNavigation(page)
    await expect(page.getByRole('button', { name: 'Language' })).toBeVisible()
  })
})

test.describe('legacy algorithm routes', () => {
  test('redirects the Portuguese slug to the canonical English path', async ({ page }) => {
    await gotoHydratedApp(page, '/algoritmos/3x3/oll/?source=legacy')

    await expect(page).toHaveURL(/\/algorithms\/3x3\/oll\/\?source=legacy$/)
    await expect(page.getByRole('heading', { name: '3x3 OLL' })).toBeVisible()
  })
})
