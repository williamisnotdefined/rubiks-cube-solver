import cls from 'classnames'
import * as SwitchPrimitive from '@radix-ui/react-switch'
import type { ComponentPropsWithoutRef } from 'react'

type SwitchProps = ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>

export function Switch({ className, ...props }: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      className={cls(
        'relative inline-flex h-5 w-9 shrink-0 items-center border border-app-border bg-app-surface outline-none transition-colors data-[state=checked]:bg-app-text focus-visible:ring-2 focus-visible:ring-app-focus/50 disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-3 translate-x-1 border border-app-border bg-app-text transition-transform data-[state=checked]:translate-x-5 data-[state=checked]:border-app-inverse data-[state=checked]:bg-app-inverse" />
    </SwitchPrimitive.Root>
  )
}
