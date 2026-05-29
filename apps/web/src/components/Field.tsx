import cls from 'classnames'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'

type FieldProps = ComponentPropsWithoutRef<'label'> & {
  children: ReactNode
  label: string
}

export function Field({ children, className, label, ...props }: FieldProps) {
  return (
    <label className={cls('grid min-w-0 gap-2', className)} {...props}>
      <span className="text-xs font-extrabold uppercase leading-none tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  )
}
