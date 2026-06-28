import cls from 'classnames'
import { GitFork, Menu, Sun, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink as RouterNavLink, useLocation } from 'react-router'
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from '@components/Dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@components/Popover'
import { useThemePreferenceSync, useThemeStore, type ThemePreference } from '@core/theme/themeStore'
import { algorithmPuzzles, setsForPuzzle } from '@pages/AlgorithmsPage/sets/algorithmSetMetadata'
import { notationPuzzleGroups } from '@pages/NotationsPage/notationGuides'
import { localeFromPathname, localizedPath } from '@src/seo/routes'

export type PageNavRoute = 'algorithms' | 'channels' | 'notations' | 'sites' | 'solve' | 'timer'

const githubUrl = 'https://github.com/williamisnotdefined/rubiks-cube-solver'

type PageNavProps = {
  activeRoute: PageNavRoute
}

export function PageNav({ activeRoute }: PageNavProps) {
  const { t } = useTranslation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <>
      <Dialog open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <div className="flex min-h-14 shrink-0 items-center justify-between border-b border-app-border bg-app-nav px-3 md:hidden">
            <span className="text-sm font-black uppercase tracking-[0.2em] text-app-text">
              {t(activeRouteLabelKey(activeRoute))}
            </span>
          <DialogTrigger asChild>
            <button
              aria-expanded={mobileMenuOpen}
              aria-label={t('navigation.openMenu')}
              className="inline-flex min-h-10 min-w-10 items-center justify-center border border-app-border bg-app-surface text-app-text outline-none transition-colors hover:border-app-text hover:bg-app-surface-raised focus-visible:ring-2 focus-visible:ring-app-focus/50"
              type="button"
            >
              <Menu aria-hidden="true" className="size-5" strokeWidth={2} />
            </button>
          </DialogTrigger>
        </div>
        <DialogContent
          aria-describedby={undefined}
          className="inset-y-0 left-0 z-40 flex w-72 min-h-0 flex-col border-r border-app-border bg-app-nav p-3 text-app-text shadow-2xl md:hidden"
          motionPreset="drawer"
          overlayClassName="z-40 bg-app-bg/80 md:hidden"
          overlayLabel={t('navigation.closeMenu')}
        >
          <nav
            className="flex min-h-0 flex-1 flex-col"
            aria-label={t('navigation.primary')}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <DialogTitle asChild>
                <span className="text-sm font-black uppercase tracking-[0.2em] text-app-text">
                  {t('navigation.menu')}
                </span>
              </DialogTitle>
              <DialogClose asChild>
                <button
                  aria-label={t('navigation.closeMenu')}
                  className="inline-flex min-h-10 min-w-10 items-center justify-center border border-app-border bg-app-surface text-app-text outline-none transition-colors hover:border-app-text hover:bg-app-surface-raised focus-visible:ring-2 focus-visible:ring-app-focus/50"
                  type="button"
                >
                  <X aria-hidden="true" className="size-5" strokeWidth={2} />
                </button>
              </DialogClose>
            </div>
            <NavContent activeRoute={activeRoute} onNavigate={() => setMobileMenuOpen(false)} />
          </nav>
        </DialogContent>
      </Dialog>
      <nav
        className="hidden h-full w-64 shrink-0 border-r border-app-border bg-app-nav p-3 md:flex"
        aria-label={t('navigation.primary')}
      >
        <NavContent activeRoute={activeRoute} />
      </nav>
    </>
  )
}

type NavContentProps = {
  activeRoute: PageNavRoute
  onNavigate?: () => void
}

