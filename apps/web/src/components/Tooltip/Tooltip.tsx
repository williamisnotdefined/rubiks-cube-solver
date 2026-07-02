import * as RadixTooltip from '@radix-ui/react-tooltip'
import type { ReactNode } from 'react'
import { cn } from '@src/lib/utils'

type TooltipProps = {
  children: ReactNode
  content?: ReactNode
  disabled?: boolean
}

export function Tooltip({ children, content, disabled = false }: TooltipProps) {
  if (disabled || content === undefined || content === null || content === '') {
    return children
  }

  return (
    <RadixTooltip.Provider delayDuration={150} skipDelayDuration={0}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            className={cn(
              'z-50 max-w-xs animate-in fade-in-0 zoom-in-95 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground shadow-md data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            )}
            collisionPadding={12}
            sideOffset={8}
          >
            {content}
            <RadixTooltip.Arrow className="fill-primary" />
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  )
}
