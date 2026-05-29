import type { ApiSolveResponse, SolveFailureResult, SolveResult } from '../types'

export function normalizeSolveResponse(
  payload: ApiSolveResponse,
  httpOk: boolean,
): SolveResult {
  const metadata = {
    maxDepth: payload.maxDepth,
    maxNodes: payload.maxNodes,
    strategyId: payload.strategyId,
    strategyLabel: payload.strategyLabel,
    solverMode: payload.solverMode,
    generatedTableStatus: payload.generatedTableStatus,
    visualState: payload.visualState,
  }

  if (httpOk && payload.ok && payload.status === 'success' && payload.replayVerified === true) {
    return {
      ...metadata,
      status: 'success',
      ok: true,
      moves: payload.moves,
      length: payload.length ?? payload.moves.length,
      exploredNodes: payload.exploredNodes ?? 0,
      elapsedMs: payload.elapsedMs ?? 0,
      replayVerified: true,
    }
  }

  if (httpOk && payload.ok && payload.status === 'success') {
    return {
      ...metadata,
      status: 'unverified_solution',
      ok: false,
      errorKind: payload.errorKind ?? 'unverified_solution',
      message: payload.message ?? 'API solve result was not replay verified.',
      exploredNodes: payload.exploredNodes,
    }
  }

  return {
    ...metadata,
    status: solveFailureStatus(payload.status),
    ok: false,
    errorKind: payload.errorKind,
    message: payload.message ?? `API solve failed with status ${payload.status}`,
    exploredNodes: payload.exploredNodes,
  }
}

function solveFailureStatus(status: string): SolveFailureResult['status'] {
  if (
    status === 'invalid_input' ||
    status === 'invalid_notation' ||
    status === 'not_found_within_limits' ||
    status === 'unsupported_strategy' ||
    status === 'invalid_limits' ||
    status === 'request_too_large' ||
    status === 'generated_tables_unavailable' ||
    status === 'generated_tables_corrupt' ||
    status === 'unverified_solution'
  ) {
    return status
  }

  return 'api_error'
}
