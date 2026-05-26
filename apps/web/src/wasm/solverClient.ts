type WasmPackage = typeof import('../../../../crates/wasm/pkg/rubiks_cube_solver_wasm.js')
type GeneratedFaceletValidationResult = ReturnType<WasmPackage['validate_facelet_string']>
type GeneratedFaceletSolveResult = ReturnType<WasmPackage['solve_facelet_string']>
type GeneratedFaceletPlaybackResult = ReturnType<WasmPackage['playback_facelet_solution']>

export type SolverStrategyId = 'bounded-ida-star' | 'two-phase-baseline'

export type SolverStrategyOption = {
  id: SolverStrategyId
  label: string
  mode: string
  description: string
}

export const solverStrategyOptions = [
  {
    id: 'bounded-ida-star',
    label: 'Bounded IDA*',
    mode: 'bounded_ida_star',
    description:
      'Default product path. Searches within the visible depth and node limits and verifies any returned solution in Rust.',
  },
  {
    id: 'two-phase-baseline',
    label: 'Limited two-phase baseline',
    mode: 'limited_two_phase_baseline',
    description:
      'Experimental fixture-backed baseline. Full generated tables are absent, so many valid states honestly report no solution within limits.',
  },
] satisfies SolverStrategyOption[]

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

export type FaceletSolveMetadata = {
  maxDepth: number
  maxNodes: number | undefined
  strategyId: string
  strategyLabel: string
  solverMode: string
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

export type FaceletSolveUnavailableStrategyResult = FaceletSolveMetadata & {
  status: 'unavailable_strategy'
  ok: false
  errorKind: 'unavailable_strategy'
  message: string
  exploredNodes: undefined
}

export type FaceletSolveResult =
  | FaceletSolveSuccessResult
  | FaceletSolveInvalidInputResult
  | FaceletSolveNotFoundWithinLimitsResult
  | FaceletSolveUnsupportedStrategyResult
  | FaceletSolveUnavailableStrategyResult

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
  solvedFacelets(): string
  validateFacelets(input: string): FaceletValidationResult
  solveFacelets(input: string, limits: FaceletSolveLimits): FaceletSolveResult
  playbackFacelets(startFacelets: string, moves: string): FaceletPlaybackResult
}

export type WasmSolverReadyState = SolverBoundaryInfo & {
  status: 'ready'
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

  return {
    ...wasmSolverBoundary,
    status: 'ready',
    client: {
      solvedFacelets: wasmModule.solved_facelet_string,
      validateFacelets(input: string): FaceletValidationResult {
        return copyValidationResult(wasmModule.validate_facelet_string(input))
      },
      solveFacelets(input: string, limits: FaceletSolveLimits): FaceletSolveResult {
        const strategyId = limits.strategyId

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
    const metadata = {
      maxDepth,
      maxNodes,
      strategyId: result.strategy_id,
      strategyLabel: result.strategy_label,
      solverMode: result.solver_mode,
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

    if (status === 'unavailable_strategy') {
      return {
        ...metadata,
        status,
        ok: false,
        errorKind: 'unavailable_strategy',
        message:
          result.message ?? 'The requested solver strategy is known but unavailable.',
        exploredNodes: undefined,
      }
    }

    throw new Error(`Unexpected WASM solve result status: ${status}`)
  } finally {
    result.free()
  }
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
