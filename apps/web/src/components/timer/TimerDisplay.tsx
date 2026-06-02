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
        'grid min-h-[15rem] w-full cursor-pointer select-none place-items-center border border-[#2b2b2b] bg-[#090909] px-4 py-8 text-center font-mono text-[clamp(4rem,20vw,10rem)] font-black leading-none tracking-[-0.08em] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#f7f7f7]/50',
        {
          'border-[#2b2b2b] text-[#f7f7f7]': status === 'idle' || status === 'stopped',
          'border-[#a8a8a8] text-[#a8a8a8]': status === 'holding' || status === 'inspection',
          'border-[#f7f7f7] bg-[#f7f7f7] text-[#080808]': status === 'ready',
          'border-[#f7f7f7] text-[#f7f7f7]': status === 'running',
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
