import * as RadixTooltip from '@radix-ui/react-tooltip'
import type { ReactNode } from 'react'

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
            className="z-[60] max-w-xs border border-app-border bg-app-surface-raised px-3 py-2 text-xs font-extrabold uppercase tracking-[0.12em] text-app-text shadow-xl"
            collisionPadding={12}
            sideOffset={8}
          >
            {content}
            <RadixTooltip.Arrow className="fill-app-surface-raised" />
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  )
}
