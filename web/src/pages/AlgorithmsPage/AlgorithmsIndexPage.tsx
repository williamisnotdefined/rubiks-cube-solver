import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { algorithmPuzzles } from './sets/algorithmSetMetadata'

export function AlgorithmsIndexPage() {
  const { t } = useTranslation()

  return (
    <main className="h-full min-h-0 overflow-y-auto bg-app-bg px-3 py-4 text-app-text sm:px-5 sm:py-6">
      <section className="mx-auto grid w-full max-w-5xl gap-5">
        <header className="grid gap-3 border border-app-border bg-app-surface p-5">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-app-muted">
            {t('algorithms.index.kicker')}
          </p>
          <h1 className="text-3xl font-black uppercase tracking-[-0.04em] text-app-text sm:text-5xl">
            {t('algorithms.index.title')}
          </h1>
          <p className="max-w-3xl text-sm font-semibold leading-6 text-app-muted">
            {t('algorithms.index.description')}
          </p>
        </header>
        <nav className="grid gap-2" aria-label={t('algorithms.index.puzzleList')}>
          {algorithmPuzzles.map((puzzle) => (
            <Link key={puzzle.id} className="border border-app-text bg-app-surface px-4 py-3 text-lg font-black uppercase tracking-[0.08em] text-app-text hover:bg-app-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-focus/50" to={puzzle.path}>
              {puzzle.title}
            </Link>
          ))}
        </nav>
      </section>
    </main>
  )
}
