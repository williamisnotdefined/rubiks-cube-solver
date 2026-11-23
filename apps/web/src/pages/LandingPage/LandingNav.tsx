import { Command as CommandIcon, Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { LanguageSelector } from '@components/layout/PageNav/LanguageSelector'
import { applyThemePreference, useThemeStore } from '@core/theme/themeStore'
import { localizedPath, type SeoLocale } from '@src/seo/routes'

const navItems = [
  { labelKey: 'navigation.solve', path: '/solve' },
  { labelKey: 'navigation.timer', path: '/timer' },
  { labelKey: 'navigation.algorithms', path: '/algorithms' },
  { labelKey: 'navigation.worldRecords', path: '/records/world' },
] as const

export function LandingNav({ locale }: { locale: SeoLocale }) {
  const { t } = useTranslation()
  const theme = useThemeStore((state) => state.theme)
  const setThemePreference = useThemeStore((state) => state.setThemePreference)
  const nextTheme = theme === 'dark' ? 'light' : 'dark'

  function toggleTheme() {
    setThemePreference(nextTheme)
    applyThemePreference(nextTheme)
  }

  function openCommandPalette() {
    window.dispatchEvent(new CustomEvent('speedcube:command-palette'))
  }

  return (
    <header className='sticky top-0 z-40 border-b-2 border-foreground bg-background'>
      <div className='mx-auto flex h-16 w-full max-w-[96rem] items-center gap-3 px-4 sm:px-6'>
        <Link
          aria-label='Speedcube / Optimistic Solve'
          className='flex min-w-0 items-center gap-3'
          to={localizedPath('/', locale)}
        >
          <span className='flex size-9 shrink-0 items-center justify-center border-2 border-foreground bg-cube-yellow shadow-[3px_3px_0_var(--foreground)]'>
            <img alt='' aria-hidden='true' className='size-7' src='/favicon.svg' />
          </span>
          <span className='grid min-w-0 leading-none'>
            <span className='truncate font-display text-lg font-extrabold uppercase tracking-tighter'>
              Speedcube
            </span>
            <span className='label-mono hidden text-[0.5rem] opacity-50 sm:block'>
              .com.br / optimistic solve
            </span>
          </span>
        </Link>

        <nav
          aria-label={t('navigation.primary')}
          className='ml-6 hidden items-center gap-5 lg:flex'
        >
          {navItems.map((item) => (
            <Link
              className='label-mono border-b-2 border-transparent py-2 text-[0.62rem] transition-colors hover:border-foreground'
              key={item.path}
              to={localizedPath(item.path, locale)}
            >
              {t(item.labelKey)}
            </Link>
          ))}
        </nav>

        <div className='ml-auto flex shrink-0 items-center gap-2'>
          <div className='hidden sm:block'>
            <LanguageSelector
              locale={locale}
              pagePath='/'
              side='bottom'
              tone='landing'
            />
          </div>
          <button
            aria-label={t('navigation.theme')}
            className='hidden size-9 place-items-center border-2 border-foreground bg-background transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:grid'
            onClick={toggleTheme}
            type='button'
          >
            {theme === 'dark' ? (
              <Sun aria-hidden='true' className='size-4' />
            ) : (
              <Moon aria-hidden='true' className='size-4' />
            )}
          </button>
          <button
            aria-label={t('navigation.command')}
            className='hidden size-9 place-items-center border-2 border-foreground bg-background transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 md:grid'
            onClick={openCommandPalette}
            type='button'
          >
            <CommandIcon aria-hidden='true' className='size-4' />
          </button>
          <Link
            className='hidden min-h-9 items-center gap-2 border-2 border-foreground bg-foreground px-3 font-mono text-[0.62rem] uppercase tracking-widest text-background shadow-[3px_3px_0_var(--foreground)] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_var(--foreground)] sm:inline-flex'
            to={localizedPath('/solve', locale)}
          >
            {t('landing.enter')}
            <span aria-hidden='true'>↗</span>
          </Link>

          <details className='relative lg:hidden'>
            <summary className='label-mono flex h-9 cursor-pointer list-none items-center border-2 border-foreground bg-background px-3 text-[0.58rem]'>
              {t('landing.menu')}
            </summary>
            <div className='absolute right-0 top-11 z-50 grid w-56 gap-1 border-2 border-foreground bg-background p-2 shadow-[6px_6px_0_var(--foreground)]'>
              {navItems.map((item) => (
                <Link
                  className='label-mono border-2 border-transparent px-2 py-2 text-[0.6rem] hover:border-foreground hover:bg-accent'
                  key={item.path}
                  to={localizedPath(item.path, locale)}
                >
                  {t(item.labelKey)}
                </Link>
              ))}
              <Link
                className='label-mono border-2 border-foreground bg-foreground px-2 py-2 text-[0.6rem] text-background'
                to={localizedPath('/solve', locale)}
              >
                {t('landing.enter')} ↗
              </Link>
              <div className='mt-2 border-t-2 border-foreground pt-2 sm:hidden'>
                <LanguageSelector
                  locale={locale}
                  pagePath='/'
                  side='top'
                  tone='landing'
                />
              </div>
              <button
                className='label-mono mt-1 flex items-center gap-2 border-2 border-transparent px-2 py-2 text-left text-[0.6rem] hover:border-foreground hover:bg-accent'
                onClick={toggleTheme}
                type='button'
              >
                {theme === 'dark' ? (
                  <Sun aria-hidden='true' className='size-3.5' />
                ) : (
                  <Moon aria-hidden='true' className='size-3.5' />
                )}
                {t('navigation.theme')}
              </button>
              <button
                className='label-mono flex items-center gap-2 border-2 border-transparent px-2 py-2 text-left text-[0.6rem] hover:border-foreground hover:bg-accent'
                onClick={openCommandPalette}
                type='button'
              >
                <CommandIcon aria-hidden='true' className='size-3.5' />
                {t('navigation.command')}
              </button>
            </div>
          </details>
        </div>
      </div>
    </header>
  )
}
