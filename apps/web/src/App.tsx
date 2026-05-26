import './App.css'
import { useEffect, useState, type FormEvent } from 'react'
import {
  loadWasmSolver,
  solverStrategyOptions,
  wasmSolverBoundary,
  wasmSolverLoadingState,
  type FaceletPlaybackResult,
  type FaceletSolveLimits,
  type FaceletSolveResult,
  type FaceletValidationResult,
  type SolverStrategyId,
  type WasmSolverLoadState,
} from './wasm/solverClient'

const defaultMaxDepth = '6'
const defaultMaxNodes = '100000'
const defaultSolverStrategyId: SolverStrategyId = 'bounded-ida-star'

const productFlow = [
  'Load the generated WASM package from crates/wasm/pkg.',
  'Read the canonical solved facelet string from Rust.',
  'Validate user-entered facelets through the Rust engine.',
  'Select a documented solver strategy while keeping bounded IDA* as the default.',
  'Request solve results, then replay returned notation through Rust/WASM playback.',
  'Keep parsing, conversion, cube validity, solving, and verification out of React.',
]

function App() {
  const [wasmState, setWasmState] =
    useState<WasmSolverLoadState>(wasmSolverBoundary)
  const [faceletInput, setFaceletInput] = useState('')
  const [maxDepthInput, setMaxDepthInput] = useState(defaultMaxDepth)
  const [maxNodesInput, setMaxNodesInput] = useState(defaultMaxNodes)
  const [solverStrategyId, setSolverStrategyId] = useState<SolverStrategyId>(
    defaultSolverStrategyId,
  )
  const [solveState, setSolveState] = useState<SolveState>({ status: 'idle' })

  useEffect(() => {
    let active = true

    setWasmState(wasmSolverLoadingState)
    loadWasmSolver().then((state) => {
      if (active) {
        setWasmState(state)
      }
    })

    return () => {
      active = false
    }
  }, [])

  const readyClient = wasmState.status === 'ready' ? wasmState.client : undefined
  const solvedFacelets = readyClient?.solvedFacelets()
  const validationResult = readyClient?.validateFacelets(faceletInput)
  const parsedLimits = parseSolveLimits(maxDepthInput, maxNodesInput)
  const selectedSolverStrategy = solverStrategyOptionFor(solverStrategyId)
  const solveLimits =
    parsedLimits.limits === undefined
      ? undefined
      : { ...parsedLimits.limits, strategyId: solverStrategyId }
  const hasLoadError =
    wasmState.status === 'unavailable_generated_package' ||
    wasmState.status === 'initialization_failed'
  const canSubmitSolve =
    readyClient !== undefined &&
    solveLimits !== undefined &&
    solveState.status !== 'solving'

  function updateFaceletInput(nextInput: string) {
    setFaceletInput(nextInput)
    setSolveState({ status: 'idle' })
  }

  function updateMaxDepthInput(nextInput: string) {
    setMaxDepthInput(nextInput)
    setSolveState({ status: 'idle' })
  }

  function updateMaxNodesInput(nextInput: string) {
    setMaxNodesInput(nextInput)
    setSolveState({ status: 'idle' })
  }

  function updateSolverStrategyId(nextStrategyId: SolverStrategyId) {
    setSolverStrategyId(nextStrategyId)
    setSolveState({ status: 'idle' })
  }

  function handleSolveSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (readyClient === undefined) {
      return
    }

    if (solveLimits === undefined) {
      return
    }

    const request = { ...solveLimits }

    setSolveState({ status: 'solving', request })

    try {
      const result = readyClient.solveFacelets(faceletInput, solveLimits)
      let playback: PlaybackState = { status: 'not_requested' }

      if (result.status === 'success') {
        try {
          playback = {
            status: 'result',
            result: readyClient.playbackFacelets(
              faceletInput,
              result.moves.join(' '),
            ),
          }
        } catch (error) {
          playback = {
            status: 'client_error',
            message: errorMessage(
              error,
              'Playback request failed in the frontend WASM boundary.',
            ),
          }
        }
      }

      setSolveState({ status: 'result', request, result, playback })
    } catch (error) {
      setSolveState({
        status: 'client_error',
        request,
        message: errorMessage(
          error,
          'Solve request failed in the frontend WASM boundary.',
        ),
      })
    }
  }

  return (
    <main className="app-shell">
      <section className="hero" aria-labelledby="page-title">
        <div className="hero-copy">
          <p className="eyebrow">Rust-backed cube solving</p>
          <h1 id="page-title">Rubik&apos;s Cube Solver</h1>
          <p className="hero-text">
            A responsive web shell for submitting cube states and validating them
            through the Rust engine before requesting boundary-owned solve results.
          </p>
        </div>
        <div className="boundary-card" aria-label="WASM solver boundary status">
          <span className="boundary-label">WASM boundary</span>
          <strong>{wasmState.packageName}</strong>
          <span className="boundary-status">
            {wasmState.status.replaceAll('_', ' ')}
          </span>
          <p>
            {hasLoadError
              ? wasmState.message
              : `Source: ${wasmState.sourcePath}`}
          </p>
        </div>
      </section>

      <section className="workspace" aria-label="Solver workspace">
        <div className="input-card">
          <div>
            <p className="section-kicker">Cube State</p>
            <h2>Enter facelets</h2>
            <p>
              Use the Kociemba face order expected by the Rust engine. React
              keeps this as user input and delegates validation to WASM.
            </p>
          </div>
          <label className="facelet-label" htmlFor="facelet-input">
            54-character facelet string
          </label>
          <textarea
            id="facelet-input"
            name="facelets"
            placeholder="Paste facelets using U, R, F, D, L, and B stickers in engine face order."
            rows={5}
            value={faceletInput}
            onChange={(event) => updateFaceletInput(event.target.value)}
          />
          <div className="input-actions">
            <button
              type="button"
              disabled={solvedFacelets === undefined}
              onClick={() => updateFaceletInput(solvedFacelets ?? '')}
            >
              Use solved facelets
            </button>
            <span>Validation runs through the generated Rust/WASM package.</span>
          </div>
          <ValidationResultView
            input={faceletInput}
            result={validationResult}
            wasmStatus={wasmState.status}
          />
          <form className="solve-form" onSubmit={handleSolveSubmit}>
            <div>
              <p className="section-kicker">Strategy And Limits</p>
              <h2>Request a solution</h2>
              <p>
                These controls are passed through WASM to the Rust solver. The
                limited two-phase path is experimental while full generated
                tables are absent.
              </p>
            </div>
            <div className="strategy-controls" aria-label="Solver strategy selection">
              <label className="strategy-field" htmlFor="solver-strategy-input">
                <span>solver strategy</span>
                <select
                  id="solver-strategy-input"
                  name="solverStrategy"
                  value={solverStrategyId}
                  onChange={(event) =>
                    updateSolverStrategyId(event.target.value as SolverStrategyId)
                  }
                >
                  {solverStrategyOptions.map((strategy) => (
                    <option key={strategy.id} value={strategy.id}>
                      {strategy.label}
                    </option>
                  ))}
                </select>
                <small>Bounded IDA* is the default product solver.</small>
              </label>
              <div className="strategy-note">
                <strong>{selectedSolverStrategy.label}</strong>
                <span>solver_mode={selectedSolverStrategy.mode}</span>
                <p>{selectedSolverStrategy.description}</p>
              </div>
            </div>
            <div className="limit-controls" aria-label="Configured solver limits">
              <label className="limit-field" htmlFor="max-depth-input">
                <span>max_depth</span>
                <input
                  id="max-depth-input"
                  inputMode="numeric"
                  min="0"
                  name="maxDepth"
                  step="1"
                  type="number"
                  value={maxDepthInput}
                  onChange={(event) => updateMaxDepthInput(event.target.value)}
                />
                <small>Required non-negative integer.</small>
              </label>
              <label className="limit-field" htmlFor="max-nodes-input">
                <span>max_nodes</span>
                <input
                  id="max-nodes-input"
                  inputMode="numeric"
                  min="0"
                  name="maxNodes"
                  step="1"
                  type="number"
                  value={maxNodesInput}
                  onChange={(event) => updateMaxNodesInput(event.target.value)}
                />
                <small>Blank means no node budget.</small>
              </label>
            </div>
            {parsedLimits.error === undefined ? (
              <p className="limit-help">
                Current request: strategy={selectedSolverStrategy.label},
                solver_mode={selectedSolverStrategy.mode}, max_depth={solveLimits?.maxDepth},
                max_nodes={formatOptionalNumber(solveLimits?.maxNodes)}.
              </p>
            ) : (
              <p className="form-error" role="alert">
                {parsedLimits.error}
              </p>
            )}
            <button type="submit" disabled={!canSubmitSolve}>
              {solveButtonLabel(wasmState.status, solveState.status)}
            </button>
          </form>
        </div>

        <aside className="flow-card" aria-labelledby="flow-title">
          <p className="section-kicker">Product Flow</p>
          <h2 id="flow-title">Engine-owned solve path</h2>
          <ol>
            {productFlow.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </aside>
      </section>

      <section className="panel-grid" aria-label="Result panels">
        <SolveResultPanel
          limitError={parsedLimits.error}
          state={solveState}
          wasmState={wasmState}
        />
        <article className="status-panel">
          <div className="status-heading">
            <h2>Generated Package</h2>
            <span>{wasmState.status.replaceAll('_', ' ')}</span>
          </div>
          <p>
            {hasLoadError
              ? wasmState.message
              : 'The component talks only to the frontend WASM boundary.'}
          </p>
        </article>
        <article className="status-panel">
          <div className="status-heading">
            <h2>Solved Facelets</h2>
            <span>{solvedFacelets === undefined ? 'unavailable' : 'ready'}</span>
          </div>
          {solvedFacelets === undefined ? (
            <p>Available after WASM initialization succeeds.</p>
          ) : (
            <code className="facelet-preview">{solvedFacelets}</code>
          )}
        </article>
        <article className="status-panel">
          <div className="status-heading">
            <h2>Validation</h2>
            <span>{validationStatusLabel(validationResult, wasmState.status)}</span>
          </div>
          <p>{validationMessage(faceletInput, validationResult, wasmState.status)}</p>
        </article>
      </section>
    </main>
  )
}

