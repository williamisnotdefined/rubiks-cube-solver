import { useTranslation } from 'react-i18next'
import { Navigate, useLocation, useParams } from 'react-router'
import { Card, CardContent, CardHeader } from '@components/Card'
import { PageScaffold } from '@components/layout/PageScaffold'
import { PageTitle } from '@components/layout/PageTitle'
import { localeFromPathname, localizedPath } from '@src/seo/routes'
import { NotationGuideNav } from '../components/NotationGuideNav'
import { NotationVisualizer } from '../components/NotationVisualizer'
import { getNotationGuide } from '../notationGuides'

export function NotationGuidePage() {
  const { t } = useTranslation()
  const location = useLocation()
  const { puzzleId } = useParams()
  const guide = getNotationGuide(puzzleId)
  const locale = localeFromPathname(location.pathname)

  if (guide === undefined) {
    return <Navigate replace to={localizedPath('/notations/3x3', locale)} />
  }

  return (
    <PageScaffold contentClassName='max-w-6xl gap-4'>
      <PageTitle>{t('notations.page.title', { puzzle: guide.puzzle })}</PageTitle>
      <div className='grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]'>
        <div className='grid min-w-0 gap-4'>
          {guide.visualization === undefined ? (
            <Card>
              <CardHeader>
                <h2 className='text-2xl font-semibold tracking-tight'>
                  {t('notations.page.underConstruction')}
                </h2>
              </CardHeader>
              <CardContent />
            </Card>
          ) : (
            <NotationVisualizer guide={guide} />
          )}
        </div>
        <NotationGuideNav />
      </div>
    </PageScaffold>
  )
}