function NavContent({ activeRoute, onNavigate }: NavContentProps) {
  const { t } = useTranslation()
  const location = useLocation()
  const locale = localeFromPathname(location.pathname)

  function toLocalizedPath(path: string) {
    return localizedPath(path, locale)
  }

  return (
    <div className="flex min-h-0 w-full flex-col gap-4">
      <div className="grid gap-2">
        <PageNavLink active={activeRoute === 'solve'} to={toLocalizedPath('/solve')} onClick={onNavigate}>
          {t('navigation.solve')}
        </PageNavLink>
        <PageNavLink active={activeRoute === 'timer'} to={toLocalizedPath('/timer')} onClick={onNavigate}>
          {t('navigation.timer')}
        </PageNavLink>
        <PageNavLink active={activeRoute === 'channels'} to={toLocalizedPath('/channels')} onClick={onNavigate}>
          {t('navigation.channels')}
        </PageNavLink>
        <PageNavLink active={activeRoute === 'sites'} to={toLocalizedPath('/sites')} onClick={onNavigate}>
          {t('navigation.sites')}
        </PageNavLink>
        <NotationsMenu active={activeRoute === 'notations'} locale={locale} onNavigate={onNavigate} />
        <AlgorithmsMenu active={activeRoute === 'algorithms'} locale={locale} onNavigate={onNavigate} />
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
          <span className="sr-only">{t('navigation.github')}</span>
          <GitFork aria-hidden="true" className="size-5" strokeWidth={2.4} />
        </a>
      </div>
    </div>
  )
}

function activeRouteLabelKey(activeRoute: PageNavRoute) {
  if (activeRoute === 'algorithms') {
    return 'navigation.algorithms'
  }

  if (activeRoute === 'notations') {
    return 'navigation.notations'
  }

  if (activeRoute === 'timer') {
    return 'navigation.timer'
  }

  if (activeRoute === 'channels') {
    return 'navigation.channels'
  }

  if (activeRoute === 'sites') {
    return 'navigation.sites'
  }

  return 'navigation.solve'
}

