import { useTranslation } from 'react-i18next'
import { PageHeader } from '@components/layout/PageHeader'
import { PageDescription } from '@components/layout/PageDescription'
import { PageScaffold } from '@components/layout/PageScaffold'
import { PageTitle } from '@components/layout/PageTitle'
import { AlgorithmLinkList } from '../components/AlgorithmLinkList'
import { algorithmPuzzles } from '../sets/algorithmSetMetadata'

export function AlgorithmsIndexPage() {
  const { t } = useTranslation()

  return (
    <PageScaffold contentClassName='max-w-5xl gap-5'>
      <PageHeader>
        <PageTitle>{t('algorithms.index.title')}</PageTitle>
        <PageDescription>{t('algorithms.index.description')}</PageDescription>
      </PageHeader>
      <AlgorithmLinkList ariaLabel={t('algorithms.index.puzzleList')} links={algorithmPuzzles} />
    </PageScaffold>
  )
}
