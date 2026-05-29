import cls from 'classnames'
import type { ComponentPropsWithRef } from 'react'

const fieldClassName =
  'h-12 w-full min-w-0 border border-border bg-input px-4 py-3 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-primary md:text-sm'

export function TextInput({ className, ...props }: ComponentPropsWithRef<'input'>) {
  return <input className={cls(fieldClassName, className)} {...props} />
}

export function SelectInput({ className, ...props }: ComponentPropsWithRef<'select'>) {
  return <select className={cls(fieldClassName, 'appearance-auto', className)} {...props} />
}
