import cls from 'classnames'
import type { ComponentPropsWithRef } from 'react'

const fieldClassName =
  'h-12 w-full min-w-0 border border-app-border bg-app-control px-4 py-3 text-base text-app-text outline-none transition-colors placeholder:text-app-muted focus-visible:border-app-text focus-visible:ring-2 focus-visible:ring-app-focus/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-app-text md:text-sm'

export function TextInput({ className, ...props }: ComponentPropsWithRef<'input'>) {
  return <input className={cls(fieldClassName, className)} {...props} />
}

export function SelectInput({ className, ...props }: ComponentPropsWithRef<'select'>) {
  return <select className={cls(fieldClassName, 'appearance-auto', className)} {...props} />
}
