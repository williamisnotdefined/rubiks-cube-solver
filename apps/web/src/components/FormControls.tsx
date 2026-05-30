import cls from 'classnames'
import type { ComponentPropsWithRef } from 'react'

const fieldClassName =
  'h-12 w-full min-w-0 border border-[#2b2b2b] bg-[#151515] px-4 py-3 text-base text-[#f7f7f7] outline-none transition-colors placeholder:text-[#a8a8a8] focus-visible:border-[#f7f7f7] focus-visible:ring-2 focus-visible:ring-[#f7f7f7]/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-[#f7f7f7] md:text-sm'

export function TextInput({ className, ...props }: ComponentPropsWithRef<'input'>) {
  return <input className={cls(fieldClassName, className)} {...props} />
}

export function SelectInput({ className, ...props }: ComponentPropsWithRef<'select'>) {
  return <select className={cls(fieldClassName, 'appearance-auto', className)} {...props} />
}