function NotationsMenu({
  active,
  locale,
  onNavigate,
}: {
  active: boolean
  locale: ReturnType<typeof localeFromPathname>
  onNavigate?: () => void
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  function handleNavigate() {
    setOpen(false)
    onNavigate?.()
  }

  return (
    <NavMenuDialog
      active={active}
      contentClassName="max-w-3xl"
      open={open}
      title={t('navigation.notationsMenu')}
      triggerLabel={t('navigation.notations')}
      onOpenChange={setOpen}
    >
      <div className="grid gap-2 sm:grid-cols-2">
        {notationPuzzleGroups.map((group) => (
          <section key={group.id} className="border border-app-border bg-app-surface p-2">
            <h3 className="px-2 py-1 text-xs font-black uppercase tracking-[0.16em] text-app-text">
              {t(group.titleKey)}
            </h3>
            <div className="grid gap-1">
              {group.puzzles.map((guide) => (
                <RouterNavLink
                  key={guide.path}
                  className={({ isActive }) => cls(
                    'block px-2 py-2 text-xs font-extrabold uppercase tracking-[0.12em] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-app-focus/50',
                    {
                      'bg-app-text text-app-inverse': isActive,
                      'text-app-muted hover:bg-app-control hover:text-app-text': !isActive,
                    },
                  )}
                  to={localizedPath(guide.path, locale)}
                  onClick={handleNavigate}
                >
                  {guide.puzzle}
                </RouterNavLink>
              ))}
            </div>
          </section>
        ))}
      </div>
    </NavMenuDialog>
  )
}

function AlgorithmsMenu({
  active,
  locale,
  onNavigate,
}: {
  active: boolean
  locale: ReturnType<typeof localeFromPathname>
  onNavigate?: () => void
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  function handleNavigate() {
    setOpen(false)
    onNavigate?.()
  }

  return (
    <NavMenuDialog
      active={active}
      contentClassName="max-w-4xl"
      open={open}
      title={t('navigation.algorithmsMenu')}
      triggerLabel={t('navigation.algorithms')}
      onOpenChange={setOpen}
    >
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {algorithmPuzzles.map((puzzle) => (
          <section key={puzzle.id} className="border border-app-border bg-app-surface p-2">
            <h3 className="px-2 py-1 text-xs font-black uppercase tracking-[0.16em] text-app-text">
              {puzzle.title}
            </h3>
            <div className="grid gap-1">
              {setsForPuzzle(puzzle.id).map((set) => (
                <RouterNavLink
                  key={set.path}
                  className={({ isActive }) => cls(
                    'block px-2 py-2 text-xs font-extrabold uppercase tracking-[0.12em] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-app-focus/50',
                    {
                      'bg-app-text text-app-inverse': isActive,
                      'text-app-muted hover:bg-app-control hover:text-app-text': !isActive,
                    },
                  )}
                  to={localizedPath(set.path, locale)}
                  onClick={handleNavigate}
                >
                  {set.title}
                </RouterNavLink>
              ))}
            </div>
          </section>
        ))}
      </div>
    </NavMenuDialog>
  )
}

function NavMenuDialog({
  active,
  children,
  contentClassName,
  open,
  title,
  triggerLabel,
  onOpenChange,
}: {
  active: boolean
  children: ReactNode
  contentClassName: string
  open: boolean
  title: string
  triggerLabel: string
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button
          aria-current={active ? 'page' : undefined}
          className={cls(
            'border border-app-border px-4 py-3 text-left font-sans text-xs font-extrabold uppercase tracking-[0.16em] outline-none focus-visible:ring-2 focus-visible:ring-app-focus/50',
            {
              'bg-app-text text-app-inverse': active,
              'bg-app-surface text-app-muted hover:bg-app-surface-raised hover:text-app-text': !active,
            },
          )}
          type="button"
        >
          {triggerLabel}
        </button>
      </DialogTrigger>
      <DialogContent
        aria-describedby={undefined}
        className={cls(
          'left-1/2 top-1/2 grid max-h-[calc(100dvh-2rem)] w-[calc(100vw-1.5rem)] -translate-x-1/2 -translate-y-1/2 grid-rows-[auto_minmax(0,1fr)] gap-3 overflow-hidden border border-app-border bg-app-surface p-3 text-left text-app-text shadow-2xl sm:w-[calc(100vw-3rem)] sm:p-4',
          contentClassName,
        )}
        overlayClassName="bg-app-bg/85 backdrop-blur-sm"
        overlayLabel={t('common.close')}
      >
        <div className="flex items-start justify-between gap-4 border border-app-border bg-app-control px-3 py-2">
          <DialogTitle asChild>
            <h2 className="text-xs font-black uppercase tracking-[0.18em] text-app-text sm:text-sm">
              {title}
            </h2>
          </DialogTitle>
          <DialogClose asChild>
            <button
              aria-label={t('common.close')}
              className="inline-flex min-h-8 min-w-8 items-center justify-center border border-app-border bg-app-surface text-app-text outline-none transition-colors hover:border-app-text hover:bg-app-surface-raised focus-visible:ring-2 focus-visible:ring-app-focus/50"
              type="button"
            >
              <X aria-hidden="true" className="size-4" strokeWidth={2.6} />
            </button>
          </DialogClose>
        </div>
        <div className="min-h-0 overflow-y-auto pr-1">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ThemeMenu() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const theme = useThemeStore((state) => state.theme)
  const setThemePreference = useThemeStore((state) => state.setThemePreference)

  useThemePreferenceSync()

  function handleThemeSelect(nextTheme: ThemePreference) {
    setThemePreference(nextTheme)
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

type PageNavLinkProps = {
  active: boolean
  children: string
  onClick?: () => void
  to: string
}

function PageNavLink({ active, children, onClick, to }: PageNavLinkProps) {
  return (
    <RouterNavLink
      className={cls(
        'border border-app-border px-4 py-3 font-sans text-xs font-extrabold uppercase tracking-[0.16em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-focus/50',
        {
          'bg-app-text text-app-inverse': active,
          'bg-app-surface text-app-muted hover:bg-app-surface-raised hover:text-app-text': !active,
        },
      )}
      aria-current={active ? 'page' : undefined}
      to={to}
      onClick={onClick}
    >
      {children}
    </RouterNavLink>
  )
}
