import cls from 'classnames'
import type { ComponentPropsWithoutRef } from 'react'

type PageTitleProps = ComponentPropsWithoutRef<'h1'>

export function PageTitle({ children, className, ...props }: PageTitleProps) {
  return (
    <h1
      className={cls('text-3xl font-black uppercase tracking-[-0.04em] text-app-text sm:text-5xl', className)}
      {...props}
    >
      {children}
    </h1>
  )
}
