import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { PageHeader } from '@components/layout/PageHeader'
import { PageTitle } from '@components/layout/PageTitle'

type AlgorithmSetHeaderProps = {
  puzzlePath: string
  sourceLabel: string
  sourceUrl: string
  title: string
}

export function AlgorithmSetHeader({
  puzzlePath,
  sourceLabel,
  sourceUrl,
  title,
}: AlgorithmSetHeaderProps) {
  const { t } = useTranslation()

  return (
    <PageHeader surface={false}>
      <Link className="text-sm font-medium text-muted-foreground hover:text-foreground" to={puzzlePath}>
        {t('algorithms.page.backToIndex')}
      </Link>
      <PageTitle>
        {title}
      </PageTitle>
      <p className="text-sm text-muted-foreground">
        {t('algorithms.table.source')}:{' '}
        <a className="font-medium text-foreground underline underline-offset-4 hover:text-muted-foreground" href={sourceUrl} rel="noreferrer" target="_blank">
          {sourceLabel}
        </a>
      </p>
    </PageHeader>
  )
}
