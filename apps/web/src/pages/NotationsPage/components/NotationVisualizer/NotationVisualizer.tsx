import { useEffect, useRef, useState, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@components/Button'
import { VisualizationLoadLayer } from '@components/VisualizationLoadLayer'
import {
  isVisualizationRegistered,
  useVisualizationRegistration,
} from '@components/VisualizationRegistration'
import type { Movement, Rotation } from '@rubiks-cube-solver/rubiks-cube/core'
import type { RubiksCubeElement } from '@rubiks-cube-solver/rubiks-cube/view'
import type {
  MegaminxMove,
  MegaminxPuzzleElement,
} from '@rubiks-cube-solver/rubiks-cube/puzzles/megaminx'
import type {
  PyraminxMove,
  PyraminxPuzzleElement,
} from '@rubiks-cube-solver/rubiks-cube/puzzles/pyraminx'
import type {
  Square1MoveInput,
  Square1PuzzleElement,
} from '@rubiks-cube-solver/rubiks-cube/puzzles/square1'
import type {
  NotationGuide,
  NotationVisualization,
  NotationVisualizationAction,
} from '../../notationGuides'

type NotationVisualizerProps = {
  guide: NotationGuide
}

type NotationPuzzleElement =
  | RubiksCubeElement
  | MegaminxPuzzleElement
  | PyraminxPuzzleElement
  | Square1PuzzleElement

type DemoStatus =
  | { key: 'applied'; move: string }
  | { key: 'failed'; move: string }
  | { key: 'ready' }
  | { key: 'reset' }
  | { key: 'running'; move: string }

const visualizationAutoLoadDelayMs = 3000

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
  const visualizationKind = visualization?.kind ?? 'cube'
  const puzzleRef = useRef<NotationPuzzleElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const runIdRef = useRef(0)
  const [loadRequested, setLoadRequested] = useState(() =>
    visualization === undefined ? false : isVisualizationRegistered(visualization.kind),
  )
  const { retry, status: registrationStatus } = useVisualizationRegistration(
    visualizationKind,
    loadRequested,
  )
  const registered = registrationStatus === 'ready'
  const [runningAction, setRunningAction] = useState<string | undefined>(undefined)
  const [pendingAction, setPendingAction] = useState<NotationVisualizationAction | undefined>(
    undefined,
  )
  const [status, setStatus] = useState<DemoStatus>({ key: 'ready' })
  const [viewResetIndex, setViewResetIndex] = useState(0)
  const [autoLoadDelayElapsed, setAutoLoadDelayElapsed] = useState(false)
  const [stageNearViewport, setStageNearViewport] = useState(false)

  useEffect(() => {
    if (visualization === undefined) {
      return undefined
    }

    const elementRegistered = isVisualizationRegistered(visualization.kind)
    setLoadRequested(elementRegistered)
    setRunningAction(undefined)
    setPendingAction(undefined)
    setStatus({ key: 'ready' })
    setViewResetIndex(0)
    setAutoLoadDelayElapsed(false)
    setStageNearViewport(false)
    runIdRef.current += 1

    return () => {
      runIdRef.current += 1
    }
  }, [visualization])

  useEffect(() => {
    if (visualization === undefined || loadRequested) {
      return undefined
    }

    const timeout = window.setTimeout(
      () => setAutoLoadDelayElapsed(true),
      visualizationAutoLoadDelayMs,
    )
    return () => window.clearTimeout(timeout)
  }, [loadRequested, visualization])

  useEffect(() => {
    const stage = stageRef.current
    if (visualization === undefined || loadRequested || stage === null) {
      return undefined
    }

    if (!('IntersectionObserver' in window)) {
      setStageNearViewport(true)
      return undefined
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setStageNearViewport(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px' },
    )
    observer.observe(stage)

    return () => {
      observer.disconnect()
    }
  }, [loadRequested, visualization])

  useEffect(() => {
    if (!autoLoadDelayElapsed || !stageNearViewport || loadRequested) {
      return undefined
    }

    const loadWhenVisible = () => {
      if (document.visibilityState !== 'hidden') {
        setLoadRequested(true)
      }
    }

    if (document.visibilityState !== 'hidden') {
      setLoadRequested(true)
      return undefined
    }

    document.addEventListener('visibilitychange', loadWhenVisible)
    return () => document.removeEventListener('visibilitychange', loadWhenVisible)
  }, [autoLoadDelayElapsed, loadRequested, stageNearViewport])

  useEffect(() => {
    if (!registered || pendingAction === undefined || visualization === undefined) {
      return undefined
    }

    const puzzle = puzzleRef.current
    if (puzzle === null) {
      return undefined
    }

    const action = pendingAction
    const actionLabel = notationActionLabel(action)
    const move = notationActionMove(action)
    const runId = runIdRef.current + 1
    let active = true
    runIdRef.current = runId

    void runVisualizationAction(puzzle, visualization, move)
      .then(() => {
        if (active && runIdRef.current === runId) {
          setStatus({ key: 'applied', move: actionLabel })
        }
      })
      .catch(() => {
        if (active && runIdRef.current === runId) {
          setStatus({ key: 'failed', move: actionLabel })
        }
      })
      .finally(() => {
        if (active && runIdRef.current === runId) {
          setPendingAction(undefined)
          setRunningAction(undefined)
        }
      })

    return () => {
      active = false
    }
  }, [pendingAction, registered, visualization])

  if (visualization === undefined) {
    return null
  }
  const activeVisualization = visualization

  const statusLabel =
    'move' in status
      ? t(`notations.page.demoStatus.${status.key}`, { move: status.move })
      : t(`notations.page.demoStatus.${status.key}`)
  const visualizationLoadLabel = loadRequested
    ? t('notations.page.loadingVisualization')
    : t('notations.page.preparingVisualization')

  function handleLoadRequest() {
    setLoadRequested(true)
  }

  function handleAction(action: NotationVisualizationAction) {
    if (runningAction !== undefined) {
      return
    }

    const actionLabel = notationActionLabel(action)
    setRunningAction(actionLabel)
    setStatus({ key: 'running', move: actionLabel })
    setPendingAction(action)

    if (!registered) {
      setLoadRequested(true)
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
    <section className='grid gap-6 py-6'>
      <header className='grid gap-1.5 px-6'>
        <h2 className='text-2xl font-semibold tracking-tight'>{t('notations.page.demoTitle')}</h2>
        <p className='max-w-3xl text-sm leading-6 text-muted-foreground'>
          {t('notations.page.demoDescription')}
        </p>
      </header>
      <div className='grid items-start gap-4 px-6 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]'>
        <div className='flex self-start justify-center lg:justify-start'>
          <div
            aria-label={t('notations.page.visualizationLabel', { puzzle: guide.puzzle })}
            className='cube-stage h-[min(280px,calc(100vw-48px))] w-[min(280px,calc(100vw-48px))] shrink-0 overflow-hidden border bg-card shadow-sm'
            ref={stageRef}
          >
            {registered ? (
              renderVisualizationElement(activeVisualization, puzzleRef, viewResetIndex)
            ) : (
              <VisualizationLoadLayer
                error={registrationStatus === 'error'}
                errorLabel={t('errorBoundary.title')}
                label={t('notations.page.preparingVisualization')}
                loadingLabel={t('notations.page.loadingVisualization')}
                loadRequested={loadRequested}
                retryLabel={t('errorBoundary.retry')}
                onLoadRequest={registrationStatus === 'error' ? retry : handleLoadRequest}
              />
            )}
          </div>
        </div>
        <div className='grid content-start gap-3'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <h3 className='text-sm font-semibold'>{t('notations.page.actionsTitle')}</h3>
            <Button
              size='sm'
              type='button'
              variant='secondary'
              disabled={!registered}
              onClick={handleReset}
            >
              {t('notations.page.reset')}
            </Button>
          </div>
          <div className='grid grid-cols-[repeat(auto-fit,minmax(4rem,1fr))] gap-2'>
            {activeVisualization.actions.map((action) => {
              const actionLabel = notationActionLabel(action)
              const move = notationActionMove(action)

              return (
                <Button
                  key={`${actionLabel}-${move}`}
                  size='sm'
                  type='button'
                  variant={runningAction === actionLabel ? 'primary' : 'secondary'}
                  disabled={runningAction !== undefined}
                  onClick={() => handleAction(action)}
                >
                  <span className='font-mono normal-case tracking-normal'>{actionLabel}</span>
                </Button>
              )
            })}
          </div>
          <p className='text-sm text-muted-foreground' role='status' aria-live='polite'>
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

async function runVisualizationAction(
  puzzle: NotationPuzzleElement,
  visualization: NotationVisualization,
  action: string,
) {
  switch (visualization.kind) {
    case 'cube': {
      const cube = puzzle as RubiksCubeElement
      const { IsRotation, isMovement } = await import('@rubiks-cube-solver/rubiks-cube/core')
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
          className='block size-full brightness-[0.78] saturate-[0.9] contrast-[0.96]'
          ref={puzzleRef as RefObject<RubiksCubeElement | null>}
          animation-speed-ms='180'
          animation-style='exponential'
          camera-peek-angle-horizontal='0.62'
          camera-peek-angle-vertical='0.55'
          camera-radius={cubeCameraRadius[visualization.cubeType]}
          cube-type={visualization.cubeType}
          piece-gap='1.045'
        />
      )
    case 'megaminx':
      return (
        <megaminx-puzzle
          key={`megaminx-${viewResetIndex}`}
          className='block size-full brightness-[0.86] saturate-[0.95] contrast-[0.98]'
          ref={puzzleRef as RefObject<MegaminxPuzzleElement | null>}
          animation-speed-ms='180'
          animation-style='exponential'
          camera-peek-angle-horizontal='0.55'
          camera-peek-angle-vertical='0.55'
          camera-radius='5.4'
          visual-style='stickerless'
        />
      )
    case 'pyraminx':
      return (
        <pyraminx-puzzle
          key={`pyraminx-${viewResetIndex}`}
          className='block size-full brightness-[0.86] saturate-[0.98] contrast-[0.98]'
          ref={puzzleRef as RefObject<PyraminxPuzzleElement | null>}
          animation-speed-ms='180'
          animation-style='exponential'
          camera-field-of-view='56'
          camera-peek-angle-horizontal='0.58'
          camera-peek-angle-vertical='0.58'
          camera-radius='4'
        />
      )
    case 'square1':
      return (
        <square1-puzzle
          key={`square1-${viewResetIndex}`}
          className='block size-full brightness-[0.86] saturate-[0.98] contrast-[0.98]'
          ref={puzzleRef as RefObject<Square1PuzzleElement | null>}
          animation-speed-ms='180'
          animation-style='exponential'
          camera-peek-angle-horizontal='0.55'
          camera-peek-angle-vertical='0.45'
          camera-radius='4.4'
        />
      )
  }
}
