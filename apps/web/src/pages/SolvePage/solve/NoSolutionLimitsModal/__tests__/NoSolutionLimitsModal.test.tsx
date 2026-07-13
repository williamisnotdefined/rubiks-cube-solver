import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NoSolutionLimitFailureResult } from '../../noSolutionLimits'
import { useSolveSettingsStore } from '../../solveSettingsStore'
import { NoSolutionLimitsModal } from '../NoSolutionLimitsModal'

const limitFailure: NoSolutionLimitFailureResult = {
  exploredNodes: 12_345,
  generatedTableStatus: 'available',
  maxDepth: 20,
  maxNodes: undefined,
  message: 'no solution found within limits',
  ok: false,
  solverMode: 'generated_two_phase_quality',
  status: 'not_found_within_limits',
  strategyId: 'generated-two-phase-quality',
  strategyLabel: 'Generated two-phase quality solver',
}

describe('NoSolutionLimitsModal', () => {
  beforeEach(() => {
    useSolveSettingsStore.getState().resetSolveSettings()
  })

  it('describes a previous attempt without a configured node limit', () => {
    renderModal()

    expect(screen.getByRole('dialog', { name: 'Try different limits' })).toBeInTheDocument()
    expect(
      screen.getByText(/tried up to 20 moves and no configured node cap nodes/),
    ).toBeInTheDocument()
    expect(screen.getByText(/explored 12,345 nodes at max moves 20/)).toBeInTheDocument()
  })

  it('blocks invalid limits and retries with valid updated limits', async () => {
    useSolveSettingsStore.getState().setMaxMovesInput('24')
    const onRetry = vi.fn()
    const user = userEvent.setup()
    renderModal({ onRetry })
    const maxMovesInput = screen.getByLabelText('Max moves')
    const retryButton = screen.getByRole('button', { name: 'Try with these limits' })

    expect(maxMovesInput).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent('Max moves must be 23 or less')
    expect(retryButton).toBeDisabled()

    fireEvent.submit(retryButton.closest('form')!)
    expect(onRetry).not.toHaveBeenCalled()

    await user.clear(maxMovesInput)
    await user.type(maxMovesInput, '22')
    await user.click(screen.getByRole('combobox', { name: 'Max nodes (M)' }))
    await user.click(screen.getByRole('option', { name: '25' }))
    await user.click(retryButton)

    expect(onRetry).toHaveBeenCalledWith({ maxDepth: 22, maxNodes: 25_000_000 })
  })

  it('disables retries while solving and supports both dismiss controls', async () => {
    const onClose = vi.fn()
    const onRetry = vi.fn()
    const user = userEvent.setup()
    renderModal({ onClose, onRetry, solving: true })

    expect(screen.getByRole('button', { name: 'Loading' })).toBeDisabled()
    expect(onRetry).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledOnce()

    await user.click(screen.getByLabelText('Close solve limits dialog'))
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(2))
  })
})

function renderModal({
  onClose = vi.fn(),
  onRetry = vi.fn(),
  solving = false,
}: {
  onClose?: () => void
  onRetry?: (limits: { maxDepth: number; maxNodes: number }) => void | Promise<void>
  solving?: boolean
} = {}) {
  return render(
    <NoSolutionLimitsModal
      puzzleSlug='cube-3x3x3'
      result={limitFailure}
      solving={solving}
      onClose={onClose}
      onRetry={onRetry}
    />,
  )
}
