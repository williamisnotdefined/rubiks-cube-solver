import { Button } from '@components/Button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@components/Collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@components/DropdownMenu'
import { Separator } from '@components/Separator'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@components/Sheet'
import { applyThemePreference, type ThemePreference, useThemeStore } from '@core/theme/themeStore'
import { cn } from '@src/lib/utils'
import {
  localeFromPathname,
  localizedPath,
  type SeoLocale,
  stripLocalePrefix,
} from '@src/seo/routes'
import {
  BookOpen,
  ChevronsUpDown,
  Clock3,
  Cookie,
  Database,
  ExternalLink,
  GitFork,
  Globe2,
  LayoutDashboard,
  ListTree,
  Moon,
  Palette,
  PanelLeft,
  Store,
  Sun,
  Trophy,
  Video,
} from 'lucide-react'
import { type MouseEvent, type ReactNode, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink as RouterNavLink, useLocation, useNavigate } from 'react-router'
import { LanguageSelector } from './LanguageSelector'
import { algorithmNavigationItems, notationNavigationItems } from './navigationManifest'

export type PageNavRoute =
  | 'algorithms'
  | 'api'
  | 'channels'
  | 'notations'
  | 'records'
  | 'sites'
  | 'solve'
  | 'stores'
  | 'timer'

const githubUrl = 'https://github.com/williamisnotdefined/rubiks-cube-solver'
const cuberBrasilUrl = 'https://www.cuberbrasil.com/'

type PageNavProps = {
  activeRoute: PageNavRoute
  onOpenCookiePreferences?: () => void
}

type NavItem = {
  active: boolean
  end?: boolean
  icon?: React.ComponentType<{ className?: string }>
  label: string
  opensInNewTab?: boolean
  reloadDocument?: boolean
  to: string
}

type NavGroup = {
  defaultOpen?: boolean
  icon: React.ComponentType<{ className?: string }>
  label: string
  route: PageNavRoute
  subItems: NavItem[]
}

type DeferredNavigation = () => void
type MobileNavigationHandler = (navigation: DeferredNavigation) => void

export function PageNav({ activeRoute, onOpenCookiePreferences }: PageNavProps) {
  const { t } = useTranslation()
  const location = useLocation()
  const locale = localeFromPathname(location.pathname)
  const pagePath = stripLocalePrefix(location.pathname)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pendingNavigation = useRef<DeferredNavigation | null>(null)
  const title = t(activeRouteLabelKey(activeRoute))

  function closeThenNavigate(navigation: DeferredNavigation) {
    pendingNavigation.current = navigation
    setMobileOpen(false)
  }

  function completePendingNavigation() {
    const navigation = pendingNavigation.current
    pendingNavigation.current = null
    navigation?.()
  }

  return (
    <>
      <header className='flex h-14 shrink-0 items-center gap-3 border-b bg-background px-3 md:hidden'>
        <Button
          aria-expanded={mobileOpen}
          aria-label={t('navigation.openMenu')}
          size='icon'
          type='button'
          variant='outline'
          onClick={() => setMobileOpen(true)}
        >
          <PanelLeft aria-hidden='true' className='size-5' />
        </Button>
        <div className='min-w-0'>
          <p className='truncate text-sm font-semibold leading-none'>Speedcube.com.br</p>
          <p className='truncate text-xs text-muted-foreground'>{title}</p>
        </div>
      </header>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          className='w-[18rem] bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden'
          closeLabel={t('navigation.closeMenu')}
          onCloseAutoFocus={completePendingNavigation}
          side='left'
        >
          <SheetHeader className='sr-only'>
            <SheetTitle>{t('navigation.menu')}</SheetTitle>
            <SheetDescription>{t('navigation.primary')}</SheetDescription>
          </SheetHeader>
          <NavContent
            activeRoute={activeRoute}
            locale={locale}
            mobile
            onOpenCookiePreferences={onOpenCookiePreferences}
            pagePath={pagePath}
            onNavigate={closeThenNavigate}
          />
        </SheetContent>
      </Sheet>
      <aside className='hidden h-dvh w-64 shrink-0 border-e bg-sidebar text-sidebar-foreground md:flex'>
        <NavContent
          activeRoute={activeRoute}
          locale={locale}
          onOpenCookiePreferences={onOpenCookiePreferences}
          pagePath={pagePath}
        />
      </aside>
    </>
  )
}

