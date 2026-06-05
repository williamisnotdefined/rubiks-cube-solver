import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test, type APIRequestContext } from '@playwright/test'

type PuzzleSlug = 'cube-3x3x3' | 'cube-2x2x2'
type ScanFaceSymbol = 'U' | 'R' | 'F' | 'D' | 'L' | 'B'
type HeavyFixture = {
  id: string
  puzzle: PuzzleSlug
  preserved: boolean
  scramble: string
  sequence: number
  visualState: string
}
type HeavyFixtureFile = {
  cube2Count: number
  cube2ScrambleDepth: number
  cube2Seed: number
  cube3Count: number
  cube3ScrambleDepth: number
  cube3Seed: number
  fixtures: HeavyFixture[]
  generatedBy: string
}
type RawVisualState = string | { kind?: string; value?: string } | null
type RawSolveResponse = {
  elapsedMs?: number
  exploredNodes?: number
  length?: number
  maxDepth?: number
  maxNodes?: number
  moves?: string[]
  ok?: boolean
  replayVerified?: boolean
  status?: string
  strategyId?: string
  visualState?: RawVisualState
}
type RawScanSessionResponse = {
  message?: string
  ok?: boolean
  solve?: RawSolveResponse
  status?: string
  timings?: {
    solveElapsedMs?: number
    totalElapsedMs?: number
  }
}
type ReportRow = {
  elapsedMs?: number
  engineElapsedMs?: number
  error?: string
  exploredNodes?: number
  fixtureId: string
  httpOk: boolean
  httpStatus?: number
  length?: number
  maxDepth: number
  maxNodes: number
  moves?: string
  preserved: boolean
  puzzle: PuzzleSlug
  replayVerified?: boolean
  scramble: string
  sequence: number
  solveElapsedMs?: number
  solveOk?: boolean
  solveStatus?: string
  status?: string
  strategyId?: string
  targetMs: number
  totalElapsedMs?: number
  validSolve: boolean
  visualStateMatches: boolean
  withinTarget: boolean
}

const faceStateOrder: readonly ScanFaceSymbol[] = ['U', 'R', 'F', 'D', 'L', 'B']
const maxNodes = 25_000_000
const cube3TargetMs = 20_000
const cube2TargetMs = 10_000
const reportDirectory = path.join(process.cwd(), 'test-results', 'heavy-scan-flow')

test.describe('heavy manual scan solve flow', () => {
  test.skip(
    process.env.RUN_HEAVY_SCAN_E2E !== '1',
    'Set RUN_HEAVY_SCAN_E2E=1 to run the 500+500 heavy scan benchmark.',
  )

  test('solves canonical generated scan sessions and writes reports', async ({ request }) => {
    test.setTimeout(envNumber('HEAVY_SCAN_TIMEOUT_MS', 8 * 60 * 60 * 1_000))

    const fixturePath = fixtureFilePath()
    const fixtureFile = loadFixtureFile(fixturePath)
    const rows: ReportRow[] = []

    for (const fixture of fixtureFile.fixtures) {
      rows.push(await runFixture(request, fixture))
    }

    const summary = buildSummary(fixtureFile, rows)
    const reportPath = writeReports(fixturePath, summary, rows)
    const invalidRows = rows.filter((row) => !row.validSolve)
    const slowRows = rows.filter((row) => row.validSolve && !row.withinTarget)

    expect(
      invalidRows.length,
      `${invalidRows.length} heavy scan cases did not return a valid solve. See ${reportPath}. First failures: ${failurePreview(invalidRows)}`,
    ).toBe(0)

    if (process.env.HEAVY_SCAN_FAIL_ON_SLOW === '1') {
      expect(
        slowRows.length,
        `${slowRows.length} heavy scan cases exceeded target time. See ${reportPath}. First slow cases: ${failurePreview(slowRows)}`,
      ).toBe(0)
    }
  })
})

