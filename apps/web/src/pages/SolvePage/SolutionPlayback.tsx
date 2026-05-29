import type { ChangeEvent } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@components/Button'

type SolutionPlaybackProps = {
  moves: readonly string[]
  step: number
  onStepChange: (step: number) => void
}

export function SolutionPlayback({
  moves,
  step,
  onStepChange,
}: SolutionPlaybackProps) {
  if (moves.length === 0) {
    return null
  }

  const currentLabel = step === 0 ? 'Scramble' : `Move ${step}: ${moves[step - 1]}`
  const isFinalStep = step === moves.length

  function handleRangeChange(event: ChangeEvent<HTMLInputElement>) {
    onStepChange(Number(event.currentTarget.value))
  }

  return (
    <section
      className="solution-playback grid w-full max-w-xl gap-3 border border-border bg-card p-3"
      aria-label="Solution playback"
    >
      <div className="playback-summary flex items-center justify-between gap-3 text-sm font-extrabold text-foreground sm:text-base">
        <span>{currentLabel}</span>
        <span className="playback-step whitespace-nowrap text-xs font-bold text-muted-foreground sm:text-sm">
          {step} / {moves.length}
          {isFinalStep ? ' solved' : ''}
        </span>
      </div>
      <div className="playback-controls flex items-center gap-3">
        <Button
          type="button"
          className="playback-button size-12 p-0"
          variant="secondary"
          aria-label="Previous move"
          disabled={step === 0}
          onClick={() => onStepChange(step - 1)}
        >
          <ChevronLeft aria-hidden="true" size={22} strokeWidth={2.6} />
        </Button>
        <input
          className="playback-range w-full accent-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          type="range"
          aria-label="Solution step"
          min="0"
          max={moves.length}
          step="1"
          value={step}
          onChange={handleRangeChange}
        />
        <Button
          type="button"
          className="playback-button size-12 p-0"
          variant="secondary"
          aria-label="Next move"
          disabled={isFinalStep}
          onClick={() => onStepChange(step + 1)}
        >
          <ChevronRight aria-hidden="true" size={22} strokeWidth={2.6} />
        </Button>
      </div>
    </section>
  )
}
