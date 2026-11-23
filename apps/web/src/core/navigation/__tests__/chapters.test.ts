import { describe, expect, it } from 'vitest'
import { chapterFromNavPath, chapterFromPathname, routeChapters } from '../chapters'
import { stripLocalePath } from '../stripLocalePath'

describe('chapters', () => {
  it('maps the primary routes to their chapter metadata', () => {
    expect(chapterFromPathname('/solve/')).toEqual(routeChapters.solve)
    expect(chapterFromPathname('/timer/')).toEqual(routeChapters.timer)
    expect(chapterFromPathname('/notations/3x3/')).toEqual(routeChapters.notation)
    expect(chapterFromPathname('/records/world/')).toEqual(routeChapters.records)
    expect(chapterFromPathname('/channels/')).toEqual(routeChapters.channels)
    expect(chapterFromPathname('/sites/')).toEqual(routeChapters.sites)
    expect(chapterFromPathname('/stores/')).toEqual(routeChapters.stores)
  })

  it('maps localized paths and nested routes', () => {
    expect(chapterFromPathname('/pt-BR/timer/')).toEqual(routeChapters.timer)
    expect(chapterFromPathname('/es/records/world/')).toEqual(routeChapters.records)
    expect(chapterFromPathname('/algorithms/')).toEqual(routeChapters['algorithms-index'])
    expect(chapterFromPathname('/algorithms/3x3/')).toEqual(routeChapters['algorithms-puzzle'])
    expect(chapterFromPathname('/algorithms/3x3/oll/')).toEqual(routeChapters['algorithms-set'])
  })

  it('maps the landing root to the enter chapter', () => {
    expect(chapterFromPathname('/')).toEqual(routeChapters.home)
    expect(chapterFromPathname('/pt-BR/')).toEqual(routeChapters.home)
  })

  it('falls back to the solver chapter for unknown paths', () => {
    expect(chapterFromPathname('/unknown')).toEqual(routeChapters.solve)
  })

  it('accepts navigation paths with or without a leading slash', () => {
    expect(chapterFromNavPath('/timer')).toEqual(routeChapters.timer)
    expect(chapterFromNavPath('timer')).toEqual(routeChapters.timer)
    expect(chapterFromNavPath('/algorithms')).toEqual(routeChapters['algorithms-index'])
  })

  it('strips locale prefixes without loading the SEO route manifest', () => {
    expect(stripLocalePath('/pt-BR/timer/')).toBe('/timer/')
    expect(stripLocalePath('/en/algorithms/3x3/')).toBe('/algorithms/3x3/')
    expect(stripLocalePath('/de')).toBe('/')
    expect(stripLocalePath('timer')).toBe('/timer')
    expect(stripLocalePath('')).toBe('/')
  })
})
