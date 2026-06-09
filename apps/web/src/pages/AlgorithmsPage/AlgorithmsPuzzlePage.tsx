import { useTranslation } from 'react-i18next'
import { Link, Navigate, useParams } from 'react-router'
import { getAlgorithmPuzzle, setsForPuzzle } from './sets/algorithmSetMetadata'

export function AlgorithmsPuzzlePage() {
  const { t } = useTranslation()
  const { puzzleId } = useParams()
  const puzzle = getAlgorithmPuzzle(puzzleId)

  if (puzzle === undefined) {
    return <Navigate replace to="/algoritmos" />
  }

  const sets = setsForPuzzle(puzzle.id)

  return (
    <main className="h-full min-h-0 overflow-y-auto bg-app-bg px-3 py-4 text-app-text sm:px-5 sm:py-6">
      <section className="mx-auto grid w-full max-w-5xl gap-5">
        <header className="grid gap-3 border border-app-border bg-app-surface p-5">
          <Link className="text-xs font-extrabold uppercase tracking-[0.18em] text-app-muted hover:text-app-text" to="/algoritmos">
            {t('algorithms.page.backToIndex')}
          </Link>
          <h1 className="text-3xl font-black uppercase tracking-[-0.04em] text-app-text sm:text-5xl">
            {puzzle.title}
          </h1>
          <p className="max-w-3xl text-sm font-semibold leading-6 text-app-muted">
            {t('algorithms.index.description')}
          </p>
        </header>
        <nav className="grid gap-2" aria-label={t('algorithms.page.methods')}>
          {sets.map((set) => (
            <Link key={set.path} className="border border-app-text bg-app-surface px-4 py-3 text-lg font-black uppercase tracking-[0.08em] text-app-text hover:bg-app-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-focus/50" to={set.path}>
              {set.title}
            </Link>
          ))}
        </nav>
      </section>
    </main>
  )
}
