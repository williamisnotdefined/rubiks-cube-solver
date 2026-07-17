import { expect, type Page } from '@playwright/test'

export async function gotoHydratedApp(page: Page, url: string) {
  await page.goto(url)
  await expect(page.locator('[data-app-shell="true"]')).toHaveAttribute(
    'data-app-interactive',
    'true',
  )
}
