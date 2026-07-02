import cls from 'classnames'
import type { ReactNode } from 'react'

type PageScaffoldProps = {
  children: ReactNode
  contentClassName: string
}

export function PageScaffold({ children, contentClassName }: PageScaffoldProps) {
  return (
    <main className="h-full min-h-0 overflow-y-auto bg-background px-4 py-6 text-foreground">
      <section className={cls('mx-auto grid w-full', contentClassName)}>
        {children}
      </section>
    </main>
  )
}
