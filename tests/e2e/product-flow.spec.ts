import { existsSync } from 'node:fs'
import path from 'node:path'
import { expect, test, type Locator, type Page } from '@playwright/test'

const solvedFacelets = 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB'
const shallowScrambledFacelets =
  'UUUUUUFFFUBBRRRRRRRRRFFDFFDDDBDDBDDBFFDLLLLLLLLLUBBUBB'
const nontrivialGeneratedFacelets =
  'UULUUFUUFRRUBRRURRFFDFFUFFFDDRDDDDDDBLLLLLLLLBRRBBBBBB'
const generatedMidDepthFacelets =
  'DUDDUDUDDLRRLRRBRRBFFBFFLLRUDDUDUUUUBBRRLLBFFFLLFBBFBL'
const generatedPruningTableDir = path.join(
  process.cwd(),
  'apps/web/public/generated-pruning-tables',
)
const generatedPruningArtifactFileNames = [
  'phase1-corner-edge-orientation.rpt',
  'phase1-corner-orientation-ud-slice.rpt',
  'phase1-edge-orientation-ud-slice.rpt',
  'phase2-corner-permutation-slice-edge-permutation.rpt',
  'phase2-ud-edge-permutation-slice-edge-permutation.rpt',
] as const
const faceletSymbolLabels = {
  U: 'Up',
  R: 'Right',
  F: 'Front',
  D: 'Down',
  L: 'Left',
  B: 'Back',
} as const
const faceletFaces = ['U', 'R', 'F', 'D', 'L', 'B'] as const

type FaceletSymbol = keyof typeof faceletSymbolLabels
type GeneratedTwoPhaseEntryMethod = 'solved-button' | 'raw-facelets' | 'sticker-net'

type GeneratedTwoPhaseFixture = {
  fixtureId: string
  facelets: string
  entryMethod: GeneratedTwoPhaseEntryMethod
  expectedHeading: 'already solved' | 'solution found'
}

const generatedTwoPhaseSuccessFixtures = [
  {
    fixtureId: 'solved-facelets',
    facelets: solvedFacelets,
    entryMethod: 'solved-button',
    expectedHeading: 'already solved',
  },
  {
    fixtureId: 'shallow-cubie-r-u',
    facelets: shallowScrambledFacelets,
    entryMethod: 'sticker-net',
    expectedHeading: 'solution found',
  },
  {
    fixtureId: 'nontrivial-facelets-r-u-rprime-uprime',
    facelets: nontrivialGeneratedFacelets,
    entryMethod: 'raw-facelets',
    expectedHeading: 'solution found',
  },
  {
    fixtureId: 'generated-mid-depth-facelets-phase2-five-move',
    facelets: generatedMidDepthFacelets,
    entryMethod: 'raw-facelets',
    expectedHeading: 'solution found',
  },
] as const satisfies readonly GeneratedTwoPhaseFixture[]