function NavContent({
  activeRoute,
  locale,
  mobile = false,
  onOpenCookiePreferences,
  pagePath,
  onNavigate,
}: {
  activeRoute: PageNavRoute
  locale: SeoLocale
  mobile?: boolean
  onOpenCookiePreferences?: () => void
  pagePath: string
  onNavigate?: MobileNavigationHandler
}) {
  const { t } = useTranslation()
  const theme = useThemeStore((state) => state.theme)
  const setThemePreference = useThemeStore((state) => state.setThemePreference)
  const groups = navGroups(t, locale, activeRoute, pagePath)

  function setTheme(themePreference: ThemePreference) {
    setThemePreference(themePreference)
    applyThemePreference(themePreference)
  }

  function openCookiePreferences() {
    if (onOpenCookiePreferences === undefined) {
      return
    }

    if (onNavigate === undefined) {
      onOpenCookiePreferences()
      return
    }

    onNavigate(onOpenCookiePreferences)
  }

  return (
    <div className={cn('flex min-h-0 w-full flex-col gap-2 p-2', mobile && 'h-full')}>
      <div className='flex h-14 items-center gap-2 rounded-lg px-2'>
        <div className='flex aspect-square size-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground'>
          <img alt='' aria-hidden='true' className='size-7' src='/favicon.svg' />
        </div>
        <div className='grid min-w-0 flex-1 text-start text-sm leading-tight'>
          <span className='truncate font-semibold'>Speedcube.com.br</span>
        </div>
      </div>
      <Separator />
      <nav aria-label={t('navigation.primary')} className='min-h-0 flex-1 overflow-y-auto py-2'>
        <div className='grid gap-4'>
          <SidebarGroup label={t('navigation.groups.main')}>
            <SidebarLink
              active={activeRoute === 'solve'}
              icon={LayoutDashboard}
              label={t('navigation.solve')}
              to={localizedPath('/solve', locale)}
              onNavigate={onNavigate}
            />
            <SidebarLink
              active={activeRoute === 'timer'}
              icon={Clock3}
              label={t('navigation.timer')}
              to={localizedPath('/timer', locale)}
              onNavigate={onNavigate}
            />
          </SidebarGroup>
          <SidebarGroup label={t('navigation.groups.explore')}>
            <SidebarLink
              active={activeRoute === 'channels'}
              icon={Video}
              label={t('navigation.channels')}
              to={localizedPath('/channels', locale)}
              onNavigate={onNavigate}
            />
            <SidebarLink
              active={activeRoute === 'sites'}
              icon={Globe2}
              label={t('navigation.sites')}
              to={localizedPath('/sites', locale)}
              onNavigate={onNavigate}
            />
            <SidebarLink
              active={activeRoute === 'stores'}
              icon={Store}
              label={t('navigation.stores')}
              to={localizedPath('/stores', locale)}
              onNavigate={onNavigate}
            />
            <SidebarLink
              active={activeRoute === 'api'}
              icon={Database}
              label={t('navigation.api')}
              opensInNewTab
              reloadDocument
              to='/api/wca-data/v1/docs'
              onNavigate={onNavigate}
            />
          </SidebarGroup>
          <SidebarGroup label={t('navigation.groups.recordsAndData')}>
            <SidebarLink
              active={activeRoute === 'records'}
              icon={Trophy}
              label={t('navigation.worldRecords')}
              to={localizedPath('/records/world', locale)}
              onNavigate={onNavigate}
            />
          </SidebarGroup>
          <SidebarGroup label={t('navigation.groups.learn')}>
            {groups.map((group) => (
              <SidebarCollapsibleGroup group={group} key={group.route} onNavigate={onNavigate} />
            ))}
          </SidebarGroup>
        </div>
      </nav>
      <Separator />
      <div className='grid gap-1'>
        {locale === 'pt-BR' ? (
          <Button asChild className='w-full justify-start h-auto' variant='ghost'>
            <a
              href={cuberBrasilUrl}
              rel='noreferrer'
              target='_blank'
            >
              <img
                alt='Cuber Brasil'
                aria-hidden='true'
                className='max-w-full w-auto object-contain dark:invert'
                src='/sites/cuber-brasil.png'
              />
              <span className='sr-only'>{t('navigation.openCuberBrasil')}</span>
            </a>
          </Button>
        ) : null}
        <LanguageSelector locale={locale} pagePath={pagePath} onNavigate={onNavigate} />
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button className='w-full justify-start gap-2' type='button' variant='ghost'>
              <Palette aria-hidden='true' className='size-4' />
              <span className='flex-1 text-start'>{t('navigation.theme')}</span>
              {theme === 'dark' ? (
                <Moon aria-hidden='true' className='size-4' />
              ) : (
                <Sun aria-hidden='true' className='size-4' />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='start' className='w-48'>
            <DropdownMenuRadioGroup
              value={theme}
              onValueChange={(value) => setTheme(value as ThemePreference)}
            >
              <DropdownMenuRadioItem value='system'>
                {t('navigation.themeSystem')}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value='light'>
                {t('navigation.themeLight')}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value='dark'>
                {t('navigation.themeDark')}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button asChild className='w-full justify-start gap-2' variant='ghost'>
          <a aria-label={t('navigation.github')} href={githubUrl} rel='noreferrer' target='_blank'>
            <GitFork aria-hidden='true' className='size-4' />
            <span>{t('navigation.github')}</span>
          </a>
        </Button>
        <Button className='w-full justify-start gap-2' type='button' variant='ghost' onClick={openCookiePreferences}>
          <Cookie aria-hidden='true' className='size-4' />
          <span>{t('analytics.consent.manage')}</span>
        </Button>
      </div>
    </div>
  )
}

function SidebarGroup({ children, label }: { children: ReactNode; label: string }) {
  return (
    <section className='grid gap-1'>
      <h2 className='px-2 text-xs font-medium text-sidebar-foreground/70'>{label}</h2>
      <div className='grid gap-1'>{children}</div>
    </section>
  )
}

function SidebarLink({
  active,
  end,
  icon: Icon,
  label,
  onNavigate,
  opensInNewTab,
  reloadDocument,
  to,
}: NavItem & { onNavigate?: MobileNavigationHandler }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const className = cn(
    'flex min-h-8 items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring/50',
    {
      'bg-sidebar-accent font-medium text-sidebar-accent-foreground': active,
      'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground':
        !active,
    },
  )
  const content = (
    <>
      {Icon === undefined ? null : <Icon aria-hidden='true' className='size-4 shrink-0' />}
      <span className='flex-1 truncate'>{label}</span>
      {opensInNewTab ? (
        <ExternalLink aria-hidden='true' className='ms-auto size-3.5 shrink-0' />
      ) : null}
    </>
  )

  function navigateAfterClose(event: MouseEvent<HTMLAnchorElement>) {
    if (onNavigate === undefined || isModifiedClick(event)) {
      return
    }

    event.preventDefault()
    onNavigate(() => navigate(to))
  }

  if (reloadDocument === true) {
    return (
      <a
        aria-label={opensInNewTab ? `${label} ${t('navigation.opensInNewTab')}` : undefined}
        aria-current={active ? 'page' : undefined}
        className={className}
        href={to}
        rel={opensInNewTab ? 'noreferrer' : undefined}
        target={opensInNewTab ? '_blank' : undefined}
        onClick={
          opensInNewTab
            ? undefined
            : (event) => {
                if (onNavigate === undefined || isModifiedClick(event)) {
                  return
                }

                event.preventDefault()
                onNavigate(() => window.location.assign(to))
              }
        }
      >
        {content}
      </a>
    )
  }

  return (
    <RouterNavLink
      aria-current={active ? 'page' : undefined}
      className={className}
      end={end}
      to={to}
      onClick={navigateAfterClose}
    >
      {content}
    </RouterNavLink>
  )
}

function SidebarCollapsibleGroup({
  group,
  onNavigate,
}: {
  group: NavGroup
  onNavigate?: MobileNavigationHandler
}) {
  const Icon = group.icon

  return (
    <Collapsible className='group/collapsible' defaultOpen={group.defaultOpen}>
      <CollapsibleTrigger asChild>
        <button
          aria-current={group.defaultOpen ? 'page' : undefined}
          className={cn(
            'flex min-h-8 w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring/50',
            {
              'bg-sidebar-accent font-medium text-sidebar-accent-foreground': group.defaultOpen,
            },
          )}
          type='button'
        >
          <Icon aria-hidden='true' className='size-4 shrink-0' />
          <span className='truncate'>{group.label}</span>
          <ChevronsUpDown aria-hidden='true' className='ms-auto size-4 text-muted-foreground' />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className='CollapsibleContent'>
        <div className='ms-4 grid gap-1 border-s px-2 py-1'>
          {group.subItems.map((item) => (
            <SidebarLink key={item.to} {...item} onNavigate={onNavigate} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function isModifiedClick(event: MouseEvent<HTMLAnchorElement>) {
  return event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey
}

function navGroups(
  t: (key: string) => string,
  locale: SeoLocale,
  activeRoute: PageNavRoute,
  pagePath: string,
): NavGroup[] {
  return [
    {
      defaultOpen: activeRoute === 'notations',
      icon: BookOpen,
      label: t('navigation.notations'),
      route: 'notations',
      subItems: notationNavigationItems.map((item) => ({
        active: pagePath === item.path,
        label: item.label,
        to: localizedPath(item.path, locale),
      })),
    },
    {
      defaultOpen: activeRoute === 'algorithms',
      icon: ListTree,
      label: t('navigation.algorithms'),
      route: 'algorithms',
      subItems: [
        {
          active: pagePath === '/algorithms',
          end: true,
          label: t('navigation.allAlgorithms'),
          to: localizedPath('/algorithms', locale),
        },
        ...algorithmNavigationItems.map((puzzle) => ({
          active: pagePath === puzzle.path || pagePath.startsWith(`${puzzle.path}/`),
          label: puzzle.label,
          to: localizedPath(puzzle.path, locale),
        })),
      ],
    },
  ]
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

  if (activeRoute === 'stores') {
    return 'navigation.stores'
  }

  if (activeRoute === 'records') {
    return 'navigation.worldRecords'
  }

  if (activeRoute === 'api') {
    return 'navigation.api'
  }

  return 'navigation.solve'
}
