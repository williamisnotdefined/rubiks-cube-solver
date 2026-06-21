import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PuzzleVisualizationKind, SolveResult } from '@api/solver/types'
import { SolvePage } from '../SolvePage'
import { useCubeVisualization } from '../hooks/useCubeVisualization'
import { usePageActivity } from '../hooks/usePageActivity'
import { useSolveSettingsStore } from '../solveSettingsStore'

const scramblePlaceholder =
  "R2 D2 F2 D L2 F2 U' R2 D B2 L2 U' B' R' B' R2 B2 L B U'"

const apiMocks = vi.hoisted(() => ({
  isPending: false,
  mutateAsync: vi.fn(),
  reset: vi.fn(),
  scanSessionSolveResult: undefined as SolveResult | undefined,
  solveData: undefined as unknown,
  solveError: null as Error | null,
}))

type SolveFailure = Exclude<SolveResult, { ok: true }>

const limitFailure: SolveFailure = {
  errorKind: undefined,
  exploredNodes: 12_345,
  generatedTableStatus: 'available',
  maxDepth: 20,
  maxNodes: 10_000_000,
  message: 'no solution found within limits',
  ok: false,
  solverMode: 'generated_two_phase_quality',
  status: 'not_found_within_limits',
  strategyId: 'generated-two-phase-quality',
  strategyLabel: 'Generated two-phase quality solver',
}

vi.mock('@api/solver', () => ({
  useGetHealth: () => ({ data: { generatedTwoPhaseReady: true, ok: true } }),
  useGetPuzzles: () => ({
    data: [
      {
        defaultMetric: 'htm',
        defaultStrategyId: 'generated-two-phase',
        family: 'cube',
        id: 'cube/3x3x3',
        label: '3x3x3 Cube',
        scannerSupported: true,
        slug: 'cube-3x3x3',
        status: 'stable',
        strategyIds: ['generated-two-phase', 'generated-two-phase-quality'],
        supportedInputs: ['notation'],
        supportedVisualizations: ['cube3-facelets-v1'],
      },
      {
        defaultMetric: 'htm',
        defaultStrategyId: 'cube2-pdb-ida-star',
        family: 'cube',
        id: 'cube/2x2x2',
        label: '2x2x2 Cube',
        scannerSupported: true,
        slug: 'cube-2x2x2',
        status: 'experimental',
        strategyIds: ['cube2-bounded-ida-star', 'cube2-pdb-ida-star'],
        supportedInputs: ['notation', 'scan2x2'],
        supportedVisualizations: ['cube2-facelets-v1'],
      },
      {
        defaultMetric: 'htm',
        family: 'pyraminx',
        id: 'pyraminx',
        label: 'Pyraminx',
        scannerSupported: false,
        slug: 'pyraminx',
        status: 'planned',
        strategyIds: [],
        supportedInputs: [],
        supportedVisualizations: [],
      },
    ],
    isSuccess: true,
  }),
  useGetPuzzleStrategies: ({ puzzleSlug }: { puzzleSlug: string }) => ({
    data:
      puzzleSlug === 'cube-2x2x2'
        ? [
            {
              defaultMetric: 'htm',
              id: 'cube2-bounded-ida-star',
              label: '2x2 bounded IDA*',
              puzzleId: 'cube/2x2x2',
              solverMode: 'cube2_bounded_ida_star',
              statusText: 'experimental',
              supportedInputs: ['notation'],
              supportedMetrics: ['htm'],
            },
            {
              defaultMetric: 'htm',
              id: 'cube2-pdb-ida-star',
              label: '2x2 PDB IDA*',
              puzzleId: 'cube/2x2x2',
              solverMode: 'cube2_pdb_ida_star',
              statusText: 'experimental',
              supportedInputs: ['notation'],
              supportedMetrics: ['htm'],
            },
          ]
        : [
            {
              defaultMetric: 'htm',
              id: 'generated-two-phase',
              label: 'Generated two-phase solver',
              puzzleId: 'cube/3x3x3',
              solverMode: 'generated_two_phase',
              statusText: 'ready',
              supportedInputs: ['notation'],
              supportedMetrics: ['htm'],
            },
            {
              defaultMetric: 'htm',
              id: 'generated-two-phase-quality',
              label: 'Generated two-phase quality solver',
              puzzleId: 'cube/3x3x3',
              solverMode: 'generated_two_phase_quality',
              statusText: 'ready',
              supportedInputs: ['notation'],
              supportedMetrics: ['htm'],
            },
          ],
    isSuccess: true,
  }),
  useSolvePuzzleNotation: () => ({
    data: apiMocks.solveData,
    error: apiMocks.solveError,
    isPending: apiMocks.isPending,
    mutateAsync: apiMocks.mutateAsync,
    reset: apiMocks.reset,
  }),
}))