test.describe('product solve flow', () => {
  test('submits solved facelets from the sticker net and shows a no-op solution', async ({
    page,
  }) => {
    await openSolver(page)

    await enterFaceletsWithStickerNet(page, solvedFacelets)
    await expect(page.getByLabel('54-character facelet string')).toHaveValue(
      solvedFacelets,
    )
    await expect(page.getByText('valid facelets').first()).toBeVisible()

    await page.getByRole('button', { name: 'Solve with WASM' }).click()

    await expect(page.getByText('already solved', { exact: true })).toBeVisible()
    await expect(page.getByText('No-op solution', { exact: true })).toBeVisible()
    await expect(page.getByText('Playback input rejected')).toHaveCount(0)
    await expect(page.getByText('Playback boundary client failure')).toHaveCount(0)
  })

  test('submits solved facelets and shows a no-op solution', async ({ page }) => {
    await openSolver(page)

    await page.getByRole('button', { name: 'Use solved facelets' }).click()
    await expect(page.getByText('valid facelets').first()).toBeVisible()
    await expect(page.getByRole('combobox', { name: /solver strategy/i })).toHaveValue(
      'bounded-ida-star',
    )
    await expect(page.getByRole('combobox', { name: /solver strategy/i })).toContainText(
      'Generated two-phase solver',
    )

    await page.getByRole('button', { name: 'Solve with WASM' }).click()

    await expect(page.getByText('already solved', { exact: true })).toBeVisible()
    await expect(page.getByText('No-op solution', { exact: true })).toBeVisible()
    await expect(page.getByText('Playback input rejected')).toHaveCount(0)
    await expect(page.getByText('Playback boundary client failure')).toHaveCount(0)
  })

  test('submits a shallow scrambled state from the sticker net and steps playback to solved', async ({
    page,
  }) => {
    await openSolver(page)

    await enterFaceletsWithStickerNet(page, shallowScrambledFacelets)
    await expect(page.getByLabel('54-character facelet string')).toHaveValue(
      shallowScrambledFacelets,
    )
    await expect(page.getByText('valid facelets').first()).toBeVisible()

    await page.getByRole('button', { name: 'Solve with WASM' }).click()

    await expect(page.getByText('solution found', { exact: true })).toBeVisible()
    await stepPlaybackToSolved(page)
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
    await stepPlaybackToSolved(page)
  })

  test('shows invalid-state errors through the UI', async ({ page }) => {
    await openSolver(page)

    await page.getByLabel('54-character facelet string').fill('U')
    await expect(page.getByText('invalid_length').first()).toBeVisible()

    await page.getByRole('button', { name: 'Solve with WASM' }).click()

    await expect(page.getByRole('heading', { name: 'Validation error' })).toBeVisible()
    await expect(page.getByText('invalid_length').first()).toBeVisible()
  })

  test('rejects an invalid sticker-net state through Rust validation', async ({ page }) => {
    await openSolver(page)

    await selectStickerSymbol(page, 'U')
    await page.getByRole('button', { name: /^F1 sticker/ }).click()

    const invalidFacelets = replaceFacelet(solvedFacelets, 18, 'U')
    await expect(page.getByLabel('54-character facelet string')).toHaveValue(
      invalidFacelets,
    )
    await expect(page.getByText('invalid_face_count').first()).toBeVisible()

    await page.getByRole('button', { name: 'Solve with WASM' }).click()

    await expect(page.getByRole('heading', { name: 'Validation error' })).toBeVisible()
    await expect(page.getByText('invalid_face_count').first()).toBeVisible()
  })

  test('selects the limited two-phase baseline and shows an honest limit outcome', async ({
    page,
  }) => {
    await openSolver(page)

    await page
      .getByRole('combobox', { name: /solver strategy/i })
      .selectOption('two-phase-baseline')
    await expect(
      page.getByText('solver_mode=limited_two_phase_baseline').first(),
    ).toBeVisible()

    await page
      .getByLabel('54-character facelet string')
      .fill(shallowScrambledFacelets)
    await expect(page.getByText('valid facelets').first()).toBeVisible()

    await page.getByRole('button', { name: 'Solve with WASM' }).click()

    await expect(
      page.getByRole('heading', { name: 'No solution within limits' }),
    ).toBeVisible()
    const solvePanel = page.locator('.solve-panel')

    await expect(solvePanel.getByText('Limited two-phase baseline').first()).toBeVisible()
    await expect(page.getByText('did not find a verified solution')).toBeVisible()
    await expect(solvePanel.getByText('limited_two_phase_baseline').first()).toBeVisible()
  })

  test('selects generated two-phase and reports missing browser artifacts', async ({ page }) => {
    await page.route('**/generated-pruning-tables/*.rpt', async (route) => {
      await route.fulfill({ status: 404, body: '' })
    })
    await openSolver(page)

    const strategySelect = page.getByRole('combobox', { name: /solver strategy/i })
    await expect(strategySelect).toContainText('Generated two-phase solver')
    await strategySelect.selectOption('generated-two-phase')
    await expect(page.getByText('solver_mode=generated_two_phase').first()).toBeVisible()

    await page.getByRole('button', { name: 'Use solved facelets' }).click()
    await expect(page.getByText('valid facelets').first()).toBeVisible()

    await page.getByRole('button', { name: 'Solve with WASM' }).click()

    const solvePanel = page.locator('.solve-panel')
    await expect(solvePanel.getByText('Generated two-phase solver').first()).toBeVisible()
    await expect(solvePanel.getByText('generated_two_phase').first()).toBeVisible()
    await expectMetric(solvePanel, 'generated_table_status', 'unavailable')
    await expect(
      page.getByRole('heading', { name: 'Generated tables unavailable' }),
    ).toBeVisible()
    await expect(solvePanel.getByText('generated_tables_unavailable')).toBeVisible()
  })

  test('selects generated two-phase and reports corrupt browser artifacts', async ({ page }) => {
    await page.route('**/generated-pruning-tables/*.rpt', async (route) => {
      const url = route.request().url()

      if (url.endsWith('/phase1-corner-edge-orientation.rpt')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/octet-stream',
          body: 'not a pruning-table artifact',
        })
        return
      }

      await route.fulfill({ status: 404, body: '' })
    })
    await openSolver(page)

    const strategySelect = page.getByRole('combobox', { name: /solver strategy/i })
    await strategySelect.selectOption('generated-two-phase')
    await page.getByRole('button', { name: 'Use solved facelets' }).click()
    await expect(page.getByText('valid facelets').first()).toBeVisible()

    await page.getByRole('button', { name: 'Solve with WASM' }).click()

    const solvePanel = page.locator('.solve-panel')
    await expect(solvePanel.getByText('Generated two-phase solver').first()).toBeVisible()
    await expect(solvePanel.getByText('generated_two_phase').first()).toBeVisible()
    await expectMetric(
      solvePanel,
      'generated_table_status',
      'corrupt_or_incompatible',
    )
    await expect(page.getByRole('heading', { name: 'Generated tables corrupt' })).toBeVisible()
    await expect(solvePanel.getByText('generated_tables_corrupt')).toBeVisible()
  })

  test('generated two-phase solves documented fixtures with local artifacts', async ({ page }) => {
    test.skip(
      !localGeneratedPruningArtifactsExist(),
      'Generate browser pruning artifacts before requiring generated two-phase browser success.',
    )

    await openSolver(page)

    const strategySelect = page.getByRole('combobox', { name: /solver strategy/i })
    await strategySelect.selectOption('generated-two-phase')
    await expect(page.getByText('solver_mode=generated_two_phase').first()).toBeVisible()

    for (const fixture of generatedTwoPhaseSuccessFixtures) {
      await enterGeneratedTwoPhaseFixture(page, fixture)
      await expect(page.getByLabel('54-character facelet string')).toHaveValue(
        fixture.facelets,
      )

      await expect(page.getByText('valid facelets').first()).toBeVisible()
      await page.getByRole('button', { name: 'Solve with WASM' }).click()

      const solvePanel = page.locator('.solve-panel')
      await expectMetric(solvePanel, 'strategy', 'Generated two-phase solver')
      await expectMetric(solvePanel, 'solver_mode', 'generated_two_phase')
      await expectMetric(solvePanel, 'generated_table_status', 'available')
      await expectMetric(solvePanel, 'max_depth', '6')
      await expectMetric(solvePanel, 'max_nodes', '100000')
      await expectMetric(solvePanel, 'solution_length', /^\d+$/)
      await expectMetric(solvePanel, 'explored_nodes', /^\d+$/)
      await expect(page.getByText(fixture.expectedHeading, { exact: true })).toBeVisible()
      await expect(page.getByText('solved: true')).toBeVisible()
      await expect(
        page.getByText('Generated tables unavailable', { exact: true }),
        fixture.fixtureId,
      ).toHaveCount(0)
      await expect(
        page.getByText('Generated tables corrupt', { exact: true }),
        fixture.fixtureId,
      ).toHaveCount(0)
    }
  })
})

