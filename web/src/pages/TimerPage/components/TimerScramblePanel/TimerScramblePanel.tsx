import { useTranslation } from 'react-i18next'
import { ScrambleViewer } from '@components/scramble/ScrambleViewer'
import type { TimerScrambleHistory } from '../../hooks/useTimerScrambleHistory'
import { TimerEventSelect } from '../TimerEventSelect'

type TimerScramblePanelProps = {
  scramble: TimerScrambleHistory
}

export function TimerScramblePanel({ scramble }: TimerScramblePanelProps) {
  const { t } = useTranslation()
  const generatedScramble = scramble.generatedScramble

  return (
    <ScrambleViewer
      className="min-h-0"
      canGoPrevious={scramble.canGoPrevious}
      copied={scramble.copied}
      eventControl={<TimerEventSelect />}
      eventLabel={generatedScramble.event.label}
      scramble={scrambleText({
        failed: scramble.scrambleLoadFailed,
        pending: scramble.isScramblePending,
        scramble: generatedScramble.scramble,
        t,
      })}
      onCopy={scramble.isScramblePending || scramble.scrambleLoadFailed ? undefined : scramble.handleCopyScramble}
      onNext={scramble.isScramblePending ? undefined : scramble.handleNextScramble}
      onPrevious={scramble.isScramblePending || scramble.scrambleLoadFailed ? undefined : scramble.handlePreviousScramble}
    />
  )
}

type ScrambleTextOptions = {
  failed: boolean
  pending: boolean
  scramble: string
  t: ReturnType<typeof useTranslation>['t']
}

function scrambleText({ failed, pending, scramble, t }: ScrambleTextOptions): string {
  if (pending) {
    return t('timer.scramble.generating')
  }

  if (failed) {
    return t('timer.scramble.generateFailed')
  }

  return scramble
}