vi.mock('../ScanCubeModal', () => ({
  ScanCubeModal: ({
    apiReady,
    onClose,
    onSessionSolvingChange,
    onSessionSolveResult,
    solving,
  }: {
    apiReady: boolean
    onClose: () => void
    onSessionSolvingChange: (solving: boolean) => void
    onSessionSolveResult: (solve: SolveResult) => void
    solving: boolean
  }) => (
    <section aria-label="Scan cube" role="dialog">
      <p>Face 1 of 6</p>
      <button
        type="button"
        disabled={!apiReady || solving}
        onClick={() => {
          onSessionSolveResult(apiMocks.scanSessionSolveResult as SolveResult)
          onClose()
        }}
      >
        Solve scanned cube
      </button>
      <button type="button" onClick={() => onSessionSolvingChange(true)}>
        Start scan solve
      </button>
    </section>
  ),
}))

vi.mock('../NoSolutionLimitsModal', async () => {
  const {
    maxMovesLimitForPuzzle,
    maxNodesMillionOptions,
    nodesPerMillion,
  } = await vi.importActual<typeof import('../constants')>('../constants')
  const { useSolveSettingsStore } = await vi.importActual<typeof import('../solveSettingsStore')>('../solveSettingsStore')

  return {
    NoSolutionLimitsModal: ({
      puzzleSlug,
      result,
      solving,
      onRetry,
    }: {
      puzzleSlug: string
      result: { exploredNodes?: number }
      solving: boolean
      onRetry: (limits: { maxDepth: number; maxNodes: number }) => void | Promise<void>
    }) => {
      const maxMovesInput = useSolveSettingsStore((state) => state.maxMovesInput)
      const maxNodesMillionInput = useSolveSettingsStore((state) => state.maxNodesMillionInput)
      const setMaxMovesInput = useSolveSettingsStore((state) => state.setMaxMovesInput)
      const setMaxNodesMillionInput = useSolveSettingsStore((state) => state.setMaxNodesMillionInput)

      return (
        <section aria-label="Try different limits" role="dialog">
          <p>Previous attempt</p>
          <p>{(result.exploredNodes ?? 0).toLocaleString('en-US')} nodes explored</p>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              void onRetry({
                maxDepth: Number(maxMovesInput.trim()),
                maxNodes: Number(maxNodesMillionInput.trim()) * nodesPerMillion,
              })
            }}
          >
            <label>
              Max moves
              <input
                max={maxMovesLimitForPuzzle(puzzleSlug)}
                value={maxMovesInput}
                onChange={(event) => setMaxMovesInput(event.target.value)}
              />
            </label>
            <label>
              Max nodes (M)
              <select
                aria-label="Max nodes (M)"
                value={maxNodesMillionInput}
                onChange={(event) => setMaxNodesMillionInput(event.target.value)}
              >
                {maxNodesMillionOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" disabled={solving}>
              Try with these limits
            </button>
          </form>
        </section>
      )
    },
  }
})

