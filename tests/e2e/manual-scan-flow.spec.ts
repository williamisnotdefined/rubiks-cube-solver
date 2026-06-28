import { expect, test, type Locator, type Page } from '@playwright/test'
import { chooseRadixSelectOption, expectRadixSelectOptionEnabled } from './select-helpers'

type ScanFaceSymbol = 'U' | 'R' | 'F' | 'D' | 'L' | 'B'
type FaceStickers = Record<ScanFaceSymbol, string>
type RawSolveResponse = {
  elapsedMs?: number
  exploredNodes?: number
  generatedTableStatus?: string
  maxDepth?: number
  maxNodes?: number
  length?: number
  moves?: string[]
  ok?: boolean
  replayVerified?: boolean
  strategyId?: string
  status?: string
  visualState?: RawVisualState
}
type RawScanSessionResponse = {
  ok?: boolean
  status?: string
  solve?: RawSolveResponse
}
type RawVisualState = string | { kind?: string; value?: string } | null
type ScanSolveResult = {
  elapsedMs: number
  engineElapsedMs: number
  exploredNodes: number
  length: number
  moves: string[]
  strategyId: string
  visualState: string
}
type ManualScanFixture = {
  scramble: string
  visualState: string
}

const faceStateOrder: readonly ScanFaceSymbol[] = ['U', 'R', 'F', 'D', 'L', 'B']
const scanFaceOrder: readonly ScanFaceSymbol[] = ['F', 'R', 'B', 'L', 'U', 'D']
const scanFaceLabels3x3: Record<ScanFaceSymbol, string> = {
  B: 'Blue face',
  D: 'Yellow face',
  F: 'Green face',
  L: 'Orange face',
  R: 'Red face',
  U: 'White face',
}
const scanFaceLabels2x2: Record<ScanFaceSymbol, string> = {
  B: 'Back side',
  D: 'Down side',
  F: 'Front side',
  L: 'Left side',
  R: 'Right side',
  U: 'Up side',
}
const scanColorLabels: Record<ScanFaceSymbol, string> = {
  B: 'Blue',
  D: 'Yellow',
  F: 'Green',
  L: 'Orange',
  R: 'Red',
  U: 'White',
}
const cube3ManualScanFixtures: readonly ManualScanFixture[] = [
  {
    scramble: "U' F2 U2 B2 F2 D' F2 D' F2 L2 U' B' L' D B L' R B2 D2 F'",
    visualState: 'FBLUUFBRFLRBURRDLRRDULFBFLBRBRLDFURUDFUFLUBDDDDLBBDFUL',
  },
  {
    scramble: "F D2 R U D' B' R2 U' L U2 L' F2 D2 F2 D2 R' L2 D2 F2 L F'",
    visualState: 'FLDFUDRULFLRRRBBBLBFDRFUUDDRBLRDLURULDDULBRDFFFUUBLBFB',
  },
  {
    scramble: "U' L' F2 U L2 D R2 D' L2 B2 D' B2 L2 U2 R' B2 L2 D R B F'",
    visualState: 'BLDDUULRURRLURBURFBDFLFLDFLRLFUDFFBLRFUDLBDFBBDURBBDUR',
  },
  {
    scramble: "L2 F2 D2 L B2 R B2 F2 D2 R D' L' R U2 F L2 B2 L U",
    visualState: 'DDUFUDLUFURLURBBLLBLRUFBBDDDFLFDBBDDFUURLRULRFLRRBFFBR',
  },
  {
    scramble: "U F' U' L2 U' F2 L2 D' F2 U' R2 D2 R B L B L D2 F2 D'",
    visualState: 'RLFDUBDRRBRRURDLBUBDDDFFLFDURFUDUDRBUBLLLLRLFUFBFBBLUF',
  },
  {
    scramble: "F' L D2 F2 D2 B2 L D F D2 B2 R B2 L2 D2 B2 R2 L",
    visualState: 'UDFDUBRLLFRRFRBRDDBBDLFDRUBDLUUDBURLLLDULFLRFURBUBFBFF',
  },
  {
    scramble: "U2 F' B2 R2 B' D' B U' R L2 U2 F U2 B2 U2 F L2 D2 R2 F'",
    visualState: 'DUUDUBFULULRRRUBFDDBFLFBDRLFFULDLFDBBBLFLURDRBRLFBDRRU',
  },
  {
    scramble: "L U L D2 R' B2 D2 F2 R F2 R B2 L2 B' L' D' F U R' B'",
    visualState: 'LRRLUBLUDBDFDRULUBFBLRFRRFUULBBDRRURUDDFLBULBDFFFBDDLF',
  },
] as const
const cube2ManualScanFixtures: readonly ManualScanFixture[] = [
  {
    scramble: "F2 U2 R' F' R2 U F2 R2 U",
    visualState: 'BRLFLFFUBUULRDDRDULFDRBB',
  },
  {
    scramble: "F' R2 F R2 U' R' U' F2 U2",
    visualState: 'RLDFUFDDFRBBURDFURLLUBLB',
  },
  {
    scramble: "U' R' F2 U R' F' U F2 U2",
    visualState: 'FFLRURBBUBRRDDDLDFLFULUB',
  },
  {
    scramble: "R U F' R' F2 R2 F2 R' U'",
    visualState: 'RRUUBUBBFRLLFUDRDLLDFFDB',
  },
  {
    scramble: "R' U2 F2 R' F U F2 R2 U2",
    visualState: 'DLRLBFUFFURRDBDLRULFUBDB',
  },
  {
    scramble: "F R2 U' F R' F R' U2 F2 U'",
    visualState: 'UULFRBLRUDUDRFDDBFLFLRBB',
  },
  {
    scramble: "R2 F R' F2 U F' U' R2 U",
    visualState: 'FUBRDBFRDFULBDDULRLRLUFB',
  },
  {
    scramble: "R F2 U' R' F R2 F' R2 U2",
    visualState: 'BLRFUFLUBRDDFFDRUDLRULBB',
  },
] as const
const cube3TargetSolveResponseMs = 20_000
const cube2TargetSolveResponseMs = 10_000
const maxNodesMillion = '25'
const maxNodes = 25_000_000
const solvePath = '/en/solve/'

