import { useTranslation } from 'react-i18next'
import { Navigate, useParams } from 'react-router'
import { PageHeader } from '@components/layout/PageHeader'
import { PageScaffold } from '@components/layout/PageScaffold'
import { PageTitle } from '@components/layout/PageTitle'
import { NotationGuideNav } from '../components/NotationGuideNav'
import { NotationRules } from '../components/NotationRules'
import { NotationSymbols } from '../components/NotationSymbols'
import { getNotationGuide } from '../notationGuides'

export function NotationGuidePage() {
  const { t } = useTranslation()
  const { puzzleId } = useParams()
  const guide = getNotationGuide(puzzleId)

  if (guide === undefined) {
    return <Navigate replace to="/notations/3x3" />
  }

  return (
    <PageScaffold contentClassName="max-w-6xl gap-4">
      <PageHeader>
        <PageTitle>
          {t('notations.page.title', { puzzle: guide.puzzle })}
        </PageTitle>
        <p className="max-w-3xl text-sm font-semibold leading-6 text-app-muted">
          {t(guide.summaryKey)}
        </p>
      </PageHeader>
      <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="grid min-w-0 gap-4">
          <NotationSymbols guide={guide} />
          <NotationRules guide={guide} />
        </div>
        <NotationGuideNav />
      </div>
    </PageScaffold>
  )
}
