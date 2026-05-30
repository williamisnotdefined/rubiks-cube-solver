import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SolvePage } from '../SolvePage'

const scramblePlaceholder =
  "R2 D2 F2 D L2 F2 U' R2 D B2 L2 U' B' R' B' R2 B2 L B U'"

const apiMocks = vi.hoisted(() => ({
  isPending: false,
  mutateAsync: vi.fn(),
  reset: vi.fn(),
  scanError: null as Error | null,
  scanIsPending: false,
  scanMutateAsync: vi.fn(),
  scanReset: vi.fn(),
  scanSolveData: undefined as unknown,
  solveData: undefined as unknown,
  solveError: null as Error | null,
}))

vi.mock('@api/solver', () => ({
  useGetHealth: () => ({ data: { generatedTwoPhaseReady: true, ok: true } }),
  useGetStrategies: () => ({
    data: [
      {
        id: 'generated-two-phase-quality',
        label: 'Generated two-phase quality solver',
        solverMode: 'generated_two_phase_quality',
        statusText: 'ready',
      },
    ],
    isSuccess: true,
  }),
  useSolveNotation: () => ({
    data: apiMocks.solveData,
    error: apiMocks.solveError,
    isPending: apiMocks.isPending,
    mutateAsync: apiMocks.mutateAsync,
    reset: apiMocks.reset,
  }),
  useSolveScan: () => ({
    data: apiMocks.scanSolveData,
    error: apiMocks.scanError,
    isPending: apiMocks.scanIsPending,
    mutateAsync: apiMocks.scanMutateAsync,
    reset: apiMocks.scanReset,
  }),
}))

vi.mock('../CubeStage', async () => {
  const { useEffect } = await vi.importActual<typeof import('react')>('react')

  return {
    CubeStage: ({ onReady }: { onReady: () => void }) => {
      useEffect(() => {
        onReady()
      }, [onReady])

      return <section aria-label="Cube visualization" data-testid="cube-stage" />
    },
  }
})

vi.mock('../hooks/useCubeVisualization', () => ({
  useCubeVisualization: vi.fn(),
}))

describe('SolvePage', () => {
  beforeEach(() => {
    apiMocks.isPending = false
    apiMocks.mutateAsync.mockClear()
    apiMocks.mutateAsync.mockResolvedValue(undefined)
    apiMocks.reset.mockClear()
    apiMocks.scanError = null
    apiMocks.scanIsPending = false
    apiMocks.scanMutateAsync.mockClear()
    apiMocks.scanMutateAsync.mockResolvedValue(undefined)
    apiMocks.scanReset.mockClear()
    apiMocks.scanSolveData = undefined
    apiMocks.solveData = undefined
    apiMocks.solveError = null
  })

  it('starts solved with an empty scramble and the sample scramble as placeholder', () => {
    render(<SolvePage />)

    const input = screen.getByLabelText('Scramble')

    expect(input).toHaveValue('')
    expect(input).toHaveAttribute('placeholder', scramblePlaceholder)
    expect(screen.getByRole('button', { name: 'Solve' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Scan cube with camera' })).toBeInTheDocument()
  })

  it('keeps the scramble field on its own row and limits plus submit on the next row', () => {
    render(<SolvePage />)

    const scrambleRow = screen.getByTestId('scramble-row')
    const limitsRow = screen.getByTestId('limits-row')

    expect(within(scrambleRow).getByLabelText('Scramble')).toBeInTheDocument()
    expect(within(scrambleRow).getByRole('button', { name: 'Scan cube with camera' })).toBeInTheDocument()
    expect(within(limitsRow).getByLabelText('Max moves')).toBeInTheDocument()
    expect(within(limitsRow).getByLabelText('Max nodes (M)')).toBeInTheDocument()
    expect(within(limitsRow).getByRole('button', { name: 'Solve' })).toBeInTheDocument()
  })

  it('opens the scan modal from the camera button', async () => {
    const user = userEvent.setup()
    render(<SolvePage />)

    await user.click(screen.getByRole('button', { name: 'Scan cube with camera' }))

    expect(screen.getByRole('dialog', { name: 'Scan cube' })).toBeInTheDocument()
    expect(screen.getByText('Face 1 of 6')).toBeInTheDocument()
  })

  it('submits trimmed notation with selected solver limits', async () => {
    const user = userEvent.setup()
    render(<SolvePage />)

    await user.type(screen.getByLabelText('Scramble'), '  R U  ')
    await user.clear(screen.getByLabelText('Max moves'))
    await user.type(screen.getByLabelText('Max moves'), '2')
    await user.selectOptions(screen.getByLabelText('Max nodes (M)'), '15')
    await user.click(screen.getByRole('button', { name: 'Solve' }))

    await waitFor(() => {
      expect(apiMocks.mutateAsync).toHaveBeenCalledWith({
        notation: 'R U',
        limits: {
          maxDepth: 2,
          maxNodes: 15_000_000,
          strategyId: 'generated-two-phase-quality',
        },
      })
    })
  })

  it('does not submit when local limits are invalid', async () => {
    const user = userEvent.setup()
    render(<SolvePage />)

    await user.type(screen.getByLabelText('Scramble'), 'R')
    await user.clear(screen.getByLabelText('Max moves'))
    await user.type(screen.getByLabelText('Max moves'), '46')
    fireEvent.submit(screen.getByTestId('solve-form'))

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
      elapsedMs: 12,
      exploredNodes: 42,
      generatedTableStatus: 'available',
      length: 2,
      maxDepth: 2,
      maxNodes: 10_000_000,
      moves: ["U'", "R'"],
      ok: true,
      replayVerified: true,
      solverMode: 'generated_two_phase_quality',
      status: 'success',
      strategyId: 'generated-two-phase-quality',
      strategyLabel: 'Generated two-phase quality solver',
    }

    render(<SolvePage />)
    await user.click(screen.getByRole('button', { name: 'Next move' }))

    expect(screen.getByLabelText('Solution step')).toHaveValue('1')
  })
})
