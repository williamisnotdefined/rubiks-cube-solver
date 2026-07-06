import { useEffect, useRef, useState, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@components/Button'
import { VisualizationLoadLayer } from '@components/VisualizationLoadLayer'
import { IsRotation, isMovement, type Movement, type Rotation } from '@rubiks-cube-solver/rubiks-cube/core'
import type { RubiksCubeElement } from '@rubiks-cube-solver/rubiks-cube/view'
import type { MegaminxMove, MegaminxPuzzleElement } from '@rubiks-cube-solver/rubiks-cube/puzzles/megaminx'
import type { PyraminxMove, PyraminxPuzzleElement } from '@rubiks-cube-solver/rubiks-cube/puzzles/pyraminx'
import type { Square1MoveInput, Square1PuzzleElement } from '@rubiks-cube-solver/rubiks-cube/puzzles/square1'
import type { NotationGuide, NotationVisualization, NotationVisualizationAction } from '../../notationGuides'

type NotationVisualizerProps = {
  guide: NotationGuide
}

type NotationPuzzleElement = RubiksCubeElement | MegaminxPuzzleElement | PyraminxPuzzleElement | Square1PuzzleElement

type DemoStatus =
  | { key: 'applied'; move: string }
  | { key: 'failed'; move: string }
  | { key: 'ready' }
  | { key: 'reset' }
  | { key: 'running'; move: string }

const puzzleElementNames = {
  cube: 'rubiks-cube',
  megaminx: 'megaminx-puzzle',
  pyraminx: 'pyraminx-puzzle',
  square1: 'square1-puzzle',
} as const satisfies Record<NotationVisualization['kind'], string>
const idleVisualizationAutoLoadDelayMs = 3000

const cubeCameraRadius = {
  Two: '7.2',
  Three: '6.2',
  Four: '5.8',
  Five: '5.5',
  Six: '5.25',
  Seven: '4.95',
} as const satisfies Record<Extract<NotationVisualization, { kind: 'cube' }>['cubeType'], string>

export function NotationVisualizer({ guide }: NotationVisualizerProps) {
  const { t } = useTranslation()
  const visualization = guide.visualization
  const puzzleRef = useRef<NotationPuzzleElement | null>(null)
  const runIdRef = useRef(0)
  const [registered, setRegistered] = useState(() =>
    visualization === undefined ? false : customElements.get(puzzleElementNames[visualization.kind]) !== undefined,
  )
  const [loadRequested, setLoadRequested] = useState(() => registered)
  const [runningAction, setRunningAction] = useState<string | undefined>(undefined)
  const [status, setStatus] = useState<DemoStatus>({ key: 'ready' })
  const [viewResetIndex, setViewResetIndex] = useState(0)

  useEffect(() => {
    if (visualization === undefined) {
      return undefined
    }

    let fallbackTimeout: number | undefined
    let idleCallbackId: number | undefined
    const elementName = puzzleElementNames[visualization.kind]
    const elementRegistered = customElements.get(elementName) !== undefined
    setRegistered(elementRegistered)
    setLoadRequested(elementRegistered)
    setRunningAction(undefined)
    setStatus({ key: 'ready' })
    setViewResetIndex(0)
    runIdRef.current += 1

    if (!elementRegistered) {
      fallbackTimeout = window.setTimeout(() => {
        fallbackTimeout = undefined

        if (window.requestIdleCallback !== undefined) {
          idleCallbackId = window.requestIdleCallback(() => {
            idleCallbackId = undefined
            setLoadRequested(true)
          }, { timeout: 1500 })
          return
        }

        setLoadRequested(true)
      }, idleVisualizationAutoLoadDelayMs)
    }

    return () => {
      if (fallbackTimeout !== undefined) {
        window.clearTimeout(fallbackTimeout)
      }
      if (idleCallbackId !== undefined) {
        window.cancelIdleCallback(idleCallbackId)
      }
      runIdRef.current += 1
    }
  }, [visualization])

  useEffect(() => {
    if (visualization === undefined || !loadRequested || registered) {
      return undefined
    }

    let mounted = true
    const currentVisualization = visualization
    const elementName = puzzleElementNames[currentVisualization.kind]

    async function registerPuzzleElement() {
      if (!customElements.get(elementName)) {
        await registerVisualizationElement(currentVisualization.kind)
      }

      if (mounted) {
        setRegistered(true)
      }
    }

    void registerPuzzleElement()

    return () => {
      mounted = false
    }
  }, [loadRequested, registered, visualization])

  if (visualization === undefined) {
    return null
  }
  const activeVisualization = visualization

  const statusLabel = 'move' in status
    ? t(`notations.page.demoStatus.${status.key}`, { move: status.move })
    : t(`notations.page.demoStatus.${status.key}`)
  const visualizationLoadLabel = loadRequested
    ? t('notations.page.loadingVisualization')
    : t('notations.page.preparingVisualization')

  function handleLoadRequest() {
    setLoadRequested(true)
  }

  async function handleAction(action: NotationVisualizationAction) {
    const puzzle = puzzleRef.current
    if (puzzle === null || runningAction !== undefined) {
      return
    }

    const actionLabel = notationActionLabel(action)
    const move = notationActionMove(action)
    const runId = runIdRef.current + 1
    runIdRef.current = runId
    setRunningAction(actionLabel)
    setStatus({ key: 'running', move: actionLabel })

    try {
      await runVisualizationAction(puzzle, activeVisualization, move)
      if (runIdRef.current === runId) {
        setStatus({ key: 'applied', move: actionLabel })
      }
    } catch {
      if (runIdRef.current === runId) {
        setStatus({ key: 'failed', move: actionLabel })
      }
    } finally {
      if (runIdRef.current === runId) {
        setRunningAction(undefined)
      }
    }
  }

  function handleReset() {
    const puzzle = puzzleRef.current
    if (puzzle === null) {
      return
    }

    runIdRef.current += 1
    setRunningAction(undefined)

    try {
      puzzle.reset()
      setViewResetIndex((current) => current + 1)
      setStatus({ key: 'reset' })
    } catch {
      setStatus({ key: 'ready' })
    }
  }

  return (
    <section className="grid gap-6 py-6">
      <header className="grid gap-1.5 px-6">
        <h2 className="text-2xl font-semibold tracking-tight">
          {t('notations.page.demoTitle')}
        </h2>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          {t('notations.page.demoDescription')}
        </p>
      </header>
      <div className="grid items-start gap-4 px-6 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
        <div className="flex self-start justify-center lg:justify-start">
          <div
            aria-label={t('notations.page.visualizationLabel', { puzzle: guide.puzzle })}
            className="cube-stage h-[min(280px,calc(100vw-48px))] w-[min(280px,calc(100vw-48px))] shrink-0 overflow-hidden border bg-card shadow-sm"
          >
            {registered ? renderVisualizationElement(activeVisualization, puzzleRef, viewResetIndex) : (
              <VisualizationLoadLayer
                label={t('notations.page.preparingVisualization')}
                loadingLabel={t('notations.page.loadingVisualization')}
                loadRequested={loadRequested}
                onLoadRequest={handleLoadRequest}
              />
            )}
          </div>
        </div>
        <div className="grid content-start gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">
              {t('notations.page.actionsTitle')}
            </h3>
            <Button size="sm" type="button" variant="secondary" disabled={!registered} onClick={handleReset}>
              {t('notations.page.reset')}
            </Button>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(4rem,1fr))] gap-2">
            {activeVisualization.actions.map((action) => {
              const actionLabel = notationActionLabel(action)
              const move = notationActionMove(action)

              return (
                <Button
                  key={`${actionLabel}-${move}`}
                  size="sm"
                  type="button"
                  variant={runningAction === actionLabel ? 'primary' : 'secondary'}
                  disabled={!registered || runningAction !== undefined}
                  onClick={() => {
                    void handleAction(action)
                  }}
                >
                  <span className="font-mono normal-case tracking-normal">{actionLabel}</span>
                </Button>
              )
            })}
          </div>
          <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
            {registered ? statusLabel : visualizationLoadLabel}
          </p>
        </div>
      </div>
    </section>
  )
}

