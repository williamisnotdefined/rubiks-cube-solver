import { describe, expect, it } from 'vitest'
import { activeRouteFromPath } from '../activeRouteFromPath'

describe('activeRouteFromPath', () => {
  it.each([
    ['/channels', 'channels'],
    ['/sites', 'sites'],
    ['/stores', 'stores'],
    ['/records', 'records'],
    ['/records/333', 'records'],
    ['/notations/3x3', 'notations'],
    ['/algorithms/3x3', 'algorithms'],
    ['/timer', 'timer'],
    ['/solve', 'solve'],
  ] as const)('maps %s to the %s navigation item', (path, route) => {
    expect(activeRouteFromPath(path)).toBe(route)
  })

  it('does not expose the removed WCA docs redirect as an app route', () => {
    expect(activeRouteFromPath('/api/wca-data')).toBe('solve')
  })
})
