import { describe, expect, it } from 'vitest'
import { bigCubeMoveAxis, generateBigCubeScramble } from '../bigCube'

describe('generateBigCubeScramble', () => {
  it('generates configured WCA-like lengths for big cubes', () => {
    expect(generateBigCubeScramble({ length: 40, puzzle: '4x4x4', seed: 7 }).split(' ')).toHaveLength(40)
    expect(generateBigCubeScramble({ length: 60, puzzle: '5x5x5', seed: 7 }).split(' ')).toHaveLength(60)
    expect(generateBigCubeScramble({ length: 80, puzzle: '6x6x6', seed: 7 }).split(' ')).toHaveLength(80)
    expect(generateBigCubeScramble({ length: 100, puzzle: '7x7x7', seed: 7 }).split(' ')).toHaveLength(100)
  })

  it('uses third-layer wide moves on 6x6 and 7x7 scrambles', () => {
    expect(generateBigCubeScramble({ length: 80, puzzle: '6x6x6', seed: 7 })).toMatch(/3[UDLRFB]w/)
    expect(generateBigCubeScramble({ length: 100, puzzle: '7x7x7', seed: 7 })).toMatch(/3[UDLRFB]w/)
  })

  it('avoids consecutive moves on the same axis', () => {
    const tokens = generateBigCubeScramble({ length: 80, puzzle: '6x6x6', seed: 7 }).split(' ')

    for (const [index, token] of tokens.entries()) {
      const previous = tokens[index - 1]

      if (previous !== undefined) {
        expect(bigCubeMoveAxis(token)).not.toBe(bigCubeMoveAxis(previous))
      }
    }
  })
})
