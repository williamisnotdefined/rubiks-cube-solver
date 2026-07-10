import { useTranslation } from 'react-i18next'
import { Link, Navigate, useLocation, useParams } from 'react-router'
import { PageHeader } from '@components/layout/PageHeader'
import { PageScaffold } from '@components/layout/PageScaffold'
import { PageTitle } from '@components/layout/PageTitle'
import { localeFromPathname, localizedPath } from '@src/seo/routes'
import { AlgorithmLinkList } from '../components/AlgorithmLinkList'
import { getAlgorithmPuzzle, setsForPuzzle } from '../sets/algorithmSetMetadata'

export function AlgorithmsPuzzlePage() {
  const { t } = useTranslation()
  const location = useLocation()
  const { puzzleId } = useParams()
  const puzzle = getAlgorithmPuzzle(puzzleId)
  const locale = localeFromPathname(location.pathname)

  if (puzzle === undefined) {
    return <Navigate replace to={localizedPath('/algoritmos', locale)} />
  }

  const sets = setsForPuzzle(puzzle.id)

  return (
    <PageScaffold contentClassName="max-w-5xl gap-5">
      <PageHeader>
        <Link className="text-sm font-medium text-muted-foreground hover:text-foreground" to={localizedPath('/algoritmos', locale)}>
          {t('algorithms.page.backToIndex')}
        </Link>
        <PageTitle>
          {puzzle.title}
        </PageTitle>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          {t('algorithms.index.description')}
        </p>
      </PageHeader>
      <AlgorithmLinkList ariaLabel={t('algorithms.page.methods')} links={sets} />
    </PageScaffold>
  )
}
