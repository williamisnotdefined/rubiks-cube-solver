import cls from 'classnames'
import type { ReactNode } from 'react'

type PageScaffoldProps = {
  children: ReactNode
  contentClassName: string
}

export function PageScaffold({ children, contentClassName }: PageScaffoldProps) {
  return (
    <main className="h-full min-h-0 overflow-y-auto bg-app-bg px-3 py-4 text-app-text sm:px-5 sm:py-6">
      <section className={cls('mx-auto grid w-full', contentClassName)}>
        {children}
      </section>
    </main>
  )
}
