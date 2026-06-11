import cls from 'classnames'
import { useEffect, useState } from 'react'
import type { ScramblePuzzleSlug } from '@core/scramble/types'

const puzzleElementName = 'twisty-puzzle'

type PuzzleReplayStageProps = {
  active: boolean
  alg: string
  className?: string
  label: string
  loadingLabel: string
  puzzleSlug: ScramblePuzzleSlug
  replaySupported: boolean
  unavailableLabel: string
}

export function PuzzleReplayStage({
  active,
  alg,
  className,
  label,
  loadingLabel,
  puzzleSlug,
  replaySupported,
  unavailableLabel,
}: PuzzleReplayStageProps) {
  const [registered, setRegistered] = useState(
    () => customElements.get(puzzleElementName) !== undefined,
  )

  useEffect(() => {
    if (!active || !replaySupported) {
      return undefined
    }

    let mounted = true

    async function registerPuzzleElement() {
      if (!customElements.get(puzzleElementName)) {
        const { TwistyPuzzleElement } = await import('@rubiks-cube-solver/rubiks-cube/puzzle')
        TwistyPuzzleElement.register()
      }

      if (mounted) {
        setRegistered(true)
      }
    }

    void registerPuzzleElement()

    return () => {
      mounted = false
    }
  }, [active, replaySupported])

  const ready = active && replaySupported && registered

  return (
    <section
      aria-label={label}
      className={cls(
        'grid min-h-40 border border-app-border bg-app-surface text-app-text',
        className,
      )}
    >
      {ready ? (
        <twisty-puzzle
          alg={alg}
          background="none"
          camera-distance="7"
          className="block size-full min-h-0 min-w-0"
          control-panel="bottom-row"
          puzzle={puzzleSlug}
          visualization="3D"
        />
      ) : (
        <div className="grid min-h-40 place-items-center px-4 text-center text-sm font-semibold text-app-muted">
          {replaySupported ? loadingLabel : unavailableLabel}
        </div>
      )}
    </section>
  )
}
