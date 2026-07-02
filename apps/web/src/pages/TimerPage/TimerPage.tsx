import { ToastProvider } from '@components/Toast'
import { TimerRuntime } from './components/TimerRuntime'
import { TimerScramblePanel } from './components/TimerScramblePanel'
import { TimerSidebar } from './components/TimerSidebar'
import { useTimerFocusMode } from './hooks/useTimerFocusMode'
import { useTimerScrambleHistory } from './hooks/useTimerScrambleHistory'

export function TimerPage() {
  const timerFocus = useTimerFocusMode()
  const scramble = useTimerScrambleHistory()

  return (
    <ToastProvider>
      <main
        className="flex h-full min-h-0 flex-1 overflow-hidden bg-background px-4 py-4 text-foreground"
        {...timerFocus.timerFocusProps}
      >
        <section className="mx-auto grid h-full min-h-0 w-full max-w-7xl grid-rows-[auto_minmax(0,1fr)] gap-2">
          <TimerScramblePanel scramble={scramble} />
          <div className="grid min-h-0 grid-rows-[minmax(12rem,2fr)_minmax(7rem,1fr)] gap-4 overflow-hidden lg:grid-cols-[minmax(0,1fr)_24rem] lg:grid-rows-none xl:grid-cols-[minmax(0,1fr)_30rem]">
            <TimerRuntime
              disabled={scramble.timerDisabled}
              resetSignal={scramble.timerResetSignal}
              onSolveComplete={scramble.handleSolveComplete}
            />
            <TimerSidebar />
          </div>
        </section>
      </main>
    </ToastProvider>
  )
}
