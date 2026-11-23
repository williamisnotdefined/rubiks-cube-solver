import { useRef, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Globe2,
  LayoutDashboard,
  ListTree,
  Store,
  Trophy,
  Video,
} from 'lucide-react'
import { chapterAccents, routeChapters, type RouteChapter } from '@core/navigation/chapters'
import { usePinnedTrack } from '@src/motion/usePinnedTrack'
import { usePrefersReducedMotion } from '@src/motion/usePrefersReducedMotion'
import { localizedPath, type SeoLocale } from '@src/seo/routes'
import { cn } from '@src/lib/utils'

const chapterLinks: Array<{
  chapter: RouteChapter
  icon: typeof LayoutDashboard
  path: string
}> = [
  { chapter: routeChapters.solve, icon: LayoutDashboard, path: '/solve' },
  { chapter: routeChapters.timer, icon: Clock3, path: '/timer' },
  { chapter: routeChapters['algorithms-index'], icon: ListTree, path: '/algorithms' },
  { chapter: routeChapters.notation, icon: BookOpen, path: '/notations/3x3' },
  { chapter: routeChapters.records, icon: Trophy, path: '/records/world' },
  { chapter: routeChapters.channels, icon: Video, path: '/channels' },
  { chapter: routeChapters.sites, icon: Globe2, path: '/sites' },
  { chapter: routeChapters.stores, icon: Store, path: '/stores' },
]

export function ChapterGrid({ locale }: { locale: SeoLocale }) {
  const { t } = useTranslation()
  const sectionRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const reduceMotion = usePrefersReducedMotion()
  const pinned = !reduceMotion

  usePinnedTrack({ enabled: pinned, sectionRef, stageRef, trackRef })

  function scrollRail(direction: -1 | 1) {
    trackRef.current?.scrollBy({
      behavior: 'smooth',
      left: direction * (trackRef.current.clientWidth * 0.8),
    })
  }

  return (
    <section
      className='landing-chapter-story w-full scroll-mt-20 border-t-2 border-foreground'
      id='chapters'
      ref={sectionRef}
    >
      <div className='landing-chapter-stage' ref={stageRef}>
        <div className='landing-chapter-heading grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] xl:items-end'>
          <div data-landing-reveal='true'>
            <div className='mb-4 flex items-center gap-3'>
              <span className='label-mono bg-foreground px-2 py-1 text-background'>
                00 / INDEX
              </span>
              <span className='h-0.5 flex-1 bg-foreground' />
            </div>
            <h2 className='font-display text-[clamp(2.5rem,8cqi,5rem)] font-extrabold uppercase leading-[0.86] tracking-[-0.05em]'>
              {t('landing.chaptersTitle')}
            </h2>
          </div>
          <div className='flex items-end justify-between gap-4 md:justify-self-end'>
            <p
              className='max-w-md text-sm leading-6 text-muted-foreground'
              data-landing-reveal='true'
            >
              {t('landing.chaptersBody')}
            </p>
            <div className='flex shrink-0 gap-2'>
              {!pinned ? (
                <>
                  <button
                    aria-label={t('landing.chaptersPrevious')}
                    className='grid size-9 place-items-center border-2 border-foreground bg-background transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50'
                    onClick={() => scrollRail(-1)}
                    type='button'
                  >
                    <ChevronLeft aria-hidden='true' className='size-4' />
                  </button>
                  <button
                    aria-label={t('landing.chaptersNext')}
                    className='grid size-9 place-items-center border-2 border-foreground bg-background transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50'
                    onClick={() => scrollRail(1)}
                    type='button'
                  >
                    <ChevronRight aria-hidden='true' className='size-4' />
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>

        <div className='landing-chapter-viewport'>
          <div
            aria-label={t('landing.chaptersNav')}
            className='landing-chapter-track'
            ref={trackRef}
          >
            {chapterLinks.map(({ chapter, icon: Icon, path }, index) => {
              const accent = chapterAccents[chapter.accent]

              return (
                <Link
                  className='landing-chapter group relative flex h-44 flex-col justify-between overflow-hidden border-2 border-foreground bg-card p-4 shadow-[5px_5px_0_var(--foreground)] focus-visible:ring-[3px] focus-visible:ring-ring/50'
                  data-landing-reveal='true'
                  key={path}
                  style={{ '--reveal-delay': `${index * 55}ms` } as CSSProperties}
                  to={localizedPath(path, locale)}
                >
                  <div className='flex items-start justify-between gap-4'>
                    <span className={cn('label-mono px-2 py-1', accent.bg, accent.text)}>
                      {chapter.number} / {chapter.code}
                    </span>
                    <Icon aria-hidden='true' className='size-4 shrink-0' />
                  </div>
                  <div className='mt-4'>
                    <span className='font-display text-4xl font-extrabold leading-[0.78] tracking-[-0.07em]'>
                      {chapter.number}
                    </span>
                    <div className='mt-3 flex items-end justify-between gap-3'>
                      <span className='font-display text-base font-bold uppercase leading-none tracking-tight'>
                        {t(chapter.labelKey)}
                      </span>
                      <span
                        aria-hidden='true'
                        className='font-mono text-base transition-transform group-hover:-translate-y-1 group-hover:translate-x-1'
                      >
                        ↗
                      </span>
                    </div>
                  </div>
                  <span
                    aria-hidden='true'
                    className={cn(
                      'absolute -bottom-6 -right-6 size-16 rotate-12 border-2 border-foreground opacity-25 transition-transform group-hover:rotate-0 group-hover:scale-110',
                      accent.bg,
                    )}
                  />
                </Link>
              )
            })}
          </div>
        </div>
        {pinned ? (
          <div aria-hidden='true' className='landing-chapter-progress'>
            <span />
          </div>
        ) : null}
      </div>
    </section>
  )
}
