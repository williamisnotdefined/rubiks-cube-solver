import { Navigate, useLocation, useParams } from 'react-router'
import { PageScaffold } from '@components/layout/PageScaffold'
import { localeFromPathname, localizedPath } from '@src/seo/routes'
import { AlgorithmSetHeader } from '../components/AlgorithmSetHeader'
import { AlgorithmTable } from '../components/AlgorithmTable'
import { getAlgorithmSet } from '../sets/algorithmSets'

export function AlgorithmSetPage() {
  const location = useLocation()
  const { methodId, puzzleId } = useParams()
  const set = getAlgorithmSet(puzzleId, methodId)
  const locale = localeFromPathname(location.pathname)

  if (set === undefined) {
    const fallbackPath = puzzleId === undefined ? '/algoritmos' : `/algoritmos/${puzzleId}`
    return <Navigate replace to={localizedPath(fallbackPath, locale)} />
  }

  return (
    <PageScaffold contentClassName="max-w-5xl gap-4">
      <AlgorithmSetHeader puzzlePath={localizedPath(`/algoritmos/${set.puzzleId}`, locale)} sourceLabel={set.sourceLabel} sourceUrl={set.sourceUrl} title={set.title} />
      <AlgorithmTable altPrefix={set.title} cases={set.cases} />
    </PageScaffold>
  )
}