test.describe('manual scan solve flow', () => {
  test.describe.configure({ timeout: 120_000 })

  test.beforeEach(async ({ page }) => {
    await blockCamera(page)
  })

  for (const [index, fixture] of cube3ManualScanFixtures.entries()) {
    test(`solves manually entered 3x3 scan #${index + 1}`, async ({ page }) => {
      await page.goto(solvePath)

      const cube = page.locator('.cube-stage rubiks-cube')
      await expect(page.getByRole('button', { name: 'Scan cube with camera' })).toBeEnabled({
        timeout: 15_000,
      })
      const solvedState = await waitForCubeState(cube, 54)
      await page.getByLabel('Max moves').fill('20')
      await chooseRadixSelectOption(page, 'Max nodes (M)', maxNodesMillion)
      await page.getByLabel('Scramble').fill(fixture.scramble)
      const scanFaces = scanFacesFor3x3(fixture.visualState)

      await page.getByRole('button', { name: 'Scan cube with camera' }).click()
      await confirmManualScanFaces(page, scanFaces, 9, scanFaceLabels3x3)
      const solveResult = await submitScanAndWaitForResult(page, {
        expectedMaxDepth: 20,
        expectedStrategyId: 'generated-two-phase',
        expectedVisualState: fixture.visualState,
        maxSolutionLength: 20,
        timeout: 120_000,
      })

      await expect(page.getByRole('dialog', { name: 'Scan cube' })).toHaveCount(0, {
        timeout: 30_000,
      })
      await expectSuccessfulScanResult(page, /Generated two-phase (quality )?solver/, solveResult.moves)
      test.info().annotations.push({
        type: 'scan-solve-response-ms',
        description: `3x3=${solveResult.elapsedMs}; target=${cube3TargetSolveResponseMs}`,
      })
      test.info().annotations.push({
        type: 'scan-solve-engine-ms',
        description: `3x3=${solveResult.engineElapsedMs}`,
      })
      expect(solveResult.elapsedMs).toBeLessThanOrEqual(cube3TargetSolveResponseMs)
      await expect.poll(() => cubeState(cube)).toBe(fixture.visualState)

      await advancePlaybackToSolved(page, cube, solvedState)
    })
  }

  for (const [index, fixture] of cube2ManualScanFixtures.entries()) {
    test(`solves manually entered 2x2 scan #${index + 1}`, async ({ page }) => {
      await page.goto(solvePath)

      const puzzleSelect = page.getByRole('combobox', { name: 'Puzzle' })
      await expect(puzzleSelect).toBeEnabled({ timeout: 15_000 })
      await expectRadixSelectOptionEnabled(page, 'Puzzle', '2x2x2 Cube')
      await chooseRadixSelectOption(page, 'Puzzle', '2x2x2 Cube')

      const cube = page.locator('.cube-stage rubiks-cube')
      await expect(page.getByRole('button', { name: 'Scan cube with camera' })).toBeEnabled({
        timeout: 15_000,
      })
      const solvedState = await waitForCubeState(cube, 24)
      await page.getByLabel('Max moves').fill('11')
      await chooseRadixSelectOption(page, 'Max nodes (M)', maxNodesMillion)
      await page.getByLabel('Scramble').fill(fixture.scramble)
      const scanFaces = scanFacesFor2x2(fixture.visualState)

      await page.getByRole('button', { name: 'Scan cube with camera' }).click()
      await confirmManualScanFaces(page, scanFaces, 4, scanFaceLabels2x2)
      await page.getByRole('button', { name: 'Review assembled cube' }).click()
      await expect(page.getByRole('heading', { name: 'Review assembled cube' })).toBeVisible()
      const solveResult = await submitScanAndWaitForResult(page, {
        buttonName: 'Accept and solve',
        expectedMaxDepth: 11,
        expectedStrategyId: 'cube2-pdb-ida-star',
        expectedVisualState: fixture.visualState,
        maxSolutionLength: 11,
        timeout: 120_000,
      })

      await expect(page.getByRole('dialog', { name: 'Scan cube' })).toHaveCount(0, {
        timeout: 30_000,
      })
      await expectSuccessfulScanResult(page, /2x2 PDB IDA\*/, solveResult.moves)
      test.info().annotations.push({
        type: 'scan-solve-response-ms',
        description: `2x2=${solveResult.elapsedMs}; target=${cube2TargetSolveResponseMs}`,
      })
      test.info().annotations.push({
        type: 'scan-solve-engine-ms',
        description: `2x2=${solveResult.engineElapsedMs}`,
      })
      expect(solveResult.elapsedMs).toBeLessThanOrEqual(cube2TargetSolveResponseMs)
      await expect.poll(() => cubeState(cube)).toBe(fixture.visualState)

      await advancePlaybackToSolved(page, cube, solvedState)
    })
  }
})

