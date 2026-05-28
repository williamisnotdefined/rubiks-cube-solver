import type { SolveResult } from '@api/solver/types'
import { formatNumber } from './format'

type SolveFailure = Exclude<SolveResult, { ok: true }>

export function solveErrorMessage(result: SolveFailure): string {
  if (result.status === 'invalid_notation') {
    return 'Invalid scramble'
  }

  if (result.status === 'invalid_input') {
    return 'Invalid cube state'
  }

  if (result.status === 'not_found_within_limits') {
    return 'No solution within the configured limits'
  }

  if (result.status === 'invalid_limits') {
    return 'Solver limits exceed API safety caps'
  }

  if (result.status === 'request_too_large') {
    return 'Solve request is too large'
  }

  if (result.status === 'unverified_solution') {
    return 'Solver solution failed replay verification'
  }

  if (result.status === 'generated_tables_unavailable') {
    return 'Generated two-phase tables unavailable on the API'
  }

  if (result.status === 'generated_tables_corrupt') {
    return 'Generated two-phase API tables corrupt or incompatible'
  }

  if (result.status === 'api_error') {
    return 'API solve request failed'
  }

  return result.message
}

export function solveErrorDetail(result: SolveFailure): string | undefined {
  if (result.status === 'not_found_within_limits') {
    return `${result.strategyLabel} explored ${formatNumber(
      result.exploredNodes ?? 0,
    )} nodes at max moves ${result.maxDepth}.`
  }

  if (result.status === 'invalid_limits') {
    return result.message
  }

  if (result.status === 'request_too_large') {
    return result.message
  }

  if (result.status === 'unverified_solution') {
    return result.message
  }

  if (result.status === 'generated_tables_unavailable') {
    return 'Generate native pruning tables and start npm run api:dev before solving.'
  }

  if (result.status === 'generated_tables_corrupt') {
    return 'Regenerate native pruning tables; the current API artifacts do not match the Rust engine.'
  }

  return result.message
}
