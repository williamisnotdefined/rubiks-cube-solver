import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PuzzleReplayStage } from '../PuzzleReplayStage'

const puzzleMocks = vi.hoisted(() => ({
  register: vi.fn(),
}))

vi.mock('@rubiks-cube-solver/rubiks-cube/puzzle', () => ({
  TwistyPuzzleElement: {
    register: puzzleMocks.register,
  },
}))

describe('PuzzleReplayStage', () => {
  beforeEach(() => {
    puzzleMocks.register.mockClear()
  })

  it('lazy-registers and renders the twisty puzzle element', async () => {
    render(
      <PuzzleReplayStage
        active
        alg="U R L B u l r b"
        label="Pyraminx replay"
        loadingLabel="Loading"
        puzzleSlug="pyraminx"
        replaySupported
        unavailableLabel="Unavailable"
      />,
    )

    const stage = screen.getByLabelText('Pyraminx replay')

    expect(screen.getByText('Loading')).toBeInTheDocument()
    await waitFor(() => expect(stage.querySelector('twisty-puzzle')).toBeInTheDocument())
    expect(puzzleMocks.register).toHaveBeenCalledTimes(1)
    expect(stage.querySelector('twisty-puzzle')).toHaveAttribute('puzzle', 'pyraminx')
    expect(stage.querySelector('twisty-puzzle')).toHaveAttribute('alg', 'U R L B u l r b')
  })

  it('renders unavailable fallback without registering when replay is unsupported', () => {
    render(
      <PuzzleReplayStage
        active
        alg="1. R U\n2. F B"
        label="3x3 MBLD replay"
        loadingLabel="Loading"
        puzzleSlug="cube-3x3x3"
        replaySupported={false}
        unavailableLabel="Unavailable"
      />,
    )

    expect(screen.getByText('Unavailable')).toBeInTheDocument()
    expect(screen.getByLabelText('3x3 MBLD replay').querySelector('twisty-puzzle')).toBeNull()
    expect(puzzleMocks.register).not.toHaveBeenCalled()
  })

  it('does not render after unmounting during lazy registration', async () => {
    const { unmount } = render(
      <PuzzleReplayStage
        active
        alg="UR3+ DR3+ y2 U-"
        label="Clock replay"
        loadingLabel="Loading"
        puzzleSlug="clock"
        replaySupported
        unavailableLabel="Unavailable"
      />,
    )

    expect(screen.getByText('Loading')).toBeInTheDocument()

    unmount()

    await waitFor(() => expect(puzzleMocks.register).toHaveBeenCalledTimes(1))
    expect(screen.queryByLabelText('Clock replay')).not.toBeInTheDocument()
  })
})
