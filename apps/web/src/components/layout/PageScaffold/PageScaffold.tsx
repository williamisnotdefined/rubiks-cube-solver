import cls from 'classnames'
import { useRef, type ReactNode } from 'react'
import { useSmoothScroll } from '@src/motion/useSmoothScroll'

type PageScaffoldProps = {
  children: ReactNode
  contentClassName: string
  smoothScroll?: boolean
}

export function PageScaffold({
  children,
  contentClassName,
  smoothScroll = false,
}: PageScaffoldProps) {
  const scrollRef = useRef<HTMLElement>(null)
  useSmoothScroll(scrollRef, smoothScroll)

  return (
    <main
      ref={scrollRef}
      className='h-full min-h-0 overflow-y-auto bg-background px-4 py-8 text-foreground md:px-8 md:py-10'
      data-route-scroll='true'
      data-smooth-scroll={smoothScroll ? 'true' : undefined}
    >
      <section className={cls('mx-auto grid w-full gap-6', contentClassName)}>{children}</section>
    </main>
  )
}
