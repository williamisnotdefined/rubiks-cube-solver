import { describe, expect, it } from 'vitest'
import { activeRouteFromPath } from '../activeRouteFromPath'

describe('activeRouteFromPath', () => {
  it('marks WCA Data API pages as API navigation', () => {
    expect(activeRouteFromPath('/api/wca-data')).toBe('api')
    expect(activeRouteFromPath('/api/wca-data/')).toBe('api')
  })
})