async function blockCamera(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: () => Promise.reject(new Error('camera disabled for e2e')),
      },
    })
  })
}

async function confirmManualScanFaces(
  page: Page,
  scanFaces: FaceStickers,
  stickersPerFace: 4 | 9,
  faceLabels: Record<ScanFaceSymbol, string>,
) {
  for (const face of scanFaceOrder) {
    await expect(page.getByRole('heading', { name: faceLabels[face] })).toBeVisible()
    await fillCurrentScanFace(page, scanFaces[face], stickersPerFace)
    await expect(page.getByRole('button', { name: 'Confirm face' })).toBeEnabled()
    await page.getByRole('button', { name: 'Confirm face' }).click()
  }
}

async function fillCurrentScanFace(page: Page, stickers: string, stickersPerFace: 4 | 9) {
  for (let index = 0; index < stickers.length; index += 1) {
    if (stickersPerFace === 9 && index === 4) {
      continue
    }

    const symbol = stickers[index] as ScanFaceSymbol
    await page.getByTestId(`scan-sticker-${index}`).dispatchEvent('click')
    await page
      .getByRole('button', { exact: true, name: scanColorLabels[symbol] })
      .dispatchEvent('click')
  }
}

async function expectSuccessfulScanResult(page: Page, strategyPattern: RegExp, moves: readonly string[]) {
  await expect(page.locator('.result code')).toHaveText(moves.join(' '), { timeout: 30_000 })
  await expect(page.locator('.result')).toContainText(/\d+ moves? - response in/)
  await page.getByRole('button', { name: 'see more' }).click()

  const details = page.getByRole('dialog', { name: 'Solver details' })
  await expect(details).toContainText(strategyPattern)
  await expect(details).toContainText('replay verified')
  await page.getByRole('button', { name: 'Close' }).click()
}

