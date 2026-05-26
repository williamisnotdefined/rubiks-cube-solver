type WasmPackage = typeof import('../../../../crates/wasm/pkg/rubiks_cube_solver_wasm.js')
type GeneratedSolverStrategyMetadata = ReturnType<WasmPackage['solver_strategy_metadata']>
type GeneratedFaceletValidationResult = ReturnType<WasmPackage['validate_facelet_string']>
type GeneratedFaceletSolveResult = ReturnType<WasmPackage['solve_facelet_string']>
type GeneratedFaceletPlaybackResult = ReturnType<WasmPackage['playback_facelet_solution']>

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
  | 'unavailable_generated_package'
  | 'initialization_failed'

export type SolverBoundaryInfo = {
  packageName: string
  sourcePath: string
  status: SolverStatus
}

export type WasmSolverPendingState = Omit<SolverBoundaryInfo, 'status'> & {
  status: 'unloaded' | 'loading'
}

export type FaceletValidationResult = {
  ok: boolean
  kind?: string
  message?: string
}

export type FaceletSolveLimits = {
  /** Required bounded search depth; omit maxNodes to leave the Rust node budget unbounded. */
  maxDepth: number
  maxNodes?: number
  /** Documented Rust/WASM solver strategy id. Defaults remain bounded IDA* when omitted. */
  strategyId?: string
}

export type GeneratedTableStatus =
  | 'not_required'
  | 'available'
  | 'unavailable'
  | 'corrupt_or_incompatible'

export type FaceletSolveMetadata = {
  maxDepth: number
  maxNodes: number | undefined
  strategyId: string
  strategyLabel: string
  solverMode: string
  generatedTableStatus: GeneratedTableStatus
}

export type FaceletSolveSuccessResult = FaceletSolveMetadata & {
  status: 'success'
  ok: true
  moves: string[]
  length: number
  exploredNodes: number
}

export type FaceletSolveInvalidInputResult = FaceletSolveMetadata & {
  status: 'invalid_input'
  ok: false
  errorKind: string
  message: string
  exploredNodes: undefined
}

export type FaceletSolveNotFoundWithinLimitsResult = FaceletSolveMetadata & {
  status: 'not_found_within_limits'
  ok: false
  message: string
  exploredNodes: number
}

export type FaceletSolveUnsupportedStrategyResult = FaceletSolveMetadata & {
  status: 'unsupported_strategy'
  ok: false
  errorKind: 'unsupported_strategy'
  message: string
  exploredNodes: undefined
}

export type FaceletSolveGeneratedTablesUnavailableResult = FaceletSolveMetadata & {
  status: 'generated_tables_unavailable'
  ok: false
  errorKind: 'generated_tables_unavailable'
  message: string
  exploredNodes: undefined
}

export type FaceletSolveGeneratedTablesCorruptResult = FaceletSolveMetadata & {
  status: 'generated_tables_corrupt'
  ok: false
  errorKind: 'generated_tables_corrupt'
  message: string
  exploredNodes: undefined
}

export type FaceletSolveResult =
  | FaceletSolveSuccessResult
  | FaceletSolveInvalidInputResult
  | FaceletSolveNotFoundWithinLimitsResult
  | FaceletSolveUnsupportedStrategyResult
  | FaceletSolveGeneratedTablesUnavailableResult
  | FaceletSolveGeneratedTablesCorruptResult

export type FaceletPlaybackSuccessResult = {
  status: 'success'
  ok: true
  states: string[]
  initialFacelets: string
  moveStates: string[]
  finalFacelets: string
  finalIsSolved: boolean
}

export type FaceletPlaybackInvalidInputResult = {
  status: 'invalid_input'
  ok: false
  states: string[]
  finalIsSolved: boolean
  errorKind: string
  message: string
}

export type FaceletPlaybackInvalidMoveNotationResult = {
  status: 'invalid_move_notation'
  ok: false
  states: string[]
  finalIsSolved: boolean
  errorKind: 'invalid_move_notation'
  message: string
}

