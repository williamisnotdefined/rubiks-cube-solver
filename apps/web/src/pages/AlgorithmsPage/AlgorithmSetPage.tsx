import { useTranslation } from 'react-i18next'
import { Link, Navigate, useParams } from 'react-router'
import { AlgorithmTable } from './components/AlgorithmTable'
import { getAlgorithmSet } from './sets/algorithmSets'

export function AlgorithmSetPage() {
  const { methodId, puzzleId } = useParams()
  const set = getAlgorithmSet(puzzleId, methodId)

  if (set === undefined) {
    return <Navigate replace to={puzzleId === undefined ? '/algoritmos' : `/algoritmos/${puzzleId}`} />
  }

  return (
    <main className="h-full min-h-0 overflow-y-auto bg-app-bg px-3 py-4 text-app-text sm:px-5 sm:py-6">
      <section className="mx-auto grid w-full max-w-5xl gap-4">
        <AlgorithmSetHeader puzzlePath={`/algoritmos/${set.puzzleId}`} sourceLabel={set.sourceLabel} sourceUrl={set.sourceUrl} title={set.title} />
        <AlgorithmTable altPrefix={set.title} cases={set.cases} />
      </section>
    </main>
  )
}

function AlgorithmSetHeader({
  puzzlePath,
  sourceLabel,
  sourceUrl,
  title,
}: {
  puzzlePath: string
  sourceLabel: string
  sourceUrl: string
  title: string
}) {
  const { t } = useTranslation()

  return (
    <header className="grid gap-3">
      <Link className="text-xs font-extrabold uppercase tracking-[0.18em] text-app-muted hover:text-app-text" to={puzzlePath}>
        {t('algorithms.page.backToIndex')}
      </Link>
      <h1 className="text-3xl font-black uppercase tracking-[-0.04em] text-app-text sm:text-5xl">
        {title}
      </h1>
      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-app-muted">
        {t('algorithms.table.source')}:{' '}
        <a className="text-app-text underline decoration-app-border underline-offset-4 hover:text-app-muted" href={sourceUrl} rel="noreferrer" target="_blank">
          {sourceLabel}
        </a>
      </p>
    </header>
  )
}
