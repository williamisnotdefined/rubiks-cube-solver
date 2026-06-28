import { Navigate, useParams } from 'react-router'
import { PageScaffold } from '@components/layout/PageScaffold'
import { AlgorithmSetHeader } from '../components/AlgorithmSetHeader'
import { AlgorithmTable } from '../components/AlgorithmTable'
import { getAlgorithmSet } from '../sets/algorithmSets'

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