vi.mock('../CubeStage', async () => {
  const { useEffect } = await vi.importActual<typeof import('react')>('react')

  return {
    CubeStage: ({
      active,
      cubeType,
      onReady,
    }: {
      active: boolean
      cubeType: 'Two' | 'Three'
      onReady: () => void
    }) => {
      useEffect(() => {
        if (active) {
          onReady()
        }
      }, [active, onReady])

      return (
        <section
          aria-label="Cube visualization"
          data-cube-type={cubeType}
          data-testid="cube-stage"
        >
          {active ? <div data-testid="cube-stage-enabled" /> : null}
        </section>
      )
    },
  }
})

vi.mock('../hooks/useCubeVisualization', () => ({
  useCubeVisualization: vi.fn(),
}))

vi.mock('../hooks/usePageActivity', () => ({
  usePageActivity: vi.fn(),
}))

vi.mock('@components/Loader3x3', () => ({
  Loader3x3: ({
    decorative,
    label = 'Loading',
  }: {
    decorative?: boolean
    label?: string
  }) => (decorative ? <span data-testid="loader-3x3" /> : <span aria-label={label} role="status" />),
}))

const useCubeVisualizationMock = vi.mocked(useCubeVisualization)
const usePageActivityMock = vi.mocked(usePageActivity)

