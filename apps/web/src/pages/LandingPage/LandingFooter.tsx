import { ArrowUpRight, GitFork } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { localizedPath, type SeoLocale } from '@src/seo/routes'

export function LandingFooter({ locale }: { locale: SeoLocale }) {
  const { t } = useTranslation()

  return (
    <footer className='bg-foreground text-background'>
      <div className='mx-auto grid w-full max-w-[96rem] gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end'>
        <div>
          <div className='flex items-center gap-3'>
            <span className='flex size-9 items-center justify-center border-2 border-background bg-cube-yellow shadow-[3px_3px_0_var(--background)]'>
              <img alt='' aria-hidden='true' className='size-7' src='/favicon.svg' />
            </span>
            <div className='grid leading-none'>
              <span className='font-display text-xl font-extrabold uppercase tracking-tighter'>
                Speedcube
              </span>
              <span className='label-mono mt-1 text-[0.5rem] opacity-50'>
                {t('landing.footerTag')}
              </span>
            </div>
          </div>
          <p className='mt-8 max-w-md text-sm leading-6 text-background/60'>
            {t('landing.footerBody')}
          </p>
        </div>

        <div className='flex flex-col items-start gap-4 lg:items-end'>
          <Link
            className='inline-flex min-h-11 items-center gap-3 border-2 border-background bg-background px-4 font-mono text-[0.62rem] uppercase tracking-widest text-foreground shadow-[4px_4px_0_var(--background)] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5'
            to={localizedPath('/solve', locale)}
          >
            {t('landing.enter')}
            <ArrowUpRight aria-hidden='true' className='size-4' />
          </Link>
          <div className='flex flex-wrap gap-4'>
            <Link
              className='label-mono border-b border-background/40 pb-1 text-[0.55rem] hover:border-background'
              to={localizedPath('/timer', locale)}
            >
              {t('navigation.timer')}
            </Link>
            <Link
              className='label-mono border-b border-background/40 pb-1 text-[0.55rem] hover:border-background'
              to={localizedPath('/algorithms', locale)}
            >
              {t('navigation.algorithms')}
            </Link>
            <a
              className='label-mono inline-flex items-center gap-1 border-b border-background/40 pb-1 text-[0.55rem] hover:border-background'
              href='https://github.com/williamisnotdefined/rubiks-cube-solver'
              rel='noreferrer'
              target='_blank'
            >
              <GitFork aria-hidden='true' className='size-3' />
              {t('landing.manifestoGithub')}
            </a>
          </div>
          <p className='label-mono text-[0.5rem] opacity-40'>
            {t('landing.footerCopyright')}
          </p>
        </div>
      </div>
    </footer>
  )
}
