import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NotationGuidePage } from '../NotationGuidePage'
import { NotationVisualizer } from '../components/NotationVisualizer'

const notationVisualizationAutoLoadDelayMs = 3000

const visualizationMocks = vi.hoisted(() => {
  const cubeMove = vi.fn().mockResolvedValue('cube-state')
  const cubeReset = vi.fn()
  const cubeRotate = vi.fn().mockResolvedValue('cube-state')
  const megaminxMove = vi.fn().mockResolvedValue('megaminx-state')
  const megaminxReset = vi.fn()
  const pyraminxMove = vi.fn().mockResolvedValue('pyraminx-state')
  const pyraminxReset = vi.fn()
  const square1Move = vi.fn().mockResolvedValue('square1-state')
  const square1Reset = vi.fn()

  return {
    cubeMove,
    cubeRegister: vi.fn(() => {
      if (!customElements.get('rubiks-cube')) {
        customElements.define('rubiks-cube', class extends HTMLElement {
          move = cubeMove
          reset = cubeReset
          rotate = cubeRotate
        })
      }
    }),
    cubeReset,
    cubeRotate,
    megaminxMove,
    megaminxRegister: vi.fn(() => {
      if (!customElements.get('megaminx-puzzle')) {
        customElements.define('megaminx-puzzle', class extends HTMLElement {
          move = megaminxMove
          reset = megaminxReset
        })
      }
    }),
    megaminxReset,
    pyraminxMove,
    pyraminxRegister: vi.fn(() => {
      if (!customElements.get('pyraminx-puzzle')) {
        customElements.define('pyraminx-puzzle', class extends HTMLElement {
          move = pyraminxMove
          reset = pyraminxReset
        })
      }
    }),
    pyraminxReset,
    square1Move,
    square1Register: vi.fn(() => {
      if (!customElements.get('square1-puzzle')) {
        customElements.define('square1-puzzle', class extends HTMLElement {
          move = square1Move
          reset = square1Reset
        })
      }
    }),
    square1Reset,
  }
})

vi.mock('@rubiks-cube-solver/rubiks-cube/view', () => ({
  RubiksCubeElement: { register: visualizationMocks.cubeRegister },
}))

vi.mock('@rubiks-cube-solver/rubiks-cube/puzzles/megaminx', () => ({
  MegaminxPuzzleElement: { register: visualizationMocks.megaminxRegister },
}))

vi.mock('@rubiks-cube-solver/rubiks-cube/puzzles/pyraminx', () => ({
  PyraminxPuzzleElement: { register: visualizationMocks.pyraminxRegister },
}))

vi.mock('@rubiks-cube-solver/rubiks-cube/puzzles/square1', () => ({
  Square1PuzzleElement: { register: visualizationMocks.square1Register },
}))

