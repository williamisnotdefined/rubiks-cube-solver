import cls from 'classnames'
import type { ComponentPropsWithoutRef } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'
type ButtonSize = 'md' | 'sm'

const baseButtonClassName =
  'inline-flex shrink-0 items-center justify-center gap-2 border text-sm font-extrabold uppercase tracking-[0.16em] outline-none transition-colors focus-visible:border-app-text focus-visible:ring-2 focus-visible:ring-app-focus/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0'

const buttonSizeClassNames: Record<ButtonSize, string> = {
  md: 'min-h-12 px-5 py-3',
  sm: 'min-h-10 px-4 py-2',
}

const buttonClassNames: Record<ButtonVariant, string> = {
  ghost:
    'border-transparent bg-transparent text-app-text hover:border-app-border hover:bg-app-surface-raised',
  primary:
    'border-app-text bg-app-text text-app-inverse hover:border-app-text hover:bg-app-text',
  secondary:
    'border-app-border bg-app-surface text-app-text hover:border-app-text hover:bg-app-surface-raised',
}

type ButtonProps = ComponentPropsWithoutRef<'button'> & {
  size?: ButtonSize
  variant?: ButtonVariant
}

export function Button({ className, size = 'md', variant = 'primary', ...props }: ButtonProps) {
  return (
    <button className={cls(baseButtonClassName, buttonSizeClassNames[size], buttonClassNames[variant], className)} {...props} />
  )
}
