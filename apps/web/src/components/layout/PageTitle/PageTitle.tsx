import cls from 'classnames'
import type { ComponentPropsWithoutRef } from 'react'

type PageTitleProps = ComponentPropsWithoutRef<'h1'>

export function PageTitle({ children, className, ...props }: PageTitleProps) {
  return (
    <h1 className={cls('text-2xl font-bold tracking-tight text-foreground', className)} {...props}>
      {children}
    </h1>
  )
}
