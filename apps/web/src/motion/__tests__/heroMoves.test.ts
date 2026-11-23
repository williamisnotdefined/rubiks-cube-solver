import { describe, expect, it } from 'vitest'
import { createHeroMoveGenerator, targetHeroMoveCount } from '../heroMoves'

describe('createHeroMoveGenerator', () => {
  it('is deterministic for a given seed', () => {
    const first = createHeroMoveGenerator(42)
    const second = createHeroMoveGenerator(42)

    expect(Array.from({ length: 24 }, () => first())).toEqual(
      Array.from({ length: 24 }, () => second()),
    )
  })

  it('never turns the same face twice in a row', () => {
    const nextMove = createHeroMoveGenerator(7)
    const moves = Array.from({ length: 80 }, () => nextMove())

    for (let index = 1; index < moves.length; index += 1) {
      expect(moves[index]?.[0]).not.toBe(moves[index - 1]?.[0])
    }
  })

  it('only emits valid 3x3 face turns', () => {
    const nextMove = createHeroMoveGenerator(2026)

    for (let index = 0; index < 80; index += 1) {
      expect(nextMove()).toMatch(/^[RLUDFB](?:'|2)?$/)
    }
  })
})

describe('targetHeroMoveCount', () => {
  it('starts solved at the top and grows with scroll', () => {
    expect(targetHeroMoveCount(0)).toBe(0)
    expect(targetHeroMoveCount(139)).toBe(0)
    expect(targetHeroMoveCount(140)).toBe(1)
    expect(targetHeroMoveCount(700)).toBe(5)
  })

  it('keeps growing through the page and ignores negative scroll positions', () => {
    expect(targetHeroMoveCount(-500)).toBe(0)
    expect(targetHeroMoveCount(1400)).toBe(10)
    expect(targetHeroMoveCount(7000)).toBe(50)
    expect(targetHeroMoveCount(100_000)).toBe(714)
  })
})