export type FaceletPlaybackResult =
  | FaceletPlaybackSuccessResult
  | FaceletPlaybackInvalidInputResult
  | FaceletPlaybackInvalidMoveNotationResult

export type WasmSolverClient = {
  solverStrategies(): SolverStrategyOption[]
  solvedFacelets(): string
  validateFacelets(input: string): FaceletValidationResult
  solveFacelets(input: string, limits: FaceletSolveLimits): Promise<FaceletSolveResult>
  playbackFacelets(startFacelets: string, moves: string): FaceletPlaybackResult
}

export type WasmSolverReadyState = SolverBoundaryInfo & {
  status: 'ready'
  strategyOptions: SolverStrategyOption[]
  client: WasmSolverClient
}

export type WasmSolverLoadErrorState = SolverBoundaryInfo & {
  status: 'unavailable_generated_package' | 'initialization_failed'
  message: string
}

export type WasmSolverLoadState =
  | WasmSolverPendingState
  | WasmSolverReadyState
  | WasmSolverLoadErrorState

type WasmSolverLoadResult = WasmSolverReadyState | WasmSolverLoadErrorState

type GeneratedPruningTableArtifact = {
  available: boolean
  bytes: Uint8Array
}

const generatedTwoPhaseStrategyId = 'generated-two-phase'
const generatedPruningTableArtifactCount = 5
const emptyGeneratedPruningTableBytes = new Uint8Array()

export const wasmSolverBoundary = {
  packageName: 'rubiks-cube-solver-wasm',
  sourcePath: 'crates/wasm/pkg',
  status: 'unloaded',
} satisfies SolverBoundaryInfo

export const wasmSolverLoadingState = {
  packageName: wasmSolverBoundary.packageName,
  sourcePath: wasmSolverBoundary.sourcePath,
  status: 'loading',
} satisfies SolverBoundaryInfo

let loadPromise: Promise<WasmSolverLoadResult> | undefined

export function loadWasmSolver(): Promise<WasmSolverLoadResult> {
  loadPromise ??= loadGeneratedWasmSolver()

  return loadPromise
}

async function loadGeneratedWasmSolver(): Promise<WasmSolverLoadResult> {
  let wasmModule: WasmPackage

  try {
    wasmModule = await import('../../../../crates/wasm/pkg/rubiks_cube_solver_wasm.js')
  } catch (error) {
    return {
      ...wasmSolverBoundary,
      status: 'unavailable_generated_package',
      message: errorMessage(
        error,
        'Generated WASM package is unavailable. Run npm run wasm:build before starting the web app.',
      ),
    }
  }

  try {
    await wasmModule.default()
  } catch (error) {
    return {
      ...wasmSolverBoundary,
      status: 'initialization_failed',
      message: errorMessage(error, 'Generated WASM package failed to initialize.'),
    }
  }

  const strategyOptions = copySolverStrategyOptions(wasmModule)

  return {
    ...wasmSolverBoundary,
    status: 'ready',
    strategyOptions,
    client: {
      solverStrategies(): SolverStrategyOption[] {
        return [...strategyOptions]
      },
      solvedFacelets: wasmModule.solved_facelet_string,
      validateFacelets(input: string): FaceletValidationResult {
        return copyValidationResult(wasmModule.validate_facelet_string(input))
      },
      async solveFacelets(
        input: string,
        limits: FaceletSolveLimits,
      ): Promise<FaceletSolveResult> {
        const strategyId = limits.strategyId

        if (strategyId === generatedTwoPhaseStrategyId) {
          return solveGeneratedTwoPhaseWithArtifacts(wasmModule, input, limits)
        }

        return copySolveResult(
          strategyId === undefined
            ? wasmModule.solve_facelet_string(input, limits.maxDepth, limits.maxNodes)
            : wasmModule.solve_facelet_string_with_strategy(
                input,
                limits.maxDepth,
                limits.maxNodes,
                strategyId,
              ),
        )
      },
      playbackFacelets(startFacelets: string, moves: string): FaceletPlaybackResult {
        return copyPlaybackResult(
          wasmModule.playback_facelet_solution(startFacelets, moves),
        )
      },
    },
  }
}

