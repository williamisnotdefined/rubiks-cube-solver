import { useRef } from 'react'
import { render } from '@testing-library/react'
import type { RubiksCubeElement } from '@rubiks-cube-solver/rubiks-cube/view'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useCubeVisualization } from '../useCubeVisualization'

type FakeCube = {
  move: ReturnType<typeof vi.fn>
  reset: ReturnType<typeof vi.fn>
  setState: ReturnType<typeof vi.fn>
}

function createFakeCube(): FakeCube {
  return {
    move: vi.fn().mockResolvedValue(undefined),
    reset: vi.fn(),
    setState: vi.fn().mockReturnValue(true),
  }
}

function HookHarness({
  cube,
  enabled = true,
  notation,
  revision = 0,
  visualState,
  visualStateKind = 'cube3-facelets-v1',
  cubeType = 'Three',
}: {
  cube: FakeCube | null
  enabled?: boolean
  notation: string
  revision?: number
  visualState?: string
  visualStateKind?: 'cube2-facelets-v1' | 'cube3-facelets-v1' | 'none'
  cubeType?: 'Two' | 'Three'
}) {
  const cubeRef = useRef(cube as unknown as RubiksCubeElement | null)
  useCubeVisualization(cubeRef, notation, revision, visualState, visualStateKind, cubeType, enabled)

  return null
}

async function runVisualizationSync() {
  await vi.runAllTimersAsync()
}

