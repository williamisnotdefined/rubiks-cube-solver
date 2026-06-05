import type {
  ApiSolveResponse,
  ApiVisualStateResponse,
  PuzzleVisualizationKind,
  SolveFailureResult,
  SolveResult,
} from '../types'

export function normalizeSolveResponse(
  payload: ApiSolveResponse,
  httpOk: boolean,
  requestElapsedMs: number,
): SolveResult {
  const visualState = normalizedVisualState(payload.visualState)
  const metadata = {
    maxDepth: payload.maxDepth,
    maxNodes: payload.maxNodes,
    strategyId: payload.strategyId,
    strategyLabel: payload.strategyLabel,
    solverMode: payload.solverMode,
    generatedTableStatus: payload.generatedTableStatus,
    puzzleId: payload.puzzleId,
    puzzleSlug: payload.puzzleSlug,
    metric: payload.metric,
    visualState: visualState.value,
    visualStateKind: visualState.kind,
  }

  if (httpOk && payload.ok && payload.status === 'success' && payload.replayVerified === true) {
    return {
      ...metadata,
      status: 'success',
      ok: true,
      moves: payload.moves,
      length: payload.length ?? payload.moves.length,
      exploredNodes: payload.exploredNodes ?? 0,
      requestElapsedMs,
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
    status === 'node_limit_exceeded' ||
    status === 'strategy_puzzle_mismatch' ||
    status === 'unsupported_input_kind' ||
    status === 'unsupported_metric' ||
    status === 'unsupported_puzzle' ||
    status === 'unknown_puzzle' ||
    status === 'unverified_solution'
  ) {
    return status
  }

  return 'api_error'
}

function normalizedVisualState(
  visualState: ApiSolveResponse['visualState'],
): { kind?: PuzzleVisualizationKind; value?: string } {
  if (typeof visualState === 'string') {
    return { kind: 'cube3-facelets-v1', value: visualState }
  }

  if (isVisualStateResponse(visualState)) {
    return visualState.kind === 'none'
      ? { kind: visualState.kind }
      : { kind: visualState.kind, value: visualState.value }
  }

  return {}
}

function isVisualStateResponse(value: unknown): value is ApiVisualStateResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'kind' in value &&
    typeof value.kind === 'string' &&
    'value' in value &&
    typeof value.value === 'string'
  )
}
