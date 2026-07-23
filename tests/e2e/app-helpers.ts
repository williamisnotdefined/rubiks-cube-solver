import { expect, type Page } from '@playwright/test'

const analyticsConsentStorageKey = 'speedcube-analytics-consent'

export async function gotoHydratedApp(page: Page, url: string) {
  await page.addInitScript((storageKey) => {
    window.localStorage.setItem(storageKey, 'denied')
  }, analyticsConsentStorageKey)
  await page.goto(url)
  await expect(page.locator('[data-app-shell="true"]')).toHaveAttribute(
    'data-app-interactive',
    'true',
  )
}
