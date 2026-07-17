import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useLocation, useParams } from 'react-router'
import { PageScaffold } from '@components/layout/PageScaffold'
import { localeFromPathname, localizedPath } from '@src/seo/routes'
import { AlgorithmSetHeader } from '../components/AlgorithmSetHeader'
import { AlgorithmTable } from '../components/AlgorithmTable'
import { getAlgorithmSetSummary } from '../sets/algorithmSetMetadata'
import { getAlgorithmSet } from '../sets/algorithmSets'
import type { AlgorithmSet } from '../sets/types'

export function AlgorithmSetPage() {
  const location = useLocation()
  const { t } = useTranslation()
  const { methodId, puzzleId } = useParams()
  const summary = getAlgorithmSetSummary(puzzleId, methodId)
  const [set, setSet] = useState<AlgorithmSet>()
  const [loadError, setLoadError] = useState<unknown>()
  const locale = localeFromPathname(location.pathname)

  useEffect(() => {
    let active = true
    setSet(undefined)
    setLoadError(undefined)

    void getAlgorithmSet(puzzleId, methodId)
      .then((loadedSet) => {
        if (active) {
          setSet(loadedSet)
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadError(error)
        }
      })

    return () => {
      active = false
    }
  }, [methodId, puzzleId])

  if (summary === undefined) {
    const fallbackPath = puzzleId === undefined ? '/algorithms' : `/algorithms/${puzzleId}`
    return <Navigate replace to={localizedPath(fallbackPath, locale)} />
  }

  if (loadError !== undefined) {
    throw loadError
  }

  if (set === undefined) {
    return (
      <PageScaffold contentClassName='max-w-5xl gap-4'>
        <p role='status'>{t('common.loading')}</p>
      </PageScaffold>
    )
  }

  return (
    <PageScaffold contentClassName='max-w-5xl gap-4'>
      <AlgorithmSetHeader
        puzzlePath={localizedPath(`/algorithms/${set.puzzleId}`, locale)}
        sourceLabel={set.sourceLabel}
        sourceUrl={set.sourceUrl}
        title={set.title}
      />
      <AlgorithmTable altPrefix={set.title} cases={set.cases} />
    </PageScaffold>
  )
}
