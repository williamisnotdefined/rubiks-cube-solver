import cls from 'classnames'
import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import { formatTimerTime } from '@core/timer/formatTimerTime'

export type TimerDisplayStatus = 'holding' | 'idle' | 'inspection' | 'ready' | 'running' | 'stopped'

type TimerDisplayProps = ComponentPropsWithoutRef<'div'> & {
  elapsedMs: number
  showMilliseconds?: boolean
  status: TimerDisplayStatus
}

export const TimerDisplay = forwardRef<HTMLDivElement, TimerDisplayProps>(function TimerDisplay({
  children,
  className,
  elapsedMs,
  showMilliseconds = false,
  status,
  ...props
}, ref) {
  return (
    <div
      ref={ref}
      className={cls(
        'flex min-h-[12rem] w-full cursor-pointer touch-none select-none flex-col items-center justify-center border border-app-border bg-app-stage px-4 py-8 text-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-app-focus/50 sm:min-h-[15rem]',
        {
          'border-app-border text-app-text': status === 'idle' || status === 'stopped',
          'border-app-muted text-app-muted': status === 'holding' || status === 'inspection',
          'border-app-text bg-app-text text-app-inverse': status === 'ready',
          'border-app-text text-app-text': status === 'running',
        },
        className,
      )}
      role="timer"
      tabIndex={0}
      {...props}
    >
      <span className="font-mono text-[clamp(4rem,20vw,10rem)] font-black leading-none tracking-[-0.08em]">
        {formatTimerTime(elapsedMs, { showMilliseconds })}
      </span>
      {children}
    </div>
  )
})
