import type { ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()

  if (moves.length === 0) {
    return null
  }

  const currentLabel =
    step === 0
      ? t('solve.playback.scramble')
      : t('solve.playback.currentMove', { move: moves[step - 1], step })
  const isFinalStep = step === moves.length

  function handleRangeChange(event: ChangeEvent<HTMLInputElement>) {
    onStepChange(Number(event.currentTarget.value))
  }

  return (
    <section
      className="solution-playback grid w-full max-w-xl gap-3 border border-[#2b2b2b] bg-[#101010] p-3"
      aria-label={t('solve.playback.ariaLabel')}
    >
      <div className="playback-summary flex items-center justify-between gap-3 text-sm font-extrabold text-[#f7f7f7] sm:text-base">
        <span>{currentLabel}</span>
        <span className="playback-step whitespace-nowrap text-xs font-bold text-[#a8a8a8] sm:text-sm">
          {step} / {moves.length}
          {isFinalStep ? t('solve.playback.solved') : ''}
        </span>
      </div>
      <div className="playback-controls flex items-center gap-3">
        <Button
          type="button"
          className="playback-button size-12 p-0"
          variant="secondary"
          aria-label={t('solve.playback.previousMove')}
          disabled={step === 0}
          onClick={() => onStepChange(step - 1)}
        >
          <ChevronLeft aria-hidden="true" size={22} strokeWidth={2.6} />
        </Button>
        <input
          className="playback-range w-full accent-[#f7f7f7] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f7f7f7]"
          type="range"
          aria-label={t('solve.playback.solutionStep')}
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
          aria-label={t('solve.playback.nextMove')}
          disabled={isFinalStep}
          onClick={() => onStepChange(step + 1)}
        >
          <ChevronRight aria-hidden="true" size={22} strokeWidth={2.6} />
        </Button>
      </div>
    </section>
  )
}
