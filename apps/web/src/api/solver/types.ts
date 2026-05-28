export type SolverStrategyId = string

export type SolverStrategyOption = {
  id: SolverStrategyId
  label: string
  solverMode: string
  statusText: string
}

export type HealthResponse = {
  ok: boolean
  generatedTwoPhaseReady: boolean
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

export type ApiSolveResponse = {
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

export type SolveNotationVariables = {
  notation: string
  limits: SolveLimits
}
