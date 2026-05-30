import cls from 'classnames'
import type { ComponentPropsWithoutRef } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

const baseButtonClassName =
  'inline-flex min-h-12 shrink-0 items-center justify-center gap-2 border px-5 py-3 text-sm font-extrabold uppercase tracking-[0.16em] outline-none transition-colors focus-visible:border-[#f7f7f7] focus-visible:ring-2 focus-visible:ring-[#f7f7f7]/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0'

const buttonClassNames: Record<ButtonVariant, string> = {
  ghost:
    'border-transparent bg-transparent text-[#f7f7f7] hover:border-[#2b2b2b] hover:bg-[#171717]',
  primary:
    'border-[#f7f7f7] bg-[#f7f7f7] text-[#080808] hover:border-[#f7f7f7] hover:bg-[#f7f7f7]',
  secondary:
    'border-[#2b2b2b] bg-[#101010] text-[#f7f7f7] hover:border-[#f7f7f7] hover:bg-[#171717]',
}

type ButtonProps = ComponentPropsWithoutRef<'button'> & {
  variant?: ButtonVariant
}

export function Button({ className, variant = 'primary', ...props }: ButtonProps) {
  return (
    <button className={cls(baseButtonClassName, buttonClassNames[variant], className)} {...props} />
  )
}
