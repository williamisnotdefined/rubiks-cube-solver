import cls from 'classnames'
import { useTranslation } from 'react-i18next'
import { NavLink, Navigate, useParams } from 'react-router'
import { PageHeader } from '@components/layout/PageHeader'
import { PageScaffold } from '@components/layout/PageScaffold'
import { PageTitle } from '@components/layout/PageTitle'
import { notationPuzzleGroups, getNotationGuide, type NotationGuide } from './notationGuides'

export function NotationGuidePage() {
  const { t } = useTranslation()
  const { puzzleId } = useParams()
  const guide = getNotationGuide(puzzleId)

  if (guide === undefined) {
    return <Navigate replace to="/notations/3x3" />
  }

  return (
    <PageScaffold contentClassName="max-w-6xl gap-4">
        <PageHeader>
          <PageTitle>
            {t('notations.page.title', { puzzle: guide.puzzle })}
          </PageTitle>
          <p className="max-w-3xl text-sm font-semibold leading-6 text-app-muted">
            {t(guide.summaryKey)}
          </p>
        </PageHeader>
        <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="grid min-w-0 gap-4">
            <NotationSymbols guide={guide} />
            <NotationRules guide={guide} />
          </div>
          <NotationGuideNav />
        </div>
    </PageScaffold>
  )
}

function NotationSymbols({ guide }: { guide: NotationGuide }) {
  const { t } = useTranslation()

  return (
    <section className="grid gap-3 border border-app-border bg-app-surface p-4">
      <h2 className="text-xl font-black uppercase tracking-[-0.03em] text-app-text sm:text-2xl">
        {t('notations.page.symbolsTitle')}
      </h2>
      <div className="overflow-x-auto border border-app-text bg-app-surface">
        <table className="w-full min-w-[34rem] border-collapse text-app-text">
          <thead>
            <tr className="bg-app-control text-sm font-black uppercase tracking-[0.08em]">
              <th className="w-32 border border-app-text px-3 py-2 text-center">{t('notations.page.symbol')}</th>
              <th className="border border-app-text px-3 py-2 text-center">{t('notations.page.meaning')}</th>
              <th className="w-36 border border-app-text px-3 py-2 text-center">{t('notations.page.example')}</th>
            </tr>
          </thead>
          <tbody>
            {guide.symbols.map((symbol) => (
              <tr key={`${symbol.symbol}-${symbol.example}`}>
                <td className="border border-app-text px-3 py-3 text-center font-mono text-base font-black">
                  {symbol.symbol}
                </td>
                <td className="border border-app-text px-4 py-3 text-sm font-semibold leading-6 text-app-muted">
                  {t(symbol.meaningKey)}
                </td>
                <td className="border border-app-text px-3 py-3 text-center font-mono text-base font-black">
                  {symbol.example}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function NotationRules({ guide }: { guide: NotationGuide }) {
  const { t } = useTranslation()

  return (
    <section className="grid gap-3 border border-app-border bg-app-surface p-4">
      <h2 className="text-xl font-black uppercase tracking-[-0.03em] text-app-text sm:text-2xl">
        {t('notations.page.howToRead')}
      </h2>
      <ol className="grid gap-2 sm:grid-cols-2">
        {guide.sections.map((section, index) => (
          <li key={section.titleKey} className="grid gap-2 border border-app-border bg-app-control p-3">
            <span className="font-mono text-xs font-black uppercase tracking-[0.16em] text-app-muted">
              {String(index + 1).padStart(2, '0')}
            </span>
            <h3 className="text-sm font-black uppercase tracking-[0.08em] text-app-text">
              {t(section.titleKey)}
            </h3>
            <p className="text-sm font-semibold leading-6 text-app-muted">
              {t(section.bodyKey)}
            </p>
          </li>
        ))}
      </ol>
    </section>
  )
}

function NotationGuideNav() {
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