type SolveRequest = FaceletSolveLimits

type SolveState =
  | { status: 'idle' }
  | { status: 'solving'; request: SolveRequest }
  | {
      status: 'result'
      request: SolveRequest
      result: FaceletSolveResult
      playback: PlaybackState
    }
  | { status: 'client_error'; request: SolveRequest; message: string }

type PlaybackState =
  | { status: 'not_requested' }
  | { status: 'result'; result: FaceletPlaybackResult }
  | { status: 'client_error'; message: string }

type ParsedSolveLimits =
  | { limits: FaceletSolveLimits; error?: undefined }
  | { limits?: undefined; error: string }

type SolveResultPanelProps = {
  limitError: string | undefined
  state: SolveState
  wasmState: WasmSolverLoadState
}

function SolveResultPanel({
  limitError,
  state,
  wasmState,
}: SolveResultPanelProps) {
  if (wasmState.status !== 'ready') {
    return (
      <article className="status-panel solve-panel is-loading" aria-live="polite">
        <div className="status-heading">
          <h2>{solveUnavailableTitle(wasmState.status)}</h2>
          <span>{wasmState.status.replaceAll('_', ' ')}</span>
        </div>
        <p>{solveUnavailableMessage(wasmState)}</p>
      </article>
    )
  }

  if (limitError !== undefined) {
    return (
      <article className="status-panel solve-panel is-warning" aria-live="polite">
        <div className="status-heading">
          <h2>Limit input error</h2>
          <span>limits invalid</span>
        </div>
        <p>{limitError}</p>
      </article>
    )
  }

  if (state.status === 'idle') {
    return (
      <article className="status-panel solve-panel" aria-live="polite">
        <div className="status-heading">
          <h2>Solution</h2>
          <span>not requested</span>
        </div>
        <p>
          Enter facelets, confirm the selected strategy and visible limits, then
          submit a solve request through the frontend WASM boundary.
        </p>
      </article>
    )
  }

  if (state.status === 'solving') {
    return (
      <article className="status-panel solve-panel is-loading" aria-live="polite">
        <div className="status-heading">
          <h2>Solving</h2>
          <span>request running</span>
        </div>
        <p>
          Rust/WASM is searching with {strategyLabelForRequest(state.request)},
          max_depth={state.request.maxDepth} and
          max_nodes={formatOptionalNumber(state.request.maxNodes)}.
        </p>
        <RequestMetrics request={state.request} />
      </article>
    )
  }

  if (state.status === 'client_error') {
    return (
      <article className="status-panel solve-panel is-error" aria-live="polite">
        <div className="status-heading">
          <h2>Solve boundary error</h2>
          <span>client error</span>
        </div>
        <p>{state.message}</p>
        <RequestMetrics request={state.request} />
      </article>
    )
  }

  return <SolveResultView result={state.result} playback={state.playback} />
}