async function runFixture(request: APIRequestContext, fixture: HeavyFixture): Promise<ReportRow> {
  const config = puzzleConfig(fixture.puzzle)
  const startedAt = Date.now()

  try {
    const response = await request.post(`${apiUrl()}${config.path}`, {
      data: {
        faces: scanSessionFaces(fixture.visualState, config.stickersPerFace),
        gridSize: config.gridSize,
        maxDepth: config.maxDepth,
        maxNodes,
        strategyId: config.strategyId,
      },
      timeout: envNumber('HEAVY_SCAN_REQUEST_TIMEOUT_MS', 120_000),
    })
    const elapsedMs = Date.now() - startedAt
    const payload = await response.json() as RawScanSessionResponse
    const solve = payload.solve
    const visualStateMatches = normalizedVisualState(solve?.visualState) === fixture.visualState
    const validSolve = isValidSolve(response.ok(), payload, solve, config, fixture.visualState)
    const withinTarget = elapsedMs <= config.targetMs

    return {
      elapsedMs,
      engineElapsedMs: solve?.elapsedMs,
      error: validSolve ? undefined : invalidReason(response.ok(), payload, solve, config, fixture.visualState),
      exploredNodes: solve?.exploredNodes,
      fixtureId: fixture.id,
      httpOk: response.ok(),
      httpStatus: response.status(),
      length: solve?.length,
      maxDepth: config.maxDepth,
      maxNodes,
      moves: solve?.moves?.join(' '),
      preserved: fixture.preserved,
      puzzle: fixture.puzzle,
      replayVerified: solve?.replayVerified,
      scramble: fixture.scramble,
      sequence: fixture.sequence,
      solveElapsedMs: payload.timings?.solveElapsedMs,
      solveOk: solve?.ok,
      solveStatus: solve?.status,
      status: payload.status,
      strategyId: solve?.strategyId,
      targetMs: config.targetMs,
      totalElapsedMs: payload.timings?.totalElapsedMs,
      validSolve,
      visualStateMatches,
      withinTarget,
    }
  } catch (error) {
    const elapsedMs = Date.now() - startedAt

    return {
      elapsedMs,
      error: error instanceof Error ? error.message : String(error),
      fixtureId: fixture.id,
      httpOk: false,
      maxDepth: config.maxDepth,
      maxNodes,
      preserved: fixture.preserved,
      puzzle: fixture.puzzle,
      scramble: fixture.scramble,
      sequence: fixture.sequence,
      status: 'request_error',
      targetMs: config.targetMs,
      validSolve: false,
      visualStateMatches: false,
      withinTarget: false,
    }
  }
}

function isValidSolve(
  httpOk: boolean,
  payload: RawScanSessionResponse,
  solve: RawSolveResponse | undefined,
  config: ReturnType<typeof puzzleConfig>,
  expectedVisualState: string,
): boolean {
  const length = solve?.length
  const moves = solve?.moves ?? []

  return httpOk &&
    payload.ok === true &&
    solve?.ok === true &&
    solve.status === 'success' &&
    solve.replayVerified === true &&
    solve.strategyId === config.strategyId &&
    solve.maxDepth === config.maxDepth &&
    solve.maxNodes === maxNodes &&
    normalizedVisualState(solve.visualState) === expectedVisualState &&
    length !== undefined &&
    length <= config.maxDepth &&
    moves.length === length
}

function invalidReason(
  httpOk: boolean,
  payload: RawScanSessionResponse,
  solve: RawSolveResponse | undefined,
  config: ReturnType<typeof puzzleConfig>,
  expectedVisualState: string,
): string {
  const checks: string[] = []
  const length = solve?.length
  const moves = solve?.moves ?? []

  if (!httpOk) checks.push('http_not_ok')
  if (payload.ok !== true) checks.push(`session_${payload.status ?? 'missing'}`)
  if (solve?.ok !== true) checks.push(`solve_${solve?.status ?? 'missing'}`)
  if (solve?.replayVerified !== true) checks.push('replay_not_verified')
  if (solve?.strategyId !== config.strategyId) checks.push(`strategy_${solve?.strategyId ?? 'missing'}`)
  if (solve?.maxDepth !== config.maxDepth) checks.push(`max_depth_${solve?.maxDepth ?? 'missing'}`)
  if (solve?.maxNodes !== maxNodes) checks.push(`max_nodes_${solve?.maxNodes ?? 'missing'}`)
  if (normalizedVisualState(solve?.visualState) !== expectedVisualState) checks.push('visual_state_mismatch')
  if (length === undefined) checks.push('length_missing')
  if (length !== undefined && length > config.maxDepth) checks.push(`length_${length}`)
  if (length !== undefined && moves.length !== length) checks.push(`moves_${moves.length}_length_${length}`)

  return checks.join(';') || payload.message || solve?.status || 'unknown_failure'
}

