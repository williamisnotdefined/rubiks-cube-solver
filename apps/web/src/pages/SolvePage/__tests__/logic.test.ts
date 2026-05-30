import { describe, expect, it } from 'vitest'
import type { SolveResult } from '@api/solver/types'
import { preferredStrategyId } from '../strategy'
import { solveErrorDetail, solveErrorMessage } from '../solveMessages'
import { validateMaxNodesMillionOption, validateWholeNumberLimit } from '../validation'

function failure(status: Exclude<SolveResult, { ok: true }>['status']): Exclude<SolveResult, { ok: true }> {
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

describe('solve page validation', () => {
  it('validates whole-number limits', () => {
    expect(validateWholeNumberLimit('', 'Max moves', 30)).toBe('Max moves is required')
    expect(validateWholeNumberLimit('1.5', 'Max moves', 30)).toBe(
      'Max moves must be a whole number',
    )
    expect(validateWholeNumberLimit('-1', 'Max moves', 30)).toBe(
      'Max moves must be a whole number',
    )
    expect(validateWholeNumberLimit('31', 'Max moves', 30)).toBe(
      'Max moves must be 30 or less',
    )
    expect(validateWholeNumberLimit('30', 'Max moves', 30)).toBeUndefined()
  })

  it('validates max-node options', () => {
    expect(validateMaxNodesMillionOption('')).toBe('Max nodes (M) is required')
    expect(validateMaxNodesMillionOption('1.5')).toBe('Max nodes (M) must be a whole number')
    expect(validateMaxNodesMillionOption('11')).toBe('Max nodes (M) must be one of 10, 15, 20, 25')
    expect(validateMaxNodesMillionOption('25')).toBeUndefined()
  })
})

describe('solve page strategy selection', () => {
  it('prefers the quality generated two-phase strategy when available', () => {
    expect(
      preferredStrategyId([
        {
          id: 'generated-two-phase-quality',
          label: 'Quality',
          solverMode: 'generated_two_phase_quality',
          statusText: 'ready',
        },
      ]),
    ).toBe('generated-two-phase-quality')
  })

  it('falls back to generated two-phase when quality is unavailable', () => {
    expect(preferredStrategyId([])).toBe('generated-two-phase')
    expect(preferredStrategyId(undefined)).toBe('generated-two-phase')
  })
})

describe('solve page messages', () => {
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
    ['unsupported_strategy', 'unsupported_strategy message'],
  ] as const)('maps %s to a user-facing message', (status, message) => {
    expect(solveErrorMessage(failure(status))).toBe(message)
  })

  it('adds useful failure details', () => {
    expect(solveErrorDetail(failure('not_found_within_limits'))).toContain('12,345 nodes')
    expect(
      solveErrorDetail({
        ...failure('invalid_input'),
        errorKind: 'unknown_corner_stickers',
      }),
    ).toContain('capture green, red, blue, and orange with white on top')
    expect(solveErrorDetail(failure('invalid_limits'))).toBe('invalid_limits message')
    expect(solveErrorDetail(failure('request_too_large'))).toBe('request_too_large message')
    expect(solveErrorDetail(failure('unverified_solution'))).toBe('unverified_solution message')
    expect(solveErrorDetail(failure('generated_tables_unavailable'))).toContain(
      'Generate native pruning tables',
    )
    expect(solveErrorDetail(failure('generated_tables_corrupt'))).toContain('Regenerate')
    expect(solveErrorDetail(failure('invalid_notation'))).toBe('invalid_notation message')
  })
})
