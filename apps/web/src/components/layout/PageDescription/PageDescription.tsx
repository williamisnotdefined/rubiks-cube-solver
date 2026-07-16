import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '@src/lib/utils'

export function PageDescription({ className, ...props }: ComponentPropsWithoutRef<'p'>) {
  return (
    <p className={cn('max-w-3xl text-sm leading-6 text-muted-foreground', className)} {...props} />
  )
}
