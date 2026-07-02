import cls from 'classnames'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink as RouterNavLink } from 'react-router'
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@components/Dialog'
import { useThemeStore, type ThemePreference } from '@core/theme/themeStore'
import { algorithmPuzzles, setsForPuzzle } from '@pages/AlgorithmsPage/sets/algorithmSetMetadata'
import { notationPuzzleGroups } from '@pages/NotationsPage/notationGuides'
import { localizedPath, type SeoLocale } from '@src/seo/routes'

type MobileNavDialogProps = {
  children: ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MobileNavDialog({ children, open, onOpenChange }: MobileNavDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
          {children}
        </nav>
      </DialogContent>
    </Dialog>
  )
}

type MenuDialogProps = {
  locale: SeoLocale
  open: boolean
  onNavigate: () => void
  onOpenChange: (open: boolean) => void
}

export function NotationsMenuDialog({ locale, open, onNavigate, onOpenChange }: MenuDialogProps) {
  const { t } = useTranslation()

  return (
    <NavMenuDialog
      contentClassName="max-w-3xl"
      open={open}
      title={t('navigation.notationsMenu')}
      onOpenChange={onOpenChange}
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
                  className={menuLinkClassName}
                  to={localizedPath(guide.path, locale)}
                  onClick={onNavigate}
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

export function AlgorithmsMenuDialog({ locale, open, onNavigate, onOpenChange }: MenuDialogProps) {
  const { t } = useTranslation()

  return (
    <NavMenuDialog
      contentClassName="max-w-4xl"
      open={open}
      title={t('navigation.algorithmsMenu')}
      onOpenChange={onOpenChange}
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
                  className={menuLinkClassName}
                  to={localizedPath(set.path, locale)}
                  onClick={onNavigate}
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

type NavMenuDialogProps = {
  children: ReactNode
  contentClassName: string
  open: boolean
  title: string
  onOpenChange: (open: boolean) => void
}

function NavMenuDialog({
  children,
  contentClassName,
  open,
  title,
  onOpenChange,
}: NavMenuDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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

type ThemeMenuDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ThemeMenuDialog({ open, onOpenChange }: ThemeMenuDialogProps) {
  const { t } = useTranslation()
  const theme = useThemeStore((state) => state.theme)
  const setThemePreference = useThemeStore((state) => state.setThemePreference)

  function handleThemeSelect(nextTheme: ThemePreference) {
    setThemePreference(nextTheme)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="left-1/2 top-1/2 grid w-[calc(100vw-1.5rem)] max-w-xs -translate-x-1/2 -translate-y-1/2 gap-3 border border-app-border bg-app-surface p-3 text-left text-app-text shadow-2xl"
        overlayClassName="bg-app-bg/85 backdrop-blur-sm"
        overlayLabel={t('common.close')}
      >
        <div className="flex items-center justify-between gap-4 border border-app-border bg-app-control px-3 py-2">
          <DialogTitle asChild>
            <h2 className="text-xs font-black uppercase tracking-[0.18em] text-app-text">
              {t('navigation.theme')}
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
        <div className="grid" role="menu">
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
      </DialogContent>
    </Dialog>
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

function menuLinkClassName({ isActive }: { isActive: boolean }) {
  return cls(
    'block px-2 py-2 text-xs font-extrabold uppercase tracking-[0.12em] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-app-focus/50',
    {
      'bg-app-text text-app-inverse': isActive,
      'text-app-muted hover:bg-app-control hover:text-app-text': !isActive,
    },
  )
}
