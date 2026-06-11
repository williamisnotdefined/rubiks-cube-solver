import type { RubiksCubeElement } from '@rubiks-cube-solver/rubiks-cube/view'
import type { TwistyPuzzleElement } from '@rubiks-cube-solver/rubiks-cube/puzzle'
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
      'twisty-puzzle': DetailedHTMLProps<
        HTMLAttributes<TwistyPuzzleElement>,
        TwistyPuzzleElement
      > & {
        alg?: string
        background?: string
        'camera-distance'?: string
        'control-panel'?: string
        puzzle?: string
        'setup-alg'?: string
        visualization?: string
      }
    }
  }
}

export {}
