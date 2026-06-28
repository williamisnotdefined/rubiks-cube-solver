import cls from 'classnames'
import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router'
import { notationPuzzleGroups } from '../../notationGuides'

export function NotationGuideNav() {
  const { t } = useTranslation()

  return (
    <nav className="grid h-max content-start gap-3 border border-app-border bg-app-surface p-3 lg:sticky lg:top-4" aria-label={t('notations.page.guideNav')}>
      <h2 className="px-2 text-xs font-extrabold uppercase tracking-[0.18em] text-app-muted">
        {t('notations.page.guideNav')}
      </h2>
      {notationPuzzleGroups.map((group) => (
        <section key={group.id} className="border border-app-border bg-app-control p-2">
          <h3 className="px-2 py-1 text-xs font-black uppercase tracking-[0.16em] text-app-text">
            {t(group.titleKey)}
          </h3>
          <div className="grid gap-1">
            {group.puzzles.map((guide) => (
              <NavLink
                key={guide.id}
                className={({ isActive }) => cls(
                  'block px-2 py-2 text-xs font-extrabold uppercase tracking-[0.12em] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-app-focus/50',
                  {
                    'bg-app-text text-app-inverse': isActive,
                    'text-app-muted hover:bg-app-surface hover:text-app-text': !isActive,
                  },
                )}
                to={guide.path}
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
