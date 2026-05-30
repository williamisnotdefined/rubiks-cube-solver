import { useEffect, useState, type RefObject } from 'react'
import type { RubiksCubeElement } from '@houstonp/rubiks-cube/view'

const cubeElementName = 'rubiks-cube'

type CubeStageProps = {
  cubeRef: RefObject<RubiksCubeElement | null>
  onReady: () => void
}

export function CubeStage({ cubeRef, onReady }: CubeStageProps) {
  const [registered, setRegistered] = useState(
    () => customElements.get(cubeElementName) !== undefined,
  )

  useEffect(() => {
    let active = true

    async function registerCubeElement() {
      if (!customElements.get(cubeElementName)) {
        const { RubiksCubeElement } = await import('@houstonp/rubiks-cube/view')
        if (!customElements.get(cubeElementName)) {
          RubiksCubeElement.register()
        }
      }

      if (active) {
        setRegistered(true)
        onReady()
      }
    }

    void registerCubeElement()

    return () => {
      active = false
    }
  }, [onReady])

  return (
    <section
      className="cube-stage aspect-square w-[min(280px,calc(100vw-24px))] overflow-hidden border border-[#2b2b2b] bg-[#101010]"
      aria-label="Cube visualization"
    >
      {registered ? (
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
