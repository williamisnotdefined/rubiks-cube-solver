export type SolverStrategyId = string

export type SolverStrategyOption = {
  id: SolverStrategyId
  label: string
  solverMode: string
  statusText: string
}

export type SolverStatus =
  | 'unloaded'
  | 'loading'
  | 'ready'
  | 'api_unavailable'
  | 'initialization_failed'

export type SolverBoundaryInfo = {
  packageName: string
  sourcePath: string
  status: SolverStatus
}

export type ApiSolverPendingState = Omit<SolverBoundaryInfo, 'status'> & {
  status: 'unloaded' | 'loading'
}

export type SolveLimits = {
  maxDepth: number
  maxNodes?: number
  strategyId?: string
}

export type GeneratedTableStatus =
  | 'not_required'
  | 'available'
  | 'unavailable'
  | 'corrupt_or_incompatible'

export type SolveMetadata = {
  maxDepth: number
  maxNodes: number | undefined
  strategyId: string
  strategyLabel: string
  solverMode: string
  generatedTableStatus: GeneratedTableStatus
  visualState?: string
}

export type SolveSuccessResult = SolveMetadata & {
  status: 'success'
  ok: true
  moves: string[]
  length: number
  exploredNodes: number
  replayVerified: boolean
}

export type SolveFailureResult = SolveMetadata & {
  status:
    | 'invalid_input'
    | 'invalid_notation'
    | 'not_found_within_limits'
    | 'unsupported_strategy'
    | 'invalid_limits'
    | 'request_too_large'
    | 'generated_tables_unavailable'
    | 'generated_tables_corrupt'
    | 'unverified_solution'
    | 'api_error'
  ok: false
  errorKind?: string
  message: string
  exploredNodes?: number
}

export type SolveResult = SolveSuccessResult | SolveFailureResult

export type ApiSolverClient = {
  solverStrategies(): SolverStrategyOption[]
  solveNotation(input: string, limits: SolveLimits): Promise<SolveResult>
}

export type ApiSolverReadyState = SolverBoundaryInfo & {
  status: 'ready'
  strategyOptions: SolverStrategyOption[]
  client: ApiSolverClient
}

export type ApiSolverLoadErrorState = SolverBoundaryInfo & {
  status: 'api_unavailable' | 'initialization_failed'
  message: string
}

export type ApiSolverLoadState =
  | ApiSolverPendingState
  | ApiSolverReadyState
  | ApiSolverLoadErrorState

type ApiSolverLoadResult = ApiSolverReadyState | ApiSolverLoadErrorState

type ApiSolveResponse = {
  ok: boolean
  status: string
  strategyId: string
  strategyLabel: string
  solverMode: string
  generatedTableStatus: GeneratedTableStatus
  maxDepth: number
  maxNodes?: number
  moves: string[]
  length?: number
  exploredNodes?: number
  replayVerified?: boolean
  visualState?: string
  errorKind?: string
  message?: string
}

const defaultApiBaseUrl = 'http://127.0.0.1:8787'

export const apiSolverBoundary = {
  packageName: 'rubiks-cube-solver-api',
  sourcePath: apiBaseUrl(),
  status: 'unloaded',
} satisfies SolverBoundaryInfo

export const apiSolverLoadingState = {
  packageName: apiSolverBoundary.packageName,
  sourcePath: apiSolverBoundary.sourcePath,
  status: 'loading',
} satisfies SolverBoundaryInfo

let loadPromise: Promise<ApiSolverLoadResult> | undefined

export function loadApiSolver(): Promise<ApiSolverLoadResult> {
  loadPromise ??= loadHttpApiSolver()

  return loadPromise
}

async function loadHttpApiSolver(): Promise<ApiSolverLoadResult> {
  try {
    const [healthResponse, strategiesResponse] = await Promise.all([
      fetch(apiUrl('/health')),
      fetch(apiUrl('/strategies')),
    ])

    if (!healthResponse.ok) {
      return apiUnavailable(`API health check failed with HTTP ${healthResponse.status}`)
    }
    if (!strategiesResponse.ok) {
      return apiUnavailable(`API strategy request failed with HTTP ${strategiesResponse.status}`)
    }

    const strategyOptions = (await strategiesResponse.json()) as SolverStrategyOption[]
    const client = createApiSolverClient(strategyOptions)

    return {
      ...apiSolverBoundary,
      status: 'ready',
      strategyOptions,
      client,
    }
  } catch (error) {
    return apiUnavailable(errorMessage(error, 'Rubik solver API is unavailable.'))
  }
}

function createApiSolverClient(strategyOptions: SolverStrategyOption[]): ApiSolverClient {
  return {
    solverStrategies() {
      return strategyOptions
    },
    async solveNotation(input, limits) {
      try {
        const response = await fetch(apiUrl('/solve-notation'), {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            moves: input,
            maxDepth: limits.maxDepth,
            maxNodes: limits.maxNodes,
            strategyId: limits.strategyId,
          }),
        })
        const payload = (await response.json()) as ApiSolveResponse

        return normalizeSolveResponse(payload, response.ok)
      } catch (error) {
        return apiSolveError(errorMessage(error, 'API scramble solve request failed.'))
      }
    },
  }
}

function normalizeSolveResponse(payload: ApiSolveResponse, httpOk: boolean): SolveResult {
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

function apiSolveError(message: string): SolveFailureResult {
  return {
    status: 'api_error',
    ok: false,
    maxDepth: 0,
    maxNodes: undefined,
    strategyId: 'generated-two-phase-quality',
    strategyLabel: 'Generated two-phase quality solver',
    solverMode: 'generated_two_phase_quality',
    generatedTableStatus: 'unavailable',
    message,
  }
}

function apiUnavailable(message: string): ApiSolverLoadErrorState {
  return {
    ...apiSolverBoundary,
    status: 'api_unavailable',
    message,
  }
}

function apiUrl(path: string): string {
  return `${apiBaseUrl()}${path}`
}

function apiBaseUrl(): string {
  return import.meta.env.VITE_RUBIKS_API_URL ?? defaultApiBaseUrl
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.length > 0) {
    return `${fallback} ${error.message}`
  }

  return fallback
}
