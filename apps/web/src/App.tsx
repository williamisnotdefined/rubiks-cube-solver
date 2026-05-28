import './App.css'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { RubiksCubeElement } from '@houstonp/rubiks-cube/view'
import {
  apiSolverBoundary,
  apiSolverLoadingState,
  loadApiSolver,
  type ApiSolverLoadState,
  type SolveResult,
} from './api/solverClient'

const defaultNotation = "R2 D2 F2 D L2 F2 U' R2 D B2 L2 U' B' R' B' R2 B2 L B U'"
const maxMovesLimit = 30
const defaultMaxMoves = maxMovesLimit
const maxNodesMillionOptions = [10, 15, 20, 25] as const
const defaultMaxNodesMillion = 10
const nodesPerMillion = 1_000_000
const fallbackStrategyId = 'generated-two-phase'
const preferredQualityStrategyId = 'generated-two-phase-quality'

if (!customElements.get('rubiks-cube')) {
  RubiksCubeElement.register()
}

type SolveState =
  | { status: 'idle' }
  | { status: 'solving' }
  | {
      status: 'done'
      moves: string[]
      strategyLabel: string
      exploredNodes: number
      solutionLength: number
      generatedTableStatus: string
      replayVerified: boolean
    }
  | { status: 'error'; message: string; detail?: string }

