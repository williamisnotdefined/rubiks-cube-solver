import type { RefObject } from 'react'
import { RubiksCubeElement } from '@houstonp/rubiks-cube/view'

if (!customElements.get('rubiks-cube')) {
  RubiksCubeElement.register()
}

type CubeStageProps = {
  cubeRef: RefObject<RubiksCubeElement | null>
}

export function CubeStage({ cubeRef }: CubeStageProps) {
  return (
    <section className="cube-stage" aria-label="Cube visualization">
      <rubiks-cube
        ref={cubeRef}
        animation-speed-ms="180"
        animation-style="exponential"
        camera-peek-angle-horizontal="0.62"
        camera-peek-angle-vertical="0.55"
        camera-radius="5.8"
        cube-type="Three"
        piece-gap="1.045"
      />
    </section>
  )
}
