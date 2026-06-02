import { useEffect, useState, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import type { RubiksCubeElement } from '@houstonp/rubiks-cube/view'

const cubeElementName = 'rubiks-cube'

type CubeStageProps = {
  active: boolean
  cubeRef: RefObject<RubiksCubeElement | null>
  onReady: () => void
}

export function CubeStage({ active, cubeRef, onReady }: CubeStageProps) {
  const { t } = useTranslation()
  const [registered, setRegistered] = useState(
    () => customElements.get(cubeElementName) !== undefined,
  )

  useEffect(() => {
    if (!active) {
      return undefined
    }

    let mounted = true

    async function registerCubeElement() {
      if (!customElements.get(cubeElementName)) {
        const { RubiksCubeElement } = await import('@houstonp/rubiks-cube/view')
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
  }, [active, onReady])

  return (
    <section
      className="cube-stage aspect-square w-[min(280px,calc(100vw-24px))] overflow-hidden border border-[#2b2b2b] bg-[#101010]"
      aria-label={t('cube.visualization')}
    >
      {active && registered ? (
        <rubiks-cube
          className="block size-full brightness-[0.78] saturate-[0.9] contrast-[0.96]"
          ref={cubeRef}
          animation-speed-ms="180"
          animation-style="exponential"
          camera-peek-angle-horizontal="0.62"
          camera-peek-angle-vertical="0.55"
          camera-radius="5.8"
          cube-type="Three"
          piece-gap="1.045"
        />
      ) : null}
    </section>
  )
}
