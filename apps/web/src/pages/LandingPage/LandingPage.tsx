import { useRef } from 'react'
import { useLocation } from 'react-router'
import { useLandingAberration } from '@src/motion/useLandingAberration'
import { useLandingReveal } from '@src/motion/useLandingReveal'
import { useSmoothScroll } from '@src/motion/useSmoothScroll'
import { localeFromPathname } from '@src/seo/routes'
import { AmbientCube } from './AmbientCube'
import { ChapterGrid } from './ChapterGrid'
import { LandingActs } from './LandingActs'
import { LandingFooter } from './LandingFooter'
import { LandingHero } from './LandingHero'
import { LandingManifesto } from './LandingManifesto'
import { LandingNav } from './LandingNav'

export function LandingPage() {
  const location = useLocation()
  const locale = localeFromPathname(location.pathname)
  const scrollRef = useRef<HTMLElement>(null)

  useSmoothScroll(scrollRef)
  useLandingReveal(scrollRef)
  useLandingAberration(scrollRef)

  return (
    <main
      className='h-full min-h-0 overflow-y-auto overflow-x-hidden bg-background text-foreground'
      data-route-scroll='true'
      ref={scrollRef}
    >
      <div className='landing-page min-w-0'>
        <LandingNav locale={locale} />
        <div className='landing-canvas relative'>
          <AmbientCube />
          <div className='landing-content relative z-10'>
            <LandingHero key={locale} locale={locale} />
            <ChapterGrid locale={locale} />
            <LandingActs locale={locale} />
            <LandingManifesto />
          </div>
        </div>
        <LandingFooter locale={locale} />
      </div>
    </main>
  )
}
