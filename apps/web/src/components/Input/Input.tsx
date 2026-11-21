import type { ComponentPropsWithRef } from 'react'
import { cn } from '@src/lib/utils'

function Input({ className, type, ...props }: ComponentPropsWithRef<'input'>) {
  return (
    <input
      className={cn(
        'flex h-10 w-full min-w-0 rounded-none border-2 border-input bg-background px-3 py-1 text-base font-medium shadow-[inset_2px_2px_0_color-mix(in_oklab,var(--foreground)_7%,transparent)] outline-none transition-[color,box-shadow,border-color] selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-sm',
        className,
      )}
      data-slot='input'
      type={type}
      {...props}
    />
  )
}

export { Input }
