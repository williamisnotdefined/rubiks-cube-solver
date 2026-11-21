import cls from 'classnames'
import type { ComponentPropsWithRef } from 'react'
import { formatTimerTime } from '@core/timer/formatTimerTime'

export type TimerDisplayStatus = 'holding' | 'idle' | 'inspection' | 'ready' | 'running' | 'stopped'

type TimerDisplayProps = ComponentPropsWithRef<'div'> & {
  elapsedMs: number
  showMilliseconds?: boolean
  status: TimerDisplayStatus
}

export function TimerDisplay({
  children,
  className,
  elapsedMs,
  ref,
  showMilliseconds = false,
  status,
  ...props
}: TimerDisplayProps) {
  return (
    <div
      ref={ref}
      className={cls(
        'timer-display relative flex min-h-[12rem] w-full cursor-pointer touch-none select-none flex-col items-center justify-center overflow-hidden border-2 border-foreground bg-card px-4 py-8 text-center shadow-[8px_8px_0_var(--foreground)] outline-none transition-colors before:pointer-events-none before:absolute before:right-3 before:top-0 before:font-display before:text-[clamp(4rem,10vw,8rem)] before:font-extrabold before:leading-none before:text-outline before:opacity-20 before:content-["02"] after:pointer-events-none after:absolute after:inset-0 after:halftone after:opacity-10 after:content-[""] focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:min-h-[15rem]',
        {
          'text-foreground': status === 'idle' || status === 'stopped',
          'border-cube-yellow bg-card text-muted-foreground':
            status === 'holding' || status === 'inspection',
          'border-foreground bg-cube-yellow text-foreground': status === 'ready',
          'border-foreground bg-foreground text-background': status === 'running',
        },
        className,
      )}
      role='timer'
      tabIndex={0}
      {...props}
    >
      <span className='relative max-w-full whitespace-nowrap font-mono text-[clamp(3.5rem,22cqi,12rem)] font-black leading-none tracking-[-0.08em] tabular-nums'>
        {formatTimerTime(elapsedMs, { showMilliseconds })}
      </span>
      {children}
    </div>
  )
}