type SolveResultViewProps = {
  result: FaceletSolveResult
  playback: PlaybackState
}

function SolveResultView({ result, playback }: SolveResultViewProps) {
  if (result.status === 'success') {
    const hasMoves = result.moves.length > 0

    return (
      <article className="status-panel solve-panel is-success" aria-live="polite">
        <div className="status-heading">
          <h2>Solution</h2>
          <span>{hasMoves ? 'solution found' : 'already solved'}</span>
        </div>
        <p>
          {hasMoves
            ? `Rust/WASM returned a verified move sequence from ${result.strategyLabel} for the submitted facelets.`
            : 'The submitted facelets are already solved; no moves are required.'}
        </p>
        {hasMoves ? (
          <>
            <code className="notation-line">{result.moves.join(' ')}</code>
            <ol className="move-list" aria-label="Solution moves">
              {result.moves.map((move, index) => (
                <li key={`${move}-${index}`}>{move}</li>
              ))}
            </ol>
          </>
        ) : (
          <div className="no-op-result">No-op solution</div>
        )}
        <SolveMetrics result={result} />
        <PlaybackResultView moves={result.moves} playback={playback} />
      </article>
    )
  }

  if (result.status === 'invalid_input') {
    return (
      <article className="status-panel solve-panel is-error" aria-live="polite">
        <div className="status-heading">
          <h2>Validation error</h2>
          <span>{result.errorKind}</span>
        </div>
        <p>{result.message}</p>
        <SolveMetrics result={result} />
      </article>
    )
  }

  if (result.status === 'unsupported_strategy') {
    return (
      <article className="status-panel solve-panel is-error" aria-live="polite">
        <div className="status-heading">
          <h2>Unsupported solver strategy</h2>
          <span>{result.errorKind}</span>
        </div>
        <p>{result.message}</p>
        <SolveMetrics result={result} />
      </article>
    )
  }

  if (result.status === 'unavailable_strategy') {
    return (
      <article className="status-panel solve-panel is-warning" aria-live="polite">
        <div className="status-heading">
          <h2>Solver strategy unavailable</h2>
          <span>{result.errorKind}</span>
        </div>
        <p>{result.message}</p>
        <SolveMetrics result={result} />
      </article>
    )
  }

  return (
    <article className="status-panel solve-panel is-warning" aria-live="polite">
      <div className="status-heading">
        <h2>No solution within limits</h2>
        <span>limits reached</span>
      </div>
      <p>
        {result.strategyLabel} did not find a verified solution under the
        configured limits. {result.message}
      </p>
      <SolveMetrics result={result} />
    </article>
  )
}

