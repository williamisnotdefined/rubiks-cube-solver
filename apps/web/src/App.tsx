import './App.css'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { RubiksCubeElement } from '@houstonp/rubiks-cube/view'
import {
  loadWasmSolver,
  wasmSolverBoundary,
  wasmSolverLoadingState,
  type WasmSolverLoadState,
} from './wasm/solverClient'

const defaultScramble = "R2 D2 F2 D L2 F2 U' R2 D B2 L2 U' B' R' B' R2 B2 L B U'"
const maxDepth = 20
const maxNodes = 1_000_000

if (!customElements.get('rubiks-cube')) {
  RubiksCubeElement.register()
}

type SolveState =
  | { status: 'idle' }
  | { status: 'solving' }
  | { status: 'done'; moves: string[] }
  | { status: 'error'; message: string }

function App() {
  const cubeRef = useRef<RubiksCubeElement | null>(null)
  const [solverState, setSolverState] =
    useState<WasmSolverLoadState>(wasmSolverBoundary)
  const [scramble, setScramble] = useState(defaultScramble)
  const [facelets, setFacelets] = useState('')
  const [solveState, setSolveState] = useState<SolveState>({ status: 'idle' })

  useEffect(() => {
    let active = true

    setSolverState(wasmSolverLoadingState)
    loadWasmSolver().then((state) => {
      if (!active) {
        return
      }

      setSolverState(state)

      if (state.status === 'ready') {
        setFacelets(state.client.solvedFacelets())
      }
    })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (facelets.length === 0) {
      return
    }

    const timeout = window.setTimeout(() => {
      try {
        cubeRef.current?.setState(facelets)
      } catch {
        // The custom element may still be finishing its first connection pass.
      }
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [facelets])

  const solverClient = solverState.status === 'ready' ? solverState.client : undefined
  const solving = solveState.status === 'solving'
  const loading = solverState.status === 'loading' || solverState.status === 'unloaded'
  const disabled = solverClient === undefined || solving || scramble.trim().length === 0

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (solverClient === undefined) {
      return
    }

    setSolveState({ status: 'solving' })
    await waitForPaint()

    try {
      const playback = solverClient.playbackFacelets(
        solverClient.solvedFacelets(),
        scramble.trim(),
      )

      if (!playback.ok) {
        setSolveState({ status: 'error', message: 'Invalid scramble' })
        return
      }

      setFacelets(playback.finalFacelets)
      await waitForPaint()

      const result = await solverClient.solveFacelets(playback.finalFacelets, {
        maxDepth,
        maxNodes,
      })

      if (result.status === 'success') {
        setSolveState({ status: 'done', moves: result.moves })
        return
      }

      setSolveState({ status: 'error', message: 'No solution' })
    } catch {
      setSolveState({ status: 'error', message: 'Error' })
    }
  }

  function handleScrambleChange(nextScramble: string) {
    setScramble(nextScramble)
    setSolveState({ status: 'idle' })
  }

  return (
    <main className="app-shell">
      <section className="cube-stage" aria-label="Cube state">
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
        <input
          aria-label="Scramble"
          autoComplete="off"
          className="scramble-input"
          spellCheck={false}
          value={scramble}
          onChange={(event) => handleScrambleChange(event.target.value)}
        />
        <button type="submit" disabled={disabled}>
          {solving ? <span className="button-loader" aria-hidden="true" /> : 'Solve'}
        </button>
      </form>

      <output className="result" aria-live="polite">
        {loading || solving ? <span className="loader" aria-label="Loading" /> : null}
        {solveState.status === 'done' ? (
          <code>{solveState.moves.length === 0 ? 'Solved' : solveState.moves.join(' ')}</code>
        ) : null}
        {solverState.status === 'unavailable_generated_package' ||
        solverState.status === 'initialization_failed' ? (
          <span>WASM unavailable</span>
        ) : null}
        {solveState.status === 'error' ? <span>{solveState.message}</span> : null}
      </output>
    </main>
  )
}

function waitForPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
}

export default App
