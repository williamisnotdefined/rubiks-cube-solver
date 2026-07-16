import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SolveSuccessResult } from '@api/solver/types'
import { useCubeVisualization } from '../../../visualization/hooks/useCubeVisualization'
import { useSolveVisualizationController } from '../useSolveVisualizationController'

vi.mock('../../../visualization/hooks/useCubeVisualization', () => ({
  useCubeVisualization: vi.fn(),
}))

const useCubeVisualizationMock = vi.mocked(useCubeVisualization)

describe('useSolveVisualizationController', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('omits notation, visual state, and state kind when visualization is unsupported', () => {
    renderController({
      notation: 'R',
      successResult: successResult({
        visualState: 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB',
        visualStateKind: 'cube3-facelets-v1',
      }),
      visibleSolutionMoves: ['U'],
      visualizationSupported: false,
    })

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

  it('omits empty notation while retaining visible solution moves', () => {
    renderController({ notation: '   ', visibleSolutionMoves: ['R'] })

    expect(useCubeVisualizationMock).toHaveBeenLastCalledWith(
      expect.anything(),
      'R',
      expect.any(Number),
      undefined,
      undefined,
      'Three',
      false,
    )
  })

  it('automatically requests an idle visualization after three seconds', () => {
    vi.useFakeTimers()
    const { result } = renderController()

    expect(result.current.loadRequested).toBe(false)

    act(() => vi.advanceTimersByTime(2999))

    expect(result.current.loadRequested).toBe(false)

    act(() => vi.advanceTimersByTime(1))

    expect(result.current.loadRequested).toBe(true)
  })

  it('requests the visualization immediately after solver interaction', () => {
    const { result } = renderController({ notation: 'R U' })

    expect(result.current.loadRequested).toBe(true)
  })

  it('inverts prime and half-turn moves when reconstructing a 2x2 scan state', () => {
    renderController({
      activeSolveSource: 'scan',
      successResult: successResult({ moves: ["R'", 'U2'] }),
      visualizationCubeType: 'Two',
    })

    expect(useCubeVisualizationMock).toHaveBeenLastCalledWith(
      expect.anything(),
      'U2 R',
      expect.any(Number),
      undefined,
      undefined,
      'Two',
      true,
    )
  })
})

type ControllerInput = Parameters<typeof useSolveVisualizationController>[0]

function renderController(overrides: Partial<ControllerInput> = {}) {
  const input: ControllerInput = {
    activeSolveSource: 'notation',
    notation: '',
    visibleSolutionMoves: [],
    visualizationCubeType: 'Three',
    visualizationSupported: true,
    ...overrides,
  }

  return renderHook(() => useSolveVisualizationController(input))
}

function successResult(overrides: Partial<SolveSuccessResult> = {}): SolveSuccessResult {
  return {
    exploredNodes: 42,
    generatedTableStatus: 'available',
    length: 2,
    maxDepth: 20,
    maxNodes: 10_000_000,
    moves: ['R', 'U'],
    ok: true,
    replayVerified: true,
    requestElapsedMs: 12,
    solverMode: 'generated_two_phase_quality',
    status: 'success',
    strategyId: 'generated-two-phase-quality',
    strategyLabel: 'Generated two-phase quality solver',
    ...overrides,
  }
}
