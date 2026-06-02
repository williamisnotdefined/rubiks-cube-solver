import cls from 'classnames'
import type { ComponentPropsWithoutRef } from 'react'

type PanelProps = ComponentPropsWithoutRef<'section'>

export function Panel({ children, className, ...props }: PanelProps) {
  return (
    <section className={cls('border border-[#2b2b2b] bg-[#101010] p-4', className)} {...props}>
      {children}
    </section>
  )
}
