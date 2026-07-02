import { useEffect, useState, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
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
        <button
          className="grid size-full place-items-center px-5 text-center text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
          type="button"
          onClick={onLoadRequest}
        >
          <span className="flex flex-col items-center gap-3">
            <span
              className="size-7 animate-spin rounded-full border-2 border-border border-t-muted-foreground"
              aria-hidden="true"
            />
            <span>{t('cube.preparingVisualization')}</span>
          </span>
        </button>
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
        <div
          className="grid size-full place-items-center px-5 text-center text-sm text-muted-foreground"
          role="status"
        >
          {t('common.loading')}
        </div>
      )}
    </section>
  )
}
