import cls from 'classnames'
import { GitFork, Menu, Sun, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Popover, PopoverContent, PopoverTrigger } from '@components/Popover'

export type PageNavRoute = 'solve' | 'timer'

type ThemePreference = 'dark' | 'light' | 'system'

const githubUrl = 'https://github.com/williamisnotdefined/rubiks-cube-solver'
const themeStorageKey = 'rubiks-cube-solver-theme'

type PageNavProps = {
  activeRoute: PageNavRoute
}

export function PageNav({ activeRoute }: PageNavProps) {
  const { t } = useTranslation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
      <div className="flex min-h-14 shrink-0 items-center justify-between border-b border-app-border bg-app-nav px-3 md:hidden">
        <span className="text-sm font-black uppercase tracking-[0.2em] text-app-text">
          {activeRoute === 'timer' ? t('navigation.timer') : t('navigation.solve')}
        </span>
        <button
          aria-expanded={mobileMenuOpen}
          aria-label={t('navigation.openMenu')}
          className="inline-flex min-h-10 min-w-10 items-center justify-center border border-app-border bg-app-surface text-app-text outline-none transition-colors hover:border-app-text hover:bg-app-surface-raised focus-visible:ring-2 focus-visible:ring-app-focus/50"
          type="button"
          onClick={() => setMobileMenuOpen(true)}
        >
          <Menu aria-hidden="true" className="size-5" strokeWidth={2} />
        </button>
      </div>
      <nav
        className="hidden h-full w-64 shrink-0 border-r border-app-border bg-app-nav p-3 md:flex"
        aria-label={t('navigation.primary')}
      >
        <NavContent activeRoute={activeRoute} />
      </nav>
      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-40 grid grid-cols-[minmax(0,18rem)_minmax(0,1fr)] md:hidden">
          <nav
            className="flex min-h-0 flex-col border-r border-app-border bg-app-nav p-3 shadow-2xl"
            aria-label={t('navigation.primary')}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <span className="text-sm font-black uppercase tracking-[0.2em] text-app-text">
                {t('navigation.menu')}
              </span>
              <button
                aria-label={t('navigation.closeMenu')}
                className="inline-flex min-h-10 min-w-10 items-center justify-center border border-app-border bg-app-surface text-app-text outline-none transition-colors hover:border-app-text hover:bg-app-surface-raised focus-visible:ring-2 focus-visible:ring-app-focus/50"
                type="button"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X aria-hidden="true" className="size-5" strokeWidth={2} />
              </button>
            </div>
            <NavContent activeRoute={activeRoute} onNavigate={() => setMobileMenuOpen(false)} />
          </nav>
          <button
            aria-label={t('navigation.closeMenu')}
            className="bg-app-bg/80 outline-none focus-visible:ring-2 focus-visible:ring-app-focus/50"
            type="button"
            onClick={() => setMobileMenuOpen(false)}
          />
        </div>
      ) : null}
    </>
  )
}

type NavContentProps = {
  activeRoute: PageNavRoute
  onNavigate?: () => void
}

function NavContent({ activeRoute, onNavigate }: NavContentProps) {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-0 w-full flex-col gap-4">
      <div className="grid gap-2">
        <NavLink active={activeRoute === 'solve'} href="#/solve" onClick={onNavigate}>
          {t('navigation.solve')}
        </NavLink>
        <NavLink active={activeRoute === 'timer'} href="#/timer" onClick={onNavigate}>
          {t('navigation.timer')}
        </NavLink>
      </div>
      <div className="mt-auto flex gap-2">
        <ThemeMenu />
        <a
          aria-label={t('navigation.github')}
          className="inline-flex size-10 items-center justify-center border border-app-border bg-app-surface text-app-text outline-none transition-colors hover:border-app-text hover:bg-app-surface-raised focus-visible:ring-2 focus-visible:ring-app-focus/50"
          href={githubUrl}
          rel="noreferrer"
          target="_blank"
        >
          <GitFork aria-hidden="true" className="size-5" strokeWidth={2} />
        </a>
      </div>
    </div>
  )
}

function ThemeMenu() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [theme, setTheme] = useState<ThemePreference>(() => storedThemePreference())

  useEffect(() => {
    applyThemePreference(theme)
  }, [theme])

  function handleThemeSelect(nextTheme: ThemePreference) {
    setTheme(nextTheme)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label={t('navigation.theme')}
          className="inline-flex size-10 items-center justify-center border border-app-border bg-app-surface text-app-text outline-none transition-colors hover:border-app-text hover:bg-app-surface-raised focus-visible:ring-2 focus-visible:ring-app-focus/50"
          type="button"
        >
          <Sun aria-hidden="true" className="size-5" strokeWidth={2} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="grid w-40"
        role="menu"
        side="top"
      >
        <ThemeMenuItem active={theme === 'system'} onClick={() => handleThemeSelect('system')}>
          {t('navigation.themeSystem')}
        </ThemeMenuItem>
        <ThemeMenuItem active={theme === 'light'} onClick={() => handleThemeSelect('light')}>
          {t('navigation.themeLight')}
        </ThemeMenuItem>
        <ThemeMenuItem active={theme === 'dark'} onClick={() => handleThemeSelect('dark')}>
          {t('navigation.themeDark')}
        </ThemeMenuItem>
      </PopoverContent>
    </Popover>
  )
}

function ThemeMenuItem({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: string
  onClick: () => void
}) {
  return (
    <button
      className={cls(
        'px-3 py-2 text-left text-xs font-extrabold uppercase tracking-[0.14em] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-app-focus/50',
        {
          'bg-app-text text-app-inverse': active,
          'text-app-muted hover:bg-app-surface hover:text-app-text': !active,
        },
      )}
      role="menuitemradio"
      aria-checked={active}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  )
}

type NavLinkProps = {
  active: boolean
  children: string
  href: string
  onClick?: () => void
}

function NavLink({ active, children, href, onClick }: NavLinkProps) {
  return (
    <a
      className={cls(
        'border border-app-border px-4 py-3 text-xs font-extrabold uppercase tracking-[0.16em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-focus/50',
        {
          'bg-app-text text-app-inverse': active,
          'bg-app-surface text-app-muted hover:bg-app-surface-raised hover:text-app-text': !active,
        },
      )}
      href={href}
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
    >
      {children}
    </a>
  )
}

function storedThemePreference(): ThemePreference {
  const storedTheme = window.localStorage.getItem(themeStorageKey)
  return storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : 'system'
}

function applyThemePreference(theme: ThemePreference) {
  if (theme === 'system') {
    window.localStorage.removeItem(themeStorageKey)
    delete document.documentElement.dataset.theme
    return
  }

  window.localStorage.setItem(themeStorageKey, theme)
  document.documentElement.dataset.theme = theme
}
