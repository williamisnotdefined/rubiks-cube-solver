import cls from 'classnames'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { Check } from 'lucide-react'
import type { ComponentPropsWithoutRef } from 'react'

type CheckboxProps = ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>

export function Checkbox({ className, ...props }: CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      className={cls(
        'inline-flex size-5 shrink-0 items-center justify-center border border-app-border bg-app-control text-app-text outline-none transition-colors data-[state=checked]:bg-app-text data-[state=checked]:text-app-inverse focus-visible:ring-2 focus-visible:ring-app-focus/50 disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator>
        <Check aria-hidden="true" className="size-4" strokeWidth={2.4} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}