function localGeneratedPruningArtifactsExist(): boolean {
  return generatedPruningArtifactFileNames.every((fileName) =>
    existsSync(path.join(generatedPruningTableDir, fileName)),
  )
}

async function openSolver(page: Page) {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Use solved facelets' })).toBeEnabled({
    timeout: 15_000,
  })
}

async function enterFaceletsWithStickerNet(page: Page, targetFacelets: string) {
  if (targetFacelets.length !== solvedFacelets.length) {
    throw new Error('Sticker-net helper expects a complete 54-character string.')
  }

  await page.getByRole('button', { name: 'Use solved facelets' }).click()
  await expect(page.getByLabel('54-character facelet string')).toHaveValue(solvedFacelets)

  for (let index = 0; index < targetFacelets.length; index += 1) {
    const targetSymbol = targetFacelets[index]

    if (targetSymbol === solvedFacelets[index]) {
      continue
    }

    if (!isFaceletSymbol(targetSymbol)) {
      throw new Error(`Unsupported sticker symbol at index ${index}: ${targetSymbol}`)
    }

    if (isCenterFaceletIndex(index)) {
      throw new Error(`Sticker-net helper cannot edit fixed center index ${index}.`)
    }

    await selectStickerSymbol(page, targetSymbol)
    await page.getByRole('button', { name: stickerButtonName(index) }).click()
  }
}

