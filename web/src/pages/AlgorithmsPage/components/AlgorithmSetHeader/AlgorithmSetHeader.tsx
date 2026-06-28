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