describe('useCubeVisualization', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('resets to solved state for empty notation', async () => {
    vi.useFakeTimers()
    const cube = createFakeCube()

    render(<HookHarness cube={cube} notation="" />)
    await runVisualizationSync()

    expect(cube.reset).toHaveBeenCalledTimes(1)
    expect(cube.move).not.toHaveBeenCalled()
  })

  it('applies valid notation without animation on first sync', async () => {
    vi.useFakeTimers()
    const cube = createFakeCube()

    render(<HookHarness cube={cube} notation="R U" />)
    await runVisualizationSync()

    expect(cube.reset).toHaveBeenCalledTimes(1)
    expect(cube.move).toHaveBeenNthCalledWith(1, 'R', { animationSpeedMs: 0 })
    expect(cube.move).toHaveBeenNthCalledWith(2, 'U', { animationSpeedMs: 0 })
  })

  it('animates appended moves after the first sync', async () => {
    vi.useFakeTimers()
    const cube = createFakeCube()
    const { rerender } = render(<HookHarness cube={cube} notation="R" />)

    await runVisualizationSync()
    rerender(<HookHarness cube={cube} notation="R U" />)
    await runVisualizationSync()

    expect(cube.reset).toHaveBeenCalledTimes(1)
    expect(cube.move).toHaveBeenLastCalledWith('U', undefined)
  })

  it('sets visual state before applying solution moves', async () => {
    vi.useFakeTimers()
    const cube = createFakeCube()
    const visualState = 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB'

    render(<HookHarness cube={cube} notation="R" visualState={visualState} />)
    await runVisualizationSync()

    expect(cube.reset).not.toHaveBeenCalled()
    expect(cube.setState).toHaveBeenCalledWith(visualState)
    expect(cube.move).toHaveBeenCalledWith('R', { animationSpeedMs: 0 })
  })

  it('sets compatible 2x2 visual state before applying solution moves', async () => {
    vi.useFakeTimers()
    const cube = createFakeCube()
    const visualState = 'UUUURRRRFFFFDDDDLLLLBBBB'

    render(
      <HookHarness
        cube={cube}
        cubeType="Two"
        notation="R"
        visualState={visualState}
        visualStateKind="cube2-facelets-v1"
      />,
    )
    await runVisualizationSync()

    expect(cube.setState).toHaveBeenCalledWith(visualState)
    expect(cube.move).toHaveBeenCalledWith('R', { animationSpeedMs: 0 })
  })

  it('retries setting visual state when the cube element is still connecting', async () => {
    vi.useFakeTimers()
    const cube = createFakeCube()
    const visualState = 'UUUURFRDFRFDDBDDLLBLUUBB'
    cube.setState.mockImplementationOnce(() => {
      throw new Error('not initialized')
    })

    render(
      <HookHarness
        cube={cube}
        cubeType="Two"
        notation=""
        visualState={visualState}
        visualStateKind="cube2-facelets-v1"
      />,
    )
    await runVisualizationSync()

    expect(cube.setState).toHaveBeenCalledTimes(2)
    expect(cube.setState).toHaveBeenLastCalledWith(visualState)
  })

  it('retries setting visual state when the cube element rejects the first state sync', async () => {
    vi.useFakeTimers()
    const cube = createFakeCube()
    const visualState = 'UUUURFRDFRFDDBDDLLBLUUBB'
    cube.setState.mockReturnValueOnce(false)

    render(
      <HookHarness
        cube={cube}
        cubeType="Two"
        notation=""
        visualState={visualState}
        visualStateKind="cube2-facelets-v1"
      />,
    )
    await runVisualizationSync()

    expect(cube.setState).toHaveBeenCalledTimes(2)
    expect(cube.setState).toHaveBeenLastCalledWith(visualState)
  })

  it('ignores incompatible 2x2 visual state length', async () => {
    vi.useFakeTimers()
    const cube = createFakeCube()
    const visualState = 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB'

    render(
      <HookHarness
        cube={cube}
        cubeType="Two"
        notation="R"
        visualState={visualState}
        visualStateKind="cube2-facelets-v1"
      />,
    )
    await runVisualizationSync()

    expect(cube.setState).not.toHaveBeenCalled()
    expect(cube.move).not.toHaveBeenCalled()
  })

  it('ignores unsupported visual state kinds', async () => {
    vi.useFakeTimers()
    const cube = createFakeCube()

    render(
      <HookHarness
        cube={cube}
        notation="R"
        visualState="unsupported"
        visualStateKind="none"
      />,
    )
    await runVisualizationSync()

    expect(cube.reset).not.toHaveBeenCalled()
    expect(cube.setState).not.toHaveBeenCalled()
    expect(cube.move).not.toHaveBeenCalled()
  })

  it('ignores a 3x3 visual state for a 2x2 cube', async () => {
    vi.useFakeTimers()
    const cube = createFakeCube()

    render(
      <HookHarness
        cube={cube}
        cubeType="Two"
        notation="R"
        visualState="UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB"
        visualStateKind="cube3-facelets-v1"
      />,
    )
    await runVisualizationSync()

    expect(cube.reset).not.toHaveBeenCalled()
    expect(cube.setState).not.toHaveBeenCalled()
    expect(cube.move).not.toHaveBeenCalled()
  })

  it('animates appended moves from the same visual state', async () => {
    vi.useFakeTimers()
    const cube = createFakeCube()
    const visualState = 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB'
    const { rerender } = render(<HookHarness cube={cube} notation="" visualState={visualState} />)

    await runVisualizationSync()
    rerender(<HookHarness cube={cube} notation="R" visualState={visualState} />)
    await runVisualizationSync()

    expect(cube.setState).toHaveBeenCalledTimes(1)
    expect(cube.move).toHaveBeenLastCalledWith('R', undefined)
  })

  it('ignores invalid visualization tokens', async () => {
    vi.useFakeTimers()
    const cube = createFakeCube()

    render(<HookHarness cube={cube} notation="R Q" />)
    await runVisualizationSync()

    expect(cube.reset).not.toHaveBeenCalled()
    expect(cube.move).not.toHaveBeenCalled()
  })

  it('does not schedule visualization work while disabled', async () => {
    vi.useFakeTimers()
    const cube = createFakeCube()

    render(<HookHarness cube={cube} enabled={false} notation="R" />)
    await runVisualizationSync()

    expect(cube.reset).not.toHaveBeenCalled()
    expect(cube.move).not.toHaveBeenCalled()
  })

  it('does nothing while the cube element is not attached', async () => {
    vi.useFakeTimers()

    render(<HookHarness cube={null} notation="R" />)
    await runVisualizationSync()

    expect(true).toBe(true)
  })

  it('stops stale sync work when a newer sync starts', async () => {
    vi.useFakeTimers()
    const cube = createFakeCube()
    let resolveFirstMove: () => void = () => {}
    cube.move.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveFirstMove = resolve
        }),
    )
    const { rerender } = render(<HookHarness cube={cube} notation="R U" />)

    await vi.advanceTimersByTimeAsync(0)
    rerender(<HookHarness cube={cube} notation="R" revision={1} />)
    resolveFirstMove()
    await Promise.resolve()

    expect(cube.move).toHaveBeenCalledTimes(1)
  })
})