function notationActionLabel(action: NotationVisualizationAction): string {
  return typeof action === 'string' ? action : action.label
}

function notationActionMove(action: NotationVisualizationAction): string {
  return typeof action === 'string' ? action : action.move
}

async function registerVisualizationElement(kind: NotationVisualization['kind']) {
  switch (kind) {
    case 'cube': {
      const { RubiksCubeElement } = await import('@rubiks-cube-solver/rubiks-cube/view')
      RubiksCubeElement.register()
      return
    }
    case 'megaminx': {
      const { MegaminxPuzzleElement } = await import('@rubiks-cube-solver/rubiks-cube/puzzles/megaminx')
      MegaminxPuzzleElement.register()
      return
    }
    case 'pyraminx': {
      const { PyraminxPuzzleElement } = await import('@rubiks-cube-solver/rubiks-cube/puzzles/pyraminx')
      PyraminxPuzzleElement.register()
      return
    }
    case 'square1': {
      const { Square1PuzzleElement } = await import('@rubiks-cube-solver/rubiks-cube/puzzles/square1')
      Square1PuzzleElement.register()
      return
    }
  }
}

async function runVisualizationAction(
  puzzle: NotationPuzzleElement,
  visualization: NotationVisualization,
  action: string,
) {
  switch (visualization.kind) {
    case 'cube': {
      const cube = puzzle as RubiksCubeElement
      if (IsRotation(action)) {
        await cube.rotate(action as Rotation)
        return
      }
      if (isMovement(action)) {
        await cube.move(action as Movement)
        return
      }
      throw new Error(`Unsupported cube visualization action: ${action}`)
    }
    case 'megaminx':
      await (puzzle as MegaminxPuzzleElement).move(action as MegaminxMove)
      return
    case 'pyraminx':
      await (puzzle as PyraminxPuzzleElement).move(action as PyraminxMove)
      return
    case 'square1':
      await (puzzle as Square1PuzzleElement).move(action as Square1MoveInput)
  }
}

