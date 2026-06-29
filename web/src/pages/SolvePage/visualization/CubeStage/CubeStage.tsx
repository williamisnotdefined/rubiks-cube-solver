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
    let fallbackTimeout: number | undefined
    let idleCallbackId: number | undefined

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

    if (window.requestIdleCallback !== undefined) {
      idleCallbackId = window.requestIdleCallback(() => {
        void registerCubeElement()
      }, { timeout: 1500 })
    } else {
      fallbackTimeout = window.setTimeout(() => {
        void registerCubeElement()
      }, 0)
    }

    return () => {
      mounted = false
      if (idleCallbackId !== undefined) {
        window.cancelIdleCallback(idleCallbackId)
      }
      if (fallbackTimeout !== undefined) {
        window.clearTimeout(fallbackTimeout)
      }
    }
  }, [loadRequested, onReady])

  return (
    <section
      className="cube-stage aspect-square w-[min(280px,calc(100vw-24px))] overflow-hidden border border-app-border bg-app-surface"
      aria-label={t('cube.visualization')}
    >
      {!loadRequested ? (
        <button
          className="grid size-full place-items-center px-5 text-center text-xs font-extrabold uppercase tracking-[0.16em] text-app-muted outline-none transition-colors hover:bg-app-surface-raised hover:text-app-text focus-visible:ring-2 focus-visible:ring-app-focus/50"
          type="button"
          onClick={onLoadRequest}
        >
          {t('cube.visualization')}
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
          className="grid size-full place-items-center px-5 text-center text-xs font-extrabold uppercase tracking-[0.16em] text-app-muted"
          role="status"
        >
          {t('common.loading')}
        </div>
      )}
    </section>
  )
}
