import type { RubiksCubeElement } from '@rubiks-cube-solver/rubiks-cube/view'
import type { DetailedHTMLProps, HTMLAttributes } from 'react'

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'rubiks-cube': DetailedHTMLProps<
        HTMLAttributes<RubiksCubeElement>,
        RubiksCubeElement
      > & {
        'animation-speed-ms'?: string
        'animation-style'?: string
        'camera-peek-angle-horizontal'?: string
        'camera-peek-angle-vertical'?: string
        'camera-radius'?: string
        'cube-type'?: string
        'piece-gap'?: string
      }
    }
  }
}

export {}
