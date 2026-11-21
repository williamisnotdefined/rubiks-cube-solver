import cls from 'classnames'
import { useRef, type ComponentPropsWithoutRef } from 'react'
import { titleRevealDelay, useRouteTitleReveal } from '@src/motion/routeReveal'
import { useSplitReveal } from '@src/motion/useSplitReveal'

type PageTitleProps = ComponentPropsWithoutRef<'h1'>

export function PageTitle({ children, className, ...props }: PageTitleProps) {
  const titleRef = useRef<HTMLHeadingElement>(null)
  const revealTitle = useRouteTitleReveal()

  useSplitReveal(titleRef, {
    delay: titleRevealDelay,
    enabled: revealTitle,
  })

  return (
    <h1
      className={cls(
        'font-display text-[clamp(2rem,4.5vw,3.75rem)] font-extrabold uppercase leading-[0.9] tracking-[-0.045em] text-foreground',
        className,
      )}
      data-split='true'
      ref={titleRef}
      {...props}
    >
      {children}
    </h1>
  )
}
