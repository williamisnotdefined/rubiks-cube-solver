import cls from 'classnames'
import type { ComponentPropsWithoutRef } from 'react'
import { formatTimerTime } from '@core/timer/formatTimerTime'

export type TimerDisplayStatus = 'holding' | 'idle' | 'inspection' | 'ready' | 'running' | 'stopped'

type TimerDisplayProps = ComponentPropsWithoutRef<'div'> & {
  elapsedMs: number
  showMilliseconds?: boolean
  status: TimerDisplayStatus
}

export function TimerDisplay({
  className,
  elapsedMs,
  showMilliseconds = false,
  status,
  ...props
}: TimerDisplayProps) {
  return (
    <div
      className={cls(
        'grid min-h-[15rem] w-full cursor-pointer select-none place-items-center border border-app-border bg-app-stage px-4 py-8 text-center font-mono text-[clamp(4rem,20vw,10rem)] font-black leading-none tracking-[-0.08em] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-app-focus/50',
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
      {formatTimerTime(elapsedMs, { showMilliseconds })}
    </div>
  )
}
