import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ToastProvider } from '@components/Toast'
import { titleRevealDelay, useRouteTitleReveal } from '@src/motion/routeReveal'
import { useSplitReveal } from '@src/motion/useSplitReveal'
import { clearTimerPageFocus } from './clearTimerPageFocus'
import { TimerRuntime } from './components/TimerRuntime'
import { TimerScramblePanel } from './components/TimerScramblePanel'
import { TimerSidebar } from './components/TimerSidebar'
import { useTimerScrambleHistory } from './hooks/useTimerScrambleHistory'
import type { TimerStatus } from './types'

export function TimerPage() {
  const { t } = useTranslation()
  const [timerStatus, setTimerStatus] = useState<TimerStatus>('idle')
  const titleRef = useRef<HTMLDivElement>(null)
  const titleReveal = useRouteTitleReveal()
  useSplitReveal(titleRef, {
    delay: titleRevealDelay,
    enabled: titleReveal,
  })
  const timerLocked =
    timerStatus === 'holding' ||
    timerStatus === 'ready' ||
    timerStatus === 'inspection' ||
    timerStatus === 'running'
  const scramble = useTimerScrambleHistory(timerLocked)

  useEffect(() => {
    clearTimerPageFocus()
  }, [])

  return (
    <ToastProvider>
      <main
        className='flex h-full min-h-0 flex-1 overflow-hidden bg-background px-3 py-3 text-foreground md:px-6 md:py-4'
        data-route-focus='false'
        onClickCapture={clearTimerPageFocus}
      >
        <section className='mx-auto grid h-full min-h-0 w-full max-w-[110rem] grid-rows-[auto_auto_minmax(0,1fr)] gap-3'>
          <header className='flex items-center gap-3 border-b-2 border-foreground pb-2'>
            <span className='label-mono bg-cube-yellow px-2 py-1 text-foreground'>02 / TIMER</span>
            <div
              className='hidden font-display text-lg font-extrabold uppercase tracking-tight sm:block'
              data-split='true'
              ref={titleRef}
            >
              {t('timer.scramble.title')}
            </div>
            <span className='h-0.5 flex-1 bg-foreground' />
            <span className='label-mono hidden shrink-0 opacity-50 sm:block'>
              {t('timer.instructions.short')}
            </span>
          </header>
          <TimerScramblePanel scramble={scramble} />
          <div className='grid min-h-0 grid-rows-[minmax(12rem,2fr)_minmax(7rem,1fr)] gap-4 overflow-hidden lg:grid-cols-[minmax(0,1fr)_26rem] lg:grid-rows-none xl:grid-cols-[minmax(0,1fr)_30rem]'>
            <TimerRuntime
              disabled={scramble.timerDisabled}
              lastCompletedSolveId={scramble.lastCompletedSolveId}
              resetSignal={scramble.timerResetSignal}
              onAttemptStart={scramble.handleAttemptStart}
              onSolveComplete={scramble.handleSolveComplete}
              onStatusChange={setTimerStatus}
            />
            <TimerSidebar />
          </div>
        </section>
      </main>
    </ToastProvider>
  )
}