function renderVisualizationElement(
  visualization: NotationVisualization,
  puzzleRef: RefObject<NotationPuzzleElement | null>,
  viewResetIndex: number,
) {
  switch (visualization.kind) {
    case 'cube':
      return (
        <rubiks-cube
          key={`cube-${visualization.cubeType}-${viewResetIndex}`}
          className="block size-full brightness-[0.78] saturate-[0.9] contrast-[0.96]"
          ref={puzzleRef as RefObject<RubiksCubeElement | null>}
          animation-speed-ms="180"
          animation-style="exponential"
          camera-peek-angle-horizontal="0.62"
          camera-peek-angle-vertical="0.55"
          camera-radius={cubeCameraRadius[visualization.cubeType]}
          cube-type={visualization.cubeType}
          piece-gap="1.045"
        />
      )
    case 'megaminx':
      return (
        <megaminx-puzzle
          key={`megaminx-${viewResetIndex}`}
          className="block size-full brightness-[0.86] saturate-[0.95] contrast-[0.98]"
          ref={puzzleRef as RefObject<MegaminxPuzzleElement | null>}
          animation-speed-ms="180"
          animation-style="exponential"
          camera-peek-angle-horizontal="0.55"
          camera-peek-angle-vertical="0.55"
          camera-radius="5.4"
          visual-style="stickerless"
        />
      )
    case 'pyraminx':
      return (
        <pyraminx-puzzle
          key={`pyraminx-${viewResetIndex}`}
          className="block size-full brightness-[0.86] saturate-[0.98] contrast-[0.98]"
          ref={puzzleRef as RefObject<PyraminxPuzzleElement | null>}
          animation-speed-ms="180"
          animation-style="exponential"
          camera-field-of-view="56"
          camera-peek-angle-horizontal="0.58"
          camera-peek-angle-vertical="0.58"
          camera-radius="4"
        />
      )
    case 'square1':
      return (
        <square1-puzzle
          key={`square1-${viewResetIndex}`}
          className="block size-full brightness-[0.86] saturate-[0.98] contrast-[0.98]"
          ref={puzzleRef as RefObject<Square1PuzzleElement | null>}
          animation-speed-ms="180"
          animation-style="exponential"
          camera-peek-angle-horizontal="0.55"
          camera-peek-angle-vertical="0.45"
          camera-radius="4.4"
        />
      )
  }
}
