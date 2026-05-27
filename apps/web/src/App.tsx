import './App.css'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { RubiksCubeElement } from '@houstonp/rubiks-cube/view'
import {
  apiSolverBoundary,
  apiSolverLoadingState,
  loadApiSolver,
  type FaceletSolveResult,
  type ApiSolverLoadState,
} from './api/solverClient'

const defaultNotation = "R2 D2 F2 D L2 F2 U' R2 D B2 L2 U' B' R' B' R2 B2 L B U'"
const defaultMaxDepth = 30
const defaultMaxNodes = 10_000_000
const defaultStrategyId = 'generated-two-phase'

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
  const [maxDepthInput, setMaxDepthInput] = useState(String(defaultMaxDepth))
  const [maxNodesInput, setMaxNodesInput] = useState(String(defaultMaxNodes))
  const [cubeFacelets, setCubeFacelets] = useState('')
  const [solveState, setSolveState] = useState<SolveState>({ status: 'idle' })

  useEffect(() => {
    let active = true

    setSolverState(apiSolverLoadingState)
    loadApiSolver().then((state) => {
      if (!active) {
        return
      }

      setSolverState(state)

      if (state.status === 'ready') {
        setCubeFacelets(state.client.solvedFacelets())
      }
    })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (cubeFacelets.length === 0) {
      return
    }

    const timeout = window.setTimeout(() => {
      try {
        cubeRef.current?.setState(cubeFacelets)
      } catch {
        // The custom element may still be finishing its first connection pass.
      }
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [cubeFacelets])

  const solverClient = solverState.status === 'ready' ? solverState.client : undefined
  const strategyOptions = solverState.status === 'ready' ? solverState.strategyOptions : []
  const selectedStrategy = strategyOptions.find((strategy) => strategy.id === defaultStrategyId)
  const solving = solveState.status === 'solving'
  const loading = solverState.status === 'loading' || solverState.status === 'unloaded'
  const maxDepth = Number(maxDepthInput)
  const maxNodes = Number(maxNodesInput)
  const maxDepthIsValid =
    maxDepthInput.trim().length > 0 && Number.isInteger(maxDepth) && maxDepth >= 0
  const maxNodesIsValid =
    maxNodesInput.trim().length > 0 && Number.isInteger(maxNodes) && maxNodes >= 0
  const disabled =
    solverClient === undefined ||
    solving ||
    notation.trim().length === 0 ||
    selectedStrategy === undefined ||
    !maxDepthIsValid ||
    !maxNodesIsValid

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (solverClient === undefined || !maxDepthIsValid || !maxNodesIsValid) {
      return
    }

    setSolveState({ status: 'solving' })
    await waitForPaint()

    try {
      const result = await solverClient.solveNotation(notation.trim(), {
        maxDepth,
        maxNodes,
        strategyId: defaultStrategyId,
      })

      if (result.status === 'success') {
        if (result.inputFacelets !== undefined) {
          setCubeFacelets(result.inputFacelets)
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

  function handleMaxDepthChange(nextMaxDepth: string) {
    setMaxDepthInput(nextMaxDepth)
    setSolveState({ status: 'idle' })
  }

  function handleMaxNodesChange(nextMaxNodes: string) {
    setMaxNodesInput(nextMaxNodes)
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
        <label className="field field-notation">
          <span className="field-label">Move notation</span>
          <input
            autoComplete="off"
            className="notation-input"
            spellCheck={false}
            value={notation}
            onChange={(event) => handleNotationChange(event.target.value)}
          />
        </label>
        <div className="api-status" aria-live="polite">
          <span className={solverState.status === 'ready' ? 'status-ok' : 'status-bad'}>
            {solverState.status === 'ready' ? 'API connected' : 'API unavailable'}
          </span>
          <span className="status-detail">
            {selectedStrategy?.label ?? 'Generated two-phase solver'}
          </span>
        </div>
        <label className="field field-depth">
          <span className="field-label">Max solution moves</span>
          <input
            className="depth-input"
            inputMode="numeric"
            min="0"
            step="1"
            type="number"
            value={maxDepthInput}
            onChange={(event) => handleMaxDepthChange(event.target.value)}
          />
        </label>
        <label className="field field-nodes">
          <span className="field-label">Max nodes</span>
          <input
            className="nodes-input"
            inputMode="numeric"
            min="0"
            step="1"
            type="number"
            value={maxNodesInput}
            onChange={(event) => handleMaxNodesChange(event.target.value)}
          />
        </label>
        <button type="submit" disabled={disabled}>
          {solving ? <span className="button-loader" aria-hidden="true" /> : 'Solve'}
        </button>
        <p className="strategy-description">
          {selectedStrategy?.statusText ?? 'Run npm run dev to start the API and web app together.'}
        </p>
      </form>

      <output className="result" aria-live="polite">
        {loading || solving ? <span className="loader" aria-label="Loading" /> : null}
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
        {solverState.status === 'api_unavailable' ||
        solverState.status === 'initialization_failed' ? (
          <>
            <span>API unavailable</span>
            <span className="result-meta">{solverState.message} Run npm run dev.</span>
          </>
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

function solveErrorMessage(result: Exclude<FaceletSolveResult, { ok: true }>): string {
  if (result.status === 'invalid_notation') {
    return 'Invalid move notation'
  }

  if (result.status === 'invalid_input') {
    return 'Invalid cube state produced by notation'
  }

  if (result.status === 'not_found_within_limits') {
    return 'No solution within the configured limits'
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

function solveErrorDetail(result: Exclude<FaceletSolveResult, { ok: true }>): string | undefined {
  if (result.status === 'not_found_within_limits') {
    return `${result.strategyLabel} explored ${formatNumber(
      result.exploredNodes ?? 0,
    )} nodes at max depth ${result.maxDepth}.`
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
