import { useTranslation } from 'react-i18next'
import { Link, Navigate, useParams } from 'react-router'
import { PageHeader } from '@components/layout/PageHeader'
import { PageScaffold } from '@components/layout/PageScaffold'
import { PageTitle } from '@components/layout/PageTitle'
import { AlgorithmTable } from './components/AlgorithmTable'
import { getAlgorithmSet } from './sets/algorithmSets'

export function AlgorithmSetPage() {
  const { methodId, puzzleId } = useParams()
  const set = getAlgorithmSet(puzzleId, methodId)

  if (set === undefined) {
    return <Navigate replace to={puzzleId === undefined ? '/algoritmos' : `/algoritmos/${puzzleId}`} />
  }

  return (
    <PageScaffold contentClassName="max-w-5xl gap-4">
        <AlgorithmSetHeader puzzlePath={`/algoritmos/${set.puzzleId}`} sourceLabel={set.sourceLabel} sourceUrl={set.sourceUrl} title={set.title} />
        <AlgorithmTable altPrefix={set.title} cases={set.cases} />
    </PageScaffold>
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
    <PageHeader surface={false}>
      <Link className="text-xs font-extrabold uppercase tracking-[0.18em] text-app-muted hover:text-app-text" to={puzzlePath}>
        {t('algorithms.page.backToIndex')}
      </Link>
      <PageTitle>
        {title}
      </PageTitle>
      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-app-muted">
        {t('algorithms.table.source')}:{' '}
        <a className="text-app-text underline decoration-app-border underline-offset-4 hover:text-app-muted" href={sourceUrl} rel="noreferrer" target="_blank">
          {sourceLabel}
        </a>
      </p>
    </PageHeader>
  )
}