function App() {
  const cubeRef = useRef<RubiksCubeElement | null>(null)
  const [solverState, setSolverState] =
    useState<ApiSolverLoadState>(apiSolverBoundary)
  const [notation, setNotation] = useState(defaultNotation)
  const [maxMovesInput, setMaxMovesInput] = useState(String(defaultMaxMoves))
  const [maxNodesMillionInput, setMaxNodesMillionInput] = useState(
    String(defaultMaxNodesMillion),
  )
  const [cubeVisualState, setCubeVisualState] = useState('')
  const [solveState, setSolveState] = useState<SolveState>({ status: 'idle' })

  useEffect(() => {
    let active = true

    setSolverState(apiSolverLoadingState)
    loadApiSolver().then((state) => {
      if (!active) {
        return
      }

      setSolverState(state)
    })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (cubeVisualState.length === 0) {
      return
    }

    const timeout = window.setTimeout(() => {
      try {
        cubeRef.current?.setState(cubeVisualState)
      } catch {
        // The custom element may still be finishing its first connection pass.
      }
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [cubeVisualState])

  const solverClient = solverState.status === 'ready' ? solverState.client : undefined
  const apiReady = solverClient !== undefined
  const solving = solveState.status === 'solving'
  const buttonLoading = !apiReady || solving
  const strategyId = preferredStrategyId(solverState)
  const maxMoves = Number(maxMovesInput)
  const maxNodesMillion = Number(maxNodesMillionInput)
  const maxNodes = maxNodesMillion * nodesPerMillion
  const maxMovesValidation = validateWholeNumberLimit(
    maxMovesInput,
    'Max moves',
    maxMovesLimit,
  )
  const maxNodesValidation = validateMaxNodesMillionOption(maxNodesMillionInput)
  const localValidationMessage = maxMovesValidation ?? maxNodesValidation
  const disabled =
    !apiReady ||
    solving ||
    notation.trim().length === 0 ||
    localValidationMessage !== undefined

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (solverClient === undefined || localValidationMessage !== undefined) {
      return
    }

    setSolveState({ status: 'solving' })
    await waitForPaint()

    try {
      const limits = {
        maxDepth: maxMoves,
        maxNodes,
        strategyId,
      }
      const result = await solverClient.solveNotation(notation.trim(), limits)

      if (result.status === 'success') {
        if (result.visualState !== undefined) {
          setCubeVisualState(result.visualState)
        }
        setSolveState({
          status: 'done',
          moves: result.moves,
          strategyLabel: result.strategyLabel,
          exploredNodes: result.exploredNodes,
          solutionLength: result.length,
          generatedTableStatus: result.generatedTableStatus,
          replayVerified: result.replayVerified,
        })
        return
      }

      setSolveState({
        status: 'error',
        message: solveErrorMessage(result),
        detail: solveErrorDetail(result),
      })
    } catch {
      setSolveState({ status: 'error', message: 'Error' })
    }
  }

  function handleNotationChange(nextNotation: string) {
    setNotation(nextNotation)
    setSolveState({ status: 'idle' })
  }

  function handleMaxMovesChange(nextMaxMoves: string) {
    setMaxMovesInput(nextMaxMoves)
    setSolveState({ status: 'idle' })
  }

  function handleMaxNodesMillionChange(nextMaxNodesMillion: string) {
    setMaxNodesMillionInput(nextMaxNodesMillion)
    setSolveState({ status: 'idle' })
  }

  return (
    <main className="app-shell">
      <section className="cube-stage" aria-label="Cube visualization">
        <rubiks-cube
          ref={cubeRef}
          animation-speed-ms="180"
          animation-style="exponential"
          camera-peek-angle-horizontal="0.62"
          camera-peek-angle-vertical="0.55"
          camera-radius="5.8"
          cube-type="Three"
          piece-gap="1.045"
        />
      </section>

      <form className="solve-form" onSubmit={handleSubmit}>
        <label className="field field-primary">
          <span className="field-label">Scramble</span>
          <input
            autoComplete="off"
            className="primary-input"
            spellCheck={false}
            value={notation}
            onChange={(event) => handleNotationChange(event.target.value)}
          />
        </label>
        <label className="field field-depth">
          <span className="field-label">Max moves</span>
          <input
            className="depth-input"
            inputMode="numeric"
            max={maxMovesLimit}
            min="0"
            step="1"
            type="number"
            value={maxMovesInput}
            onChange={(event) => handleMaxMovesChange(event.target.value)}
          />
        </label>
        <label className="field field-nodes">
          <span className="field-label">Max nodes (M)</span>
          <select
            className="nodes-input"
            value={maxNodesMillionInput}
            onChange={(event) => handleMaxNodesMillionChange(event.target.value)}
          >
            {maxNodesMillionOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <button
          aria-label={buttonLoading ? 'Loading' : undefined}
          type="submit"
          disabled={disabled}
        >
          {buttonLoading ? <span className="button-loader" aria-hidden="true" /> : 'Solve'}
        </button>
      </form>

      <output className="result" aria-live="polite">
        {solving ? <span className="loader" aria-label="Loading" /> : null}
        {solveState.status === 'done' ? (
          <>
            <code>
              {solveState.moves.length === 0 ? 'Solved' : solveState.moves.join(' ')}
            </code>
            <span className="result-meta">
              {solveState.strategyLabel} - {solveState.solutionLength} moves -{' '}
              {formatNumber(solveState.exploredNodes)} nodes
              {solveState.generatedTableStatus === 'not_required'
                ? ''
                : ` - tables ${solveState.generatedTableStatus}`}
              {solveState.replayVerified ? ' - replay verified' : ''}
            </span>
          </>
        ) : null}
        {solveState.status === 'idle' && localValidationMessage !== undefined ? (
          <span>{localValidationMessage}</span>
        ) : null}
        {solveState.status === 'error' ? (
          <>
            <span>{solveState.message}</span>
            {solveState.detail === undefined ? null : (
              <span className="result-meta">{solveState.detail}</span>
            )}
          </>
        ) : null}
      </output>
    </main>
  )
}

function preferredStrategyId(solverState: ApiSolverLoadState): string {
  if (
    solverState.status === 'ready' &&
    solverState.strategyOptions.some(
      (option) => option.id === preferredQualityStrategyId,
    )
  ) {
    return preferredQualityStrategyId
  }

  return fallbackStrategyId
}

function solveErrorMessage(result: Exclude<SolveResult, { ok: true }>): string {
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

function validateWholeNumberLimit(
  input: string,
  label: string,
  limit: number,
): string | undefined {
  const trimmed = input.trim()
  const value = Number(trimmed)

  if (trimmed.length === 0) {
    return `${label} is required`
  }

  if (!Number.isInteger(value) || value < 0) {
    return `${label} must be a whole number`
  }

  if (value > limit) {
    return `${label} must be ${limit} or less`
  }

  return undefined
}

function validateMaxNodesMillionOption(input: string): string | undefined {
  const trimmed = input.trim()
  const value = Number(trimmed)

  if (trimmed.length === 0) {
    return 'Max nodes (M) is required'
  }

  if (!Number.isInteger(value)) {
    return 'Max nodes (M) must be a whole number'
  }

  if (!maxNodesMillionOptions.some((option) => option === value)) {
    return `Max nodes (M) must be one of ${maxNodesMillionOptions.join(', ')}`
  }

  return undefined
}

function solveErrorDetail(result: Exclude<SolveResult, { ok: true }>): string | undefined {
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

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}

function waitForPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
}

export default App
