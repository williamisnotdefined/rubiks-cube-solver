import { useEffect, useState } from 'react'
import { ToastProvider } from '@components/Toast'
import { clearTimerPageFocus } from './clearTimerPageFocus'
import { TimerRuntime } from './components/TimerRuntime'
import { TimerScramblePanel } from './components/TimerScramblePanel'
import { TimerSidebar } from './components/TimerSidebar'
import { useTimerScrambleHistory } from './hooks/useTimerScrambleHistory'
import type { TimerStatus } from './types'

export function TimerPage() {
  const [timerStatus, setTimerStatus] = useState<TimerStatus>('idle')
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
        className='flex h-full min-h-0 flex-1 overflow-hidden bg-background px-4 py-4 text-foreground'
        onClickCapture={clearTimerPageFocus}
      >
        <section className='mx-auto grid h-full min-h-0 w-full max-w-7xl grid-rows-[auto_minmax(0,1fr)] gap-2'>
          <TimerScramblePanel scramble={scramble} />
          <div className='grid min-h-0 grid-rows-[minmax(12rem,2fr)_minmax(7rem,1fr)] gap-4 overflow-hidden lg:grid-cols-[minmax(0,1fr)_24rem] lg:grid-rows-none xl:grid-cols-[minmax(0,1fr)_30rem]'>
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