function scanSessionFaces(visualState: string, stickersPerFace: 4 | 9) {
  return faceStateOrder.map((face, faceIndex) => {
    const start = faceIndex * stickersPerFace
    const stickers = visualState.slice(start, start + stickersPerFace)

    return {
      clientRotation: 0,
      reviewedStickers: [...stickers].map((symbol, index) => ({
        confidence: 1,
        index,
        source: stickersPerFace === 9 && index === 4 ? 'center' : 'manual',
        symbol,
      })),
      symbol: face,
    }
  })
}

function loadFixtureFile(fixturePath: string): HeavyFixtureFile {
  mkdirSync(reportDirectory, { recursive: true })

  if (process.env.HEAVY_SCAN_FIXTURES === undefined) {
    execFileSync(
      'cargo',
      [
        'run',
        '--quiet',
        '-p',
        'cube-engine',
        '--bin',
        'generate_scan_e2e_fixtures',
        '--',
        '--cube3-count',
        String(envNumber('HEAVY_SCAN_CUBE3_COUNT', 500)),
        '--cube2-count',
        String(envNumber('HEAVY_SCAN_CUBE2_COUNT', 500)),
        '--output',
        fixturePath,
      ],
      { cwd: process.cwd(), stdio: 'inherit' },
    )
  } else if (!existsSync(fixturePath)) {
    throw new Error(`HEAVY_SCAN_FIXTURES does not exist: ${fixturePath}`)
  }

  return JSON.parse(readFileSync(fixturePath, 'utf8')) as HeavyFixtureFile
}

function fixtureFilePath(): string {
  return process.env.HEAVY_SCAN_FIXTURES ?? path.join(reportDirectory, 'fixtures.json')
}