async function submitScanAndWaitForResult(
  page: Page,
  {
    buttonName = 'Solve scanned cube',
    expectedMaxDepth,
    expectedStrategyId,
    expectedVisualState,
    maxSolutionLength,
    timeout,
  }: {
    buttonName?: string
    expectedMaxDepth: number
    expectedStrategyId: string
    expectedVisualState: string
    maxSolutionLength: number
    timeout: number
  },
): Promise<ScanSolveResult> {
  const startedAt = Date.now()
  const [response] = await Promise.all([
    page.waitForResponse(
      (response) => response.url().endsWith('/scan/solve-session') && response.request().method() === 'POST',
      { timeout },
    ),
    page.getByRole('button', { name: buttonName }).click(),
  ])
  const elapsedMs = Date.now() - startedAt
  const payload = await response.json() as RawScanSessionResponse
  const solve = payload.solve
  const moves = solve?.moves ?? []
  const length = solve?.length ?? -1
  const visualState = normalizedVisualState(solve?.visualState)

  expect(response.ok()).toBe(true)
  expect(payload.ok, `scan session status=${payload.status ?? 'missing'}`).toBe(true)
  expect(solve?.ok, `solve status=${solve?.status ?? 'missing'}`).toBe(true)
  expect(solve?.status).toBe('success')
  expect(solve?.replayVerified).toBe(true)
  expect(solve?.strategyId).toBe(expectedStrategyId)
  expect(solve?.maxDepth).toBe(expectedMaxDepth)
  expect(solve?.maxNodes).toBe(maxNodes)
  expect(visualState).toBe(expectedVisualState)
  expect(length).toBeGreaterThan(0)
  expect(length).toBeLessThanOrEqual(maxSolutionLength)
  expect(moves).toHaveLength(length)
  expect(solve?.exploredNodes ?? 0).toBeGreaterThan(0)
  expect(solve?.elapsedMs ?? -1).toBeGreaterThanOrEqual(0)

  return {
    elapsedMs,
    engineElapsedMs: solve?.elapsedMs ?? 0,
    exploredNodes: solve?.exploredNodes ?? 0,
    length,
    moves,
    strategyId: solve?.strategyId ?? '',
    visualState,
  }
}

function normalizedVisualState(visualState: RawVisualState | undefined): string {
  if (typeof visualState === 'string') {
    return visualState
  }

  return visualState?.value ?? ''
}

async function advancePlaybackToSolved(page: Page, cube: Locator, solvedState: string) {
  const range = page.getByLabel('Solution step')
  await expect(range).toHaveValue('0')

  const maxStep = Number(await range.getAttribute('max'))
  expect(maxStep).toBeGreaterThan(0)

  for (let step = 1; step <= maxStep; step += 1) {
    await page.getByRole('button', { name: 'Next move' }).click()
    await expect(range).toHaveValue(String(step))
  }

  await expect.poll(() => cubeState(cube)).toBe(solvedState)
}

async function waitForCubeState(cube: Locator, expectedLength: number): Promise<string> {
  await expect
    .poll(() => cubeState(cube))
    .toMatch(new RegExp(`^[URFDLB]{${expectedLength}}$`))

  return cubeState(cube)
}

async function cubeState(cube: Locator): Promise<string> {
  return cube.evaluate((element) => {
    try {
      return (element as HTMLElement & { getState: () => string }).getState()
    } catch {
      return ''
    }
  })
}

function scanFacesFor3x3(state: string): FaceStickers {
  const faces = canonicalFaces(state, 9)

  return {
    ...faces,
    U: rotateSquareFace(faces.U),
  }
}

function scanFacesFor2x2(state: string): FaceStickers {
  const faces = canonicalFaces(state, 4)

  return {
    B: faces.B,
    D: rotateSquareFace(faces.D),
    F: faces.F,
    L: faces.R,
    R: faces.L,
    U: faces.U,
  }
}

function canonicalFaces(state: string, stickersPerFace: 4 | 9): FaceStickers {
  return Object.fromEntries(
    faceStateOrder.map((face, faceIndex) => [
      face,
      state.slice(faceIndex * stickersPerFace, (faceIndex + 1) * stickersPerFace),
    ]),
  ) as FaceStickers
}

function rotateSquareFace(stickers: string): string {
  return stickers.split('').reverse().join('')
}
