import cls from 'classnames'
import type { ComponentPropsWithoutRef } from 'react'

type PanelProps = ComponentPropsWithoutRef<'section'>

export function Panel({ children, className, ...props }: PanelProps) {
  return (
    <section
      className={cls('rounded-none border-2 border-foreground bg-card p-4 text-card-foreground shadow-[4px_4px_0_var(--foreground)]', className)}
      {...props}
    >
      {children}
    </section>
  )
}