type PlaybackResultViewProps = {
  moves: string[]
  playback: PlaybackState
}

function PlaybackResultView({ moves, playback }: PlaybackResultViewProps) {
  if (playback.status === 'not_requested') {
    return null
  }

  if (playback.status === 'client_error') {
    return (
      <div className="playback-result is-invalid">
        <div className="playback-heading">
          <strong>Playback boundary client failure</strong>
          <span>client failure</span>
        </div>
        <p>{playback.message}</p>
      </div>
    )
  }

  const result = playback.result

  if (result.status === 'success') {
    return <SuccessfulPlaybackView moves={moves} result={result} />
  }

  return <PlaybackRejectedView result={result} />
}

type SuccessfulPlaybackViewProps = {
  moves: string[]
  result: Extract<FaceletPlaybackResult, { status: 'success' }>
}

function SuccessfulPlaybackView({ moves, result }: SuccessfulPlaybackViewProps) {
  const [selectedStep, setSelectedStep] = useState(0)
  const lastStep = Math.max(result.states.length - 1, 0)
  const stepCount = result.moveStates.length

  useEffect(() => {
    setSelectedStep(0)
  }, [result])

  useEffect(() => {
    setSelectedStep((step) => Math.min(step, lastStep))
  }, [lastStep])

  if (result.states.length === 0) {
    return (
      <div className="playback-result is-invalid">
        <div className="playback-heading">
          <strong>Playback result incomplete</strong>
          <span>client failure</span>
        </div>
        <p>
          The WASM playback boundary reported success but returned no engine
          states to display.
        </p>
      </div>
    )
  }

  const safeSelectedStep = Math.min(selectedStep, lastStep)
  const selectedFacelets = result.states[safeSelectedStep]
  const atInitialState = safeSelectedStep === 0
  const atFinalStep = safeSelectedStep === lastStep

  return (
    <div
      className={`playback-result ${result.finalIsSolved ? 'is-valid' : 'is-invalid'}`}
    >
      <div className="playback-heading">
        <strong>Engine playback</strong>
        <span>{result.finalIsSolved ? 'final solved' : 'final not solved'}</span>
      </div>
      <p>
        Rust/WASM returned {result.states.length} facelet states for {stepCount}{' '}
        {stepCount === 1 ? 'move step' : 'move steps'}. React only indexes the
        engine-produced states for display.
      </p>
      <div className="playback-step-card" aria-live="polite">
        <div>
          <p className="section-kicker">Selected State</p>
          <h3>{playbackStepTitle(safeSelectedStep, lastStep, moves)}</h3>
        </div>
        <dl className="playback-step-metadata" aria-label="Playback step labels">
          <div>
            <dt>Initial state</dt>
            <dd>Step 0</dd>
          </div>
          <div>
            <dt>Current move step</dt>
            <dd>{playbackMoveStepLabel(safeSelectedStep, moves)}</dd>
          </div>
          <div>
            <dt>Final step</dt>
            <dd>{playbackFinalStepLabel(lastStep, moves)}</dd>
          </div>
          <div>
            <dt>Disabled boundary</dt>
            <dd>{playbackBoundaryLabel(atInitialState, atFinalStep)}</dd>
          </div>
        </dl>
        <div className="playback-controls" aria-label="Playback controls">
          <button
            type="button"
            disabled={atInitialState}
            onClick={() => setSelectedStep((step) => Math.max(0, step - 1))}
          >
            Previous
          </button>
          <button
            type="button"
            disabled={atInitialState}
            onClick={() => setSelectedStep(0)}
          >
            Reset
          </button>
          <button
            type="button"
            disabled={atFinalStep}
            onClick={() => setSelectedStep((step) => Math.min(lastStep, step + 1))}
          >
            Next
          </button>
        </div>
        <FaceletNet facelets={selectedFacelets} />
        <code className="playback-state-code">{selectedFacelets}</code>
      </div>
      <div
        className={`playback-verification ${result.finalIsSolved ? 'is-valid' : 'is-invalid'}`}
      >
        <strong>Engine-backed final solved verification</strong>
        <span>{result.finalIsSolved ? 'solved: true' : 'solved: false'}</span>
      </div>
    </div>
  )
}

