import cls from 'classnames'
import type { ComponentPropsWithoutRef } from 'react'

type PanelProps = ComponentPropsWithoutRef<'section'>

export function Panel({ children, className, ...props }: PanelProps) {
  return (
    <section className={cls('border border-app-border bg-app-surface p-4', className)} {...props}>
      {children}
    </section>
  )
}
