import { useTranslation } from 'react-i18next'
import { PageHeader } from '@components/layout/PageHeader'
import { PageDescription } from '@components/layout/PageDescription'
import { PageScaffold } from '@components/layout/PageScaffold'
import { PageTitle } from '@components/layout/PageTitle'
import { SiteGrid } from './components/SiteGrid'
import { cubingSites } from './sites'

export function CubingSitesPage() {
  const { t } = useTranslation()

  return (
    <PageScaffold contentClassName='max-w-7xl gap-5'>
      <PageHeader>
        <PageTitle>{t('sites.title')}</PageTitle>
        <PageDescription>{t('sites.description', { count: cubingSites.length })}</PageDescription>
      </PageHeader>
      <SiteGrid sites={cubingSites} />
    </PageScaffold>
  )
}
