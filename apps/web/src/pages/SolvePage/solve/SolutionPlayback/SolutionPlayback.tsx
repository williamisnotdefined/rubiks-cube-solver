import type { ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@components/Button'
import { Card, CardContent } from '@components/Card'

type SolutionPlaybackProps = {
  moves: readonly string[]
  step: number
  onStepChange: (step: number) => void
  onVisualizationRequest?: () => void
}

export function SolutionPlayback({
  moves,
  step,
  onStepChange,
  onVisualizationRequest,
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
    onVisualizationRequest?.()
    onStepChange(Number(event.currentTarget.value))
  }

  function changeStep(nextStep: number) {
    onVisualizationRequest?.()
    onStepChange(nextStep)
  }

  return (
    <Card className='solution-playback w-full max-w-xl'>
      <CardContent aria-label={t('solve.playback.ariaLabel')} className='grid gap-3' role='group'>
        <div className='playback-summary flex items-center justify-between gap-3 text-sm font-medium sm:text-base'>
          <span>{currentLabel}</span>
          <span className='playback-step whitespace-nowrap text-xs text-muted-foreground sm:text-sm'>
            {step} / {moves.length}
            {isFinalStep ? t('solve.playback.solved') : ''}
          </span>
        </div>
        <div className='playback-controls flex items-center gap-3'>
          <Button
            aria-label={t('solve.playback.previousMove')}
            className='playback-button size-10 p-0'
            disabled={step === 0}
            type='button'
            variant='outline'
            onClick={() => changeStep(step - 1)}
          >
            <ChevronLeft aria-hidden='true' size={22} strokeWidth={2.6} />
          </Button>
          <input
            aria-label={t('solve.playback.solutionStep')}
            className='playback-range w-full accent-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring'
            max={moves.length}
            min='0'
            step='1'
            type='range'
            value={step}
            onChange={handleRangeChange}
          />
          <Button
            aria-label={t('solve.playback.nextMove')}
            className='playback-button size-10 p-0'
            disabled={isFinalStep}
            type='button'
            variant='outline'
            onClick={() => changeStep(step + 1)}
          >
            <ChevronRight aria-hidden='true' size={22} strokeWidth={2.6} />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
