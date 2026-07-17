import { expect, test } from '@playwright/test'
import { gotoHydratedApp } from './app-helpers'

test.describe('responsive UI smoke', () => {
  test('keeps browser routes, mobile navigation, and reduced-motion overlays usable', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 390, height: 844 })
    await gotoHydratedApp(page, '/solve/')

    await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible()
    await page.getByRole('button', { name: 'Open menu' }).click()
    await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible()

    await page.getByRole('link', { name: 'Timer' }).click()
    await expect(page).toHaveURL(/\/timer\/$/)
    await expect(page.getByRole('timer', { name: 'Speedsolve timer' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible()
  })

  test('keeps the cube visualization capped on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await gotoHydratedApp(page, '/solve/')

    const cube = page.locator('.cube-stage rubiks-cube')
    await expect(cube).toBeVisible({ timeout: 15_000 })

    const box = await cube.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.width).toBeLessThanOrEqual(350)
    expect(box!.height).toBeLessThanOrEqual(350)
  })
})
