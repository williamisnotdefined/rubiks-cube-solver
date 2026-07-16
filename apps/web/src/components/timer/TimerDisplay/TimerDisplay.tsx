import cls from 'classnames'
import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import { formatTimerTime } from '@core/timer/formatTimerTime'

export type TimerDisplayStatus = 'holding' | 'idle' | 'inspection' | 'ready' | 'running' | 'stopped'

type TimerDisplayProps = ComponentPropsWithoutRef<'div'> & {
  elapsedMs: number
  showMilliseconds?: boolean
  status: TimerDisplayStatus
}

export const TimerDisplay = forwardRef<HTMLDivElement, TimerDisplayProps>(function TimerDisplay(
  { children, className, elapsedMs, showMilliseconds = false, status, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cls(
        'flex min-h-[12rem] w-full cursor-pointer touch-none select-none flex-col items-center justify-center rounded-xl border bg-card px-4 py-8 text-center shadow-sm outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:min-h-[15rem]',
        {
          'text-foreground': status === 'idle' || status === 'stopped',
          'border-muted-foreground/40 text-muted-foreground':
            status === 'holding' || status === 'inspection',
          'border-primary bg-primary text-primary-foreground': status === 'ready',
          'border-primary text-foreground': status === 'running',
        },
        className,
      )}
      role='timer'
      tabIndex={0}
      {...props}
    >
      <span className='font-mono text-[clamp(4rem,20vw,10rem)] font-bold leading-none tracking-[-0.08em]'>
        {formatTimerTime(elapsedMs, { showMilliseconds })}
      </span>
      {children}
    </div>
  )
})
