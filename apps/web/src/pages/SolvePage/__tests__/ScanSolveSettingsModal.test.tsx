import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SolveResult } from '@api/solver/types'
import { ScanSolveSettingsModal } from '../ScanSolveSettingsModal'
import { useSolveSettingsStore } from '../solveSettingsStore'

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

describe('ScanSolveSettingsModal', () => {
  beforeEach(() => {
    useSolveSettingsStore.getState().resetSolveSettings()
  })

  it('updates global solve settings and retries', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    render(
      <ScanSolveSettingsModal
        result={limitFailure}
        solving={false}
        onClose={vi.fn()}
        onRetry={onRetry}
      />,
    )
    const dialog = screen.getByRole('dialog', { name: 'Adjust solve limits' })

    await user.clear(within(dialog).getByLabelText('Max moves'))
    await user.type(within(dialog).getByLabelText('Max moves'), '30')
    await user.selectOptions(within(dialog).getByLabelText('Max nodes (M)'), '25')
    await user.click(within(dialog).getByRole('button', { name: 'Apply and retry' }))

    expect(useSolveSettingsStore.getState()).toMatchObject({
      maxMovesInput: '30',
      maxNodesMillionInput: '25',
    })
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('blocks retry while local settings are invalid', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    render(
      <ScanSolveSettingsModal
        result={limitFailure}
        solving={false}
        onClose={vi.fn()}
        onRetry={onRetry}
      />,
    )
    const dialog = screen.getByRole('dialog', { name: 'Adjust solve limits' })

    await user.clear(within(dialog).getByLabelText('Max moves'))
    await user.type(within(dialog).getByLabelText('Max moves'), '31')

    expect(within(dialog).getByText('Max moves must be 30 or less')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Apply and retry' })).toBeDisabled()
  })
})
