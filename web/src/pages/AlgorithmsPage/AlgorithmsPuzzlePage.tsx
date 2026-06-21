import { useTranslation } from 'react-i18next'
import { Link, Navigate, useParams } from 'react-router'
import { PageHeader } from '@components/layout/PageHeader'
import { PageScaffold } from '@components/layout/PageScaffold'
import { PageTitle } from '@components/layout/PageTitle'
import { AlgorithmLinkList } from './components/AlgorithmLinkList'
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
    <PageScaffold contentClassName="max-w-5xl gap-5">
        <PageHeader>
          <Link className="text-xs font-extrabold uppercase tracking-[0.18em] text-app-muted hover:text-app-text" to="/algoritmos">
            {t('algorithms.page.backToIndex')}
          </Link>
          <PageTitle>
            {puzzle.title}
          </PageTitle>
          <p className="max-w-3xl text-sm font-semibold leading-6 text-app-muted">
            {t('algorithms.index.description')}
          </p>
        </PageHeader>
        <AlgorithmLinkList ariaLabel={t('algorithms.page.methods')} links={sets} />
    </PageScaffold>
  )
}
