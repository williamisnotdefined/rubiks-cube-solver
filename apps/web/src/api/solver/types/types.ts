export type SolverStrategyId = string
export type PuzzleSlug = string

export type ScanFaceSymbol = 'U' | 'R' | 'F' | 'D' | 'L' | 'B'

export type PuzzleStatus = 'stable' | 'experimental' | 'planned' | 'disabled'
export type PuzzleInputKind = 'notation' | 'facelets3x3' | 'scan2x2' | 'scan3x3'
export type PuzzleVisualizationKind = 'cube3-facelets-v1' | 'cube2-facelets-v1' | 'none'

export type PuzzleDefinition = {
  id: string
  slug: PuzzleSlug
  label: string
  family: string
  status: PuzzleStatus
  defaultMetric: 'htm'
  supportedInputs: PuzzleInputKind[]
  supportedVisualizations: PuzzleVisualizationKind[]
  defaultStrategyId?: SolverStrategyId
  strategyIds: SolverStrategyId[]
  scannerSupported: boolean
}

export type SolverStrategyOption = {
  id: SolverStrategyId
  label: string
  solverMode: string
  statusText: string
}

export type PuzzleStrategyOption = SolverStrategyOption & {
  puzzleId: string
  defaultMetric: 'htm'
  supportedMetrics: 'htm'[]
  supportedInputs: PuzzleInputKind[]
}

export type HealthResponse = {
  ok: boolean
  generatedTwoPhaseReady: boolean
  visionOk?: boolean
  visionTileDetectorAvailable?: boolean
  visionTileDetectorReason?: string
}

export type SolveLimits = {
  maxDepth: number
  maxNodes?: number
  strategyId?: string
}

export type GeneratedTableStatus =
  | 'not_required'
  | 'not_applicable'
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
  puzzleId?: string
  puzzleSlug?: PuzzleSlug
  metric?: 'htm'
  visualStateKind?: PuzzleVisualizationKind
  visualState?: string
}

export type SolveSuccessResult = SolveMetadata & {
  status: 'success'
  ok: true
  moves: string[]
  length: number
  exploredNodes: number
  requestElapsedMs: number
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
    | 'node_limit_exceeded'
    | 'strategy_puzzle_mismatch'
    | 'unsupported_input_kind'
    | 'unsupported_metric'
    | 'unsupported_puzzle'
    | 'unknown_puzzle'
    | 'unverified_solution'
    | 'api_error'
  ok: false
  errorKind?: string
  message: string
  exploredNodes?: number
}

export type SolveResult = SolveSuccessResult | SolveFailureResult

type ApiSolveResponseFields = {
  strategyId: string
  strategyLabel: string
  solverMode: string
  generatedTableStatus: GeneratedTableStatus
  puzzleId?: string
  puzzleSlug?: PuzzleSlug
  metric?: 'htm'
  maxDepth: number
  maxNodes?: number | null
  moves: string[]
  length?: number | null
  exploredNodes?: number | null
  elapsedMs?: number | null
  replayVerified?: boolean | null
  visualState?: string | ApiVisualStateResponse | null
  errorKind?: string | null
  message?: string | null
}

export type ApiSolveSuccessResponse = ApiSolveResponseFields & {
  ok: true
  status: 'success'
}

export type ApiSolveFailureResponse = ApiSolveResponseFields & {
  ok: false
  status: string
}

export type ApiSolveResponse = ApiSolveSuccessResponse | ApiSolveFailureResponse

export type ApiVisualStateResponse = {
  kind: PuzzleVisualizationKind
  value: string
}

export type SolveNotationVariables = {
  notation: string
  limits: SolveLimits
}

export type SolvePuzzleNotationVariables = SolveNotationVariables & {
  puzzleSlug: PuzzleSlug
}

export type ScanFacesPayload = Record<ScanFaceSymbol, string>

export type SolveScanVariables = {
  faces: ScanFacesPayload
  limits: SolveLimits
}
