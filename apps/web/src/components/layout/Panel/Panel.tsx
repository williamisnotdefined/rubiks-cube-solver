import cls from 'classnames'
import type { ComponentPropsWithoutRef } from 'react'

type PanelProps = ComponentPropsWithoutRef<'section'>

export function Panel({ children, className, ...props }: PanelProps) {
  return (
    <section className={cls('rounded-xl border bg-card p-4 text-card-foreground shadow-sm', className)} {...props}>
      {children}
    </section>
  )
}