function writeReports(fixturePath: string, summary: unknown, rows: readonly ReportRow[]): string {
  mkdirSync(reportDirectory, { recursive: true })

  const reportPath = path.join(reportDirectory, 'report.json')
  const failures = rows.filter((row) => !row.validSolve)
  const slow = rows.filter((row) => row.validSolve && !row.withinTarget)

  writeFileSync(reportPath, `${JSON.stringify({ fixturePath, rows, summary }, null, 2)}\n`)
  writeFileSync(path.join(reportDirectory, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`)
  writeFileSync(path.join(reportDirectory, 'failures.json'), `${JSON.stringify(failures, null, 2)}\n`)
  writeFileSync(path.join(reportDirectory, 'slow.json'), `${JSON.stringify(slow, null, 2)}\n`)
  writeFileSync(path.join(reportDirectory, 'report.csv'), csvReport(rows))

  return reportPath
}

function buildSummary(fixtureFile: HeavyFixtureFile, rows: readonly ReportRow[]) {
  return {
    cube2Count: fixtureFile.cube2Count,
    cube3Count: fixtureFile.cube3Count,
    generatedAt: new Date().toISOString(),
    generatedBy: fixtureFile.generatedBy,
    maxNodes,
    overall: summarizeRows(rows),
    byPuzzle: {
      'cube-3x3x3': summarizeRows(rows.filter((row) => row.puzzle === 'cube-3x3x3')),
      'cube-2x2x2': summarizeRows(rows.filter((row) => row.puzzle === 'cube-2x2x2')),
    },
  }
}

function summarizeRows(rows: readonly ReportRow[]) {
  return {
    count: rows.length,
    invalid: rows.filter((row) => !row.validSolve).length,
    lengthHistogram: countBy(rows.map((row) => row.length ?? 'missing')),
    responseMs: numericStats(rows.map((row) => row.elapsedMs)),
    slow: rows.filter((row) => row.validSolve && !row.withinTarget).length,
    solveEngineMs: numericStats(rows.map((row) => row.engineElapsedMs)),
    solveNodes: numericStats(rows.map((row) => row.exploredNodes)),
    statusCounts: countBy(rows.map((row) => row.solveStatus ?? row.status ?? 'missing')),
    valid: rows.filter((row) => row.validSolve).length,
  }
}

function numericStats(values: readonly (number | undefined)[]) {
  const numbers = values.filter((value): value is number => typeof value === 'number').sort((a, b) => a - b)

  if (numbers.length === 0) {
    return { avg: undefined, count: 0, max: undefined, min: undefined, p50: undefined, p95: undefined }
  }

  return {
    avg: Math.round(numbers.reduce((sum, value) => sum + value, 0) / numbers.length),
    count: numbers.length,
    max: numbers[numbers.length - 1],
    min: numbers[0],
    p50: percentile(numbers, 0.5),
    p95: percentile(numbers, 0.95),
  }
}

function percentile(sortedNumbers: readonly number[], percentileRank: number): number {
  return sortedNumbers[Math.min(sortedNumbers.length - 1, Math.floor((sortedNumbers.length - 1) * percentileRank))]
}

function countBy(values: readonly (string | number)[]): Record<string, number> {
  return values.reduce<Record<string, number>>((counts, value) => {
    const key = String(value)
    counts[key] = (counts[key] ?? 0) + 1

    return counts
  }, {})
}

function csvReport(rows: readonly ReportRow[]): string {
  const headers: readonly (keyof ReportRow)[] = [
    'fixtureId',
    'puzzle',
    'sequence',
    'preserved',
    'validSolve',
    'withinTarget',
    'elapsedMs',
    'engineElapsedMs',
    'exploredNodes',
    'length',
    'solveStatus',
    'status',
    'httpStatus',
    'strategyId',
    'replayVerified',
    'visualStateMatches',
    'error',
    'scramble',
    'moves',
  ]
  const lines = [headers.join(',')]

  for (const row of rows) {
    lines.push(headers.map((header) => csvEscape(row[header])).join(','))
  }

  return `${lines.join('\n')}\n`
}

function csvEscape(value: unknown): string {
  if (value === undefined || value === null) {
    return ''
  }

  const text = String(value)
  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`
  }

  return text
}

function puzzleConfig(puzzle: PuzzleSlug) {
  if (puzzle === 'cube-2x2x2') {
    return {
      gridSize: 2,
      maxDepth: 11,
      path: '/puzzles/cube-2x2x2/scan/solve-session',
      stickersPerFace: 4 as const,
      strategyId: 'cube2-pdb-ida-star',
      targetMs: cube2TargetMs,
    }
  }

  return {
    gridSize: 3,
    maxDepth: 20,
    path: '/puzzles/cube-3x3x3/scan/solve-session',
    stickersPerFace: 9 as const,
    strategyId: 'generated-two-phase',
    targetMs: cube3TargetMs,
  }
}

function normalizedVisualState(visualState: RawVisualState | undefined): string {
  if (typeof visualState === 'string') {
    return visualState
  }

  return visualState?.value ?? ''
}

function apiUrl(): string {
  return process.env.HEAVY_SCAN_API_URL ?? process.env.VITE_RUBIKS_API_URL ?? 'http://127.0.0.1:8787'
}

function envNumber(name: string, fallback: number): number {
  const value = process.env[name]
  if (value === undefined || value.trim() === '') {
    return fallback
  }

  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative number`)
  }

  return parsed
}

function failurePreview(rows: readonly ReportRow[]): string {
  return rows
    .slice(0, 10)
    .map((row) => `${row.fixtureId}:${row.solveStatus ?? row.status ?? 'missing'}:${row.error ?? 'no detail'}`)
    .join(' | ')
}
