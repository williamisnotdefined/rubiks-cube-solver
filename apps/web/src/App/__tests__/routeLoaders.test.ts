import { afterEach, describe, expect, it, vi } from 'vitest'
import { preloadRoute, routeKindsFromPathname, routeLoaders } from '../routeLoaders'

describe('routeLoaders', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('maps page paths to lazy route kinds', () => {
    expect(routeKindsFromPathname('/solve/')).toEqual(['solve'])
    expect(routeKindsFromPathname('/')).toEqual(['home'])
    expect(routeKindsFromPathname('/pt-BR/')).toEqual(['home'])
    expect(routeKindsFromPathname('/pt-BR/timer/')).toEqual(['timer'])
    expect(routeKindsFromPathname('/records/world/')).toEqual(['records'])
    expect(routeKindsFromPathname('/channels/')).toEqual(['channels'])
    expect(routeKindsFromPathname('/sites/')).toEqual(['sites'])
    expect(routeKindsFromPathname('/stores/')).toEqual(['stores'])
    expect(routeKindsFromPathname('/notations/3x3/')).toEqual(['notation'])
  })

  it('distinguishes algorithm index, puzzle and set routes', () => {
    expect(routeKindsFromPathname('/algorithms/')).toEqual(['algorithms-index'])
    expect(routeKindsFromPathname('/algorithms/3x3/')).toEqual(['algorithms-puzzle'])
    expect(routeKindsFromPathname('/algorithms/3x3/oll/')).toEqual(['algorithms-set'])
  })

  it('preloads a route only once', async () => {
    const loader = vi.fn().mockResolvedValue({ default: () => null })
    vi.spyOn(routeLoaders, 'stores').mockImplementation(loader)

    preloadRoute('stores')
    preloadRoute('stores')

    await Promise.resolve()
    expect(loader).toHaveBeenCalledTimes(1)
  })
})
