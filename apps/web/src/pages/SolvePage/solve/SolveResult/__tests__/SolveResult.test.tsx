import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { SolveResult } from '../SolveResult'
import type { SolveResult as ApiSolveResult } from '@api/solver/types'

const successResult: ApiSolveResult = {
  exploredNodes: 12_345,
  generatedTableStatus: 'available',
  length: 2,
  maxDepth: 2,
  maxNodes: 10_000_000,
  moves: ["U'", "R'"],
  ok: true,
  replayVerified: true,
  requestElapsedMs: 27_000,
  solverMode: 'generated_two_phase_quality',
  status: 'success',
  strategyId: 'generated-two-phase-quality',
  strategyLabel: 'Generated two-phase quality solver',
}

function failureResult(status: Exclude<ApiSolveResult, { ok: true }>['status']): ApiSolveResult {
  return {
    errorKind: status,
    generatedTableStatus: 'available',
    maxDepth: 2,
    maxNodes: 10_000_000,
    message: `${status} detail`,
    ok: false,
    solverMode: 'generated_two_phase_quality',
    status,
    strategyId: 'generated-two-phase-quality',
    strategyLabel: 'Generated two-phase quality solver',
    exploredNodes: 123,
  }
}

describe('SolveResult', () => {
  it('renders successful solutions with a short summary', () => {
    render(<SolveResult error={null} result={successResult} solving={false} />)

    expect(screen.getByText("U' R'")).toBeInTheDocument()
    expect(screen.getByText(/2 moves - response in 27.0 s/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'see more' })).toBeInTheDocument()
    expect(screen.queryByText(/12,345 nodes/)).not.toBeInTheDocument()
    expect(screen.queryByText(/replay verified/)).not.toBeInTheDocument()
  })

  it('opens solver details from the summary link', async () => {
    const user = userEvent.setup()
    render(<SolveResult error={null} result={successResult} solving={false} />)

    await user.click(screen.getByRole('button', { name: 'see more' }))

    const dialog = await screen.findByRole('dialog', { name: 'Solver details' })
    expect(within(dialog).getByText('Generated two-phase quality solver')).toBeInTheDocument()
    expect(within(dialog).getAllByText('12,345 nodes').length).toBeGreaterThan(0)
    expect(within(dialog).getAllByText('response in 27.0 s').length).toBeGreaterThan(0)
    expect(within(dialog).getByText('tables available')).toBeInTheDocument()
    expect(within(dialog).getByText('replay verified')).toBeInTheDocument()
    expect(within(dialog).getByText(/does not mean generative AI/)).toBeInTheDocument()
  })

  it('shows non-generated solver details and closes them with Escape', async () => {
    const user = userEvent.setup()
    render(
      <SolveResult
        error={null}
        result={{
          ...successResult,
          generatedTableStatus: 'not_applicable',
          maxNodes: undefined,
          replayVerified: false,
          strategyId: 'cube2-pdb-ida-star',
          strategyLabel: '2x2 PDB IDA*',
        }}
        solving={false}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'see more' }))

    const dialog = await screen.findByRole('dialog', { name: 'Solver details' })
    expect(within(dialog).getByText('2x2 PDB IDA*')).toBeInTheDocument()
    expect(within(dialog).getByText('replay not verified')).toBeInTheDocument()
    expect(
      within(dialog).getByText(/The deterministic backend solver strategy/),
    ).toBeInTheDocument()
    expect(within(dialog).getByText(/no configured node cap/)).toBeInTheDocument()

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog', { name: 'Solver details' })).not.toBeInTheDocument()
  })

  it('renders solved states with no moves', () => {
    render(
      <SolveResult
        error={null}
        result={{ ...successResult, length: 0, moves: [] }}
        solving={false}
      />,
    )

    expect(screen.getByText('Solved')).toBeInTheDocument()
  })

  it('renders loading and local validation states', () => {
    const { rerender } = render(
      <SolveResult error={null} localValidationMessage='Max moves is required' solving />,
    )

    expect(screen.getByLabelText('Loading')).toBeInTheDocument()

    rerender(
      <SolveResult error={null} localValidationMessage='Max moves is required' solving={false} />,
    )

    expect(screen.getByText('Max moves is required')).toBeInTheDocument()
  })

  it.each([
    ['invalid_notation', 'Invalid scramble'],
    ['invalid_input', 'Invalid cube state'],
    ['not_found_within_limits', 'No solution within the configured limits'],
    ['invalid_limits', 'Solver limits exceed API safety caps'],
    ['request_too_large', 'Solve request is too large'],
    ['unverified_solution', 'Solver solution failed replay verification'],
    ['generated_tables_unavailable', 'Generated two-phase tables unavailable on the API'],
    ['generated_tables_corrupt', 'Generated two-phase API tables corrupt or incompatible'],
    ['api_error', 'API solve request failed'],
    ['unsupported_strategy', 'Unsupported solver strategy'],
  ] as const)('renders %s failures', (status, message) => {
    render(<SolveResult error={null} result={failureResult(status)} solving={false} />)

    expect(screen.getAllByText(message).length).toBeGreaterThan(0)
  })

  it('renders transport errors', () => {
    render(<SolveResult error={new Error('Network down')} solving={false} />)

    expect(screen.getByText('API solve request failed')).toBeInTheDocument()
    expect(screen.getByText('Network down')).toBeInTheDocument()
  })
})
