import { useEffect, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { VisualizationLoadLayer } from '@components/VisualizationLoadLayer'
import { useVisualizationRegistration } from '@components/VisualizationRegistration'
import type { RubiksCubeElement } from '@rubiks-cube-solver/rubiks-cube/view'

export type CubeStageCubeType = 'Two' | 'Three'

type CubeStageProps = {
  cubeType: CubeStageCubeType
  cubeRef: RefObject<RubiksCubeElement | null>
  loadRequested: boolean
  onReady: () => void
  onLoadRequest: () => void
}

export function CubeStage({
  cubeType,
  cubeRef,
  loadRequested,
  onReady,
  onLoadRequest,
}: CubeStageProps) {
  const { t } = useTranslation()
  const { retry, status } = useVisualizationRegistration('cube', loadRequested)
  const registered = status === 'ready'

  useEffect(() => {
    if (registered) {
      onReady()
    }
  }, [onReady, registered])

  return (
    <section
      className='cube-stage aspect-square w-[min(280px,calc(100vw-24px))] overflow-hidden border bg-card shadow-sm'
      aria-label={t('cube.visualization')}
    >
      {!loadRequested ? (
        <VisualizationLoadLayer
          label={t('cube.preparingVisualization')}
          loadingLabel={t('common.loading')}
          loadRequested={loadRequested}
          onLoadRequest={onLoadRequest}
        />
      ) : registered ? (
        <rubiks-cube
          className='block size-full brightness-[0.78] saturate-[0.9] contrast-[0.96]'
          ref={cubeRef}
          animation-speed-ms='180'
          animation-style='exponential'
          camera-peek-angle-horizontal='0.62'
          camera-peek-angle-vertical='0.55'
          camera-radius='5.8'
          cube-type={cubeType}
          piece-gap='1.045'
        />
      ) : (
        <VisualizationLoadLayer
          error={status === 'error'}
          errorLabel={t('errorBoundary.title')}
          label={t('cube.preparingVisualization')}
          loadingLabel={t('common.loading')}
          loadRequested={loadRequested}
          retryLabel={t('errorBoundary.retry')}
          onLoadRequest={retry}
        />
      )}
    </section>
  )
}
