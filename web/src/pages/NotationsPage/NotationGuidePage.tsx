import cls from 'classnames'
import type { SyntheticEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, Navigate, useParams } from 'react-router'
import { notationPuzzleGroups, getNotationGuide, type NotationGuide } from './notationGuides'

export function NotationGuidePage() {
  const { t } = useTranslation()
  const { puzzleId } = useParams()
  const guide = getNotationGuide(puzzleId)

  if (guide === undefined) {
    return <Navigate replace to="/notations/3x3" />
  }

  return (
    <main className="h-full min-h-0 overflow-y-auto bg-app-bg px-3 py-4 text-app-text sm:px-5 sm:py-6">
      <section className="mx-auto grid w-full max-w-7xl gap-5">
        <header className="grid gap-3 border border-app-border bg-app-surface p-5">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-app-muted">
            {t('notations.page.kicker')}
          </p>
          <h1 className="text-3xl font-black uppercase tracking-[-0.04em] text-app-text sm:text-5xl">
            {t('notations.page.title', { puzzle: guide.puzzle })}
          </h1>
          <p className="max-w-3xl text-sm font-semibold leading-6 text-app-muted">
            {t(guide.summaryKey)}
          </p>
        </header>
        <div className="grid min-h-0 gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="grid min-w-0 gap-5">
            <NotationHero guide={guide} />
            <NotationSymbols guide={guide} />
            <NotationSections guide={guide} />
          </div>
          <NotationGuideNav />
        </div>
      </section>
    </main>
  )
}

function NotationHero({ guide }: { guide: NotationGuide }) {
  const { t } = useTranslation()

  return (
    <section className="grid gap-4 border border-app-border bg-app-surface p-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <div className="relative min-h-56 overflow-hidden border border-app-border bg-app-control">
        <div className="absolute inset-0 grid place-items-center px-4 text-center text-xs font-extrabold uppercase tracking-[0.16em] text-app-muted">
          {t('notations.page.imageUnavailable')}
        </div>
        <img
          alt={t(guide.imageAltKey)}
          className="relative h-full min-h-56 w-full object-contain p-4"
          loading="lazy"
          src={guide.imageSrc}
          onError={handleImageError}
        />
      </div>
      <div className="grid content-center gap-3">
        <h2 className="text-xl font-black uppercase tracking-[-0.03em] text-app-text sm:text-2xl">
          {t('notations.page.howToRead')}
        </h2>
        <p className="text-sm font-semibold leading-6 text-app-muted">
          {t('notations.page.readingIntro')}
        </p>
        {guide.sourceLabel !== undefined && guide.sourceUrl !== undefined && (
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-app-muted">
            {t('notations.page.source')}:{' '}
            <a className="text-app-text underline decoration-app-border underline-offset-4 hover:text-app-muted" href={guide.sourceUrl} rel="noreferrer" target="_blank">
              {guide.sourceLabel}
            </a>
          </p>
        )}
      </div>
    </section>
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
        <table className="w-full min-w-[40rem] border-collapse text-app-text">
          <thead>
            <tr className="bg-app-control text-sm font-black uppercase tracking-[0.08em]">
              <th className="w-36 border border-app-text px-3 py-2 text-center">{t('notations.page.symbol')}</th>
              <th className="border border-app-text px-3 py-2 text-center">{t('notations.page.meaning')}</th>
              <th className="w-40 border border-app-text px-3 py-2 text-center">{t('notations.page.example')}</th>
            </tr>
          </thead>
          <tbody>
            {guide.symbols.map((symbol) => (
              <tr key={`${symbol.symbol}-${symbol.example}`}>
                <td className="border border-app-text px-3 py-4 text-center font-mono text-base font-black">
                  {symbol.symbol}
                </td>
                <td className="border border-app-text px-4 py-4 text-sm font-semibold leading-6 text-app-muted">
                  {t(symbol.meaningKey)}
                </td>
                <td className="border border-app-text px-3 py-4 text-center font-mono text-base font-black">
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

function NotationSections({ guide }: { guide: NotationGuide }) {
  const { t } = useTranslation()

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {guide.sections.map((section) => (
        <section key={section.titleKey} className="border border-app-border bg-app-surface p-4">
          <h2 className="text-base font-black uppercase tracking-[0.08em] text-app-text">
            {t(section.titleKey)}
          </h2>
          <p className="mt-3 text-sm font-semibold leading-6 text-app-muted">
            {t(section.bodyKey)}
          </p>
        </section>
      ))}
    </div>
  )
}

function NotationGuideNav() {
  const { t } = useTranslation()

  return (
    <nav className="grid content-start gap-3 border border-app-border bg-app-surface p-3" aria-label={t('notations.page.guideNav')}>
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

function handleImageError(event: SyntheticEvent<HTMLImageElement>) {
  event.currentTarget.hidden = true
}
