import { describe, expect, it } from 'vitest'
import type { SolveResult } from '@api/solver/types'
import i18n from '@src/i18n/i18n'
import { solveErrorDetail, solveErrorMessage } from '../solveMessages'

type SolveFailure = Exclude<SolveResult, { ok: true }>

describe('solve messages', () => {
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
  ] as const)('maps %s to a user-facing message', (status, message) => {
    expect(solveErrorMessage(failure(status), i18n.t)).toBe(message)
  })

  it('adds useful failure details', () => {
    expect(solveErrorDetail(failure('not_found_within_limits'), i18n.t)).toContain('12,345 nodes')
    expect(
      solveErrorDetail(
        {
          ...failure('invalid_input'),
          errorKind: 'unknown_corner_stickers',
        },
        i18n.t,
      ),
    ).toContain('capture green, red, blue, and orange with white on top')
    expect(solveErrorDetail(failure('invalid_limits'), i18n.t)).toBe('invalid_limits message')
    expect(solveErrorDetail(failure('request_too_large'), i18n.t)).toBe('request_too_large message')
    expect(solveErrorDetail(failure('unverified_solution'), i18n.t)).toBe(
      'unverified_solution message',
    )
    expect(solveErrorDetail(failure('generated_tables_unavailable'), i18n.t)).toContain(
      'Generate native pruning tables',
    )
    expect(solveErrorDetail(failure('generated_tables_corrupt'), i18n.t)).toContain('Regenerate')
    expect(solveErrorDetail(failure('invalid_notation'), i18n.t)).toBe('invalid_notation message')
  })
})

function failure(status: SolveFailure['status']): SolveFailure {
  return {
    generatedTableStatus: 'available',
    maxDepth: 20,
    maxNodes: 10_000_000,
    message: `${status} message`,
    ok: false,
    solverMode: 'generated_two_phase_quality',
    status,
    strategyId: 'generated-two-phase-quality',
    strategyLabel: 'Generated two-phase quality solver',
    exploredNodes: 12_345,
  }
}
