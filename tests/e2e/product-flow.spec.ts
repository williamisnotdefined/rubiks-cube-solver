import { expect, test, type Page } from '@playwright/test'

const shallowScrambledFacelets =
  'UUUUUUFFFUBBRRRRRRRRRFFDFFDDDBDDBDDBFFDLLLLLLLLLUBBUBB'

test.describe('product solve flow', () => {
  test('submits solved facelets and shows a no-op solution', async ({ page }) => {
    await openSolver(page)

    await page.getByRole('button', { name: 'Use solved facelets' }).click()
    await expect(page.getByText('valid facelets').first()).toBeVisible()

    await page.getByRole('button', { name: 'Solve with WASM' }).click()

    await expect(page.getByText('already solved', { exact: true })).toBeVisible()
    await expect(page.getByText('No-op solution', { exact: true })).toBeVisible()
    await expect(page.getByText('Playback input rejected')).toHaveCount(0)
    await expect(page.getByText('Playback boundary client failure')).toHaveCount(0)
  })

  test('submits a shallow scrambled state and steps playback to solved', async ({
    page,
  }) => {
    await openSolver(page)

    await page
      .getByLabel('54-character facelet string')
      .fill(shallowScrambledFacelets)
    await expect(page.getByText('valid facelets').first()).toBeVisible()

    await page.getByRole('button', { name: 'Solve with WASM' }).click()

    await expect(page.getByText('solution found', { exact: true })).toBeVisible()

    const solutionMoves = page.getByRole('list', { name: 'Solution moves' })
    await expect(solutionMoves).toBeVisible()
    await expect(solutionMoves.getByRole('listitem').first()).toBeVisible()

    await expect(page.getByRole('button', { name: 'Previous' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Reset' })).toBeVisible()

    const nextButton = page.getByRole('button', { name: 'Next' })
    await expect(nextButton).toBeEnabled()

    for (let step = 0; step < 6; step += 1) {
      if (await nextButton.isDisabled()) {
        break
      }

      await nextButton.click()
    }

    await expect(nextButton).toBeDisabled()
    await expect(page.getByRole('heading', { name: /^Final step:/ })).toBeVisible()
    await expect(page.getByText('solved: true')).toBeVisible()
  })

  test('shows invalid-state errors through the UI', async ({ page }) => {
    await openSolver(page)

    await page.getByLabel('54-character facelet string').fill('U')
    await expect(page.getByText('invalid_length').first()).toBeVisible()

    await page.getByRole('button', { name: 'Solve with WASM' }).click()

    await expect(page.getByRole('heading', { name: 'Validation error' })).toBeVisible()
    await expect(page.getByText('invalid_length').first()).toBeVisible()
  })
})

async function openSolver(page: Page) {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Use solved facelets' })).toBeEnabled({
    timeout: 15_000,
  })
}
