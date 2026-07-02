import type { ComponentPropsWithRef } from 'react'
import { cn } from '@src/lib/utils'

const fieldClassName =
  'flex h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs outline-none transition-[color,box-shadow] selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:ring-destructive/40'

export function TextInput({ className, ...props }: ComponentPropsWithRef<'input'>) {
  return <input className={cn(fieldClassName, className)} data-slot="input" {...props} />
}
