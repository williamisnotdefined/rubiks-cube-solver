import { useEffect, useState, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { VisualizationLoadLayer } from '@components/VisualizationLoadLayer'
import type { RubiksCubeElement } from '@rubiks-cube-solver/rubiks-cube/view'

const cubeElementName = 'rubiks-cube'

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
  const [registered, setRegistered] = useState(
    () => customElements.get(cubeElementName) !== undefined,
  )

  useEffect(() => {
    let mounted = true

    if (!loadRequested) {
      return undefined
    }

    async function registerCubeElement() {
      if (!customElements.get(cubeElementName)) {
        const { RubiksCubeElement } = await import('@rubiks-cube-solver/rubiks-cube/view')
        if (!customElements.get(cubeElementName)) {
          RubiksCubeElement.register()
        }
      }

      if (mounted) {
        setRegistered(true)
        onReady()
      }
    }

    void registerCubeElement()

    return () => {
      mounted = false
    }
  }, [loadRequested, onReady])

  return (
    <section
      className="cube-stage aspect-square w-[min(280px,calc(100vw-24px))] overflow-hidden border bg-card shadow-sm"
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
          className="block size-full brightness-[0.78] saturate-[0.9] contrast-[0.96]"
          ref={cubeRef}
          animation-speed-ms="180"
          animation-style="exponential"
          camera-peek-angle-horizontal="0.62"
          camera-peek-angle-vertical="0.55"
          camera-radius="5.8"
          cube-type={cubeType}
          piece-gap="1.045"
        />
      ) : (
        <VisualizationLoadLayer
          label={t('cube.preparingVisualization')}
          loadingLabel={t('common.loading')}
          loadRequested={loadRequested}
          onLoadRequest={onLoadRequest}
        />
      )}
    </section>
  )
}