async function enterGeneratedTwoPhaseFixture(
  page: Page,
  fixture: GeneratedTwoPhaseFixture,
) {
  if (fixture.entryMethod === 'solved-button') {
    await page.getByRole('button', { name: 'Use solved facelets' }).click()
    return
  }

  if (fixture.entryMethod === 'sticker-net') {
    await enterFaceletsWithStickerNet(page, fixture.facelets)
    return
  }

  await page.getByLabel('54-character facelet string').fill(fixture.facelets)
}

async function expectMetric(
  panel: Locator,
  metricName: string,
  expectedValue: string | RegExp,
) {
  const metric = panel.locator('.metrics-grid div').filter({ hasText: metricName }).first()

  await expect(metric.locator('dt')).toHaveText(metricName, { timeout: 30_000 })
  await expect(metric.locator('dd')).toHaveText(expectedValue, { timeout: 30_000 })
}

async function selectStickerSymbol(page: Page, symbol: FaceletSymbol) {
  await page
    .getByRole('button', {
      name: `Select ${symbol} sticker (${faceletSymbolLabels[symbol]})`,
    })
    .click()
}

async function stepPlaybackToSolved(page: Page) {
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
}

function stickerButtonName(faceletIndex: number): RegExp {
  return new RegExp(`^${faceletPositionName(faceletIndex)} sticker`)
}

function faceletPositionName(faceletIndex: number): string {
  const face = faceletFaces[Math.floor(faceletIndex / 9)]

  if (face === undefined) {
    throw new Error(`Invalid facelet index ${faceletIndex}.`)
  }

  return `${face}${(faceletIndex % 9) + 1}`
}

function isCenterFaceletIndex(faceletIndex: number): boolean {
  return faceletIndex % 9 === 4
}

function isFaceletSymbol(symbol: string): symbol is FaceletSymbol {
  return symbol in faceletSymbolLabels
}

function replaceFacelet(
  facelets: string,
  faceletIndex: number,
  symbol: FaceletSymbol,
): string {
  return `${facelets.slice(0, faceletIndex)}${symbol}${facelets.slice(faceletIndex + 1)}`
}
