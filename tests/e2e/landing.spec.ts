import { expect, test } from '@playwright/test'
import { gotoHydratedApp } from './app-helpers'

test.describe('landing page', () => {
  test('renders the full-bleed home and enters the solver', async ({ page }) => {
    await gotoHydratedApp(page, '/')

    await expect(page.locator('[data-app-variant="landing"]')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/SPEED/i)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/CUBE/i)
    await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible()
    await expect(
      page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', {
        name: 'Chapters',
      }),
    ).toHaveCount(0)
    await expect(page.locator('#chapters a')).toHaveCount(8)
    await expect(page.getByText('RUST ENGINE').first()).toBeVisible()

    await page.getByRole('link', { name: /Start Solving/i }).first().click()

    await expect(page).toHaveURL(/\/solve\/$/)
    await expect(page.locator('[data-app-variant="app"]')).toBeVisible()
  })

  test('turns the hero cube while the landing scrolls', async ({ page }) => {
    await gotoHydratedApp(page, '/')

    const cube = page.locator('[data-landing-cube]')
    await expect.poll(() => cube.getAttribute('data-hero-cube-ready'), { timeout: 20_000 }).toBe('true')

    const before = Number(await cube.getAttribute('data-hero-cube-moves'))

    await page.locator('[data-route-scroll]').evaluate(async (element) => {
      for (let index = 0; index < 6; index += 1) {
        element.scrollTop += 80
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      }
    })

    await expect
      .poll(async () => Number(await cube.getAttribute('data-hero-cube-moves')), { timeout: 5_000 })
      .toBeGreaterThan(before)

    await page.locator('[data-route-scroll]').evaluate((element) => {
      element.scrollTop = 0
    })
    await expect
      .poll(async () => cube.getAttribute('data-cube-solved'), { timeout: 5_000 })
      .toBe('true')
  })


  test('animates hero floaters and lets the pointer move them', async ({ page }) => {
    await gotoHydratedApp(page, '/')

    const root = page.locator('[data-hero-floaters]')
    await expect
      .poll(() => root.getAttribute('data-hero-floaters-ready'), { timeout: 10_000 })
      .toBe('true')
    await expect(root.locator('.hero-floater')).toHaveCount(12)

    const clockInner = root.locator('.hero-floater--clock .hero-floater-inner')
    const before = await clockInner.evaluate((element) => getComputedStyle(element).transform)

    await page.mouse.move(1180, 360)
    await page.mouse.move(180, 640)

    await expect
      .poll(() => clockInner.evaluate((element) => getComputedStyle(element).transform))
      .not.toBe(before)
  })

  test('pins the chapter rail with compact cards', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoHydratedApp(page, '/')

    const section = page.locator('.landing-chapter-story')
    const track = section.locator('.landing-chapter-track')
    const cube = page.locator('[data-landing-cube]')

    await expect(section).toHaveAttribute('data-pinned', 'true')
    await expect(page.locator('.landing-cube-rail')).toHaveCount(0)
    await expect(cube).toHaveCount(1)
    expect(await cube.evaluate((element) => getComputedStyle(element).position)).toBe('fixed')

    const sectionBox = await section.boundingBox()
    expect(sectionBox).not.toBeNull()
    expect(sectionBox!.height).toBeGreaterThan(800)

    const firstCardBox = await section.locator('.landing-chapter').first().boundingBox()
    expect(firstCardBox).not.toBeNull()
    expect(firstCardBox!.height).toBeLessThanOrEqual(200)

    const initialTrackTransform = await track.evaluate(
      (element) => getComputedStyle(element).transform,
    )
    const initialCubeTransform = await cube.evaluate(
      (element) => getComputedStyle(element).transform,
    )
    const initialCubeBox = await cube.boundingBox()
    expect(initialCubeBox).not.toBeNull()
    const chapterTop = await section.evaluate((element) => {
      const scroll = element.closest('[data-route-scroll]')
      const scrollTop = scroll instanceof HTMLElement ? scroll.scrollTop : 0
      return element.getBoundingClientRect().top + scrollTop
    })

    await page.locator('[data-route-scroll]').evaluate((element, nextTop) => {
      element.scrollTop = nextTop
    }, chapterTop + 600)

    await expect
      .poll(() => track.evaluate((element) => getComputedStyle(element).transform))
      .not.toBe(initialTrackTransform)
    await expect
      .poll(() => cube.evaluate((element) => getComputedStyle(element).transform))
      .not.toBe(initialCubeTransform)

    const cubeBox = await cube.boundingBox()
    expect(cubeBox).not.toBeNull()
    expect(cubeBox!.y).toBeLessThan(initialCubeBox!.y)
    expect(cubeBox!.y + cubeBox!.height).toBeGreaterThan(0)
    const contentWidth = await page
      .locator('.landing-content')
      .evaluate((element) => element.getBoundingClientRect().width)
    expect(contentWidth).toBeGreaterThan(1200)
  })

  test('keeps the cube parallax moving through the very bottom', async ({ page }) => {
    async function cubeBoxAt(progress: number): Promise<{ y: number; height: number }> {
      const scroll = page.locator('[data-route-scroll]')
      const cube = page.locator('[data-landing-cube]')

      await scroll.evaluate((element, value) => {
        element.scrollTop = (element.scrollHeight - element.clientHeight) * value
      }, progress)
      await page.waitForTimeout(160)
      const box = await cube.boundingBox()
      expect(box).not.toBeNull()
      return { height: box!.height, y: box!.y }
    }

    async function expectParallaxAtBottom(viewportHeight: number) {
      const atNinetyPercent = await cubeBoxAt(0.9)
      const atBottom = await cubeBoxAt(1)

      expect(atBottom.y).toBeLessThan(atNinetyPercent.y)

      const visibleBottom = Math.min(viewportHeight, atBottom.y + atBottom.height)
      const visibleTop = Math.max(0, atBottom.y)
      expect((visibleBottom - visibleTop) / atBottom.height).toBeGreaterThanOrEqual(0.3)
    }

    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoHydratedApp(page, '/')
    await expectParallaxAtBottom(900)

    await page.setViewportSize({ width: 390, height: 844 })
    await gotoHydratedApp(page, '/')
    await expectParallaxAtBottom(844)
  })

  test('keeps chromatic aberration scoped to the SPEEDCUBE title', async ({ page }) => {
    await gotoHydratedApp(page, '/')

    const shadows = await page.evaluate(() => {
      const brand = document.querySelector('[data-hero-brand]')
      const domain = document.querySelector('[data-hero-domain]')

      return {
        brand: brand ? getComputedStyle(brand).textShadow : null,
        domain: domain ? getComputedStyle(domain).textShadow : null,
      }
    })

    expect(shadows.brand).not.toBe('none')
    expect(shadows.domain).toBe('none')
  })

  test('drives chromatic aberration from scroll direction', async ({ page }) => {
    await gotoHydratedApp(page, '/')

    const scroll = page.locator('[data-route-scroll]')
    const caValue = () =>
      page.evaluate(() => {
        const landing = document.querySelector('.landing-page')
        return Number.parseFloat(
          getComputedStyle(landing ?? document.body).getPropertyValue('--ca-scroll'),
        ) || 0
      })

    const downOffset = await scroll.evaluate(async (element) => {
      for (let index = 0; index < 10; index += 1) {
        element.scrollTop += 32
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      }
      const landing = document.querySelector('.landing-page')
      return Number.parseFloat(
        getComputedStyle(landing ?? document.body).getPropertyValue('--ca-scroll'),
      ) || 0
    })

    expect(downOffset).toBeGreaterThan(0)
    await expect.poll(caValue, { timeout: 2500 }).toBe(0)

    const upOffset = await scroll.evaluate(async (element) => {
      for (let index = 0; index < 10; index += 1) {
        element.scrollTop -= 32
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      }
      const landing = document.querySelector('.landing-page')
      return Number.parseFloat(
        getComputedStyle(landing ?? document.body).getPropertyValue('--ca-scroll'),
      ) || 0
    })

    expect(upOffset).toBeLessThan(0)
  })
})