describe('Notation guides', () => {
  beforeEach(() => {
    visualizationMocks.cubeMove.mockClear()
    visualizationMocks.cubeRegister.mockClear()
    visualizationMocks.cubeReset.mockClear()
    visualizationMocks.cubeRotate.mockClear()
    visualizationMocks.megaminxMove.mockClear()
    visualizationMocks.megaminxRegister.mockClear()
    visualizationMocks.megaminxReset.mockClear()
    visualizationMocks.pyraminxMove.mockClear()
    visualizationMocks.pyraminxRegister.mockClear()
    visualizationMocks.pyraminxReset.mockClear()
    visualizationMocks.square1Move.mockClear()
    visualizationMocks.square1Register.mockClear()
    visualizationMocks.square1Reset.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('delays notation visualization registration on first load', async () => {
    vi.useFakeTimers()
    const { container } = renderWithRoute('/notations/3x3')

    expect(screen.getByRole('button', { name: 'Preparing visualization' })).toBeInTheDocument()
    expect(screen.getAllByText('Preparing visualization').length).toBeGreaterThan(0)
    expect(container.querySelector('rubiks-cube')).not.toBeInTheDocument()
    expect(visualizationMocks.cubeRegister).not.toHaveBeenCalled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(notationVisualizationAutoLoadDelayMs - 1)
    })
    expect(container.querySelector('rubiks-cube')).not.toBeInTheDocument()
    expect(visualizationMocks.cubeRegister).not.toHaveBeenCalled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    vi.useRealTimers()

    await waitFor(() => expect(container.querySelector('rubiks-cube')).toBeInTheDocument())
    expect(visualizationMocks.cubeRegister).toHaveBeenCalled()
  })

  it('uses an already-registered visualization without registering it again', () => {
    visualizationMocks.cubeRegister()
    visualizationMocks.cubeRegister.mockClear()
    const { container } = renderWithRoute('/notations/3x3')

    expect(container.querySelector('rubiks-cube')).toBeInTheDocument()
    expect(visualizationMocks.cubeRegister).not.toHaveBeenCalled()
    expect(screen.getByRole('status')).toHaveTextContent('Ready')
  })

  it('loads notation visualization from the preparing layer click', async () => {
    const { container } = renderWithRoute('/notations/megaminx')
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Preparing visualization' }))

    await waitFor(() => expect(container.querySelector('megaminx-puzzle')).toBeInTheDocument())
    expect(visualizationMocks.megaminxRegister).toHaveBeenCalled()
  })

  it('registers the visualization from an idle callback after the fallback delay', async () => {
    vi.useFakeTimers()
    let idleCallback: IdleRequestCallback | undefined
    const requestIdleCallback = vi.fn((callback: IdleRequestCallback) => {
      idleCallback = callback
      return 41
    })
    vi.stubGlobal('requestIdleCallback', requestIdleCallback)
    vi.stubGlobal('cancelIdleCallback', vi.fn())
    const { container } = renderWithRoute('/notations/pyraminx')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(notationVisualizationAutoLoadDelayMs)
    })

    expect(requestIdleCallback).toHaveBeenCalledWith(expect.any(Function), { timeout: 1500 })
    expect(visualizationMocks.pyraminxRegister).not.toHaveBeenCalled()

    await act(async () => {
      idleCallback?.({ didTimeout: false, timeRemaining: () => 50 })
    })
    vi.useRealTimers()

    await waitFor(() =>
      expect(container.querySelector('pyraminx-puzzle')).toBeInTheDocument(),
    )
    expect(visualizationMocks.pyraminxRegister).toHaveBeenCalledOnce()
  })

  it('cancels pending idle registration when the visualization unmounts', async () => {
    vi.useFakeTimers()
    const requestIdleCallback = vi.fn(() => 73)
    const cancelIdleCallback = vi.fn()
    vi.stubGlobal('requestIdleCallback', requestIdleCallback)
    vi.stubGlobal('cancelIdleCallback', cancelIdleCallback)
    const { unmount } = renderWithRoute('/notations/square-1')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(notationVisualizationAutoLoadDelayMs)
    })
    expect(requestIdleCallback).toHaveBeenCalledOnce()

    unmount()

    expect(cancelIdleCallback).toHaveBeenCalledWith(73)
    expect(visualizationMocks.square1Register).not.toHaveBeenCalled()
  })

  it('renders a complete 3x3 notation reference', () => {
    renderWithRoute('/notations/3x3')

    expect(screen.getByRole('heading', { name: 'Interactive notation' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Notation guides' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'L' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: "L'" })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'L2' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'D' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'B2' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'M2' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: "E'" })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'S' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lw2' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'r2' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'x2' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: "z'" })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Core symbols' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'How to read the moves' })).not.toBeInTheDocument()
  })

  it.each(['2x2', '3x3', '4x4', '5x5', '6x6', '7x7'])('does not render redundant triple-turn suffixes for %s notation', (puzzleId) => {
    renderWithRoute(`/notations/${puzzleId}`)

    expect(screen.queryByRole('button', { name: 'U3' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'F3' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'x3' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Lw3' })).not.toBeInTheDocument()
  })

  it('renders Megaminx double turns as degrees instead of vague clicks', () => {
    renderWithRoute('/notations/megaminx')

    expect(screen.getAllByText('R++').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: "U2'" })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: "BR'" })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: "DBL2'" })).toBeInTheDocument()
    expect(screen.queryByText(/clicks/i)).not.toBeInTheDocument()
  })

  it('renders Square-1 notation with coordinate and slash symbols', () => {
    renderWithRoute('/notations/square-1')

    expect(screen.getByRole('button', { name: '(2,0)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '(-5,0)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '(0,6)' })).toBeInTheDocument()
  })

  it('preserves lowercase Pyraminx tip notation labels', () => {
    renderWithRoute('/notations/pyraminx')

    expect(screen.getByRole('button', { name: 'u' }).querySelector('span')).toHaveClass('normal-case')
    expect(screen.getByRole('button', { name: "u'" })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'l' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'r' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'b' })).toBeInTheDocument()
  })

  it.each(['2x2', '3x3', '4x4', '5x5', '6x6', '7x7'])('renders L moves for %s notation', (puzzleId) => {
    renderWithRoute(`/notations/${puzzleId}`)

    expect(screen.getByRole('button', { name: 'L' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: "L'" })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'L2' })).toBeInTheDocument()
  })

  it.each(['4x4', '5x5', '6x6', '7x7'])('renders two-layer wide and inner moves for %s notation', (puzzleId) => {
    renderWithRoute(`/notations/${puzzleId}`)

    expect(screen.getByRole('button', { name: 'Lw' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: "Lw'" })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lw2' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '2L' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: "2L'" })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '2L2' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '2Lw' })).toBeInTheDocument()
  })

  it.each(['6x6', '7x7'])('renders third-layer wide moves for %s notation', (puzzleId) => {
    renderWithRoute(`/notations/${puzzleId}`)

    expect(screen.getByRole('button', { name: '3Lw' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: "3Lw'" })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '3Lw2' })).toBeInTheDocument()
  })

  it.each(['4x4', '5x5'])('does not render redundant third-layer moves for %s notation', (puzzleId) => {
    renderWithRoute(`/notations/${puzzleId}`)

    expect(screen.queryByRole('button', { name: '3Lw' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '3Fw' })).not.toBeInTheDocument()
  })

  it.each(['6x6', '7x7'])('does not render high mirrored layer prefixes for %s notation', (puzzleId) => {
    renderWithRoute(`/notations/${puzzleId}`)

    expect(screen.queryByRole('button', { name: "4Fw'" })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '5R' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '6B2' })).not.toBeInTheDocument()
  })

  it.each(['3x3', '5x5', '7x7'])('renders slice moves for odd cube %s notation', (puzzleId) => {
    renderWithRoute(`/notations/${puzzleId}`)

    expect(screen.getByRole('button', { name: 'M' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'M2' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'E' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'E2' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'S' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'S2' })).toBeInTheDocument()
  })

  it.each(['2x2', '4x4', '6x6'])('does not render slice moves for %s notation', (puzzleId) => {
    renderWithRoute(`/notations/${puzzleId}`)

    expect(screen.queryByRole('button', { name: 'M' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'E' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'S' })).not.toBeInTheDocument()
  })

  it.each([
    ['/notations/2x2', 'rubiks-cube', '7.2'],
    ['/notations/3x3', 'rubiks-cube', '6.2'],
    ['/notations/4x4', 'rubiks-cube', '5.8'],
    ['/notations/5x5', 'rubiks-cube', '5.5'],
    ['/notations/6x6', 'rubiks-cube', '5.25'],
    ['/notations/7x7', 'rubiks-cube', '4.95'],
    ['/notations/pyraminx', 'pyraminx-puzzle', '4'],
    ['/notations/square-1', 'square1-puzzle', '4.4'],
    ['/notations/megaminx', 'megaminx-puzzle', '5.4'],
  ])('normalizes notation visualization size for %s', async (path, elementName, cameraRadius) => {
    const { container } = await renderWithLoadedVisualization(path)

    await waitFor(() => expect(container.querySelector(elementName)?.getAttribute('camera-radius')).toBe(cameraRadius))
  })

  it('keeps the cube stage fixed when the notation list grows', () => {
    renderWithRoute('/notations/7x7')

    const stage = screen.getByLabelText('7x7 notation visualization')

    expect(stage).toHaveClass('h-[min(280px,calc(100vw-48px))]')
    expect(stage).toHaveClass('w-[min(280px,calc(100vw-48px))]')
  })

  it('zooms Pyraminx with a valid field of view instead of an invalid camera radius', async () => {
    const { container } = await renderWithLoadedVisualization('/notations/pyraminx')

    await waitFor(() => expect(container.querySelector('pyraminx-puzzle')).toHaveAttribute('camera-field-of-view', '56'))
  })

  it('does not add visual actions for notation pages without visualization support', () => {
    const skewb = renderWithRoute('/notations/skewb')

    expect(screen.getByRole('heading', { name: 'Under construction' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Notation guides' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Interactive notation' })).not.toBeInTheDocument()

    skewb.unmount()
    renderWithRoute('/notations/clock')

    expect(screen.getByRole('heading', { name: 'Under construction' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Notation guides' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Interactive notation' })).not.toBeInTheDocument()
  })

  it('renders nothing when NotationVisualizer receives a guide without visualization support', () => {
    const { container } = render(
      <NotationVisualizer
        guide={{ id: 'skewb', path: '/notations/skewb', puzzle: 'Skewb' }}
      />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('runs and resets cube visualization actions', async () => {
    const { container } = await renderWithLoadedVisualization('/notations/3x3')
    const user = userEvent.setup()
    const initialCubeElement = container.querySelector('rubiks-cube')

    const moveButton = screen.getByRole('button', { name: 'R' })
    await waitFor(() => expect(moveButton).toBeEnabled())
    await user.click(moveButton)

    await waitFor(() => expect(visualizationMocks.cubeMove).toHaveBeenCalledWith('R'))

    const leftButton = screen.getByRole('button', { name: 'L' })
    await waitFor(() => expect(leftButton).toBeEnabled())
    await user.click(leftButton)
    await waitFor(() => expect(visualizationMocks.cubeMove).toHaveBeenCalledWith('L'))

    const rotateButton = screen.getByRole('button', { name: 'x' })
    await waitFor(() => expect(rotateButton).toBeEnabled())
    await user.click(rotateButton)
    await waitFor(() => expect(visualizationMocks.cubeRotate).toHaveBeenCalledWith('x'))

    const wideHalfTurnButton = screen.getByRole('button', { name: 'Lw2' })
    await waitFor(() => expect(wideHalfTurnButton).toBeEnabled())
    await user.click(wideHalfTurnButton)
    await waitFor(() => expect(visualizationMocks.cubeMove).toHaveBeenCalledWith('Lw2'))

    await user.click(screen.getByRole('button', { name: 'Reset' }))

    expect(visualizationMocks.cubeReset).toHaveBeenCalled()
    await waitFor(() => expect(container.querySelector('rubiks-cube')).not.toBe(initialCubeElement))
  })

  it('reports a failed visualization move and enables the actions again', async () => {
    visualizationMocks.cubeMove.mockRejectedValueOnce(new Error('animation failed'))
    await renderWithLoadedVisualization('/notations/3x3')
    const user = userEvent.setup()
    const moveButton = screen.getByRole('button', { name: 'R' })

    await user.click(moveButton)

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('R could not run'),
    )
    expect(moveButton).toBeEnabled()
  })

  it('falls back to ready when resetting the visualization throws', async () => {
    visualizationMocks.cubeReset.mockImplementationOnce(() => {
      throw new Error('reset failed')
    })
    const { container } = await renderWithLoadedVisualization('/notations/3x3')
    const user = userEvent.setup()
    const cubeElement = container.querySelector('rubiks-cube')

    await user.click(screen.getByRole('button', { name: 'Reset' }))

    expect(visualizationMocks.cubeReset).toHaveBeenCalledOnce()
    expect(screen.getByRole('status')).toHaveTextContent('Ready')
    expect(container.querySelector('rubiks-cube')).toBe(cubeElement)
  })

  it('runs Pyraminx notation actions with its puzzle element', async () => {
    await renderWithLoadedVisualization('/notations/pyraminx')
    const user = userEvent.setup()
    const moveButton = screen.getByRole('button', { name: 'U' })

    await user.click(moveButton)

    await waitFor(() => expect(visualizationMocks.pyraminxMove).toHaveBeenCalledWith('U'))
    expect(screen.getByRole('status')).toHaveTextContent('U applied')
  })

  it('runs Megaminx notation labels through the corrected visual face mapping', async () => {
    await renderWithLoadedVisualization('/notations/megaminx')
    const user = userEvent.setup()

    const rightButton = screen.getByRole('button', { name: 'R' })
    await waitFor(() => expect(rightButton).toBeEnabled())
    await user.click(rightButton)
    await waitFor(() => expect(visualizationMocks.megaminxMove).toHaveBeenCalledWith('A'))

    const leftButton = screen.getByRole('button', { name: 'L' })
    await waitFor(() => expect(leftButton).toBeEnabled())
    await user.click(leftButton)
    await waitFor(() => expect(visualizationMocks.megaminxMove).toHaveBeenCalledWith('R'))

    const bottomRightButton = screen.getByRole('button', { name: "BR'" })
    await waitFor(() => expect(bottomRightButton).toBeEnabled())
    await user.click(bottomRightButton)
    await waitFor(() => expect(visualizationMocks.megaminxMove).toHaveBeenCalledWith("L'"))

    const downLeftButton = screen.getByRole('button', { name: 'DL' })
    await waitFor(() => expect(downLeftButton).toBeEnabled())
    await user.click(downLeftButton)
    await waitFor(() => expect(visualizationMocks.megaminxMove).toHaveBeenCalledWith('H'))

    const downBackRightButton = screen.getByRole('button', { name: "DBR2'" })
    await waitFor(() => expect(downBackRightButton).toBeEnabled())
    await user.click(downBackRightButton)
    await waitFor(() => expect(visualizationMocks.megaminxMove).toHaveBeenCalledWith("I2'"))

    const downBackLeftButton = screen.getByRole('button', { name: "DBL2'" })
    await waitFor(() => expect(downBackLeftButton).toBeEnabled())
    await user.click(downBackLeftButton)
    await waitFor(() => expect(visualizationMocks.megaminxMove).toHaveBeenCalledWith("C2'"))

    const wcaWideButton = screen.getByRole('button', { name: 'R++' })
    await waitFor(() => expect(wcaWideButton).toBeEnabled())
    await user.click(wcaWideButton)
    await waitFor(() => expect(visualizationMocks.megaminxMove).toHaveBeenCalledWith('R++'))
  })

  it('runs Square-1 notation actions with its puzzle element', async () => {
    await renderWithLoadedVisualization('/notations/square-1')
    const user = userEvent.setup()

    const squareOneButton = screen.getByRole('button', { name: '(4,0)' })
    await waitFor(() => expect(squareOneButton).toBeEnabled())
    await user.click(squareOneButton)

    await waitFor(() => expect(visualizationMocks.square1Move).toHaveBeenCalledWith('(4,0)'))

    const slashButton = screen.getByRole('button', { name: '/' })
    await waitFor(() => expect(slashButton).toBeEnabled())
    await user.click(slashButton)

    await waitFor(() => expect(visualizationMocks.square1Move).toHaveBeenCalledWith('/'))
  })

  it('redirects unknown notation routes to the 3x3 guide', () => {
    renderWithRoute('/notations/unknown')

    expect(screen.getByRole('heading', { name: 'Interactive notation' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'M' })).toBeInTheDocument()
  })

  it('preserves locale prefixes in notation guide links', () => {
    render(
      <MemoryRouter initialEntries={['/fr/notations/3x3']}>
        <Routes>
          <Route path="/fr/notations/:puzzleId" element={<NotationGuidePage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Square-1' })).toHaveAttribute('href', '/fr/notations/square-1/')
  })
})

function renderWithRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/notations/:puzzleId" element={<NotationGuidePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

async function renderWithLoadedVisualization(path: string) {
  vi.useFakeTimers()
  const rendered = renderWithRoute(path)

  await act(async () => {
    await vi.advanceTimersByTimeAsync(notationVisualizationAutoLoadDelayMs)
  })
  vi.useRealTimers()

  return rendered
}
