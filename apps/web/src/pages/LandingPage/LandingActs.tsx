import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { localizedPath, type SeoLocale } from '@src/seo/routes'
import { cn } from '@src/lib/utils'

const acts = [
  {
    accent: 'bg-cube-blue text-cube-white',
    bodyKey: 'landing.solveBody',
    path: '/solve',
    titleKey: 'navigation.solve',
    visual: 'solve',
  },
  {
    accent: 'bg-cube-yellow text-foreground',
    bodyKey: 'landing.timerBody',
    path: '/timer',
    titleKey: 'navigation.timer',
    visual: 'timer',
  },
  {
    accent: 'bg-cube-green text-cube-white',
    bodyKey: 'landing.learnBody',
    path: '/algorithms',
    titleKey: 'navigation.groups.learn',
    visual: 'learn',
  },
] as const

export function LandingActs({ locale }: { locale: SeoLocale }) {
  const { t } = useTranslation()

  return (
    <section className='landing-acts relative'>
      {acts.map((act, index) => (
        <article
          className={cn(
            'landing-act relative grid w-full items-center gap-10 py-16 lg:gap-16 lg:py-24',
            index === 0 && 'lg:grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)]',
            index === 1 && 'lg:grid-cols-[minmax(0,0.32fr)_minmax(0,0.68fr)]',
            index === 2 && 'lg:grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)]',
          )}
          data-landing-reveal='true'
          key={act.path}
        >
          <div className='min-w-0'>
            <div className='mb-4 flex items-center gap-3'>
              <span className={cn('label-mono px-2 py-1', act.accent)}>
                0{index + 1} / ACT
              </span>
              <span className='label-mono opacity-40'>OPTIMISTIC SOLVE</span>
            </div>
            <h2 className='font-display text-[clamp(2.8rem,6vw,5.5rem)] font-extrabold uppercase leading-[0.82] tracking-[-0.055em]'>
              {t(act.titleKey)}
            </h2>
            <p className='mt-5 max-w-md text-sm leading-7 text-muted-foreground sm:text-base'>
              {t(act.bodyKey)}
            </p>
            <Link
              className='label-mono mt-7 inline-flex items-center gap-2 bg-foreground px-3 py-2 text-background transition-transform hover:-translate-y-0.5'
              to={localizedPath(act.path, locale)}
            >
              {t('landing.openChapter')}
              <span aria-hidden='true'>↗</span>
            </Link>
          </div>

          <div className='landing-act-visual relative min-w-0' aria-hidden='true'>
            {act.visual === 'solve' ? <SolveVisual /> : null}
            {act.visual === 'timer' ? <TimerVisual /> : null}
            {act.visual === 'learn' ? <LearnVisual /> : null}
          </div>
        </article>
      ))}
    </section>
  )
}

function SolveVisual() {
  return (
    <div className='relative'>
      <span className='pointer-events-none absolute -top-16 right-0 font-display text-[clamp(6rem,15vw,13rem)] font-extrabold leading-none text-outline opacity-30'>
        01
      </span>
      <div className='relative flex flex-wrap gap-2 font-mono text-sm sm:text-base'>
        {['R', 'U', "R'", "U'", 'F2', 'D', "L'", 'B2'].map((move, index) => (
          <span
            className={cn(
              'px-2.5 py-1.5 shadow-[3px_3px_0_var(--foreground)]',
              index % 3 === 0 ? 'bg-cube-blue text-cube-white' : 'bg-background text-foreground',
            )}
            key={move}
          >
            {move}
          </span>
        ))}
      </div>
      <div className='mt-10 flex items-end gap-6'>
        <div className='grid w-[min(64%,16rem)] -rotate-3 grid-cols-3 gap-1.5'>
          {[
            'bg-cube-blue',
            'bg-cube-yellow',
            'bg-cube-red',
            'bg-cube-white',
            'bg-cube-orange',
            'bg-cube-white',
            'bg-cube-green',
            'bg-cube-white',
            'bg-cube-blue',
          ].map((color, index) => (
            <span
              className={cn('aspect-square shadow-[2px_2px_0_var(--foreground)]', color)}
              key={`${color}-${index}`}
            />
          ))}
        </div>
        <span className='label-mono -rotate-6 bg-cube-blue px-3 py-2 text-[0.55rem] text-cube-white'>
          REPLAY VERIFIED
        </span>
      </div>
    </div>
  )
}

function TimerVisual() {
  return (
    <div className='relative min-w-0'>
      <div className='mb-4 flex items-center justify-between'>
        <span className='label-mono bg-cube-yellow px-2 py-1 text-foreground'>02 / TIME</span>
        <span className='label-mono text-[0.55rem] opacity-45'>READY / HOLD / RELEASE</span>
      </div>
      <div className='landing-act-timer'>0.00</div>
      <div className='mt-5 flex items-center justify-between gap-4'>
        <span className='label-mono text-[0.55rem] opacity-40'>SESSION / 3×3</span>
        <div className='flex gap-2'>
          <span className='label-mono bg-card px-3 py-1 text-[0.55rem] shadow-[3px_3px_0_var(--foreground)]'>
            +2
          </span>
          <span className='label-mono bg-card px-3 py-1 text-[0.55rem] shadow-[3px_3px_0_var(--foreground)]'>
            DNF
          </span>
        </div>
      </div>
    </div>
  )
}

function LearnVisual() {
  return (
    <div className='relative'>
      <div className='mb-4 flex items-center justify-between'>
        <span className='label-mono bg-cube-green px-2 py-1 text-cube-white'>04 / NOTATION</span>
        <span className='label-mono text-[0.55rem] text-cube-green'>LEARN THE LANGUAGE</span>
      </div>
      <div className='landing-act-notation-wall grid -rotate-1 grid-cols-3 gap-2'>
        {['R', 'U', "R'", "U'", 'F2', 'D', "L'", 'B2', 'M'].map((move, index) => (
          <span
            className={cn(
              'landing-act-notation-cell grid aspect-square place-items-center font-mono text-4xl font-bold sm:text-5xl',
              index % 3 === 0 && 'text-cube-green',
            )}
            key={move}
          >
            {move}
          </span>
        ))}
      </div>
    </div>
  )
}
