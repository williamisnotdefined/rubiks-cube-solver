import type { RubiksCubeElement } from '@rubiks-cube-solver/rubiks-cube/view'
import type { MegaminxPuzzleElement } from '@rubiks-cube-solver/rubiks-cube/puzzles/megaminx'
import type { PyraminxPuzzleElement } from '@rubiks-cube-solver/rubiks-cube/puzzles/pyraminx'
import type { Square1PuzzleElement } from '@rubiks-cube-solver/rubiks-cube/puzzles/square1'
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
      'megaminx-puzzle': DetailedHTMLProps<
        HTMLAttributes<MegaminxPuzzleElement>,
        MegaminxPuzzleElement
      > & {
        'animation-speed-ms'?: string
        'animation-style'?: string
        'camera-peek-angle-horizontal'?: string
        'camera-peek-angle-vertical'?: string
        'camera-radius'?: string
        'visual-style'?: string
      }
      'pyraminx-puzzle': DetailedHTMLProps<
        HTMLAttributes<PyraminxPuzzleElement>,
        PyraminxPuzzleElement
      > & {
        'animation-speed-ms'?: string
        'animation-style'?: string
        'camera-field-of-view'?: string
        'camera-peek-angle-horizontal'?: string
        'camera-peek-angle-vertical'?: string
        'camera-radius'?: string
      }
      'square1-puzzle': DetailedHTMLProps<
        HTMLAttributes<Square1PuzzleElement>,
        Square1PuzzleElement
      > & {
        'animation-speed-ms'?: string
        'animation-style'?: string
        'camera-peek-angle-horizontal'?: string
        'camera-peek-angle-vertical'?: string
        'camera-radius'?: string
      }
    }
  }
}

export {}
