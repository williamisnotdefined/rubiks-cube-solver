import cls from 'classnames'
import type { ComponentPropsWithoutRef } from 'react'

type PageHeaderProps = ComponentPropsWithoutRef<'header'> & {
  surface?: boolean
}

export function PageHeader({ children, className, surface = true, ...props }: PageHeaderProps) {
  return (
    <header
      className={cls('grid gap-3', { 'border border-app-border bg-app-surface p-5': surface }, className)}
      {...props}
    >
      {children}
    </header>
  )
}
