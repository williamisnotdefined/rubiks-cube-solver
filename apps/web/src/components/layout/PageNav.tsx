import cls from 'classnames'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

export type PageNavRoute = 'solve' | 'timer'

type ThemePreference = 'dark' | 'light' | 'system'

const githubUrl = 'https://github.com/williamisnotdefined/rubiks-cube-solver'
const themeStorageKey = 'rubiks-cube-solver-theme'

type PageNavProps = {
  activeRoute: PageNavRoute
}

export function PageNav({ activeRoute }: PageNavProps) {
  const { t } = useTranslation()

  return (
    <nav
      className="border-b border-app-border bg-app-nav px-3 py-3 sm:px-5"
      aria-label={t('navigation.primary')}
    >
      <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-2">
        <a
          className="text-sm font-black uppercase tracking-[0.2em] text-app-text"
          href="#/solve"
        >
          Rubik Solver
        </a>
        <div className="flex items-center gap-2">
          <div className="flex border border-app-border">
            <NavLink active={activeRoute === 'solve'} href="#/solve">
              {t('navigation.solve')}
            </NavLink>
            <NavLink active={activeRoute === 'timer'} href="#/timer">
              {t('navigation.timer')}
            </NavLink>
          </div>
          <ThemeMenu />
          <a
            aria-label={t('navigation.github')}
            className="inline-flex min-h-10 items-center justify-center border border-app-border bg-app-surface px-3 text-app-text outline-none transition-colors hover:border-app-text hover:bg-app-surface-raised focus-visible:ring-2 focus-visible:ring-app-focus/50"
            href={githubUrl}
            rel="noreferrer"
            target="_blank"
          >
            <GitHubIcon />
          </a>
        </div>
      </div>
    </nav>
  )
}

function ThemeMenu() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [theme, setTheme] = useState<ThemePreference>(() => storedThemePreference())
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    applyThemePreference(theme)
  }, [theme])

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (menuRef.current?.contains(event.target as Node) !== false) {
        return
      }

      setOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)

    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  function handleThemeSelect(nextTheme: ThemePreference) {
    setTheme(nextTheme)
    setOpen(false)
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t('navigation.theme')}
        className="inline-flex min-h-10 items-center justify-center border border-app-border bg-app-surface px-3 text-app-text outline-none transition-colors hover:border-app-text hover:bg-app-surface-raised focus-visible:ring-2 focus-visible:ring-app-focus/50"
        type="button"
        onClick={() => setOpen((current) => !current)}
      >
        <ThemeIcon />
      </button>
      {open ? (
        <div
          className="absolute right-0 z-20 mt-2 grid min-w-36 border border-app-border bg-app-surface-raised p-1 shadow-2xl"
          role="menu"
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
        </div>
      ) : null}
    </div>
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
}

function NavLink({ active, children, href }: NavLinkProps) {
  return (
    <a
      className={cls(
        'border-l border-app-border px-4 py-2 text-xs font-extrabold uppercase tracking-[0.16em] first:border-l-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-focus/50',
        {
          'bg-app-text text-app-inverse': active,
          'bg-app-surface text-app-muted hover:bg-app-surface-raised hover:text-app-text': !active,
        },
      )}
      href={href}
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

function ThemeIcon() {
  return (
    <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3v2" />
      <path d="M12 19v2" />
      <path d="m4.22 4.22 1.42 1.42" />
      <path d="m18.36 18.36 1.42 1.42" />
      <path d="M3 12h2" />
      <path d="M19 12h2" />
      <path d="m4.22 19.78 1.42-1.42" />
      <path d="m18.36 5.64 1.42-1.42" />
      <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.48 2 2 6.58 2 12.26c0 4.53 2.87 8.38 6.84 9.74.5.09.68-.22.68-.49 0-.24-.01-.88-.01-1.73-2.78.62-3.37-1.37-3.37-1.37-.45-1.19-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.55-1.14-4.55-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.34 9.34 0 0 1 12 7c.85 0 1.7.12 2.5.34 1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.06.36.32.68.95.68 1.92 0 1.39-.01 2.51-.01 2.85 0 .27.18.59.69.49A10.17 10.17 0 0 0 22 12.26C22 6.58 17.52 2 12 2Z" />
    </svg>
  )
}
