import cls from 'classnames'
import type { ComponentPropsWithoutRef } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

const baseButtonClassName =
  'inline-flex min-h-12 shrink-0 items-center justify-center gap-2 border px-5 py-3 text-sm font-extrabold uppercase tracking-[0.16em] outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0'

const buttonClassNames: Record<ButtonVariant, string> = {
  ghost:
    'border-transparent bg-transparent text-foreground hover:border-border hover:bg-muted',
  primary:
    'border-primary bg-primary text-primary-foreground hover:border-foreground hover:bg-foreground',
  secondary:
    'border-border bg-card text-foreground hover:border-foreground hover:bg-muted',
}

type ButtonProps = ComponentPropsWithoutRef<'button'> & {
  variant?: ButtonVariant
}

export function Button({ className, variant = 'primary', ...props }: ButtonProps) {
  return (
    <button className={cls(baseButtonClassName, buttonClassNames[variant], className)} {...props} />
  )
}
