import cls from 'classnames'
import type { ComponentPropsWithoutRef } from 'react'

type PageHeaderProps = ComponentPropsWithoutRef<'header'> & {
  surface?: boolean
}

export function PageHeader({ children, className, surface = false, ...props }: PageHeaderProps) {
  return (
    <header
      className={cls(
        'grid gap-4',
        {
          'border-2 border-foreground bg-card p-6 text-card-foreground shadow-[5px_5px_0_var(--foreground)]':
            surface,
        },
        className,
      )}
      {...props}
    >
      {children}
    </header>
  )
}
