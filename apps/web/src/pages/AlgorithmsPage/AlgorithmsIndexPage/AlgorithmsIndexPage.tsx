import { useTranslation } from 'react-i18next'
import { PageHeader } from '@components/layout/PageHeader'
import { PageScaffold } from '@components/layout/PageScaffold'
import { PageTitle } from '@components/layout/PageTitle'
import { AlgorithmLinkList } from '../components/AlgorithmLinkList'
import { algorithmPuzzles } from '../sets/algorithmSetMetadata'

export function AlgorithmsIndexPage() {
  const { t } = useTranslation()

  return (
    <PageScaffold contentClassName="max-w-5xl gap-5">
      <PageHeader>
        <PageTitle>
          {t('algorithms.index.title')}
        </PageTitle>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          {t('algorithms.index.description')}
        </p>
      </PageHeader>
      <AlgorithmLinkList ariaLabel={t('algorithms.index.puzzleList')} links={algorithmPuzzles} />
    </PageScaffold>
  )
}
