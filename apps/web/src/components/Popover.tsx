import cls from 'classnames'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import type { ComponentPropsWithoutRef } from 'react'

export const Popover = PopoverPrimitive.Root
export const PopoverTrigger = PopoverPrimitive.Trigger
export const PopoverAnchor = PopoverPrimitive.Anchor

type PopoverContentProps = ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>

export function PopoverContent({
  align = 'center',
  className,
  sideOffset = 8,
  ...props
}: PopoverContentProps) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        className={cls(
          'z-50 border border-app-border bg-app-surface-raised p-1 shadow-2xl outline-none',
          className,
        )}
        sideOffset={sideOffset}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
}
