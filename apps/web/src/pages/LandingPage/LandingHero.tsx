import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { titleRevealDelay, useRouteTitleReveal } from '@src/motion/routeReveal'
import { useHeroTitleReveal } from '@src/motion/useHeroTitleReveal'
import { localizedPath, type SeoLocale } from '@src/seo/routes'
import { HeroFloatingObjects } from './HeroFloatingObjects'

export function LandingHero({ locale }: { locale: SeoLocale }) {
  const { t } = useTranslation()
  const titleRef = useRef<HTMLHeadingElement>(null)
  const revealTitle = useRouteTitleReveal()

  useHeroTitleReveal(titleRef, {
    delay: titleRevealDelay,
    enabled: revealTitle,
  })

  return (
    <section className='landing-hero min-w-0'>
      <HeroFloatingObjects />
      <div className='landing-hero-copy relative z-10 min-w-0'>
        <div className='mb-8 flex items-center gap-3'>
          <span className='label-mono bg-cube-yellow px-2 py-1 text-foreground'>
            {t('landing.heroKicker')}
          </span>
          <span className='label-mono ml-auto hidden opacity-50 sm:block'>EST. 2026</span>
        </div>

        <h1
          aria-label='Speedcube.com.br'
          className='landing-brand font-display font-extrabold uppercase text-foreground'
          ref={titleRef}
        >
          <span aria-hidden='true' className='landing-brand-line landing-brand-line--speed'>
            <span className='ca-brand' data-hero-brand>
              SPEED
            </span>
          </span>
          <span aria-hidden='true' className='landing-brand-line landing-brand-line--cube'>
            <span className='ca-brand' data-hero-brand>
              CUBE
            </span>
          </span>
          <span className='landing-brand-domain-row'>
            <span aria-hidden='true' className='landing-brand-domain' data-hero-domain>
              .COM.BR
            </span>
          </span>
        </h1>

        <p
          className='ca-subtitle mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg'
          data-landing-reveal='true'
        >
          {t('landing.heroSubtitle')}
        </p>

        <div className='mt-8 flex flex-col gap-3 sm:flex-row sm:items-center'>
          <Link
            className='inline-flex min-h-11 items-center justify-center gap-3 border-2 border-foreground bg-foreground px-5 font-mono text-xs uppercase tracking-[0.18em] text-background shadow-[5px_5px_0_var(--foreground)] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[7px_7px_0_var(--foreground)] focus-visible:ring-[3px] focus-visible:ring-ring/50'
            to={localizedPath('/solve', locale)}
          >
            {t('landing.enter')}
            <span aria-hidden='true'>→</span>
          </Link>
          <Link
            className='inline-flex min-h-11 items-center justify-center gap-3 border-2 border-foreground bg-background px-5 font-mono text-xs uppercase tracking-[0.18em] transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50'
            to={localizedPath('/timer', locale)}
          >
            {t('landing.timer')}
            <span aria-hidden='true'>↗</span>
          </Link>
        </div>

        <p className='landing-scroll-cue label-mono flex items-center gap-2 text-[0.6rem] opacity-50'>
          {t('landing.scroll')}
          <span aria-hidden='true'>↓</span>
        </p>
      </div>
    </section>
  )
}
