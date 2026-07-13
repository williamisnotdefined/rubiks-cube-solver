import { describe, expect, it } from 'vitest'
import { getAlgorithmPuzzle, getAlgorithmSetSummary, setsForPuzzle } from '../algorithmSetMetadata'

describe('algorithm set metadata', () => {
  it('finds known puzzle metadata and returns no match for an unknown puzzle', () => {
    expect(getAlgorithmPuzzle('3x3')).toMatchObject({ id: '3x3', title: '3x3' })
    expect(getAlgorithmPuzzle('unknown')).toBeUndefined()
  })

  it('finds a set by puzzle and route while rejecting missing combinations', () => {
    expect(getAlgorithmSetSummary('3x3', 'oll')).toMatchObject({
      puzzleId: '3x3',
      routeSlug: 'oll',
      title: '3x3 OLL',
    })
    expect(getAlgorithmSetSummary('3x3', 'missing')).toBeUndefined()
    expect(getAlgorithmSetSummary(undefined, undefined)).toBeUndefined()
  })

  it('returns only the sets owned by the requested puzzle', () => {
    const sets = setsForPuzzle('3x3')

    expect(sets.length).toBeGreaterThan(0)
    expect(sets.every((set) => set.puzzleId === '3x3')).toBe(true)
  })
})