async function solveGeneratedTwoPhaseWithArtifacts(
  wasmModule: WasmPackage,
  input: string,
  limits: FaceletSolveLimits,
): Promise<FaceletSolveResult> {
  const artifacts = await fetchGeneratedPruningTableArtifacts(wasmModule)

  return copySolveResult(
    wasmModule.solve_facelet_string_with_generated_pruning_tables(
      input,
      limits.maxDepth,
      limits.maxNodes,
      artifacts[0].available,
      artifacts[0].bytes,
      artifacts[1].available,
      artifacts[1].bytes,
      artifacts[2].available,
      artifacts[2].bytes,
      artifacts[3].available,
      artifacts[3].bytes,
      artifacts[4].available,
      artifacts[4].bytes,
    ),
  )
}

async function fetchGeneratedPruningTableArtifacts(
  wasmModule: WasmPackage,
): Promise<GeneratedPruningTableArtifact[]> {
  const count = wasmModule.generated_pruning_table_artifact_count()

  if (count !== generatedPruningTableArtifactCount) {
    throw new Error(
      `WASM reported ${count} generated pruning-table artifacts; the browser boundary expects ${generatedPruningTableArtifactCount}.`,
    )
  }

  return Promise.all(
    Array.from({ length: count }, (_, index) =>
      fetchGeneratedPruningTableArtifact(wasmModule, index),
    ),
  )
}

async function fetchGeneratedPruningTableArtifact(
  wasmModule: WasmPackage,
  index: number,
): Promise<GeneratedPruningTableArtifact> {
  const fileName = wasmModule.generated_pruning_table_file_name(index)

  try {
    const response = await fetch(generatedPruningTableArtifactUrl(fileName))

    if (!response.ok) {
      return unavailableGeneratedPruningTableArtifact()
    }

    return {
      available: true,
      bytes: new Uint8Array(await response.arrayBuffer()),
    }
  } catch {
    return unavailableGeneratedPruningTableArtifact()
  }
}

