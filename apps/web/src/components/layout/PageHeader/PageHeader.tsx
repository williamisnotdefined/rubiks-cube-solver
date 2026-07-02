import cls from 'classnames'
import type { ComponentPropsWithoutRef } from 'react'

type PageHeaderProps = ComponentPropsWithoutRef<'header'> & {
  surface?: boolean
}

export function PageHeader({ children, className, surface = false, ...props }: PageHeaderProps) {
  return (
    <header
      className={cls('grid gap-3', { 'rounded-xl border bg-card p-6 text-card-foreground shadow-sm': surface }, className)}
      {...props}
    >
      {children}
    </header>
  )
}