type PlaybackRejectedResult = Extract<FaceletPlaybackResult, { ok: false }>

type PlaybackRejectedViewProps = {
  result: PlaybackRejectedResult
}

function PlaybackRejectedView({ result }: PlaybackRejectedViewProps) {
  const isNotationError = result.status === 'invalid_move_notation'

  return (
    <div className="playback-result is-invalid">
      <div className="playback-heading">
        <strong>
          {isNotationError ? 'Playback notation rejected' : 'Playback input rejected'}
        </strong>
        <span>{result.status.replaceAll('_', ' ')}</span>
      </div>
      <p>
        {result.errorKind}: {result.message}
      </p>
    </div>
  )
}

const faceletFaceSpecs = [
  { name: 'U', label: 'Up', start: 0 },
  { name: 'L', label: 'Left', start: 36 },
  { name: 'F', label: 'Front', start: 18 },
  { name: 'R', label: 'Right', start: 9 },
  { name: 'B', label: 'Back', start: 45 },
  { name: 'D', label: 'Down', start: 27 },
] as const

type FaceletNetProps = {
  facelets: string
}

function FaceletNet({ facelets }: FaceletNetProps) {
  return (
    <div className="facelet-net" aria-label="Selected playback facelet net">
      {faceletFaceSpecs.map((face) => (
        <div
          key={face.name}
          className={`facelet-face facelet-face-${face.name.toLowerCase()}`}
          aria-label={`${face.label} face`}
        >
          <span className="facelet-face-label">{face.name}</span>
          <div className="facelet-stickers">
            {Array.from({ length: 9 }, (_, stickerIndex) => {
              const sticker = facelets[face.start + stickerIndex] ?? '?'

              return (
                <span
                  key={`${face.name}-${stickerIndex}`}
                  className="facelet-sticker"
                  data-sticker={sticker}
                  aria-label={`${face.name}${stickerIndex + 1}: ${sticker}`}
                >
                  {sticker}
                </span>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function playbackStepTitle(
  selectedStep: number,
  lastStep: number,
  moves: string[],
): string {
  if (lastStep === 0) {
    return 'Initial state and final step'
  }

  if (selectedStep === 0) {
    return 'Initial state'
  }

  const moveLabel = playbackMoveStepLabel(selectedStep, moves)

  return selectedStep === lastStep ? `Final step: ${moveLabel}` : moveLabel
}

function playbackMoveStepLabel(selectedStep: number, moves: string[]): string {
  if (selectedStep === 0) {
    return 'Step 0: no move applied'
  }

  const move = moves[selectedStep - 1]

  return move === undefined
    ? `After move ${selectedStep}`
    : `After move ${selectedStep}: ${move}`
}

function playbackFinalStepLabel(lastStep: number, moves: string[]): string {
  if (lastStep === 0) {
    return 'Step 0: initial state is final'
  }

  const move = moves[lastStep - 1]

  return move === undefined
    ? `Step ${lastStep}`
    : `Step ${lastStep}: after ${move}`
}

function playbackBoundaryLabel(atInitialState: boolean, atFinalStep: boolean): string {
  if (atInitialState && atFinalStep) {
    return 'Previous, Reset, and Next disabled at the only step'
  }

  if (atInitialState) {
    return 'Previous and Reset disabled at the initial state'
  }

  if (atFinalStep) {
    return 'Next disabled at the final step'
  }

  return 'No disabled boundary controls at this step'
}

type SolveMetricsProps = {
  result: FaceletSolveResult
}

function SolveMetrics({ result }: SolveMetricsProps) {
  const solutionLength = result.status === 'success' ? result.length : 'not available'

  return (
    <dl className="metrics-grid" aria-label="Solver metrics">
      <div>
        <dt>solution_length</dt>
        <dd>{solutionLength}</dd>
      </div>
      <div>
        <dt>strategy</dt>
        <dd>{result.strategyLabel}</dd>
      </div>
      <div>
        <dt>solver_mode</dt>
        <dd>{result.solverMode}</dd>
      </div>
      <div>
        <dt>explored_nodes</dt>
        <dd>{formatOptionalMetric(result.exploredNodes)}</dd>
      </div>
      <div>
        <dt>max_depth</dt>
        <dd>{result.maxDepth}</dd>
      </div>
      <div>
        <dt>max_nodes</dt>
        <dd>{formatOptionalNumber(result.maxNodes)}</dd>
      </div>
    </dl>
  )
}

type RequestMetricsProps = {
  request: SolveRequest
}

function RequestMetrics({ request }: RequestMetricsProps) {
  return (
    <dl className="metrics-grid" aria-label="Requested solver limits">
      <div>
        <dt>strategy</dt>
        <dd>{strategyLabelForRequest(request)}</dd>
      </div>
      <div>
        <dt>solver_mode</dt>
        <dd>{solverModeForRequest(request)}</dd>
      </div>
      <div>
        <dt>max_depth</dt>
        <dd>{request.maxDepth}</dd>
      </div>
      <div>
        <dt>max_nodes</dt>
        <dd>{formatOptionalNumber(request.maxNodes)}</dd>
      </div>
    </dl>
  )
}

type ValidationResultViewProps = {
  input: string
  result: FaceletValidationResult | undefined
  wasmStatus: WasmSolverLoadState['status']
}

function ValidationResultView({
  input,
  result,
  wasmStatus,
}: ValidationResultViewProps) {
  return (
    <div
      className={`validation-result ${result?.ok ? 'is-valid' : 'is-invalid'}`}
      role="status"
    >
      <strong>{validationStatusLabel(result, wasmStatus)}</strong>
      <span>{validationMessage(input, result, wasmStatus)}</span>
    </div>
  )
}

function validationStatusLabel(
  result: FaceletValidationResult | undefined,
  wasmStatus: WasmSolverLoadState['status'],
): string {
  if (wasmStatus !== 'ready') {
    return wasmStatus.replaceAll('_', ' ')
  }

  if (result === undefined) {
    return 'waiting for validation'
  }

  return result.ok ? 'valid facelets' : (result.kind ?? 'invalid facelets')
}

function validationMessage(
  input: string,
  result: FaceletValidationResult | undefined,
  wasmStatus: WasmSolverLoadState['status'],
): string {
  if (wasmStatus !== 'ready') {
    return 'Validation is available after the generated WASM package loads.'
  }

  if (input.length === 0) {
    return 'Enter a facelet string or use the solved facelets from WASM.'
  }

  if (result === undefined) {
    return 'Waiting for validation.'
  }

  return result.message ?? 'The Rust engine accepted this facelet state.'
}

function solverStrategyOptionFor(strategyId: string | undefined) {
  return (
    solverStrategyOptions.find((strategy) => strategy.id === strategyId) ??
    solverStrategyOptions[0]
  )
}

function strategyLabelForRequest(request: SolveRequest): string {
  return solverStrategyOptionFor(request.strategyId).label
}

function solverModeForRequest(request: SolveRequest): string {
  return solverStrategyOptionFor(request.strategyId).mode
}

function parseSolveLimits(
  maxDepthInput: string,
  maxNodesInput: string,
): ParsedSolveLimits {
  const maxDepth = parseNonNegativeInteger(maxDepthInput)

  if (maxDepth === undefined) {
    return { error: 'max_depth must be a non-negative integer.' }
  }

  const normalizedMaxNodes = maxNodesInput.trim()

  if (normalizedMaxNodes.length === 0) {
    return { limits: { maxDepth } }
  }

  const maxNodes = parseNonNegativeInteger(normalizedMaxNodes)

  if (maxNodes === undefined) {
    return {
      error: 'max_nodes must be a non-negative integer or blank for unbounded search.',
    }
  }

  return { limits: { maxDepth, maxNodes } }
}

function parseNonNegativeInteger(input: string): number | undefined {
  const normalized = input.trim()

  if (!/^\d+$/.test(normalized)) {
    return undefined
  }

  const parsed = Number(normalized)

  return Number.isSafeInteger(parsed) ? parsed : undefined
}

function solveButtonLabel(
  wasmStatus: WasmSolverLoadState['status'],
  solveStatus: SolveState['status'],
): string {
  if (wasmStatus === 'loading' || wasmStatus === 'unloaded') {
    return 'Loading WASM solver'
  }

  if (wasmStatus === 'unavailable_generated_package') {
    return 'WASM package unavailable'
  }

  if (wasmStatus === 'initialization_failed') {
    return 'WASM initialization failed'
  }

  return solveStatus === 'solving' ? 'Solving...' : 'Solve with WASM'
}

function solveUnavailableTitle(status: WasmSolverLoadState['status']): string {
  if (status === 'initialization_failed') {
    return 'Solver initialization failed'
  }

  if (status === 'unavailable_generated_package') {
    return 'Generated package unavailable'
  }

  return 'Solver loading'
}

function solveUnavailableMessage(state: WasmSolverLoadState): string {
  if (
    state.status === 'initialization_failed' ||
    state.status === 'unavailable_generated_package'
  ) {
    return state.message
  }

  return 'The solve button is enabled after the generated WASM package loads and initializes.'
}

function formatOptionalNumber(value: number | undefined): string {
  return value === undefined ? 'unbounded' : value.toString()
}

function formatOptionalMetric(value: number | undefined): string {
  return value === undefined ? 'not available' : value.toString()
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.length > 0) {
    return `${fallback} ${error.message}`
  }

  return fallback
}

export default App