function generatedPruningTableArtifactUrl(fileName: string): string {
  const baseUrl = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`

  return `${baseUrl}generated-pruning-tables/${fileName}`
}

function unavailableGeneratedPruningTableArtifact(): GeneratedPruningTableArtifact {
  return {
    available: false,
    bytes: emptyGeneratedPruningTableBytes,
  }
}

function copySolverStrategyOptions(wasmModule: WasmPackage): SolverStrategyOption[] {
  return Array.from({ length: wasmModule.solver_strategy_count() }, (_, index) =>
    copySolverStrategyMetadata(wasmModule.solver_strategy_metadata(index)),
  )
}

function copySolverStrategyMetadata(
  metadata: GeneratedSolverStrategyMetadata,
): SolverStrategyOption {
  try {
    return {
      id: metadata.id,
      label: metadata.label,
      solverMode: metadata.solver_mode,
      statusText: metadata.status_text,
    }
  } finally {
    metadata.free()
  }
}

function copyValidationResult(
  result: GeneratedFaceletValidationResult,
): FaceletValidationResult {
  try {
    return {
      ok: result.ok,
      kind: result.kind,
      message: result.message,
    }
  } finally {
    result.free()
  }
}

function copySolveResult(result: GeneratedFaceletSolveResult): FaceletSolveResult {
  try {
    const maxDepth = result.max_depth
    const maxNodes = result.max_nodes
    const exploredNodes = result.explored_nodes
    const status = result.status
    const strategyId = result.strategy_id
    const metadata = {
      maxDepth,
      maxNodes,
      strategyId,
      strategyLabel: result.strategy_label,
      solverMode: result.solver_mode,
      generatedTableStatus: generatedTableStatusForResult(status, strategyId),
    } satisfies FaceletSolveMetadata

    if (status === 'success') {
      return {
        ...metadata,
        status,
        ok: true,
        moves: [...result.moves],
        length: result.length,
        exploredNodes: exploredNodes ?? 0,
      }
    }

    if (status === 'invalid_input') {
      return {
        ...metadata,
        status,
        ok: false,
        errorKind: result.error_kind ?? 'unknown_validation_error',
        message: result.message ?? 'The Rust engine rejected this facelet input.',
        exploredNodes: undefined,
      }
    }

    if (status === 'not_found_within_limits') {
      return {
        ...metadata,
        status,
        ok: false,
        message:
          result.message ??
          'No solution was found within the configured solver limits.',
        exploredNodes: exploredNodes ?? 0,
      }
    }

    if (status === 'unsupported_strategy') {
      return {
        ...metadata,
        status,
        ok: false,
        errorKind: 'unsupported_strategy',
        message:
          result.message ?? 'The Rust/WASM boundary does not support this solver strategy.',
        exploredNodes: undefined,
      }
    }

    if (status === 'generated_tables_unavailable') {
      return {
        ...metadata,
        status,
        ok: false,
        errorKind: 'generated_tables_unavailable',
        message:
          result.message ??
          'The generated two-phase pruning tables are unavailable in this environment.',
        exploredNodes: undefined,
      }
    }

    if (status === 'generated_tables_corrupt') {
      return {
        ...metadata,
        status,
        ok: false,
        errorKind: 'generated_tables_corrupt',
        message:
          result.message ??
          'The generated two-phase pruning tables are corrupt or incompatible.',
        exploredNodes: undefined,
      }
    }

    throw new Error(`Unexpected WASM solve result status: ${status}`)
  } finally {
    result.free()
  }
}

function generatedTableStatusForResult(
  status: string,
  strategyId: string,
): GeneratedTableStatus {
  if (status === 'generated_tables_unavailable') {
    return 'unavailable'
  }

  if (status === 'generated_tables_corrupt') {
    return 'corrupt_or_incompatible'
  }

  if (strategyId !== generatedTwoPhaseStrategyId) {
    return 'not_required'
  }

  return status === 'success' || status === 'not_found_within_limits'
    ? 'available'
    : 'not_required'
}

function copyPlaybackResult(
  result: GeneratedFaceletPlaybackResult,
): FaceletPlaybackResult {
  try {
    const status = result.status
    const states = [...result.states]
    const finalIsSolved = result.final_is_solved
    const errorKind = result.error_kind
    const message = result.message

    if (status === 'success') {
      const initialFacelets = states[0] ?? ''
      const finalFacelets = states[states.length - 1] ?? initialFacelets

      return {
        status,
        ok: true,
        states,
        initialFacelets,
        moveStates: states.slice(1),
        finalFacelets,
        finalIsSolved,
      }
    }

    if (status === 'invalid_input') {
      return {
        status,
        ok: false,
        states,
        finalIsSolved,
        errorKind: errorKind ?? 'unknown_validation_error',
        message: message ?? 'The Rust engine rejected the starting facelet input.',
      }
    }

    if (status === 'invalid_move_notation') {
      const notationErrorKind =
        errorKind === 'invalid_move_notation' ? errorKind : 'invalid_move_notation'

      return {
        status,
        ok: false,
        states,
        finalIsSolved,
        errorKind: notationErrorKind,
        message: message ?? 'The Rust engine rejected the move notation.',
      }
    }

    throw new Error(`Unexpected WASM playback result status: ${status}`)
  } finally {
    result.free()
  }
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.length > 0) {
    return `${fallback} ${error.message}`
  }

  return fallback
}
