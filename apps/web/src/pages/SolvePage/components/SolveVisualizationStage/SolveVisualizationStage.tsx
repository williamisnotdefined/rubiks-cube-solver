import type { RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import type { RubiksCubeElement } from '@rubiks-cube-solver/rubiks-cube/view'
import { CubeStage, type CubeStageCubeType } from '../../visualization/CubeStage'

type SolveVisualizationStageProps = {
  cubeRef: RefObject<RubiksCubeElement | null>
  loadRequested: boolean
  cubeType?: CubeStageCubeType
  onReady: () => void
  onLoadRequest: () => void
}

export function SolveVisualizationStage({
  cubeRef,
  loadRequested,
  cubeType,
  onReady,
  onLoadRequest,
}: SolveVisualizationStageProps) {
  const { t } = useTranslation()

  if (cubeType === undefined) {
    return (
      <section
        className="cube-stage flex aspect-square w-[min(280px,calc(100vw-24px))] items-center justify-center border border-app-border bg-app-surface px-5 text-center text-sm font-semibold text-app-muted"
        aria-label={t('cube.visualizationUnavailable')}
      >
        {t('cube.visualizationUnavailable')}
      </section>
    )
  }

  return (
    <CubeStage
      key={cubeType}
      cubeType={cubeType}
      cubeRef={cubeRef}
      loadRequested={loadRequested}
      onReady={onReady}
      onLoadRequest={onLoadRequest}
    />
  )
}
