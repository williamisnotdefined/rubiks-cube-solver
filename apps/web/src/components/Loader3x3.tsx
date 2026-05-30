import cls from 'classnames'
import { useEffect, useRef, useState } from 'react'
import type { Movement } from '@houstonp/rubiks-cube/core'
import type { RubiksCubeElement } from '@houstonp/rubiks-cube/view'

type Loader3x3Props = {
  className?: string
  decorative?: boolean
  label?: string
  registerDelayMs?: number
}

const cubeElementName = 'rubiks-cube'
const loaderMoves = ['R', 'U', "R'", "U'", 'F', 'R', 'U', "R'", "U'", "F'"] as const satisfies readonly Movement[]
const pauseBetweenMovesMs = 40

export function Loader3x3({
  className,
  decorative = false,
  label = 'Loading',
  registerDelayMs = 0,
}: Loader3x3Props) {
  const cubeRef = useRef<RubiksCubeElement | null>(null)
  const [registered, setRegistered] = useState(
    () => customElements.get(cubeElementName) !== undefined,
  )
  const explicitSize = hasExplicitSizeClass(className)

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
      }
    }

    const timeout = window.setTimeout(() => {
      void registerCubeElement()
    }, registerDelayMs)

    return () => {
      active = false
      window.clearTimeout(timeout)
    }
  }, [registerDelayMs])

  useEffect(() => {
    if (!registered) {
      return
    }

    let active = true

    async function animateCube() {
      const cube = cubeRef.current
      if (cube === null) {
        return
      }

      let moveIndex = 0
      try {
        cube.reset()
      } catch {
        // The custom element may still be finishing its first connection pass.
      }

      while (active) {
        try {
          await cube.move(loaderMoves[moveIndex % loaderMoves.length])
          moveIndex += 1
        } catch {
          // If the cube is temporarily unavailable, keep the loader alive until unmount.
        }

        await delay(pauseBetweenMovesMs)
      }
    }

    void animateCube()

    return () => {
      active = false
    }
  }, [registered])

  return (
    <span
      aria-hidden={decorative ? 'true' : undefined}
      aria-label={decorative ? undefined : label}
      className={cls(
        'relative inline-block overflow-hidden bg-transparent align-middle',
        !explicitSize && 'size-10',
        className,
      )}
      role={decorative ? undefined : 'status'}
    >
      {registered ? (
        <rubiks-cube
          aria-hidden="true"
          className="block size-full pointer-events-none brightness-[0.92] saturate-[1.08] contrast-[1.04]"
          data-loader-cube="true"
          ref={cubeRef}
          animation-speed-ms="120"
          animation-style="exponential"
          camera-peek-angle-horizontal="0.62"
          camera-peek-angle-vertical="0.55"
          camera-radius="5.8"
          cube-type="Three"
          piece-gap="1.045"
        />
      ) : null}
    </span>
  )
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function hasExplicitSizeClass(className?: string): boolean {
  return className?.split(/\s+/).some((name) => /^(size|h|w)-/.test(name)) ?? false
}
