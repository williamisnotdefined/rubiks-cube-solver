import type { SolveFailureResult, SolveResult } from '@api/solver/types'

export type NoSolutionLimitFailureResult = SolveFailureResult & {
  status: 'node_limit_exceeded' | 'not_found_within_limits'
}

export function isNoSolutionLimitFailure(
  result: SolveResult | undefined,
): result is NoSolutionLimitFailureResult {
  return (
    result?.ok === false &&
    (result.status === 'not_found_within_limits' || result.status === 'node_limit_exceeded')
  )
}
