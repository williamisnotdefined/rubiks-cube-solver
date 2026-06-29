import cls from 'classnames'
import { GitFork, Menu, Sun } from 'lucide-react'
import { lazy, Suspense, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink as RouterNavLink, useLocation } from 'react-router'
import { localeFromPathname, localizedPath, type SeoLocale } from '@src/seo/routes'

const MobileNavDialog = lazy(() => import('./PageNavMenus').then((module) => ({ default: module.MobileNavDialog })))
const AlgorithmsMenuDialog = lazy(() => import('./PageNavMenus').then((module) => ({ default: module.AlgorithmsMenuDialog })))
const NotationsMenuDialog = lazy(() => import('./PageNavMenus').then((module) => ({ default: module.NotationsMenuDialog })))
const ThemeMenuDialog = lazy(() => import('./PageNavMenus').then((module) => ({ default: module.ThemeMenuDialog })))

export type PageNavRoute = 'algorithms' | 'channels' | 'notations' | 'sites' | 'solve' | 'timer'

const githubUrl = 'https://github.com/williamisnotdefined/rubiks-cube-solver'

type ActiveDialog = 'algorithms' | 'notations' | 'theme' | null

type PageNavProps = {
  activeRoute: PageNavRoute
}

export function PageNav({ activeRoute }: PageNavProps) {
  const { t } = useTranslation()
  const location = useLocation()
  const locale = localeFromPathname(location.pathname)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null)

  function closeNavigation() {
    setActiveDialog(null)
    setMobileMenuOpen(false)
  }

  function navContent(onNavigate?: () => void) {
    return (
      <NavContent
        activeRoute={activeRoute}
        locale={locale}
        onAlgorithmsClick={() => setActiveDialog('algorithms')}
        onNavigate={onNavigate}
        onNotationsClick={() => setActiveDialog('notations')}
        onThemeClick={() => setActiveDialog('theme')}
      />
    )
  }

  return (
    <>
      <div className="flex min-h-14 shrink-0 items-center justify-between border-b border-app-border bg-app-nav px-3 md:hidden">
        <span className="text-sm font-black uppercase tracking-[0.2em] text-app-text">
          {t(activeRouteLabelKey(activeRoute))}
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
      {mobileMenuOpen ? (
        <Suspense fallback={null}>
          <MobileNavDialog open onOpenChange={setMobileMenuOpen}>
            {navContent(closeNavigation)}
          </MobileNavDialog>
        </Suspense>
      ) : null}
      <nav
        className="hidden h-full w-64 shrink-0 border-r border-app-border bg-app-nav p-3 md:flex"
        aria-label={t('navigation.primary')}
      >
        {navContent()}
      </nav>
      {activeDialog === 'notations' ? (
        <Suspense fallback={null}>
          <NotationsMenuDialog
            locale={locale}
            open
            onNavigate={closeNavigation}
            onOpenChange={(open) => setActiveDialog(open ? 'notations' : null)}
          />
        </Suspense>
      ) : null}
      {activeDialog === 'algorithms' ? (
        <Suspense fallback={null}>
          <AlgorithmsMenuDialog
            locale={locale}
            open
            onNavigate={closeNavigation}
            onOpenChange={(open) => setActiveDialog(open ? 'algorithms' : null)}
          />
        </Suspense>
      ) : null}
      {activeDialog === 'theme' ? (
        <Suspense fallback={null}>
          <ThemeMenuDialog
            open
            onOpenChange={(open) => setActiveDialog(open ? 'theme' : null)}
          />
        </Suspense>
      ) : null}
    </>
  )
}

type NavContentProps = {
  activeRoute: PageNavRoute
  locale: SeoLocale
  onAlgorithmsClick: () => void
  onNavigate?: () => void
  onNotationsClick: () => void
  onThemeClick: () => void
}

function NavContent({
  activeRoute,
  locale,
  onAlgorithmsClick,
  onNavigate,
  onNotationsClick,
  onThemeClick,
}: NavContentProps) {
  const { t } = useTranslation()

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
        <PageNavButton active={activeRoute === 'notations'} onClick={onNotationsClick}>
          {t('navigation.notations')}
        </PageNavButton>
        <PageNavButton active={activeRoute === 'algorithms'} onClick={onAlgorithmsClick}>
          {t('navigation.algorithms')}
        </PageNavButton>
      </div>
      <div className="mt-auto flex gap-2">
        <button
          aria-label={t('navigation.theme')}
          className="inline-flex size-10 items-center justify-center border border-app-border bg-app-surface text-app-text outline-none transition-colors hover:border-app-text hover:bg-app-surface-raised focus-visible:ring-2 focus-visible:ring-app-focus/50"
          type="button"
          onClick={onThemeClick}
        >
          <Sun aria-hidden="true" className="size-5" strokeWidth={2} />
        </button>
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

type PageNavButtonProps = {
  active: boolean
  children: string
  onClick: () => void
}

function PageNavButton({ active, children, onClick }: PageNavButtonProps) {
  return (
    <button
      aria-current={active ? 'page' : undefined}
      className={navItemClassName(active)}
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
      className={navItemClassName(active)}
      aria-current={active ? 'page' : undefined}
      to={to}
      onClick={onClick}
    >
      {children}
    </RouterNavLink>
  )
}

function navItemClassName(active: boolean) {
  return cls(
    'border border-app-border px-4 py-3 text-left font-sans text-xs font-extrabold uppercase tracking-[0.16em] outline-none focus-visible:ring-2 focus-visible:ring-app-focus/50',
    {
      'bg-app-text text-app-inverse': active,
      'bg-app-surface text-app-muted hover:bg-app-surface-raised hover:text-app-text': !active,
    },
  )
}