describe('SolvePage', () => {
  beforeEach(() => {
    apiMocks.isPending = false
    apiMocks.mutateAsync.mockClear()
    apiMocks.mutateAsync.mockResolvedValue(undefined)
    apiMocks.reset.mockClear()
    apiMocks.scanSessionSolveResult = scanSuccessResult()
    apiMocks.solveData = undefined
    apiMocks.solveError = null
    usePageActivityMock.mockReturnValue(true)
    useSolveSettingsStore.getState().resetSolveSettings()
    useCubeVisualizationMock.mockClear()
  })

  it('starts solved with an empty scramble and the sample scramble as placeholder', () => {
    render(<SolvePage />)

    const input = screen.getByLabelText('Scramble')

    expect(input).toHaveValue('')
    expect(input).toHaveAttribute('placeholder', scramblePlaceholder)
    expect(screen.getByTestId('cube-stage-enabled')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Solve' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Scan cube with camera' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Puzzle' })).toHaveTextContent('3x3x3 Cube')
    expect(screen.getByTestId('cube-stage')).toHaveAttribute('data-cube-type', 'Three')
    expect(screen.queryByLabelText('Strategy')).not.toBeInTheDocument()
    expect(useCubeVisualizationMock).toHaveBeenLastCalledWith(
      expect.anything(),
      '',
      expect.any(Number),
      undefined,
      undefined,
      'Three',
      true,
    )
  })

  it('keeps the cube visualization unmounted and unsynced while the page is inactive', () => {
    usePageActivityMock.mockReturnValue(false)

    render(<SolvePage />)

    expect(screen.queryByTestId('cube-stage-enabled')).not.toBeInTheDocument()
    expect(useCubeVisualizationMock).toHaveBeenLastCalledWith(
      expect.anything(),
      '',
      expect.any(Number),
      undefined,
      undefined,
      'Three',
      false,
    )
  })

  it('keeps the scramble field on its own row and limits plus submit on the next row', () => {
    render(<SolvePage />)

    const scrambleRow = screen.getByTestId('scramble-row')
    const limitsRow = screen.getByTestId('limits-row')

    expect(within(scrambleRow).getByLabelText('Scramble')).toBeInTheDocument()
    expect(within(scrambleRow).getByRole('button', { name: 'Scan cube with camera' })).toBeInTheDocument()
    expect(within(limitsRow).getByLabelText('Max moves')).toBeInTheDocument()
    expect(within(limitsRow).getByRole('combobox', { name: 'Max nodes (M)' })).toBeInTheDocument()
    expect(within(limitsRow).getByRole('button', { name: 'Solve' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Puzzle' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Strategy')).not.toBeInTheDocument()
  })

  it('disables puzzle options that are not implemented yet', async () => {
    const user = userEvent.setup()
    render(<SolvePage />)

    await user.click(screen.getByRole('combobox', { name: 'Puzzle' }))

    expect(screen.getByRole('option', { name: '3x3x3 Cube' })).not.toHaveAttribute('aria-disabled')
    expect(screen.getByRole('option', { name: '2x2x2 Cube' })).not.toHaveAttribute('aria-disabled')
    expect(screen.getByRole('option', { name: 'Pyraminx' })).toHaveAttribute('aria-disabled', 'true')
  })

  it('opens the scan modal from the camera button', async () => {
    const user = userEvent.setup()
    render(<SolvePage />)

    await user.click(screen.getByRole('button', { name: 'Scan cube with camera' }))

    expect(screen.getByRole('dialog', { name: 'Scan cube' })).toBeInTheDocument()
    expect(screen.getByText('Face 1 of 6')).toBeInTheDocument()
  })

  it('shows the page cube loader while scan solve is pending', async () => {
    const user = userEvent.setup()
    render(<SolvePage />)

    await user.click(screen.getByRole('button', { name: 'Scan cube with camera' }))
    await user.click(screen.getByRole('button', { name: 'Start scan solve' }))

    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Solve scanned cube' })).toBeDisabled()
  })

  it('submits trimmed notation with selected solver limits', async () => {
    const user = userEvent.setup()
    render(<SolvePage />)

    await user.type(screen.getByLabelText('Scramble'), '  R U  ')
    await user.clear(screen.getByLabelText('Max moves'))
    await user.type(screen.getByLabelText('Max moves'), '2')
    await chooseSelectOption(user, 'Max nodes (M)', '15')
    await user.click(screen.getByRole('button', { name: 'Solve' }))

    await waitFor(() => {
      expect(apiMocks.mutateAsync).toHaveBeenCalledWith({
        notation: 'R U',
        puzzleSlug: 'cube-3x3x3',
        limits: {
          maxDepth: 2,
          maxNodes: 15_000_000,
          strategyId: 'generated-two-phase',
        },
      })
    })
  })

  it('opens a retry modal for notation solve limit failures', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<SolvePage />)

    await user.type(screen.getByLabelText('Scramble'), 'R U')
    apiMocks.solveData = limitFailure
    rerender(<SolvePage />)

    const dialog = await screen.findByRole('dialog', { name: 'Try different limits' })
    expect(within(dialog).getByText('Previous attempt')).toBeInTheDocument()
    expect(within(dialog).getByText(/12,345 nodes/)).toBeInTheDocument()
  })

  it('retries notation solve with updated shared limits from the modal', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<SolvePage />)

    await user.type(screen.getByLabelText('Scramble'), 'R U')
    apiMocks.solveData = limitFailure
    rerender(<SolvePage />)
    apiMocks.mutateAsync.mockClear()

    const dialog = await screen.findByRole('dialog', { name: 'Try different limits' })
    await user.clear(within(dialog).getByLabelText('Max moves'))
    await user.type(within(dialog).getByLabelText('Max moves'), '18')
    await user.selectOptions(within(dialog).getByLabelText('Max nodes (M)'), '25')
    await user.click(within(dialog).getByRole('button', { name: 'Try with these limits' }))

    await waitFor(() => {
      expect(apiMocks.mutateAsync).toHaveBeenCalledWith({
        notation: 'R U',
        puzzleSlug: 'cube-3x3x3',
        limits: {
          maxDepth: 18,
          maxNodes: 25_000_000,
          strategyId: 'generated-two-phase',
        },
      })
    })
    expect(useSolveSettingsStore.getState()).toMatchObject({
      maxMovesInput: '18',
      maxNodesMillionInput: '25',
    })
  })

  it('opens the retry modal for 2x2 node limit failures with the 2x2 move cap', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<SolvePage />)

    await chooseSelectOption(user, 'Puzzle', '2x2x2 Cube')
    await user.type(screen.getByLabelText('Scramble'), 'R U F')
    apiMocks.solveData = {
      ...limitFailure,
      errorKind: 'node_limit_exceeded',
      generatedTableStatus: 'not_applicable',
      maxDepth: 11,
      maxNodes: 1,
      solverMode: 'cube2_pdb_ida_star',
      status: 'node_limit_exceeded',
      strategyId: 'cube2-pdb-ida-star',
      strategyLabel: '2x2 PDB IDA*',
    }
    rerender(<SolvePage />)

    const dialog = await screen.findByRole('dialog', { name: 'Try different limits' })
    expect(within(dialog).getByLabelText('Max moves')).toHaveAttribute('max', '11')
  })

  it('selects 2x2 puzzle settings and keeps scan available', async () => {
    const user = userEvent.setup()
    render(<SolvePage />)

    await chooseSelectOption(user, 'Puzzle', '2x2x2 Cube')

    expect(screen.getByLabelText('Scramble')).toHaveAttribute('placeholder', 'R U F')
    expect(screen.getByLabelText('Max moves')).toHaveValue(11)
    expect(screen.getByLabelText('Max moves')).toHaveAttribute('max', '11')
    expect(screen.getByRole('button', { name: 'Scan cube with camera' })).toBeEnabled()
    expect(screen.getByTestId('cube-stage')).toHaveAttribute('data-cube-type', 'Two')
    expect(screen.queryByText('Visualization is not available for this puzzle yet.')).not.toBeInTheDocument()
    expect(useCubeVisualizationMock).toHaveBeenLastCalledWith(
      expect.anything(),
      '',
      expect.any(Number),
      undefined,
      undefined,
      'Two',
      true,
    )
  })

  it('submits 2x2 notation with the puzzle-aware strategy', async () => {
    const user = userEvent.setup()
    render(<SolvePage />)

    await chooseSelectOption(user, 'Puzzle', '2x2x2 Cube')
    await user.type(screen.getByLabelText('Scramble'), 'R U F')
    await user.click(screen.getByRole('button', { name: 'Solve' }))

    await waitFor(() => {
      expect(apiMocks.mutateAsync).toHaveBeenCalledWith({
        notation: 'R U F',
        puzzleSlug: 'cube-2x2x2',
        limits: {
          maxDepth: 11,
          maxNodes: 10_000_000,
          strategyId: 'cube2-pdb-ida-star',
        },
      })
    })
  })

  it('uses a 23 move cap for 3x3 local validation', () => {
    render(<SolvePage />)

    expect(screen.getByLabelText('Max moves')).toHaveAttribute('max', '23')
  })

  it('rejects 2x2 max moves above 11 before sending requests', async () => {
    const user = userEvent.setup()
    render(<SolvePage />)

    await chooseSelectOption(user, 'Puzzle', '2x2x2 Cube')
    await user.type(screen.getByLabelText('Scramble'), 'R')
    await user.clear(screen.getByLabelText('Max moves'))
    await user.type(screen.getByLabelText('Max moves'), '12')
    await user.click(screen.getByRole('button', { name: 'Solve' }))

    expect(apiMocks.mutateAsync).not.toHaveBeenCalled()
  })

  it('does not submit when local limits are invalid', async () => {
    const user = userEvent.setup()
    render(<SolvePage />)

    await user.type(screen.getByLabelText('Scramble'), 'R')
    await user.clear(screen.getByLabelText('Max moves'))
    await user.type(screen.getByLabelText('Max moves'), '46')
    await user.click(screen.getByRole('button', { name: 'Solve' }))

    expect(apiMocks.mutateAsync).not.toHaveBeenCalled()
  })

  it('renders the loading submit state', () => {
    apiMocks.isPending = true

    render(<SolvePage />)

    expect(screen.getByRole('button', { name: 'Loading' })).toBeDisabled()
  })

  it('drives playback state from a successful solve result', async () => {
    const user = userEvent.setup()
    apiMocks.solveData = {
      exploredNodes: 42,
      generatedTableStatus: 'available',
      length: 2,
      maxDepth: 2,
      maxNodes: 10_000_000,
      moves: ["U'", "R'"],
      ok: true,
      replayVerified: true,
      requestElapsedMs: 12,
      solverMode: 'generated_two_phase_quality',
      status: 'success',
      strategyId: 'generated-two-phase-quality',
      strategyLabel: 'Generated two-phase quality solver',
    }

    render(<SolvePage />)
    await user.click(screen.getByRole('button', { name: 'Next move' }))

    expect(screen.getByLabelText('Solution step')).toHaveValue('1')
  })

  it('drives playback and cube state from a successful scan solve result', async () => {
    const user = userEvent.setup()
    const visualState = 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB'
    apiMocks.scanSessionSolveResult = scanSuccessResult(visualState)

    render(<SolvePage />)
    await user.click(screen.getByRole('button', { name: 'Scan cube with camera' }))
    await user.click(screen.getByRole('button', { name: 'Solve scanned cube' }))

    expect(screen.getByLabelText('Solution step')).toHaveValue('0')

    await user.click(screen.getByRole('button', { name: 'Next move' }))

    expect(screen.getByLabelText('Solution step')).toHaveValue('1')
    expect(useCubeVisualizationMock).toHaveBeenLastCalledWith(
      expect.anything(),
      'R',
      expect.any(Number),
      visualState,
      'cube3-facelets-v1',
      'Three',
      true,
    )
  })

  it('reconstructs the 2x2 scan state from the inverse solution for playback', async () => {
    const user = userEvent.setup()
    const visualState = 'UUUURRRRFFFFDDDDLLLLBBBB'
    apiMocks.scanSessionSolveResult = scanSuccessResult(visualState, 'cube2-facelets-v1')

    render(<SolvePage />)
    await chooseSelectOption(user, 'Puzzle', '2x2x2 Cube')
    await user.click(screen.getByRole('button', { name: 'Scan cube with camera' }))
    await user.click(screen.getByRole('button', { name: 'Solve scanned cube' }))

    expect(useCubeVisualizationMock).toHaveBeenLastCalledWith(
      expect.anything(),
      "U' R'",
      expect.any(Number),
      undefined,
      undefined,
      'Two',
      true,
    )

    await user.click(screen.getByRole('button', { name: 'Next move' }))

    expect(useCubeVisualizationMock).toHaveBeenLastCalledWith(
      expect.anything(),
      "U' R' R",
      expect.any(Number),
      undefined,
      undefined,
      'Two',
      true,
    )
  })

  it('renders terminal scan solve failures on the page', async () => {
    const user = userEvent.setup()
    apiMocks.scanSessionSolveResult = limitFailure
    render(<SolvePage />)

    await user.click(screen.getByRole('button', { name: 'Scan cube with camera' }))
    await user.click(screen.getByRole('button', { name: 'Solve scanned cube' }))

    expect(screen.queryByRole('dialog', { name: 'Scan cube' })).not.toBeInTheDocument()
    expect(screen.getByText('No solution within the configured limits')).toBeInTheDocument()
  })
})

type TestUser = ReturnType<typeof userEvent.setup>

async function chooseSelectOption(user: TestUser, label: string, optionName: string) {
  await user.click(screen.getByRole('combobox', { name: label }))
  await screen.findByRole('listbox')
  await user.click(screen.getByRole('option', { name: optionName }))
  await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument())
}

function scanSuccessResult(
  visualState?: string,
  visualStateKind: PuzzleVisualizationKind = 'cube3-facelets-v1',
): SolveResult {
  return {
    exploredNodes: 42,
    generatedTableStatus: 'available',
    length: 2,
    maxDepth: 2,
    maxNodes: 10_000_000,
    moves: ['R', 'U'],
    ok: true,
    replayVerified: true,
    requestElapsedMs: 12,
    solverMode: 'generated_two_phase_quality',
    status: 'success',
    strategyId: 'generated-two-phase-quality',
    strategyLabel: 'Generated two-phase quality solver',
    visualState,
    visualStateKind: visualState === undefined ? undefined : visualStateKind,
  }
}
