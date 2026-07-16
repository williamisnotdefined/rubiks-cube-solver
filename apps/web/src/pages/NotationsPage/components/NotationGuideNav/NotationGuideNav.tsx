import { useTranslation } from 'react-i18next'
import { NavLink, useLocation } from 'react-router'
import { cn } from '@src/lib/utils'
import { localeFromPathname, localizedPath } from '@src/seo/routes'
import { notationPuzzleGroups } from '../../notationGuides'

export function NotationGuideNav() {
  const { t } = useTranslation()
  const location = useLocation()
  const locale = localeFromPathname(location.pathname)

  return (
    <nav
      className='grid h-max content-start gap-3 rounded-xl border bg-card p-3 text-card-foreground shadow-sm lg:sticky lg:top-4'
      aria-label={t('notations.page.guideNav')}
    >
      <h2 className='px-2 text-sm font-medium text-muted-foreground'>
        {t('notations.page.guideNav')}
      </h2>
      {notationPuzzleGroups.map((group) => (
        <section key={group.id} className='rounded-lg border bg-muted/40 p-2'>
          <h3 className='px-2 py-1 text-sm font-semibold'>{t(group.titleKey)}</h3>
          <div className='grid gap-1'>
            {group.puzzles.map((guide) => (
              <NavLink
                key={guide.id}
                className={({ isActive }) =>
                  cn(
                    'block rounded-md px-2 py-2 text-sm outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50',
                    {
                      'bg-background font-medium text-foreground shadow-xs': isActive,
                      'text-muted-foreground hover:bg-background hover:text-foreground': !isActive,
                    },
                  )
                }
                to={localizedPath(guide.path, locale)}
              >
                {guide.puzzle}
              </NavLink>
            ))}
          </div>
        </section>
      ))}
    </nav>
  )
}
